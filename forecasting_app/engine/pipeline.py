import pandas as pd
import math
import numpy as np

from forecasting_app.ml_models.naive import naive_forecast
from forecasting_app.ml_models.moving_average import moving_average_forecast
from forecasting_app.ml_models.arima import arima_forecast
from forecasting_app.ml_models.sarima import sarima_forecast
from forecasting_app.ml_models.xgboost import xgboost_forecast

def safe_float(x):
    if x is None:
        return 0.0
    if isinstance(x, float):
        if math.isnan(x) or math.isinf(x):
            return 0.0
    if isinstance(x, np.floating):
        if np.isnan(x) or np.isinf(x):
            return 0.0
    return float(x)

# METRICS
def mae(y_true, y_pred):
    y_true = pd.Series(y_true).astype(float)
    y_pred = pd.Series(y_pred).astype(float)
    return (y_true - y_pred).abs().mean()

def rmse(y_true, y_pred):
    y_true = pd.Series(y_true).astype(float)
    y_pred = pd.Series(y_pred).astype(float)
    return ((y_true - y_pred) ** 2).mean() ** 0.5

def smape(y_true, y_pred):
    y_true = pd.Series(y_true).astype(float)
    y_pred = pd.Series(y_pred).astype(float)

    numerator = (y_true - y_pred).abs()
    denominator = (y_true.abs() + y_pred.abs()).replace(0, np.nan)

    smape_val = (numerator / denominator).mean() * 100

    return smape_val if not np.isnan(smape_val) else 0.0

def weighted_score(mae_val, rmse_val, smape_val, model_name):

    # normalize (log scaling reduces dataset scale sensitivity)
    mae_n = np.log1p(mae_val)
    rmse_n = np.log1p(rmse_val)
    smape_n = smape_val / 100  # convert to 0–1 scale

    score = (
        0.4 * mae_n +
        0.3 * rmse_n +
        0.3 * smape_n
    )

    penalties = {
        "Naive": 1.08,
        "Moving Average": 1.03
    }

    return score * penalties.get(model_name, 1.0)

# MODEL WRAPPER
def evaluate_model(name, model_func, series, steps=5):

    series = series.dropna().astype(float)

    split_point = int(len(series) * 0.8)

    train = series.iloc[:split_point]
    test = series.iloc[split_point:]

    # FORCE minimum test size
    if len(test) < 2:
        test = series.iloc[-5:]

    predictions = model_func(train, steps=len(test))

    # FORCE equal length
    min_len = min(len(test), len(predictions))

    test = test.iloc[:min_len].values
    predictions = np.array(predictions[:min_len])

    # sanity check (IMPORTANT)
    if len(test) == 0 or len(predictions) == 0:
        return {
            "model": name,
            "error": "empty evaluation set"
        }

    metrics = {
        "MAE": safe_float(mae(test, predictions)),
        "RMSE": safe_float(rmse(test, predictions)),
        "SMAPE": safe_float(smape(test, predictions))
    }

    return {
        "model": name,
        "metrics": metrics,
        "score": weighted_score(
            metrics["MAE"],
            metrics["RMSE"],
            metrics["SMAPE"],
            name
        ),
        "predictions": predictions.tolist()
    }

# MAIN PIPELINE
def run_pipeline(series, steps=5):

    results = {}

    models = {
        "Naive": naive_forecast,
        "Moving Average": moving_average_forecast,
        "ARIMA": arima_forecast,
        "SARIMA": sarima_forecast,
        "XGBoost": xgboost_forecast
    }

    for name, model in models.items():
        try:
            results[name] = evaluate_model(name, model, series, steps)
        except Exception as e:
            results[name] = {"error": str(e)}

    # Select best model
    valid_results = [
        r for r in results.values()
        if isinstance(r, dict)
        and "score" in r
        and r["score"] is not None
        and not (isinstance(r["score"], float) and (math.isnan(r["score"]) or math.isinf(r["score"])))
    ]
    if valid_results:
        best_model = min(valid_results, key=lambda x: x["score"])
        best_model_name = best_model["model"]
    else:
        best_model = None
        best_model_name = None

    return {
        "results": results,
        "best_model": best_model_name
    }