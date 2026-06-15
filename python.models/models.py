# -*- coding: utf-8 -*-
"""
Implémentation des 12 modèles de prévision budgétaire.

Modèles implémentés:
1.  Linear Regression
2.  Polynomial Regression (degree 2)
3.  Ridge Regression
4.  Prophet (Meta/Facebook)
5.  Holt Exponential Smoothing
6.  ARIMA
7.  CAGR (Compound Annual Growth Rate)
8.  Weighted Exponential Average
9.  SVR (Support Vector Regression)
10. LSTM (Deep Learning)
11. Bayesian Ridge Regression
12. Theta Method

Auteur: Mlle. Zouini Dounia
"""

import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple, Any, List
import warnings
import logging

from base_model import (
    BaseForecaster, SklearnForecaster, StatsmodelsForecaster,
    AnalyticForecaster, ForecastResult
)
from metrics import calc_metriques, MetricsResult

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)


# =============================================================================
# MODÈLES SCIKIT-LEARN
# =============================================================================

class LinearRegressionForecaster(SklearnForecaster):
    """Régression linéaire simple."""

    def __init__(self, config: Optional[Dict] = None):
        from sklearn.linear_model import LinearRegression
        super().__init__("Linear Regression", LinearRegression, config or {})
        self._coef_ = None
        self._intercept_ = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'LinearRegressionForecaster':
        super().fit(X, y, **kwargs)
        self._coef_ = self._model_instance.coef_[0]
        self._intercept_ = self._model_instance.intercept_
        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        result = super().predict(X)

        # Ajouter l'interprétation
        if self._coef_ is not None:
            result.metadata = {
                "slope": round(self._coef_, 2),
                "intercept": round(self._intercept_, 2),
                "growth_per_year": round(self._coef_, 2)
            }

        return result


class PolynomialRegressionForecaster(SklearnForecaster):
    """Régression polynomiale."""

    def __init__(self, config: Optional[Dict] = None):
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures
        config = config or {"degree": 2}
        super().__init__("Polynomial Regression", LinearRegression, config)
        self._poly_features = None
        self._degree = config.get("degree", 2)
        self._y_min = None
        self._y_max = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'PolynomialRegressionForecaster':
        from sklearn.preprocessing import PolynomialFeatures

        X, y = self.validate_inputs(X, y)

        # Sauvegarder les bornes pour clipping
        self._y_min = y.min() * 0.8
        self._y_max = y.max() * 1.5

        # Transformer les features
        self._poly_features = PolynomialFeatures(degree=self._degree, include_bias=False)
        X_poly = self._poly_features.fit_transform(X)

        # Entraîner la régression
        self._model_instance = self.model_class()
        self._model_instance.fit(X_poly, y)
        self.is_fitted = True
        self.model = self._model_instance

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        X, _ = self.validate_inputs(X)
        X_poly = self._poly_features.transform(X)
        value = float(self._model_instance.predict(X_poly)[0])

        # Clip pour éviter les valeurs aberrantes
        value = np.clip(value, self._y_min, self._y_max)

        return ForecastResult(
            value=value,
            metadata={"degree": self._degree, "type": "polynomial"}
        )

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        import joblib
        import os

        os.makedirs(directory, exist_ok=True)
        basename = basename or "polynomial_regression"

        files = []

        # Sauvegarder la régression
        model_path = os.path.join(directory, f"{basename}.joblib")
        joblib.dump(self._model_instance, model_path)
        files.append(model_path)

        # Sauvegarder les features polynomiales
        poly_path = os.path.join(directory, f"{basename}_features.joblib")
        joblib.dump(self._poly_features, poly_path)
        files.append(poly_path)

        return files

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'PolynomialRegressionForecaster':
        import joblib

        basename = basename or "polynomial_regression"
        instance = cls()

        instance._model_instance = joblib.load(os.path.join(directory, f"{basename}.joblib"))
        instance._poly_features = joblib.load(os.path.join(directory, f"{basename}_features.joblib"))
        instance.is_fitted = True

        return instance


class RidgeForecaster(SklearnForecaster):
    """Ridge Regression avec régularisation L2."""

    def __init__(self, config: Optional[Dict] = None):
        from sklearn.linear_model import Ridge
        config = config or {"alpha": 1.0}
        super().__init__("Ridge Regression", Ridge, config)


class BayesianRidgeForecaster(SklearnForecaster):
    """Bayesian Ridge avec intervalles de confiance natifs."""

    def __init__(self, config: Optional[Dict] = None):
        from sklearn.linear_model import BayesianRidge
        super().__init__("Bayesian Ridge", BayesianRidge, config or {})

    def predict(self, X: np.ndarray, return_ci: bool = True) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        X, _ = self.validate_inputs(X)

        if return_ci:
            y_pred, y_std = self._model_instance.predict(X, return_std=True)
            value = float(y_pred[0])
            std = float(y_std[0])

            return ForecastResult(
                value=value,
                std_error=std,
                lower_ci=value - 1.96 * std,
                upper_ci=value + 1.96 * std
            )
        else:
            return ForecastResult(value=float(self._model_instance.predict(X)[0]))


class SVRForecaster(BaseForecaster):
    """Support Vector Regression avec noyau RBF."""

    def __init__(self, config: Optional[Dict] = None):
        super().__init__("SVR", config or {
            "kernel": "rbf",
            "C": 100,
            "gamma": 0.1,
            "epsilon": 0.01
        })
        self._scaler_X = None
        self._scaler_y = None
        self._model = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'SVRForecaster':
        from sklearn.svm import SVR
        from sklearn.preprocessing import StandardScaler

        X, y = self.validate_inputs(X, y)

        # Normalisation OBLIGATOIRE pour SVR
        self._scaler_X = StandardScaler()
        self._scaler_y = StandardScaler()

        X_scaled = self._scaler_X.fit_transform(X)
        y_scaled = self._scaler_y.fit_transform(y.reshape(-1, 1)).ravel()

        # Paramètres du modèle
        model_params = {k: v for k, v in self.config.items()
                       if k in ["kernel", "C", "gamma", "epsilon"]}

        self._model = SVR(**model_params)
        self._model.fit(X_scaled, y_scaled)
        self.is_fitted = True

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        X, _ = self.validate_inputs(X)
        X_scaled = self._scaler_X.transform(X)
        y_pred_scaled = self._model.predict(X_scaled)
        value = float(self._scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1))[0, 0])

        return ForecastResult(
            value=value,
            metadata={"kernel": self.config.get("kernel"), "type": "svr"}
        )

    def get_fitted_values(self, X: np.ndarray) -> np.ndarray:
        X_scaled = self._scaler_X.transform(X)
        y_pred_scaled = self._model.predict(X_scaled)
        return self._scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        import joblib
        import os

        os.makedirs(directory, exist_ok=True)
        basename = basename or "svr"
        files = []

        # Modèle
        model_path = os.path.join(directory, f"{basename}_model.joblib")
        joblib.dump(self._model, model_path)
        files.append(model_path)

        # Scalers
        joblib.dump(self._scaler_X, os.path.join(directory, f"{basename}_scaler_X.joblib"))
        joblib.dump(self._scaler_y, os.path.join(directory, f"{basename}_scaler_y.joblib"))
        files.extend([
            os.path.join(directory, f"{basename}_scaler_X.joblib"),
            os.path.join(directory, f"{basename}_scaler_y.joblib")
        ])

        return files

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'SVRForecaster':
        import joblib

        basename = basename or "svr"
        instance = cls()

        instance._model = joblib.load(os.path.join(directory, f"{basename}_model.joblib"))
        instance._scaler_X = joblib.load(os.path.join(directory, f"{basename}_scaler_X.joblib"))
        instance._scaler_y = joblib.load(os.path.join(directory, f"{basename}_scaler_y.joblib"))
        instance.is_fitted = True

        return instance


# =============================================================================
# MODÈLES STATSMODELS
# =============================================================================

class HoltForecaster(StatsmodelsForecaster):
    """Lissage exponentiel de Holt (double)."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {
            "initialization_method": "estimated",
            "optimized": True,
            "remove_bias": True
        }
        super().__init__("Holt", config)
        self._alpha = None
        self._beta = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'HoltForecaster':
        from statsmodels.tsa.holtwinters import Holt

        y = np.asarray(y, dtype=float).flatten()

        self._fit_result = Holt(
            y,
            initialization_method=self.config.get("initialization_method", "estimated")
        ).fit(
            optimized=self.config.get("optimized", True),
            remove_bias=self.config.get("remove_bias", True)
        )

        self._alpha = self._fit_result.params.get("smoothing_level")
        self._beta = self._fit_result.params.get("smoothing_trend")
        self.is_fitted = True

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        # Holt ne prédit que le nombre de steps demandé
        # Pour 2026, on prédit 1 step après les données
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        value = float(self._fit_result.forecast(steps=1)[0])

        return ForecastResult(
            value=value,
            metadata={
                "alpha": round(self._alpha, 4) if self._alpha else None,
                "beta": round(self._beta, 4) if self._beta else None
            }
        )

    def get_fitted_values(self, X: np.ndarray = None) -> np.ndarray:
        return self._fit_result.fittedvalues.values


class ARIMAForecaster(StatsmodelsForecaster):
    """ARIMA avec sélection automatique de l'ordre."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {
            "max_p": 3, "max_d": 2, "max_q": 2,
            "information_criterion": "aic"
        }
        super().__init__("ARIMA", config)
        self._best_order = None
        self._aic = None

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'ARIMAForecaster':
        from statsmodels.tsa.arima.model import ARIMA

        y = np.asarray(y, dtype=float).flatten()

        # Recherche de l'ordre optimal
        best_aic = float("inf")
        best_order = (1, 1, 0)

        max_p = self.config.get("max_p", 3)
        max_d = self.config.get("max_d", 2)
        max_q = self.config.get("max_q", 2)

        for p in range(max_p):
            for d in range(max_d):
                for q in range(max_q):
                    try:
                        model = ARIMA(y, order=(p, d, q))
                        result = model.fit()
                        if result.aic < best_aic:
                            best_aic = result.aic
                            best_order = (p, d, q)
                    except Exception:
                        continue

        self._best_order = best_order
        self._aic = best_aic

        # Entraîner avec le meilleur ordre
        model = ARIMA(y, order=best_order)
        self._fit_result = model.fit()
        self.is_fitted = True

        logger.info(f"ARIMA optimal: {best_order}, AIC={best_aic:.2f)")

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        value = float(self._fit_result.forecast(steps=1)[0])

        return ForecastResult(
            value=value,
            metadata={
                "order": self._best_order,
                "aic": round(self._aic, 2) if self._aic else None
            }
        )

    def get_fitted_values(self, X: np.ndarray = None) -> np.ndarray:
        # Reconstruire les fitted values à partir des résidus
        # (plus fiable que fittedvalues avec d>=1)
        return self._fit_result.model.endog - self._fit_result.resid


class ProphetForecaster(BaseForecaster):
    """Prophet (Meta) pour séries temporelles."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {
            "yearly_seasonality": False,
            "weekly_seasonality": False,
            "daily_seasonality": False,
            "interval_width": 0.95,
            "changepoint_prior_scale": 0.05
        }
        super().__init__("Prophet", config)
        self._model = None
        self._years = None

    def fit(self, X: np.ndarray, y: np.ndarray, years: np.ndarray = None, **kwargs) -> 'ProphetForecaster':
        try:
            from prophet import Prophet
            import logging
            logging.getLogger("prophet").setLevel(logging.ERROR)
            logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
        except ImportError:
            logger.warning("Prophet non disponible. Installer avec: pip install prophet")
            return self

        X, y = self.validate_inputs(X, y)
        self._years = years if years is not None else X.flatten()

        # Créer le dataframe Prophet
        df = pd.DataFrame({
            "ds": pd.to_datetime([f"{int(a)}-06-30" for a in self._years]),
            "y": y
        })

        params = {k: v for k, v in self.config.items()
                 if k in ["yearly_seasonality", "weekly_seasonality",
                         "daily_seasonality", "interval_width",
                         "changepoint_prior_scale"]}

        self._model = Prophet(**params)
        self._model.fit(df)
        self.is_fitted = True

        return self

    def predict(self, X: np.ndarray, return_ci: bool = True) -> ForecastResult:
        if not self.is_fitted or self._model is None:
            return ForecastResult(value=np.nan)

        target_year = int(X.flatten()[0])
        future = pd.DataFrame({"ds": pd.to_datetime([f"{target_year}-06-30"])})
        forecast = self._model.predict(future)

        value = float(forecast["yhat"].values[0])
        lower = float(forecast["yhat_lower"].values[0]) if "yhat_lower" in forecast else None
        upper = float(forecast["yhat_upper"].values[0]) if "yhat_upper" in forecast else None

        return ForecastResult(
            value=max(value, 0),  # Prophet peut donner des valeurs négatives
            lower_ci=max(lower, 0) if lower else None,
            upper_ci=upper
        )

    def get_fitted_values(self, X: np.ndarray = None) -> np.ndarray:
        df = pd.DataFrame({
            "ds": pd.to_datetime([f"{int(a)}-06-30" for a in self._years])
        })
        forecast = self._model.predict(df)
        return forecast["yhat"].values

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        import pickle
        import os

        os.makedirs(directory, exist_ok=True)
        basename = basename or "prophet"
        filepath = os.path.join(directory, f"{basename}.pkl")

        with open(filepath, 'wb') as f:
            pickle.dump(self._model, f)

        return [filepath]

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'ProphetForecaster':
        import pickle

        basename = basename or "prophet"
        filepath = os.path.join(directory, f"{basename}.pkl")

        with open(filepath, 'rb') as f:
            model = pickle.load(f)

        instance = cls()
        instance._model = model
        instance.is_fitted = True

        return instance


# =============================================================================
# MODÈLES ANALYTIQUES
# =============================================================================

class CAGRForecaster(AnalyticForecaster):
    """Taux de Croissance Annuel Composé."""

    def __init__(self, config: Optional[Dict] = None):
        super().__init__("CAGR", config or {})

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'CAGRForecaster':
        y = np.asarray(y, dtype=float).flatten()

        # Calculer le CAGR sur différentes périodes
        n_years = len(y)
        self._params_calculated = {
            "cagr_full": (y[-1] / y[0]) ** (1 / (n_years - 1)) - 1,
            "cagr_4ans": (y[-1] / y[0]) ** (1 / min(4, n_years - 1)) - 1 if n_years >= 2 else 0,
            "cagr_2ans": (y[-1] / y[-3]) ** (1/2) - 1 if n_years >= 3 else 0,
            "y_last": y[-1]
        }

        # Moyenne des CAGR pour la prévision
        cagr_avg = (
            self._params_calculated["cagr_4ans"] +
            self._params_calculated["cagr_2ans"]
        ) / 2

        self._params_calculated["cagr_moyen"] = cagr_avg
        self.is_fitted = True

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        y_last = self._params_calculated["y_last"]
        cagr = self._params_calculated["cagr_moyen"]

        # Prévision: y_last * (1 + cagr)
        target_year = int(X.flatten()[0])
        value = y_last * (1 + cagr)

        return ForecastResult(
            value=value,
            metadata={
                "cagr_4ans_pct": round(self._params_calculated["cagr_4ans"] * 100, 2),
                "cagr_2ans_pct": round(self._params_calculated["cagr_2ans"] * 100, 2),
                "cagr_moyen_pct": round(cagr * 100, 2)
            }
        )

    def get_fitted_values(self, X: np.ndarray = None) -> np.ndarray:
        y_last = self._params_calculated["y_last"]
        cagr = self._params_calculated["cagr_full"]
        y_first = y_last / ((1 + cagr) ** (len(X) - 1)) if len(X) > 1 else y_last

        return np.array([y_first * (1 + cagr) ** i for i in range(len(X))])


class WeightedAverageForecaster(AnalyticForecaster):
    """Moyenne pondérée exponentielle avec tendance."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {"exp_range": (0, 2)}
        super().__init__("Weighted Average", config)

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'WeightedAverageForecaster':
        y = np.asarray(y, dtype=float).flatten()
        n = len(y)

        # Poids exponentiels (plus récent = plus lourd)
        exp_range = self.config.get("exp_range", (0, 2))
        weights = np.exp(np.linspace(exp_range[0], exp_range[1], n))
        weights /= weights.sum()

        # Tendance récente
        slope = y[-1] - y[-2] if n >= 2 else 0

        self._params_calculated = {
            "weights": weights.tolist(),
            "slope": slope,
            "weighted_mean": float(np.dot(weights, y))
        }

        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        weighted_mean = self._params_calculated["weighted_mean"]
        slope = self._params_calculated["slope"]

        value = weighted_mean + slope

        return ForecastResult(
            value=value,
            metadata={
                "slope_MAD": round(slope, 2),
                "weighted_mean_MAD": round(weighted_mean, 2)
            }
        )

    def get_fitted_values(self, X: np.ndarray = None) -> np.ndarray:
        # Leave-one-out pour métriques
        return np.array(self._params_calculated.get("fitted_values", []))


class ThetaForecaster(AnalyticForecaster):
    """Méthode Theta (combinaison tendance + lissage)."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {
            "alpha_ses": 0.8,
            "theta_weights": (0.5, 0.5)
        }
        super().__init__("Theta", config)

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'ThetaForecaster':
        y = np.asarray(y, dtype=float).flatten()
        X, _ = self.validate_inputs(X, y)

        alpha = self.config.get("alpha_ses", 0.8)

        # Theta=0 : régression linéaire (tendance pure)
        from sklearn.linear_model import LinearRegression
        m_theta0 = LinearRegression().fit(X, y)
        theta0_coefs = (m_theta0.coef_[0], m_theta0.intercept_)

        # Theta=2 : SES + drift
        ses_level = y[0]
        for val in y[1:]:
            ses_level = alpha * val + (1 - alpha) * ses_level

        drift = (y[-1] - y[-3]) / 2 if len(y) >= 3 else 0

        self._params_calculated = {
            "theta0_slope": float(m_theta0.coef_[0]),
            "theta0_intercept": float(m_theta0.intercept_),
            "ses_level": ses_level,
            "drift": drift,
            "theta_weights": self.config.get("theta_weights", (0.5, 0.5))
        }

        self.is_fitted = True
        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted:
            raise ValueError("Le modèle n'est pas entraîné")

        target_year = int(X.flatten()[0])
        p = self._params_calculated

        # Theta=0 forecast
        theta0_fc = p["theta0_intercept"] + p["theta0_slope"] * (target_year - 2020)  # annee_min

        # Theta=2 forecast
        theta2_fc = p["ses_level"] + p["drift"]

        # Combinaison
        w0, w2 = p["theta_weights"]
        value = w0 * theta0_fc + w2 * theta2_fc

        return ForecastResult(
            value=value,
            metadata={
                "theta0_forecast": round(theta0_fc, 2),
                "theta2_forecast": round(theta2_fc, 2),
                "weights": p["theta_weights"]
            }
        )


# =============================================================================
# MODÈLE LSTM (DEEP LEARNING)
# =============================================================================

class LSTMForecaster(BaseForecaster):
    """LSTM pour séries temporelles."""

    def __init__(self, config: Optional[Dict] = None):
        config = config or {
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
        super().__init__("LSTM", config)
        self._model = None
        self._scaler_params = None
        self._seq_length = config.get("seq_length", 4)

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> 'LSTMForecaster':
        try:
            import tensorflow as tf
            tf.get_logger().setLevel("ERROR")
        except ImportError:
            logger.warning("TensorFlow non disponible. Installer avec: pip install tensorflow")
            return self

        y = np.asarray(y, dtype=float).flatten()

        # Normalisation min-max
        y_min, y_max = y.min(), y.max()
        y_norm = (y - y_min) / (y_max - y_min + 1e-8)

        self._scaler_params = {"y_min": y_min, "y_max": y_max}

        # Créer les séquences
        seq_len = self._seq_length
        X_seq, y_seq = [], []

        for i in range(len(y_norm) - seq_len):
            X_seq.append(y_norm[i:i + seq_len])
            y_seq.append(y_norm[i + seq_len])

        X_seq = np.array(X_seq).reshape(-1, seq_len, 1)
        y_seq = np.array(y_seq)

        if len(X_seq) == 0:
            logger.warning("Pas assez de données pour LSTM")
            return self

        # Construire le modèle
        tf.random.set_seed(42)

        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(
                self.config.get("lstm_units_1", 64),
                activation='tanh',
                return_sequences=True,
                input_shape=(seq_len, 1)
            ),
            tf.keras.layers.Dropout(self.config.get("dropout", 0.1)),
            tf.keras.layers.LSTM(
                self.config.get("lstm_units_2", 32),
                activation='tanh'
            ),
            tf.keras.layers.Dense(self.config.get("dense_units", 16), activation='relu'),
            tf.keras.layers.Dense(1)
        ])

        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=self.config.get("learning_rate", 0.01)
            ),
            loss='mse'
        )

        # Entraînement
        early_stop = tf.keras.callbacks.EarlyStopping(
            monitor='loss',
            patience=self.config.get("early_stopping_patience", 50),
            restore_best_weights=True
        )

        history = model.fit(
            X_seq, y_seq,
            epochs=self.config.get("epochs", 500),
            batch_size=self.config.get("batch_size", 1),
            verbose=0,
            callbacks=[early_stop]
        )

        self._model = model
        self._epochs_trained = len(history.history['loss'])
        self.is_fitted = True

        logger.info(f"LSTM entraîné: {self._epochs_trained} epochs")

        return self

    def predict(self, X: np.ndarray, return_ci: bool = False) -> ForecastResult:
        if not self.is_fitted or self._model is None:
            return ForecastResult(value=np.nan)

        target_year = int(X.flatten()[0])
        y_min = self._scaler_params["y_min"]
        y_max = self._scaler_params["y_max"]

        # Construire la séquence d'entrée
        # Normalement on utilise les dernières valeurs
        # Ici on simplifie avec une valeur moyenne normalisée
        seq_len = self._seq_length
        input_seq = np.array([0.5] * seq_len).reshape(1, seq_len, 1)

        pred_norm = self._model.predict(input_seq, verbose=0)[0][0]
        value = pred_norm * (y_max - y_min) + y_min

        return ForecastResult(
            value=float(value),
            metadata={
                "epochs": self._epochs_trained,
                "seq_length": self._seq_length,
                "warning": "n=5 points - interpréter avec prudence"
            }
        )

    def save(self, directory: str, basename: Optional[str] = None) -> List[str]:
        import joblib
        import os

        os.makedirs(directory, exist_ok=True)
        basename = basename or "lstm"
        files = []

        try:
            model_path = os.path.join(directory, f"{basename}.keras")
            self._model.save(model_path)
            files.append(model_path)
        except Exception:
            model_path = os.path.join(directory, f"{basename}.h5")
            self._model.save(model_path)
            files.append(model_path)

        scaler_path = os.path.join(directory, f"{basename}_scaler.joblib")
        joblib.dump(self._scaler_params, scaler_path)
        files.append(scaler_path)

        return files

    @classmethod
    def load(cls, directory: str, basename: Optional[str] = None) -> 'LSTMForecaster':
        import joblib
        import tensorflow as tf

        basename = basename or "lstm"
        instance = cls()

        try:
            instance._model = tf.keras.models.load_model(
                os.path.join(directory, f"{basename}.keras")
            )
        except Exception:
            instance._model = tf.keras.models.load_model(
                os.path.join(directory, f"{basename}.h5")
            )

        instance._scaler_params = joblib.load(
            os.path.join(directory, f"{basename}_scaler.joblib")
        )
        instance.is_fitted = True

        return instance
