# -*- coding: utf-8 -*-
"""
Module d'ensemble pour combiner les prévisions de plusieurs modèles.

Ce module implémente plusieurs stratégies d'agrégation:
- Médiane pondérée
- Moyenne pondérée par performance
- Stacking avec méta-modèle
- Sélection dynamique

Auteur: Mlle. Zouini Dounia
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class EnsembleConfig:
    """Configuration de l'ensemble."""
    method: str = "weighted_median"  # median, mean, weighted_median, stacking
    min_models: int = 3
    exclude_models: List[str] = None  # Modèles à exclure
    confidence_level: float = 0.95


class EnsembleForecaster:
    """
    Ensemble de modèles de prévision.

    Combine les prévisions de plusieurs modèles pour réduire
    la variance et améliorer la robustesse.
    """

    def __init__(self, config: Optional[EnsembleConfig] = None):
        self.config = config or EnsembleConfig()
        self._weights = {}
        self._models_performance = {}

    def fit(
        self,
        forecasts: Dict[str, float],
        metrics: Dict[str, Dict],
        y_train: np.ndarray
    ) -> "EnsembleForecaster":
        """
        Calcule les poids de l'ensemble basés sur les performances.

        _Paramètres:
        -----------
        forecasts : dict
            Prévisions par modèle {nom: value}
        metrics : dict
            Métriques par modèle {nom: {mape, mae, ...}}
        y_train : np.ndarray
            Données historiques pour normalisation
        """
        # Filtrer les modèles exclus
        exclude = self.config.exclude_models or []
        valid_models = {
            k: v for k, v in forecasts.items()
            if k not in exclude and not np.isnan(v)
        }

        if len(valid_models) < self.config.min_models:
            logger.warning(
                f"Pas assez de modèles valides ({len(valid_models)} < {self.config.min_models})"
            )

        # Calculer les poids basés sur MAPE inversé
        total_weight = 0
        for name in valid_models:
            m = metrics.get(name, {})
            mape = m.get("MAPE", 50)  # MAPE par défaut si manquant

            # Poids inversement proportionnel au MAPE
            # MAPE = 0 → poids max, MAPE élevé → poids faible
            weight = 1 / (mape + 1)  # +1 pour éviter division par 0

            self._weights[name] = weight
            total_weight += weight
            self._models_performance[name] = {
                "mape": mape,
                "mae": m.get("MAE", np.nan),
                "r2": m.get("R2", 0)
            }

        # Normaliser les poids
        for name in self._weights:
            self._weights[name] /= total_weight

        return self

    def predict(
        self,
        forecasts: Dict[str, float],
        return_distribution: bool = False
    ) -> Tuple[float, Optional[float], Optional[float]]:
        """
        Calcule la prévision de l'ensemble.

        _Paramètres:
        -----------
        forecasts : dict
            Prévisions individuelles par modèle
        return_distribution : bool
            Si True, retourne aussi les percentiles

        _Retourne:
        ---------
        Tuple : (valeur, ic_bas, ic_haut) ou (valeur, None, None)
        """
        # Filtrer les modèles valides
        valid_forecasts = {
            k: v for k, v in forecasts.items()
            if not np.isnan(v) and k in self._weights
        }

        if len(valid_forecasts) == 0:
            return np.nan, None, None

        values = np.array(list(valid_forecasts.values()))
        weights = np.array([self._weights.get(k, 0) for k in valid_forecasts.keys()])

        # Normaliser les poids pour ce subset
        weights = weights / weights.sum()

        # Calcul selon la méthode
        method = self.config.method

        if method == "median":
            value = np.median(values)

        elif method == "mean":
            value = np.dot(weights, values)

        elif method == "weighted_median":
            # Trier par valeur
            sorted_idx = np.argsort(values)
            sorted_values = values[sorted_idx]
            sorted_weights = weights[sorted_idx]

            # Trouver médiane pondérée
            cum_weights = np.cumsum(sorted_weights)
            median_idx = np.searchsorted(cum_weights, 0.5)
            value = sorted_values[median_idx] if median_idx < len(sorted_values) else sorted_values[-1]

        else:
            value = np.median(values)

        # Intervalles de confiance
        if return_distribution and len(values) >= 3:
            alpha = 1 - self.config.confidence_level
            lower = np.percentile(values, alpha / 2 * 100)
            upper = np.percentile(values, (1 - alpha / 2) * 100)
        else:
            lower = None
            upper = None

        return value, lower, upper

    def get_weights(self) -> Dict[str, float]:
        """Retourne les poids de chaque modèle."""
        return self._weights.copy()

    def get_contribution(self, forecasts: Dict[str, float]) -> Dict[str, float]:
        """
        Calcule la contribution de chaque modèle à la prévision finale.

        _Retourne:
        ---------
        Dict: {nom_modèle: contribution_%}
        """
        contributions = {}
        total = sum(abs(v) * self._weights.get(k, 0)
                   for k, v in forecasts.items()
                   if not np.isnan(v))

        for name, fc in forecasts.items():
            if np.isnan(fc) or name not in self._weights:
                continue
            contributions[name] = (abs(fc) * self._weights[name] / total * 100) if total > 0 else 0

        return contributions


class StackingEnsemble:
    """
    Ensemble par stacking avec méta-modèle.

    Utilise les prévisions des modèles de base comme features
    pour un méta-modèle (ex: régression ridge).
    """

    def __init__(self, meta_model_type: str = "ridge"):
        """
        _Paramètres:
        -----------
        meta_model_type : str
            Type de méta-modèle: ridge, linear, bayesian
        """
        self.meta_model_type = meta_model_type
        self._meta_model = None
        self._feature_names = []

    def fit(
        self,
        base_forecasts: np.ndarray,
        y_true: np.ndarray
    ) -> "StackingEnsemble":
        """
        Entraîne le méta-modèle sur les prévisions de base.

        _Paramètres:
        -----------
        base_forecasts : np.ndarray
            Matrice des prévisions (n_samples, n_models)
        y_true : np.ndarray
            Valeurs réelles
        """
        from sklearn.linear_model import Ridge, LinearRegression, BayesianRidge

        if self.meta_model_type == "ridge":
            self._meta_model = Ridge(alpha=1.0)
        elif self.meta_model_type == "bayesian":
            self._meta_model = BayesianRidge()
        else:
            self._meta_model = LinearRegression()

        self._meta_model.fit(base_forecasts, y_true)

        return self

    def predict(self, base_forecasts: np.ndarray) -> float:
        """
        Prédit avec le méta-modèle.

        _Paramètres:
        -----------
        base_forecasts : np.ndarray
            Prévisions des modèles de base (1, n_models)
        """
        if self._meta_model is None:
            raise ValueError("Méta-modèle non entraîné")

        return float(self._meta_model.predict(base_forecasts.reshape(1, -1))[0])

    def get_coef(self) -> Dict[int, float]:
        """Retourne les coefficients du méta-modèle."""
        if self._meta_model is None:
            return {}

        coef = self._meta_model.coef_
        return {i: float(c) for i, c in enumerate(coef)}


class DynamicSelector:
    """
    Sélectionneur dynamique de modèle.

    Choisit le meilleur modèle selon les conditions actuelles:
    - Volatilité récente
    - Tendance
    - Saisonnalité
    """

    def __init__(self):
        self._rules = []
        self._model_rankings = {}

    def add_rule(self, condition: str, preferred_models: List[str]):
        """
        Ajoute une règle de sélection.

        _Paramètres:
        -----------
        condition : str
            Condition: "high_volatility", "trend_up", "trend_down", "stable"
        preferred_models : list
            Modèles préférés dans cet ordre
        """
        self._rules.append({
            "condition": condition,
            "models": preferred_models
        })

    def analyze_series(self, y: np.ndarray) -> str:
        """
        Analyse les caractéristiques de la série.

        _Retourne:
        ---------
        str: condition identifiée
        """
        if len(y) < 3:
            return "stable"

        # Volatilité
        std_recent = np.std(y[-3:])
        std_all = np.std(y)
        volatility_ratio = std_recent / std_all if std_all > 0 else 1

        # Tendance
        trend = (y[-1] - y[-3]) / y[-3] * 100 if len(y) >= 3 else 0

        # Classification
        if volatility_ratio > 1.5:
            return "high_volatility"
        elif trend > 5:
            return "trend_up"
        elif trend < -5:
            return "trend_down"
        else:
            return "stable"

    def select_model(
        self,
        y: np.ndarray,
        models_scores: Dict[str, float]
    ) -> str:
        """
        Sélectionne le meilleur modèle pour la situation.

        _Paramètres:
        -----------
        y : np.ndarray
            Série temporelle
        models_scores : dict
            Scores des modèles disponibles

        _Retourne:
        ---------
        str: nom du modèle sélectionné
        """
        condition = self.analyze_series(y)

        # Chercher les modèles préférés pour cette condition
        preferred = None
        for rule in self._rules:
            if rule["condition"] == condition:
                preferred = rule["models"]
                break

        if preferred is None:
            # Règle par défaut: prendre le meilleur score
            return max(models_scores.items(), key=lambda x: x[1])[0]

        # Chercher le premier modèle préféré qui est disponible
        for model in preferred:
            if model in models_scores:
                return model

        # Fallback
        return max(models_scores.items(), key=lambda x: x[1])[0]


def create_default_ensemble_config() -> EnsembleConfig:
    """Crée une configuration d'ensemble par défaut."""
    return EnsembleConfig(
        method="weighted_median",
        min_models=3,
        exclude_models=["bayesian_ridge"],  # Souvent aberrant avec n=5
        confidence_level=0.95
    )


def create_ensemble_config_from_data(
    forecasts: Dict[str, float],
    metrics: Dict[str, Dict]
) -> EnsembleConfig:
    """
    Crée une configuration adaptée aux données.

    Ajuste automatiquement les paramètres selon:
    - Nombre de modèles disponibles
    - Dispersion des prévisions
    - Qualité des métriques
    """
    valid_forecasts = [v for v in forecasts.values() if not np.isnan(v)]

    if len(valid_forecasts) < 3:
        # Peu de modèles: utiliser la moyenne simple
        return EnsembleConfig(
            method="mean",
            min_models=1,
            confidence_level=0.90
        )

    # Calculer la dispersion
    forecast_std = np.std(valid_forecasts)
    forecast_mean = np.mean(valid_forecasts)
    cv = forecast_std / forecast_mean  # Coefficient de variation

    if cv > 0.15:
        # Forte dispersion: médiane pour robustesse
        return EnsembleConfig(
            method="median",
            min_models=3,
            exclude_models=["bayesian_ridge", "lstm"],
            confidence_level=0.95
        )
    else:
        # Faible dispersion: moyenne pondérée
        return EnsembleConfig(
            method="weighted_median",
            min_models=5,
            confidence_level=0.95
        )
