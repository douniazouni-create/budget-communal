# -*- coding: utf-8 -*-
"""
Classes de base pour les modèles de prévision.

Ce module définit l'interface commune que tous les modèles doivent implémenter,
permettant une architecture modulaire et extensible.

Auteur: Mlle. Zouini Dounia
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple, Any, List
import numpy as np
import pandas as pd
import json
import os
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ForecastResult:
    """Résultat d'une prévision individuelle."""
    value: float
    lower_ci: Optional[float] = None
    upper_ci: Optional[float] = None
    std_error: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "value": round(self.value, 2),
            "lower_ci": round(self.lower_ci, 2) if self.lower_ci else None,
            "upper_ci": round(self.upper_ci, 2) if self.upper_ci else None,
            "std_error": round(self.std_error, 4) if self.std_error else None
        }


@dataclass
class ModelResult:
    """Résultat complet d'un modèle entraîné."""
    model_name: str
    forecast: ForecastResult
    fitted_values: np.ndarray
    metrics: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)
    file_paths: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "forecast": self.forecast.to_dict(),
            "metrics": {k: round(v, 4) if isinstance(v, float) else v
                       for k, v in self.metrics.items()},
            "metadata": self.metadata,
            "file_paths": self.file_paths
        }


class BaseForecaster(ABC):
    """
    Classe abstraite définissant l'interface commune pour tous les modèles.

    Chaque modèle doit implémenter:
    - fit(): entraînement du modèle
    - predict(): génération de prévisions
    - save(): sérialisation du modèle
    - load(): désérialisation du modèle
    """

    def __init__(self, name: str, config: Optional[Dict] = None):
        """
        Initialise le modèle.

        _Paramètres:
        -----------
        name : str
            Nom identifier du modèle
        config : dict, optional
            Paramètres de configuration spécifiques au modèle
        """
        self.name = name
        self.config = config or {}
        self.model = None
        self.is_fitted = False
        self._scaler_X = None
        self._scaler_y = None

    @abstractmethod
    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'BaseForecaster':
        """
        Entraîne le modèle sur les données fournies.

        _Paramètres:
        -----------
        X : np.ndarray
            Variables explicatives (shape: n_samples, n_features)
        y : np.ndarray
            Variable cible (shape: n_samples,)

        _Retourne:
        ---------
        self : instance du modèle entraîné
        """
        pass

    @abstractmethod
    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        """
        Génère des prévisions pour les entrées données.

        _Paramètres:
        -----------
        X : np.ndarray
            Variables explicatives pour la prévision
        return_ci : bool
            Si True, retourne également les intervalles de confiance

        _Retourne:
        ---------
        ForecastResult : prévision et intervalles si disponibles
        """
        pass

    @abstractmethod
    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        """
        Sauvegarde le modèle sur disque.

        _Paramètres:
        -----------
        directory : str
            Répertoire de destination
        basename : str, optional
            Préfixe pour les noms de fichiers

        _Retourne:
        ---------
        List[str] : Liste des chemins des fichiers créés
        """
        pass

    @classmethod
    @abstractmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'BaseForecaster':
        """
        Charge un modèle depuis le disque.

        _Paramètres:
        -----------
        directory : str
            Répertoire contenant les fichiers
        basename : str, optional
            Préfixe des noms de fichiers

        _Retourne:
        ---------
        BaseForecaster : instance du modèle chargé
        """
        pass

    def get_fitted_values(self, X: np.ndarray) -> np.ndarray:
        """
        Retourne les valeurs ajustées sur les données d'entraînement.

        _Paramètres:
        -----------
        X : np.ndarray
            Données d'entraînement

        _Retourne:
        ---------
        np.ndarray : Prédictions sur les données d'entraînement
        """
        return self.predict(X).value

    def get_params(self) -> Dict[str, Any]:
        """Retourne les paramètres du modèle."""
        return self.config.copy()

    def set_params(self, **params) -> 'BaseForecaster':
        """Met à jour les paramètres du modèle."""
        self.config.update(params)
        return self

    def validate_inputs(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """
        Valide et nettoie les données d'entrée.

        _Paramètres:
        -----------
        X : np.ndarray
            Variables explicatives
        y : np.ndarray, optional
            Variable cible

        _Retourne:
        ---------
        Tuple de tableaux validés
        """
        X = np.asarray(X, dtype=float)
        if X.ndim == 1:
            X = X.reshape(-1, 1)

        if y is not None:
            y = np.asarray(y, dtype=float).flatten()
            if len(X) != len(y):
                raise ValueError(f"X et y doivent avoir la même longueur: {len(X)} vs {len(y)}")

        return X, y

    def __repr__(self) -> str:
        status = "entraîné" if self.is_fitted else "non entraîné"
        return f"{self.__class__.__name__}(name='{self.name}', status='{status}')"


class SklearnForecaster(BaseForecaster):
    """
    Classe de base pour les modèles scikit-learn.
    Gère la sérialisation avec joblib.
    """

    def __init__(self, name: str, model_class: Any, config: Optional[Dict] = None):
        super().__init__(name, config)
        self.model_class = model_class
        self._model_instance = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'SklearnForecaster':
        """Entraîne le modèle scikit-learn."""
        X, y = self.validate_inputs(X, y)

        # Créer l'instance du modèle avec les paramètres
        model_params = {k: v for k, v in self.config.items()
                       if k in self._get_model_param_names()}
        self._model_instance = self.model_class(**model_params)
        self._model_instance.fit(X, y, **kwargs)
        self.is_fitted = True
        self.model = self._model_instance

        logger.info(f"{self.name} entraîné avec {len(y)} observations")
        return self

    def _get_model_param_names(self) -> List[str]:
        """Retourne les noms des paramètres valides du modèle."""
        if hasattr(self.model_class, 'get_params'):
            return list(self.model_class().get_params().keys())
        return []

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        """Prédit avec le modèle scikit-learn."""
        if not self.is_fitted:
            raise ValueError(f"Le modèle {self.name} n'est pas entraîné")

        X, _ = self.validate_inputs(X)
        value = float(self._model_instance.predict(X)[0])

        return ForecastResult(value=value)

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        """Sauvegarde avec joblib."""
        import joblib

        os.makedirs(directory, exist_ok=True)
        basename = basename or self.name.replace(" ", "_").lower()
        filepath = os.path.join(directory, f"{basename}.joblib")

        joblib.dump(self._model_instance, filepath)
        logger.info(f"Modèle sauvegardé: {filepath}")

        return [filepath]

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'SklearnForecaster':
        """Charge depuis joblib."""
        import joblib

        filepath = os.path.join(directory, f"{basename}.joblib")
        model_instance = joblib.load(filepath)

        instance = cls(name=basename, model_class=type(model_instance))
        instance._model_instance = model_instance
        instance.is_fitted = True

        return instance


class StatsmodelsForecaster(BaseForecaster):
    """
    Classe de base pour les modèles statsmodels.
    Gère la sérialisation avec pickle.
    """

    def __init__(self, name: str, config: Optional[Dict] = None):
        super().__init__(name, config)
        self._fit_result = None

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        """Sauvegarde avec pickle."""
        import pickle

        os.makedirs(directory, exist_ok=True)
        basename = basename or self.name.replace(" ", "_").lower()
        filepath = os.path.join(directory, f"{basename}.pkl")

        with open(filepath, 'wb') as f:
            pickle.dump(self._fit_result, f)

        logger.info(f"Modèle sauvegardé: {filepath}")
        return [filepath]

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'StatsmodelsForecaster':
        """Charge depuis pickle."""
        import pickle

        filepath = os.path.join(directory, f"{basename}.pkl")

        with open(filepath, 'rb') as f:
            fit_result = pickle.load(f)

        instance = cls(name=basename)
        instance._fit_result = fit_result
        instance.is_fitted = True

        return instance


class AnalyticForecaster(BaseForecaster):
    """
    Classe pour les modèles analytiques (sans fichier de modèle).
    Les paramètres sont stockés dans metadata.
    """

    def __init__(self, name: str, config: Optional[Dict] = None):
        super().__init__(name, config)
        self._params_calculated = {}

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        """Sauvegarde les paramètres calculés en JSON."""
        os.makedirs(directory, exist_ok=True)
        basename = basename or self.name.replace(" ", "_").lower()
        filepath = os.path.join(directory, f"{basename}_params.json")

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({
                "name": self.name,
                "params": self._params_calculated,
                "config": self.config
            }, f, indent=2, ensure_ascii=False)

        logger.info(f"Paramètres sauvegardés: {filepath}")
        return [filepath]

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'AnalyticForecaster':
        """Charge les paramètres depuis JSON."""
        filepath = os.path.join(directory, f"{basename}_params.json")

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        instance = cls(name=data["name"], config=data.get("config", {}))
        instance._params_calculated = data.get("params", {})
        instance.is_fitted = True

        return instance

    def get_params_calculated(self) -> Dict[str, Any]:
        """Retourne les paramètres calculés pendant l'entraînement."""
        return self._params_calculated.copy()
