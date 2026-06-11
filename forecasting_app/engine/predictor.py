from forecasting_app.ml_models.naive import naive_forecast
from forecasting_app.ml_models.moving_average import moving_average_forecast
from forecasting_app.ml_models.exponential_smoothing import exponential_smoothing
from forecasting_app.ml_models.arima import arima_forecast
from forecasting_app.ml_models.sarima import sarima_forecast
from forecasting_app.ml_models.xgboost import xgboost_forecast


MODEL_REGISTRY = {
    "Naive": naive_forecast,
    "Moving Average": moving_average_forecast,
    "Exponential Smoothing": exponential_smoothing,
    "ARIMA": arima_forecast,
    "SARIMA": sarima_forecast,
    "XGBoost": xgboost_forecast
}


def predict(model_name, series, steps=7):

    model = MODEL_REGISTRY[model_name]

    return model(series, steps=steps)