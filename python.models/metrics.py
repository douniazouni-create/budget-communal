# -*- coding: utf-8 -*-
"""
Module de calcul des métriques pour l'évaluation des modèles de prévision.

Ce module implémente les 6 métriques standards utilisées en prévision budgétaire:
- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- MAPE (Mean Absolute Percentage Error)
- R² (Coefficient de détermination)
- MASE (Mean Absolute Scaled Error)
- SMAPE (Symmetric MAPE)

Auteur: Mlle. Zouini Dounia
Référence: Hyndman & Koehler (2006) pour MASE
"""

import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    mean_absolute_percentage_error,
    r2_score
)
import warnings

warnings.filterwarnings("ignore")


@dataclass
class MetricsResult:
    """Résultat des métriques pour un modèle."""
    mae: float
    rmse: float
    mape: float  # en pourcentage
    r2: float
    mase: float
    smape: float  # en pourcentage

    # Métriques additionnelles
    me: float = 0.0  # Mean Error (biais)
    max_error: float = 0.0
    coverage_95: Optional[float] = None  # Taux de couverture IC 95%

    def to_dict(self) -> Dict[str, float]:
        """Convertit en dictionnaire pour sérialisation."""
        return {
            "MAE": round(self.mae, 2),
            "RMSE": round(self.rmse, 2),
            "MAPE": round(self.mape, 4),
            "R2": round(self.r2, 4),
            "MASE": round(self.mase, 4),
            "SMAPE": round(self.smape, 4),
            "ME": round(self.me, 4),
            "MaxError": round(self.max_error, 2)
        }

    def summary(self) -> str:
        """Retourne un résumé textuel des métriques."""
        return (
            f"MAE={self.mae/1e6:.2f}M MAD | "
            f"RMSE={self.rmse/1e6:.2f}M | "
            f"MAPE={self.mape:.2f}% | "
            f"R²={self.r2:.3f} | "
            f"MASE={self.mase:.3f}"
        )


def safe_array(arr: np.ndarray) -> np.ndarray:
    """Convertit en tableau numpy float et gère les NaN."""
    return np.asarray(arr, dtype=float).flatten()


def remove_nan_pairs(y_true: np.ndarray, y_pred: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Supprime les paires contenant des NaN."""
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    return y_true[mask], y_pred[mask]


def calc_metriques(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_train: Optional[np.ndarray] = None,
    label: str = ""
) -> MetricsResult:
    """
    Calcule les métriques standards pour évaluer une prévision.

   _Paramètres:
    -----------
    y_true : array-like
        Valeurs réelles observées
    y_pred : array-like
        Valeurs prédites par le modèle
    y_train : array-like, optional
        Données d'entraînement pour calculer le MASE (naive forecast)
    label : str
        Nom du modèle pour les logs

    _Retourne:
    ---------
    MetricsResult : objet contenant toutes les métriques

    _Métriques calculées:
    -------------------
    MAE   : Mean Absolute Error — erreur absolue moyenne en MAD
            → Interprétation directe : en moyenne le modèle se trompe de X MAD
            → Robuste aux outliers (contrairement au RMSE)

    RMSE  : Root Mean Squared Error — racine de l'erreur quadratique moyenne
            → Pénalise plus les grandes erreurs que le MAE
            → Même unité que la variable (MAD)

    MAPE  : Mean Absolute Percentage Error — erreur en pourcentage
            → Indépendant de l'échelle
            → Standard en prévision budgétaire (< 10% = bon, < 5% = excellent)

    R²    : Coefficient de détermination
            → 1.0 = modèle parfait | 0.0 = modèle = moyenne | <0 = pire que moyenne
            → Mesure la proportion de variance expliquée

    MASE  : Mean Absolute Scaled Error (Hyndman & Koehler, 2006)
            → Normalise le MAE par l'erreur de référence (naïf pas-à-pas)
            → MASE < 1 : meilleur qu'un modèle naïf | > 1 : pire
            → Standard académique, insensible à l'échelle

    SMAPE : Symmetric MAPE — version symétrique du MAPE
            → Évite l'asymétrie du MAPE quand y_true est proche de 0
            → Plage [0%, 200%]

    ME    : Mean Error — erreur moyenne (biais)
            → Positif = sous-estimation | Négatif = surestimation
    """
    y_true = safe_array(y_true)
    y_pred = safe_array(y_pred)

    n = len(y_true)
    if n < 2:
        return MetricsResult(
            mae=np.nan, rmse=np.nan, mape=np.nan,
            r2=np.nan, mase=np.nan, smape=np.nan
        )

    # Supprimer les NaN
    y_true_clean, y_pred_clean = remove_nan_pairs(y_true, y_pred)
    if len(y_true_clean) < 2:
        return MetricsResult(
            mae=np.nan, rmse=np.nan, mape=np.nan,
            r2=np.nan, mase=np.nan, smape=np.nan
        )

    # Métriques de base
    mae = mean_absolute_error(y_true_clean, y_pred_clean)
    rmse = np.sqrt(mean_squared_error(y_true_clean, y_pred_clean))
    r2 = r2_score(y_true_clean, y_pred_clean)

    # MAPE avec gestion de division par zéro
    try:
        mape = mean_absolute_percentage_error(y_true_clean, y_pred_clean) * 100
    except Exception:
        # Calcul manuel si sklearn échoue
        with np.errstate(divide='ignore', invalid='ignore'):
            mape_vals = np.abs((y_true_clean - y_pred_clean) / y_true_clean) * 100
            mape_vals = mape_vals[np.isfinite(mape_vals)]
            mape = np.mean(mape_vals) if len(mape_vals) > 0 else np.nan

    # SMAPE (symmetric MAPE)
    denominator = (np.abs(y_true_clean) + np.abs(y_pred_clean))
    with np.errstate(divide='ignore', invalid='ignore'):
        smape_vals = 2 * np.abs(y_pred_clean - y_true_clean) / denominator * 100
        smape_vals = smape_vals[np.isfinite(smape_vals)]
        smape = np.mean(smape_vals) if len(smape_vals) > 0 else np.nan

    # MASE : erreur naïve = moyenne des |y[t] - y[t-1]|
    # Utiliser y_train si fourni, sinon y_true
    ref_series = y_train if y_train is not None and len(y_train) > 1 else y_true_clean
    if len(ref_series) > 1:
        naive_err = np.mean(np.abs(np.diff(ref_series)))
        mase = mae / naive_err if naive_err > 0 else np.nan
    else:
        mase = np.nan

    # Métriques additionnelles
    me = np.mean(y_pred_clean - y_true_clean)  # Biais
    max_err = np.max(np.abs(y_pred_clean - y_true_clean))

    return MetricsResult(
        mae=mae,
        rmse=rmse,
        mape=mape,
        r2=r2,
        mase=mase,
        smape=smape,
        me=me,
        max_error=max_err
    )


def score_global(metrics: MetricsResult, weights: Optional[Dict[str, float]] = None) -> float:
    """
    Calcule un score composite normalisé [0-100] pour classer les modèles.

    _Paramètres:
    -----------
    metrics : MetricsResult
        Objet contenant les métriques calculées
    weights : dict, optional
        Poids personnalisés pour chaque métrique
        Défaut: {"mape": 0.35, "smape": 0.20, "mase": 0.20, "r2": 0.15, "rmse": 0.10}

    _Retourne:
    ---------
    float : Score entre 0 (très mauvais) et 100 (parfait)

    _Formule:
    --------
    Le score combine les métriques normalisées:
    - MAPE : 0% → 100 pts | 20% → 0 pts (linéaire)
    - SMAPE : même logique
    - MASE : 0 → 100 pts | 2 → 0 pts
    - R² : directement en pourcentage
    - RMSE : normalisé par la moyenne des recettes
    """
    if weights is None:
        weights = {"mape": 0.35, "smape": 0.20, "mase": 0.20, "r2": 0.15, "rmse": 0.10}

    score = 0.0

    # MAPE : 0% → 100 pts | 20% → 0 pts
    if not np.isnan(metrics.mape):
        score += weights["mape"] * max(0, 100 - metrics.mape * 5)

    # SMAPE (même logique)
    if not np.isnan(metrics.smape):
        score += weights["smape"] * max(0, 100 - metrics.smape * 5)

    # MASE : 0 → 100 pts | 2 → 0 pts
    if not np.isnan(metrics.mase):
        score += weights["mase"] * max(0, 100 - metrics.mase * 50)

    # R² : directement en %
    if not np.isnan(metrics.r2):
        score += weights["r2"] * max(0, metrics.r2 * 100)

    # RMSE : normalisé (nécessite contexte externe)
    # Note: rmse_pct doit être calculé à l'extérieur
    score += weights["rmse"] * 0  # Placeholder, ajusté dans le module principal

    return round(score, 2)


def interpret_metrics(metrics: MetricsResult, thresholds: Optional[Dict] = None) -> str:
    """
    Génère une interprétation textuelle des métriques.

    _Paramètres:
    -----------
    metrics : MetricsResult
        Métriques à interpréter
    thresholds : dict
        Seuils d'interprétation (mape_excellent, mape_acceptable, mase_good)

    _Retourne:
    ---------
    str : Interprétation lisible des résultats
    """
    if thresholds is None:
        thresholds = {"mape_excellent": 5.0, "mape_acceptable": 10.0, "mase_good": 1.0}

    # Interprétation MAPE
    if metrics.mape < thresholds["mape_excellent"]:
        mape_qual = "🟢 Excellent (< 5%)"
    elif metrics.mape < thresholds["mape_acceptable"]:
        mape_qual = "🟡 Acceptable (5-10%)"
    else:
        mape_qual = "🔴 À améliorer (> 10%)"

    # Interprétation MASE
    if metrics.mase < 0.5:
        mase_qual = "bien meilleur qu'un modèle naïf"
    elif metrics.mase < thresholds["mase_good"]:
        mase_qual = "meilleur qu'un modèle naïf"
    else:
        mase_qual = "comparable ou pire qu'un modèle naïf ⚠️"

    # Interprétation R²
    if metrics.r2 > 0.9:
        r2_qual = "excellent ajustement"
    elif metrics.r2 > 0.7:
        r2_qual = "bon ajustement"
    elif metrics.r2 > 0.5:
        r2_qual = "ajustement moyen"
    else:
        r2_qual = "faible ajustement"

    # Interprétation du biais
    if abs(metrics.me) < metrics.mae * 0.1:
        bias_qual = "pas de biais significatif"
    elif metrics.me > 0:
        bias_qual = f"tendance à sous-estimer (biais +{metrics.me/1e6:.1f}M)"
    else:
        bias_qual = f"tendance à surestimer (biais {metrics.me/1e6:.1f}M)"

    return (
        f"MAPE: {mape_qual} | "
        f"MASE: {mase_qual} | "
        f"R²: {r2_qual} | "
        f"Biais: {bias_qual}"
    )


def compare_models(
    metrics_dict: Dict[str, MetricsResult],
    weights: Optional[Dict[str, float]] = None,
    y_mean: Optional[float] = None
) -> pd.DataFrame:
    """
    Compare tous les modèles et retourne un DataFrame classé.

    _Paramètres:
    -----------
    metrics_dict : dict
        Dictionnaire {nom_modèle: MetricsResult}
    weights : dict, optional
        Poids pour le score composite
    y_mean : float, optional
        Moyenne des recettes pour normaliser le RMSE

    _Retourne:
    ---------
    DataFrame avec classement, scores et interprétations
    """
    rows = []

    for name, metrics in metrics_dict.items():
        # Calcul du score avec RMSE normalisé
        score = score_global(metrics, weights)

        # Ajustement pour RMSE si y_mean fourni
        if y_mean is not None and not np.isnan(metrics.rmse):
            rmse_pct = (metrics.rmse / y_mean) * 100
            rmse_score = max(0, 100 - rmse_pct * 5)
            # Recalculer le score avec RMSE
            if weights is None:
                weights = {"mape": 0.35, "smape": 0.20, "mase": 0.20, "r2": 0.15, "rmse": 0.10}
            score = score_global(metrics, weights) + weights["rmse"] * rmse_score

        rows.append({
            "modèle": name,
            "MAE_MAD": metrics.mae,
            "RMSE_MAD": metrics.rmse,
            "MAPE_%": metrics.mape,
            "R2": metrics.r2,
            "MASE": metrics.mase,
            "SMAPE_%": metrics.smape,
            "ME_MAD": metrics.me,
            "score": score
        })

    df = pd.DataFrame(rows)
    df = df.sort_values("score", ascending=False).reset_index(drop=True)
    df["rang"] = df.index + 1

    return df[["rang", "modèle", "MAE_MAD", "RMSE_MAD", "MAPE_%", "R2", "MASE", "SMAPE_%", "score"]]


def confidence_interval_metrics(
    y_true: np.ndarray,
    y_pred_lower: np.ndarray,
    y_pred_upper: np.ndarray,
    y_pred: np.ndarray
) -> Dict[str, float]:
    """
    Évalue la qualité des intervalles de confiance.

    _Paramètres:
    -----------
    y_true : valeurs observées
    y_pred_lower : borne inférieure IC
    y_pred_upper : borne supérieure IC
    y_pred : prévision centrale

    _Retourne:
    ---------
    Dict avec coverage, width_mean, sharpness
    """
    y_true = safe_array(y_true)
    y_pred_lower = safe_array(y_pred_lower)
    y_pred_upper = safe_array(y_pred_upper)
    y_pred = safe_array(y_pred)

    # Taux de couverture (pourcentage de valeurs dans l'IC)
    in_interval = (y_true >= y_pred_lower) & (y_true <= y_pred_upper)
    coverage = np.mean(in_interval) * 100

    # Largeur moyenne de l'IC
    width = y_pred_upper - y_pred_lower
    width_mean = np.mean(width)

    # Sharpness (IC étroits = meilleure précision)
    sharpness = 1 / (width_mean / np.mean(y_true) + 1e-6)

    return {
        "coverage_%": round(coverage, 2),
        "width_mean_MAD": round(width_mean, 2),
        "sharpness": round(sharpness, 4)
    }
