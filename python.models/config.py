# -*- coding: utf-8 -*-
"""
Configuration centrale pour les modèles de prévision budgétaire.

Ce fichier contient tous les paramètres ajustables pour la modélisation,
permettant une personnalisation facile sans modifier le code source.

Auteur: Mlle. Zouini Dounia
Phase: 6 - Modélisation Prédictive
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import json


@dataclass
class ModelConfig:
    """Configuration d'un modèle individuel."""
    enabled: bool = True
    hyperparams: Dict = field(default_factory=dict)
    exclude_from_median: bool = False
    exclude_from_recommendation: bool = False


@dataclass
class ScoringWeights:
    """Poids pour le calcul du score composite."""
    mape: float = 0.35
    smape: float = 0.20
    mase: float = 0.20
    r2: float = 0.15
    rmse: float = 0.10


@dataclass
class AppConfig:
    """Configuration principale de l'application."""
    # Informations du projet
    project_name: str = "BI Recettes Budgétaires"
    commune_name: str = "Fquih Ben Salah"
    author: str = "Mlle. Zouini Dounia"
    phase: int = 6
    target_year: int = 2026

    # Chemins
    data_dir: str = "data_warehouse"
    models_dir: str = "models"
    output_dir: str = "data_warehouse"

    # Validation croisée
    cv_min_samples: int = 3
    cv_n_splits: int = 3  # TimeSeriesSplit splits

    # Scoring
    scoring_weights: ScoringWeights = field(default_factory=ScoringWeights)

    # Seuils d'interprétation
    mape_excellent_threshold: float = 5.0
    mape_acceptable_threshold: float = 10.0
    mase_good_threshold: float = 1.0

    # Modèles individuels
    models: Dict[str, ModelConfig] = field(default_factory=lambda: {
        "linear_regression": ModelConfig(
            enabled=True,
            hyperparams={}
        ),
        "polynomial_regression": ModelConfig(
            enabled=True,
            hyperparams={"degree": 2}
        ),
        "ridge_regression": ModelConfig(
            enabled=True,
            hyperparams={"alpha": 1.0}
        ),
        "bayesian_ridge": ModelConfig(
            enabled=True,
            hyperparams={},
            exclude_from_median=True,
            exclude_from_recommendation=True
        ),
        "prophet": ModelConfig(
            enabled=True,
            hyperparams={
                "yearly_seasonality": False,
                "weekly_seasonality": False,
                "daily_seasonality": False,
                "interval_width": 0.95,
                "changepoint_prior_scale": 0.05
            }
        ),
        "holt": ModelConfig(
            enabled=True,
            hyperparams={
                "initialization_method": "estimated",
                "optimized": True,
                "remove_bias": True
            }
        ),
        "arima": ModelConfig(
            enabled=True,
            hyperparams={
                "max_p": 3,
                "max_d": 2,
                "max_q": 2,
                "information_criterion": "aic"
            }
        ),
        "cagr": ModelConfig(
            enabled=True,
            hyperparams={}
        ),
        "moyenne_ponderee": ModelConfig(
            enabled=True,
            hyperparams={"exp_range": (0, 2)}
        ),
        "svr": ModelConfig(
            enabled=True,
            hyperparams={
                "kernel": "rbf",
                "C": 100,
                "gamma": 0.1,
                "epsilon": 0.01
            },
            exclude_from_recommendation=True  # Sur-ajustement potentiel avec n=5
        ),
        "lstm": ModelConfig(
            enabled=True,
            hyperparams={
                "seq_length": 4,
                "lstm_units_1": 64,
                "lstm_units_2": 32,
                "dense_units": 16,
                "dropout": 0.1,
                "learning_rate": 0.01,
                "epochs": 500,
                "batch_size": 1,
                "early_stopping_patience": 50
            }
        ),
        "theta": ModelConfig(
            enabled=True,
            hyperparams={
                "alpha_ses": 0.8,
                "theta_weights": (0.5, 0.5)  # (theta0, theta2)
            }
        )
    })

    def to_dict(self) -> dict:
        """Convertit la configuration en dictionnaire pour sérialisation."""
        return {
            "project_name": self.project_name,
            "commune_name": self.commune_name,
            "author": self.author,
            "phase": self.phase,
            "target_year": self.target_year,
            "scoring_weights": {
                "mape": self.scoring_weights.mape,
                "smape": self.scoring_weights.smape,
                "mase": self.scoring_weights.mase,
                "r2": self.scoring_weights.r2,
                "rmse": self.scoring_weights.rmse
            },
            "thresholds": {
                "mape_excellent": self.mape_excellent_threshold,
                "mape_acceptable": self.mape_acceptable_threshold,
                "mase_good": self.mase_good_threshold
            }
        }

    def save(self, filepath: str):
        """Sauvegarde la configuration en JSON."""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)

    @classmethod
    def load(cls, filepath: str) -> 'AppConfig':
        """Charge une configuration depuis un fichier JSON."""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        config = cls()
        config.project_name = data.get("project_name", config.project_name)
        config.commune_name = data.get("commune_name", config.commune_name)
        config.author = data.get("author", config.author)
        config.phase = data.get("phase", config.phase)
        config.target_year = data.get("target_year", config.target_year)

        if "scoring_weights" in data:
            sw = data["scoring_weights"]
            config.scoring_weights = ScoringWeights(
                mape=sw.get("mape", 0.35),
                smape=sw.get("smape", 0.20),
                mase=sw.get("mase", 0.20),
                r2=sw.get("r2", 0.15),
                rmse=sw.get("rmse", 0.10)
            )

        if "thresholds" in data:
            th = data["thresholds"]
            config.mape_excellent_threshold = th.get("mape_excellent", 5.0)
            config.mape_acceptable_threshold = th.get("mape_acceptable", 10.0)
            config.mase_good_threshold = th.get("mase_good", 1.0)

        return config


# Configuration par défaut
DEFAULT_CONFIG = AppConfig()
