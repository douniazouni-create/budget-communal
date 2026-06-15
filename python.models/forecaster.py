# -*- coding: utf-8 -*-
"""
Orchestrateur principal pour la modélisation budgétaire.

Ce module:
- Charge les données depuis SQLite
- Entraîne tous les modèles
- Calcule les métriques avec validation croisée
- Génère les prévisions avec intervalles de confiance
- Crée des ensembles de modèles
- Exporte les résultats en CSV/JSON

Auteur: Mlle. Zouini Dounia
Phase: 6 - Modélisation Prédictive
"""

import numpy as np
import pandas as pd
import sqlite3
import os
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
import warnings

# Modules internes
from config import AppConfig, DEFAULT_CONFIG
from metrics import (
    calc_metriques, score_global, compare_models,
    MetricsResult, interpret_metrics
)
from base_model import ModelResult, ForecastResult
from models import (
    LinearRegressionForecaster,
    PolynomialRegressionForecaster,
    RidgeForecaster,
    BayesianRidgeForecaster,
    SVRForecaster,
    HoltForecaster,
    ARIMAForecaster,
    ProphetForecaster,
    CAGRForecaster,
    WeightedAverageForecaster,
    ThetaForecaster,
    LSTMForecaster
)

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ForecastingPipeline:
    """
    Pipeline complet de prévision budgétaire.

    Orchestre l'entraînement, l'évaluation et l'export de tous les modèles.
    """
    config: AppConfig = field(default_factory=AppConfig)
    models: Dict[str, Any] = field(default_factory=dict)
    results: Dict[str, ModelResult] = field(default_factory=dict)
    metrics: Dict[str, MetricsResult] = field(default_factory=dict)
    ensemble_forecast: Optional[float] = None

    # Données
    _data: Optional[pd.DataFrame] = None
    _X_train: Optional[np.ndarray] = None
    _y_train: Optional[np.ndarray] = None
    _years_train: Optional[np.ndarray] = None
    _X_pred: Optional[np.ndarray] = None
    _y_mean: Optional[float] = None

    def __post_init__(self):
        """Initialise les modèles selon la configuration."""
        self._initialize_models()

    def _initialize_models(self):
        """Crée les instances de tous les modèles activés."""
        model_classes = {
            "linear_regression": LinearRegressionForecaster,
            "polynomial_regression": PolynomialRegressionForecaster,
            "ridge_regression": RidgeForecaster,
            "bayesian_ridge": BayesianRidgeForecaster,
            "svr": SVRForecaster,
            "holt": HoltForecaster,
            "arima": ARIMAForecaster,
            "prophet": ProphetForecaster,
            "cagr": CAGRForecaster,
            "moyenne_ponderee": WeightedAverageForecaster,
            "theta": ThetaForecaster,
            "lstm": LSTMForecaster
        }

        for model_key, model_class in model_classes.items():
            if model_key in self.config.models:
                model_config = self.config.models[model_key]
                if model_config.enabled:
                    self.models[model_key] = model_class(
                        config=model_config.hyperparams
                    )

    def load_data(self, db_path: Optional[str] = None) -> pd.DataFrame:
        """
        Charge les données depuis SQLite ou un fichier CSV.

        _Paramètres:
        -----------
        db_path : str, optional
            Chemin vers la base de données SQLite

        _Retourne:
        ---------
        DataFrame : Données chargées
        """
        if db_path is None:
            db_path = os.path.join(self.config.data_dir, "budget_dw.db")

        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            query = """
                SELECT t.annee, t.est_previsionnel,
                       ROUND(SUM(f.montant_reference), 2) as total
                FROM fait_recettes f
                JOIN dim_temps t ON f.id_temps = t.id_temps
                JOIN dim_section s ON f.id_section = s.id_section
                WHERE s.code_section = 'REC' AND t.has_recettes = 1
                GROUP BY t.annee
                ORDER BY t.annee
            """
            self._data = pd.read_sql(query, conn)
            conn.close()
            logger.info(f"Données chargées depuis SQLite: {len(self._data)} lignes")
        else:
            # Fallback: CSV
            csv_path = os.path.join(self.config.data_dir, "historique_et_previsions.csv")
            if os.path.exists(csv_path):
                self._data = pd.read_csv(csv_path)
                logger.info(f"Données chargées depuis CSV: {len(self._data)} lignes")
            else:
                raise FileNotFoundError(f"Aucune source de données trouvée: {db_path} ou {csv_path}")

        return self._data

    def prepare_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prépare les données pour l'entraînement.

        _Retourne:
        ---------
        Tuple : (X_train, y_train, years_train)
        """
        if self._data is None:
            self.load_data()

        # Séparer réalisé vs prévisionnel
        df_realise = self._data[self._data["est_previsionnel"] == 0].copy()

        years_train = df_realise["annee"].values.astype(float)
        y_train = df_realise["total"].values.astype(float)

        # Normalisation des années (pour les modèles sklearn)
        annee_min = years_train.min()
        X_train = (years_train - annee_min).reshape(-1, 1)

        self._annee_min = annee_min
        self._years_train = years_train
        self._X_train = X_train
        self._y_train = y_train
        self._y_mean = y_train.mean()

        # Préparation pour la prédiction 2026
        annee_cible = self.config.target_year
        self._X_pred = np.array([[annee_cible - annee_min]])

        logger.info(f"Données préparées: {len(y_train)} observations, "
                   f"plage [{years_train.min():.0f}, {years_train.max():.0f}]")

        return X_train, y_train, years_train

    def train_all_models(self) -> Dict[str, ModelResult]:
        """
        Entraîne tous les modèles activés.

        _Retourne:
        ---------
        Dict : Résultats par modèle
        """
        if self._X_train is None:
            self.prepare_data()

        logger.info("=" * 60)
        logger.info("  ENTRAÎNEMENT DES MODÈLES")
        logger.info("=" * 60)

        for model_key, model in self.models.items():
            try:
                logger.info(f"\n→ Entraînement: {model.name}")

                # Cas spécial: Prophet a besoin des années
                if isinstance(model, ProphetForecaster):
                    model.fit(self._X_train, self._y_train, years=self._years_train)
                else:
                    model.fit(self._X_train, self._y_train)

                # Prévision
                forecast = model.predict(self._X_pred)

                # Valeurs ajustées
                if isinstance(model, ProphetForecaster):
                    fitted = model.get_fitted_values()
                elif isinstance(model, (HoltForecaster, ARIMAForecaster)):
                    fitted = model.get_fitted_values()
                else:
                    fitted = model.get_fitted_values(self._X_train)

                # Métriques
                metrics = calc_metriques(
                    self._y_train, fitted,
                    y_train=self._y_train
                )

                # Stocker le résultat
                self.results[model_key] = ModelResult(
                    model_name=model.name,
                    forecast=forecast,
                    fitted_values=fitted,
                    metrics=metrics.to_dict(),
                    metadata=model._params_calculated if hasattr(model, '_params_calculated')
                             else model.get_params() if hasattr(model, 'get_params') else {},
                    file_paths=[]
                )
                self.metrics[model.name] = metrics

                logger.info(f"  Prévision 2026: {forecast.value:,.0f} MAD")
                logger.info(f"  {metrics.summary()}")

            except Exception as e:
                logger.error(f"  Erreur {model.name}: {e}")
                self.results[model_key] = ModelResult(
                    model_name=model.name,
                    forecast=ForecastResult(value=np.nan),
                    fitted_values=np.array([]),
                    metrics={},
                    metadata={"error": str(e)}
                )

        return self.results

    def cross_validate(self, n_splits: Optional[int] = None) -> Dict[str, Dict]:
        """
        Validation croisée temporelle (TimeSeriesSplit).

        _Paramètres:
        -----------
        n_splits : int, optional
            Nombre de splits pour la validation croisée

        _Retourne:
        ---------
        Dict : Métriques CV par modèle
        """
        from sklearn.model_selection import TimeSeriesSplit

        if n_splits is None:
            n_splits = self.config.cv_n_splits

        if len(self._y_train) < self.config.cv_min_samples:
            logger.warning(f"Pas assez de données pour CV (min={self.config.cv_min_samples})")
            return {}

        tscv = TimeSeriesSplit(n_splits=n_splits)
        cv_results = {}

        logger.info("\n" + "=" * 60)
        logger.info("  VALIDATION CROISÉE (TimeSeriesSplit)")
        logger.info("=" * 60)

        for model_key, model in self.models.items():
            cv_scores = []

            for fold, (train_idx, test_idx) in enumerate(tscv.split(self._X_train)):
                X_cv_train = self._X_train[train_idx]
                y_cv_train = self._y_train[train_idx]
                X_cv_test = self._X_train[test_idx]
                y_cv_test = self._y_train[test_idx]

                try:
                    # Clone le modèle pour le fold
                    model_cv = type(model)(config=model.config)

                    if isinstance(model_cv, ProphetForecaster):
                        years_cv = self._years_train[train_idx]
                        model_cv.fit(X_cv_train, y_cv_train, years=years_cv)
                    else:
                        model_cv.fit(X_cv_train, y_cv_train)

                    y_pred = model_cv.predict(X_cv_test).value
                    metrics_cv = calc_metriques(y_cv_test, np.array([y_pred]))

                    cv_scores.append({
                        "fold": fold + 1,
                        "mape": metrics_cv.mape,
                        "mae": metrics_cv.mae,
                        "train_size": len(train_idx),
                        "test_size": len(test_idx)
                    })

                except Exception as e:
                    logger.warning(f"  CV {model.name} fold {fold + 1} échoué: {e}")

            if cv_scores:
                avg_mape = np.mean([s["mape"] for s in cv_scores if not np.isnan(s["mape"])])
                avg_mae = np.mean([s["mae"] for s in cv_scores if not np.isnan(s["mae"])])

                cv_results[model_key] = {
                    "avg_mape": avg_mape,
                    "avg_mae": avg_mae,
                    "folds": cv_scores
                }

                logger.info(f"  {model.name}: MAPE CV = {avg_mape:.2f}% (±{np.std([s['mape'] for s in cv_scores]):.2f})")

        return cv_results

    def create_ensemble(self, method: str = "weighted_median") -> ForecastResult:
        """
        Crée un ensemble de prévisions.

        _Paramètres:
        -----------
        method : str
            Méthode d'agrégation:
            - "median": médiane des prévisions
            - "mean": moyenne pondérée
            - "weighted_median": médiane pondérée par scores

        _Retourne:
        ---------
        ForecastResult : Prévision de l'ensemble
        """
        # Collecter les prévisions valides
        forecasts = []
        scores = []

        for model_key, result in self.results.items():
            if np.isnan(result.forecast.value):
                continue

            model_config = self.config.models.get(model_key)
            if model_config and model_config.exclude_from_median:
                continue

            forecasts.append(result.forecast.value)

            # Score pour pondération
            metrics = self.metrics.get(result.model_name)
            if metrics:
                score = score_global(metrics)
            else:
                score = 50  # Score neutre

            scores.append(score)

        forecasts = np.array(forecasts)
        scores = np.array(scores)

        if method == "median":
            value = np.median(forecasts)
        elif method == "mean":
            weights = scores / scores.sum()
            value = np.dot(weights, forecasts)
        elif method == "weighted_median":
            # Trier par prévision et poids cumulés
            sorted_idx = np.argsort(forecasts)
            sorted_forecasts = forecasts[sorted_idx]
            sorted_weights = scores[sorted_idx]
            cum_weights = np.cumsum(sorted_weights)

            # Trouver la médiane pondérée
            median_idx = np.searchsorted(cum_weights, cum_weights[-1] / 2)
            value = sorted_forecasts[median_idx]
        else:
            value = np.median(forecasts)

        # Intervalle de confiance de l'ensemble
        lower = np.percentile(forecasts, 25)
        upper = np.percentile(forecasts, 75)

        self.ensemble_forecast = value

        logger.info(f"\nEnsemble ({method}): {value:,.0f} MAD "
                   f"[IC 50%: {lower:,.0f} - {upper:,.0f}]")

        return ForecastResult(
            value=value,
            lower_ci=lower,
            upper_ci=upper,
            metadata={"method": method, "n_models": len(forecasts)}
        )

    def generate_ranking(self) -> pd.DataFrame:
        """
        Génère le classement des modèles.

        _Retourne:
        ---------
        DataFrame : Classement avec scores
        """
        # Calculer les scores avec normalisation RMSE
        scores = {}
        for name, metrics in self.metrics.items():
            score = score_global(metrics)
            # Ajuster RMSE
            if self._y_mean and not np.isnan(metrics.rmse):
                rmse_pct = (metrics.rmse / self._y_mean) * 100
                rmse_score = max(0, 100 - rmse_pct * 5)
                score += 0.10 * rmse_score  # Poids RMSE
            scores[name] = score

        # Créer le DataFrame
        rows = []
        for model_key, result in self.results.items():
            name = result.model_name
            m = self.metrics.get(name)

            if m is None:
                continue

            row = {
                "rang": 0,
                "modele": name,
                "prevision_2026": result.forecast.value,
                "MAE_MAD": m.mae,
                "RMSE_MAD": m.rmse,
                "MAPE_%": m.mape,
                "R2": m.r2,
                "MASE": m.mase,
                "SMAPE_%": m.smape,
                "score_global": scores.get(name, 0),
                "qualite": "Excellent" if m.mape < 5 else
                          "Acceptable" if m.mape < 10 else "À améliorer"
            }
            rows.append(row)

        df = pd.DataFrame(rows)
        df = df.sort_values("score_global", ascending=False).reset_index(drop=True)
        df["rang"] = df.index + 1

        return df[["rang", "modele", "prevision_2026", "MAE_MAD", "RMSE_MAD",
                   "MAPE_%", "R2", "MASE", "SMAPE_%", "score_global", "qualite"]]

    def export_results(self, output_dir: Optional[str] = None) -> Dict[str, str]:
        """
        Exporte tous les résultats en CSV et JSON.

        _Paramètres:
        -----------
        output_dir : str, optional
            Répertoire de sortie

        _Retourne:
        ---------
        Dict : Chemins des fichiers exportés
        """
        if output_dir is None:
            output_dir = self.config.output_dir

        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(self.config.models_dir, exist_ok=True)

        exported_files = {}

        # 1. Classement CSV
        df_ranking = self.generate_ranking()
        ranking_path = os.path.join(output_dir, "metriques_comparaison.csv")
        df_ranking.to_csv(ranking_path, index=False, encoding="utf-8-sig")
        exported_files["ranking"] = ranking_path

        # 2. Prévisions CSV
        prev_rows = []
        for model_key, result in self.results.items():
            if not np.isnan(result.forecast.value):
                var_pct = (result.forecast.value / self._y_train[-1] - 1) * 100
                prev_rows.append({
                    "modele": result.model_name,
                    "prevision_2026": round(result.forecast.value, 2),
                    "variation_%": round(var_pct, 2),
                    "ic_bas": result.forecast.lower_ci,
                    "ic_haut": result.forecast.upper_ci
                })

        df_prev = pd.DataFrame(prev_rows)
        prev_path = os.path.join(output_dir, "previsions_2026.csv")
        df_prev.to_csv(prev_path, index=False, encoding="utf-8-sig")
        exported_files["previsions"] = prev_path

        # 3. Metadata JSON pour l'application web
        ensemble = self.create_ensemble(method="weighted_median")

        metadata = {
            "projet": f"{self.config.project_name} — Commune de {self.config.commune_name}",
            "auteur": self.config.author,
            "phase": self.config.phase,
            "date_generation": datetime.now().isoformat(),
            "annee_cible": self.config.target_year,
            "historique": {
                int(a): float(r)
                for a, r in zip(self._years_train, self._y_train)
            },
            "modeles": {},
            "synthese": {
                "mediane": float(np.median([r.forecast.value for r in self.results.values()
                                          if not np.isnan(r.forecast.value)])),
                "moyenne": float(np.mean([r.forecast.value for r in self.results.values()
                                         if not np.isnan(r.forecast.value)])),
                "ecart_type": float(np.std([r.forecast.value for r in self.results.values()
                                           if not np.isnan(r.forecast.value)])),
                "ensemble": ensemble.value,
                "ensemble_ic_bas": ensemble.lower_ci,
                "ensemble_ic_haut": ensemble.upper_ci,
                "variation_vs_2025_pct": float((ensemble.value / self._y_train[-1] - 1) * 100),
                "modele_recommande": df_ranking.iloc[0]["modele"] if len(df_ranking) > 0 else None
            },
            "classement": df_ranking.to_dict("records")
        }

        # Ajouter les détails par modèle
        for model_key, result in self.results.items():
            if np.isnan(result.forecast.value):
                continue

            model_meta = {
                "prevision": round(result.forecast.value, 2),
                "ic_95_bas": round(result.forecast.lower_ci, 2) if result.forecast.lower_ci else None,
                "ic_95_haut": round(result.forecast.upper_ci, 2) if result.forecast.upper_ci else None,
                "metrics": result.metrics,
                "fichier": f"{model_key}.joblib"
            }
            metadata["modeles"][model_key] = model_meta

        metadata_path = os.path.join(output_dir, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        exported_files["metadata"] = metadata_path

        # 4. Sauvegarder les modèles
        for model_key, model in self.models.items():
            try:
                files = model.save(self.config.models_dir, basename=model_key)
                exported_files[f"model_{model_key}"] = files
            except Exception as e:
                logger.warning(f"Impossible de sauvegarder {model_key}: {e}")

        logger.info(f"\n✓ Résultats exportés dans {output_dir}")
        for name, path in exported_files.items():
            logger.info(f"  - {name}: {path}")

        return exported_files

    def run_full_pipeline(self, db_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Exécute le pipeline complet.

        _Paramètres:
        -----------
        db_path : str, optional
            Chemin vers la base de données

        _Retourne:
        ---------
        Dict : Résumé de l'exécution
        """
        logger.info("\n" + "=" * 70)
        logger.info("  PIPELINE DE PRÉVISION BUDGÉTAIRE")
        logger.info(f"  Commune: {self.config.commune_name}")
        logger.info(f"  Année cible: {self.config.target_year}")
        logger.info("=" * 70)

        # 1. Charger les données
        self.load_data(db_path)

        # 2. Préparer les données
        self.prepare_data()

        # 3. Afficher les données historiques
        self._print_data_summary()

        # 4. Entraîner les modèles
        self.train_all_models()

        # 5. Validation croisée si assez de données
        if len(self._y_train) >= self.config.cv_min_samples:
            cv_results = self.cross_validate()

        # 6. Générer le classement
        ranking = self.generate_ranking()
        print("\n" + "=" * 70)
        print("  CLASSEMENT DES MODÈLES")
        print("=" * 70)
        print(ranking.to_string(index=False))

        # 7. Créer l'ensemble
        ensemble = self.create_ensemble(method="weighted_median")

        # 8. Scénarios
        forecasts = [r.forecast.value for r in self.results.values()
                    if not np.isnan(r.forecast.value)]

        q25 = np.percentile(forecasts, 25)
        q75 = np.percentile(forecasts, 75)

        print(f"\n  SCÉNARIOS 2026:")
        print(f"  ╔══════════════╦══════════════════╦════════════╗")
        print(f"  ║ Scénario     ║ Prévision        ║ Var vs 2025║")
        print(f"  ╠══════════════╬══════════════════╬════════════╣")
        print(f"  ║ Pessimiste   ║ {q25:>16,.0f} ║ {(q25/self._y_train[-1]-1)*100:>+10.1f}% ║")
        print(f"  ║ Central      ║ {ensemble.value:>16,.0f} ║ {(ensemble.value/self._y_train[-1]-1)*100:>+10.1f}% ║")
        print(f"  ║ Optimiste    ║ {q75:>16,.0f} ║ {(q75/self._y_train[-1]-1)*100:>+10.1f}% ║")
        print(f"  ╚══════════════╩══════════════════╩════════════╝")

        # 9. Exporter
        exported = self.export_results()

        return {
            "ensemble": ensemble.value,
            "ranking": ranking.to_dict("records"),
            "exported_files": exported
        }

    def _print_data_summary(self):
        """Affiche un résumé des données."""
        print("\n  ┌─── DONNÉES HISTORIQUES ───────────────────────────────────┐")
        for year, value in zip(self._years_train, self._y_train):
            bar = "█" * int(value / 8_000_000)
            print(f"  │  {int(year)}  {value:>15,.0f} MAD  {bar:<20}")
        print("  └────────────────────────────────────────────────────────────┘")


# =============================================================================
# POINT D'ENTRÉE
# =============================================================================

def main():
    """Point d'entrée principal."""
    config = AppConfig(
        commune_name="Fquih Ben Salah",
        target_year=2026,
        data_dir="data_warehouse",
        models_dir="models",
        output_dir="data_warehouse"
    )

    pipeline = ForecastingPipeline(config=config)

    # Exécuter avec les données de démonstration si pas de DB
    result = pipeline.run_full_pipeline()

    print("\n✓ Pipeline terminé avec succès")
    print(f"  Prévision ensemble: {result['ensemble']:,.0f} MAD")

    return result


if __name__ == "__main__":
    main()
