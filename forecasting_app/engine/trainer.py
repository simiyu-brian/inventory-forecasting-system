from forecasting_app.ml_models.naive import naive_forecast
from forecasting_app.ml_models.moving_average import moving_average_forecast
from forecasting_app.ml_models.exponential_smoothing import exponential_smoothing
from forecasting_app.ml_models.arima import arima_forecast
from forecasting_app.ml_models.sarima import sarima_forecast
from forecasting_app.ml_models.xgboost import xgboost_forecast

from forecasting_app.engine.evaluator import evaluate_model


def train_all_models(train, test):

    horizon = len(test)

    results = {}

    models = {
        "Naive": naive_forecast,
        "Moving Average": moving_average_forecast,
        "Exponential Smoothing": exponential_smoothing,
        "ARIMA": arima_forecast,
        "SARIMA": sarima_forecast,
        "XGBoost": xgboost_forecast
    }

    for name, model in models.items():

        predictions = model(train, steps=horizon)

        metrics = evaluate_model(
            test,
            predictions
        )

        results[name] = {
            "predictions": predictions,
            "metrics": metrics
        }

    return results