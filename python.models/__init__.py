# -*- coding: utf-8 -*-
"""
Modélisation Prédictive des Recettes Budgétaires.

Package Python pour la prévision des recettes communales marocaines.
Implémente 12 modèles de prévision avec métriques complètes.

Modules:
--------
- config: Configuration des modèles
- metrics: Calcul des métriques (MAE, RMSE, MAPE, R², MASE, SMAPE)
- base_model: Classes de base pour les modèles
- models: Implémentation des 12 modèles
- ensemble: Agrégation des prévisions
- forecaster: Orchestrateur principal

Auteur: Mlle. Zouini Dounia
Phase: 6 - Modélisation Prédictive
Version: 2.0
Date: 2026
"""

from config import AppConfig, DEFAULT_CONFIG, ModelConfig, ScoringWeights
from metrics import (
    calc_metriques,
    score_global,
    compare_models,
    interpret_metrics,
    MetricsResult
)
from base_model import (
    BaseForecaster,
    SklearnForecaster,
    StatsmodelsForecaster,
    AnalyticForecaster,
    ModelResult,
    ForecastResult
)
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
from ensemble import (
    EnsembleForecaster,
    StackingEnsemble,
    DynamicSelector,
    EnsembleConfig,
    create_default_ensemble_config
)
from forecaster import ForecastingPipeline


__all__ = [
    # Configuration
    "AppConfig",
    "DEFAULT_CONFIG",
    "ModelConfig",
    "ScoringWeights",

    # Métriques
    "calc_metriques",
    "score_global",
    "compare_models",
    "interpret_metrics",
    "MetricsResult",

    # Classes de base
    "BaseForecaster",
    "SklearnForecaster",
    "StatsmodelsForecaster",
    "AnalyticForecaster",
    "ModelResult",
    "ForecastResult",

    # Modèles
    "LinearRegressionForecaster",
    "PolynomialRegressionForecaster",
    "RidgeForecaster",
    "BayesianRidgeForecaster",
    "SVRForecaster",
    "HoltForecaster",
    "ARIMAForecaster",
    "ProphetForecaster",
    "CAGRForecaster",
    "WeightedAverageForecaster",
    "ThetaForecaster",
    "LSTMForecaster",

    # Ensemble
    "EnsembleForecaster",
    "StackingEnsemble",
    "DynamicSelector",
    "EnsembleConfig",
    "create_default_ensemble_config",

    # Pipeline
    "ForecastingPipeline",
]

__version__ = "2.0.0"
__author__ = "Mlle. Zouini Dounia"
