# Module de Prévision Budgétaire

Architecture modulaire et extensible pour la prévision des recettes communales marocaines.

## Structure du Package

```
python.models/
├── __init__.py          # Point d'entrée du package
├── config.py            # Configuration centralisée
├── metrics.py           # Calcul des métriques (MAE, RMSE, MAPE, R², MASE, SMAPE)
├── base_model.py        # Classes abstraites de base
├── models.py            # Implémentation des 12 modèles
├── ensemble.py          # Agrégation des prévisions
├── forecaster.py        # Orchestrateur principal
├── demo.py              # Script de démonstration
└── README.md            # Documentation
```

## Modèles Implémentés

| # | Modèle | Type | Intervalle de Confiance |
|---|--------|------|------------------------|
| 1 | Linear Regression | Sklearn | Non |
| 2 | Polynomial Regression | Sklearn | Non |
| 3 | Ridge Regression | Sklearn | Non |
| 4 | Prophet | Meta/Facebook | Oui (natif) |
| 5 | Holt Exponential Smoothing | Statsmodels | Non |
| 6 | ARIMA | Statsmodels | Non |
| 7 | CAGR | Analytique | Non |
| 8 | Weighted Exponential Average | Analytique | Non |
| 9 | SVR | Sklearn | Non |
| 10 | LSTM | Keras/TensorFlow | Non |
| 11 | Bayesian Ridge | Sklearn | Oui (natif) |
| 12 | Theta Method | Analytique | Non |

## Installation

```bash
# Dépendances minimales
pip install numpy pandas scikit-learn joblib

# Pour Prophet
pip install prophet

# Pour ARIMA et Holt
pip install statsmodels

# Pour LSTM
pip install tensorflow
```

## Utilisation Rapide

### Via le Pipeline Complet

```python
from forecaster import ForecastingPipeline
from config import AppConfig

config = AppConfig(
    commune_name="Fquih Ben Salah",
    target_year=2026
)

pipeline = ForecastingPipeline(config=config)
results = pipeline.run_full_pipeline(db_path="budget_dw.db")
```

### Via Script de Démonstration

```bash
cd python.models
python demo.py
```

### Utilisation Individuelle d'un Modèle

```python
from models import LinearRegressionForecaster
import numpy as np

# Données
years = np.array([2021, 2022, 2023, 2024, 2025])
recettes = np.array([123353679, 143356486, 141497575, 140916499, 161273528])

# Normalisation
X = (years - years.min()).reshape(-1, 1)
y = recettes

# Entraînement
model = LinearRegressionForecaster()
model.fit(X, y)

# Prévision 2026
X_2026 = np.array([[2026 - years.min()]])
forecast = model.predict(X_2026)
print(f"Prévision 2026: {forecast.value:,.0f} MAD")
```

## Métriques Disponibles

| Métrique | Description | Interprétation |
|----------|-------------|----------------|
| MAE | Mean Absolute Error | Erreur moyenne en MAD |
| RMSE | Root Mean Squared Error | Pénalise les grandes erreurs |
| MAPE | Mean Absolute Percentage Error | Erreur en % (< 5% = excellent) |
| R² | Coefficient of Determination | Variance expliquée (0-1) |
| MASE | Mean Absolute Scaled Error | Vs modèle naïf (< 1 = meilleur) |
| SMAPE | Symmetric MAPE | Plus stable que MAPE |

### Score Composite

Le score global combiné (0-100) est calculé avec les poids suivants:
- MAPE: 35%
- SMAPE: 20%
- MASE: 20%
- R²: 15%
- RMSE: 10%

## Validation Croisée

Le pipeline inclut une validation croisée temporelle (TimeSeriesSplit) pour évaluer la stabilité des modèles:

```python
pipeline = ForecastingPipeline(config)
pipeline.load_data()
pipeline.prepare_data()
cv_results = pipeline.cross_validate(n_splits=3)
```

## Ensemble de Prévisions

L'ensemble combine les prévisions de plusieurs modèles:

```python
from ensemble import EnsembleForecaster, EnsembleConfig

config = EnsembleConfig(
    method="weighted_median",  # median, mean, weighted_median
    min_models=3,
    exclude_models=["bayesian_ridge"]
)

ensemble = EnsembleForecaster(config)
ensemble.fit(forecasts, metrics, y_train)
value, low, high = ensemble.predict(forecasts, return_distribution=True)
```

## Configuration

Tous les paramètres sont centralisés dans `config.py`:

```python
from config import AppConfig, ModelConfig

config = AppConfig(
    target_year=2026,
    models={
        "linear_regression": ModelConfig(
            enabled=True,
            hyperparams={}
        ),
        "polynomial_regression": ModelConfig(
            enabled=True,
            hyperparams={"degree": 2}
        ),
        "svr": ModelConfig(
            enabled=True,
            hyperparams={"C": 100, "gamma": 0.1},
            exclude_from_recommendation=True  # Risque de sur-ajustement
        )
    }
)
```

## Export des Résultats

Le pipeline exporte automatiquement:
- `metriques_comparaison.csv` - Classement des modèles
- `previsions_2026.csv` - Toutes les prévisions
- `metadata.json` - Point d'entrée pour l'application web

## Architecture

```
┌─────────────────────┐
│   AppConfig         │  Configuration centrale
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ ForecastingPipeline │  Orchestrateur
└─────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────────┐
│ Models  │ │  Ensemble   │
│ (12)    │ │  Forecaster │
└─────────┘ └─────────────┘
     │
     ▼
┌─────────────────────┐
│ Metrics Calculator  │
└─────────────────────┘
     │
     ▼
┌─────────────────────┐
│ Export (CSV/JSON)   │
└─────────────────────┘
```

## Points d'Amélioration Futurs

1. **Hyperparameter Tuning**: Intégration Optuna pour optimisation automatique
2. **Model Versioning**: Suivi des versions de modèle avec MLflow
3. **Backtesting**: Évaluation sur plusieurs années glissantes
4. **Feature Engineering**: Ajout de variables exogènes (population, PIB)
5. **Model Monitoring**: Détection de drift avec Evidently

## Auteur

Mlle. Zouini Dounia
Phase 6 - Modélisation Prédictive
Commune de Fquih Ben Salah
