#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de démonstration pour le pipeline de prévision budgétaire.

Ce script peut être exécuté directement pour tester le pipeline
avec des données simulées représentatives de la commune de Fquih Ben Salah.

Usage:
------
    python demo.py                    # Avec données simulées
    python demo.py --db budget.db     # Avec base SQLite
    python demo.py --csv data.csv     # Avec fichier CSV

Auteur: Mlle. Zouini Dounia
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, Optional

# Ajouter le répertoire courant au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def create_demo_data() -> tuple:
    """
    Crée des données de démonstration réalistes.

    _Retourne:
    ---------
    Tuple : (df, X_train, y_train, years_train, X_pred)
    """
    # Données historiques Fquih Ben Salah (2021-2025)
    years = np.array([2021, 2022, 2023, 2024, 2025], dtype=float)
    recettes = np.array([
        123_353_679,  # 2021
        143_356_486,  # 2022
        141_497_575,  # 2023
        140_916_499,  # 2024
        161_273_528   # 2025
    ], dtype=float)

    # DataFrame complet
    df = pd.DataFrame({
        "annee": years,
        "total": recettes,
        "est_previsionnel": 0
    })

    # Normalisation des années
    annee_min = years.min()
    X_train = (years - annee_min).reshape(-1, 1)

    return df, X_train, recettes, years, annee_min


def run_demo():
    """Exécute la démonstration du pipeline."""
    print("=" * 70)
    print("  DÉMONSTRATION - PIPELINE DE PRÉVISION BUDGÉTAIRE")
    print("  Commune de Fquih Ben Salah")
    print("=" * 70)

    # Créer les données de démo
    df, X_train, y_train, years_train, annee_min = create_demo_data()

    print("\n  DONNÉES HISTORIQUES:")
    print("  ┌" + "─" * 60 + "┐")
    for _, row in df.iterrows():
        bar = "█" * int(row["total"] / 8_000_000)
        print(f"  │  {int(row['annee'])}  {row['total']:>15,.0f} MAD  {bar:<20}   │")
    print("  └" + "─" * 60 + "┘")

    # Importer les modules
    try:
        from config import AppConfig
        from metrics import calc_metriques, score_global, MetricsResult
        from models import (
            LinearRegressionForecaster,
            PolynomialRegressionForecaster,
            RidgeForecaster,
            BayesianRidgeForecaster,
            CAGRForecaster,
            WeightedAverageForecaster
        )
        from ensemble import EnsembleForecaster, EnsembleConfig
    except ImportError as e:
        print(f"\n❌ Erreur d'import: {e}")
        print("   Exécutez ce script depuis le répertoire python.models/")
        return

    # Configuration
    config = AppConfig(
        commune_name="Fquih Ben Salah",
        target_year=2026
    )

    # Année cible
    annee_cible = 2026
    X_pred = np.array([[annee_cible - annee_min]])

    print(f"\n  PRÉVISION POUR {annee_cible}:")

    # Entraîner et tester plusieurs modèles
    models_to_test = [
        ("Linéaire", LinearRegressionForecaster()),
        ("Polynomial", PolynomialRegressionForecaster({"degree": 2})),
        ("Ridge", RidgeForecaster({"alpha": 1.0})),
        ("Bayesian Ridge", BayesianRidgeForecaster()),
        ("CAGR", CAGRForecaster()),
        ("Moyenne Pondérée", WeightedAverageForecaster()),
    ]

    forecasts = {}
    all_metrics = {}
    all_results = []

    for name, model in models_to_test:
        try:
            # Entraîner
            model.fit(X_train, y_train)

            # Prévoir
            result = model.predict(X_pred)
            forecasts[name] = result.value

            # Valeurs ajustées
            fitted = model.get_fitted_values(X_train)

            # Métriques
            metrics = calc_metriques(y_train, fitted)
            all_metrics[name] = metrics.to_dict()

            # Score
            score = score_global(metrics)

            # Variation
            var_pct = (result.value / y_train[-1] - 1) * 100

            print(f"\n  {name}:")
            print(f"    Prévision: {result.value:>15,.0f} MAD ({var_pct:>+6.1f}%)")
            print(f"    {metrics.summary()}")
            print(f"    Score: {score:.1f}/100")

            all_results.append({
                "modèle": name,
                "prévision": result.value,
                "variation_%": var_pct,
                "MAPE_%": metrics.mape,
                "R2": metrics.r2,
                "score": score
            })

        except Exception as e:
            print(f"\n  {name}: ⚠️ Erreur - {e}")
            forecasts[name] = np.nan

    # Créer l'ensemble
    print("\n" + "=" * 70)
    print("  ENSEMBLE DE PRÉVISIONS")
    print("=" * 70)

    ensemble_config = EnsembleConfig(
        method="weighted_median",
        min_models=3,
        exclude_models=["Bayesian Ridge"]
    )

    ensemble = EnsembleForecaster(config=ensemble_config)
    ensemble.fit(forecasts, all_metrics, y_train)

    ensemble_value, ic_low, ic_high = ensemble.predict(forecasts, return_distribution=True)
    ensemble_var = (ensemble_value / y_train[-1] - 1) * 100

    print(f"\n  Ensemble (médiane pondérée): {ensemble_value:,.0f} MAD ({ensemble_var:+.1f}%)")
    if ic_low and ic_high:
        print(f"  Intervalle 95%: [{ic_low:,.0f} - {ic_high:,.0f}] MAD")

    # Poids des modèles
    print("\n  Contribution des modèles:")
    weights = ensemble.get_weights()
    for name, weight in sorted(weights.items(), key=lambda x: x[1], reverse=True):
        print(f"    {name:<20}: {weight*100:>5.1f}%")

    # Résumé final
    print("\n" + "=" * 70)
    print("  RÉSUMÉ DES PRÉVISIONS 2026")
    print("=" * 70)

    valid_forecasts = [v for v in forecasts.values() if not np.isnan(v)]

    q25 = np.percentile(valid_forecasts, 25)
    q75 = np.percentile(valid_forecasts, 75)

    print(f"""
  ╔══════════════╦══════════════════╦════════════╗
  ║ Scénario     ║ Prévision        ║ Var vs 2025║
  ╠══════════════╬══════════════════╬════════════╣
  ║ Pessimiste   ║ {q25:>16,.0f} ║ {(q25/y_train[-1]-1)*100:>+10.1f}% ║
  ║ Central      ║ {ensemble_value:>16,.0f} ║ {ensemble_var:>+10.1f}% ║
  ║ Optimiste    ║ {q75:>16,.0f} ║ {(q75/y_train[-1]-1)*100:>+10.1f}% ║
  ╚══════════════╩══════════════════╩════════════╝
  """)

    # DataFrame des résultats
    df_results = pd.DataFrame(all_results)
    df_results = df_results.sort_values("score", ascending=False)

    print("  CLASSEMENT DES MODÈLES:")
    print(df_results[["modèle", "prévision", "MAPE_%", "R2", "score"]].to_string(index=False))

    return {
        "ensemble": ensemble_value,
        "ic_low": ic_low,
        "ic_high": ic_high,
        "forecasts": forecasts,
        "metrics": all_metrics
    }


def save_demo_output(results: Dict, output_dir: str = "output"):
    """Sauvegarde les résultats de la démo."""
    os.makedirs(output_dir, exist_ok=True)

    # Metadata JSON
    metadata = {
        "projet": "BI Recettes Budgétaires — Commune de Fquih Ben Salah",
        "auteur": "Mlle. Zouini Dounia",
        "phase": 6,
        "date_generation": pd.Timestamp.now().isoformat(),
        "annee_cible": 2026,
        "historique": {
            2021: 123353679,
            2022: 143356486,
            2023: 141497575,
            2024: 140916499,
            2025: 161273528
        },
        "synthese": {
            "mediane": results["ensemble"],
            "ic_95_bas": results.get("ic_low"),
            "ic_95_haut": results.get("ic_high"),
            "variation_vs_2025_pct": round(
                (results["ensemble"] / 161273528 - 1) * 100, 2
            )
        },
        "modeles": results["forecasts"]
    }

    metadata_path = os.path.join(output_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Résultats sauvegardés dans {output_dir}/metadata.json")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Pipeline de prévision budgétaire")
    parser.add_argument("--db", type=str, help="Chemin vers la base SQLite")
    parser.add_argument("--csv", type=str, help="Chemin vers le fichier CSV")
    parser.add_argument("--output", type=str, default="output", help="Répertoire de sortie")

    args = parser.parse_args()

    # Exécuter la démo
    results = run_demo()

    # Sauvegarder
    if results:
        save_demo_output(results, args.output)

    print("\n✓ Démonstration terminée avec succès")
