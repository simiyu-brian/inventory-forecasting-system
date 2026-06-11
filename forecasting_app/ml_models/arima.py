import numpy as np
import warnings
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller

warnings.filterwarnings("ignore")


def make_stationary(series):
    
    # Ensuring stationarity using differencing if needed
    result = adfuller(series)

    if result[1] > 0.05:
        return series.diff().dropna(), True

    return series, False


def arima_forecast(series, steps=5):

    # ARIMA with auto differencing
    if len(series) < 10:
        raise ValueError("ARIMA needs at least 10 data points")

    series, differenced = make_stationary(series)

    best_aic = float("inf")
    best_order = (1, 1, 1)

    # small grid search (fast version)
    for p in range(2):
        for d in range(2):
            for q in range(2):
                try:
                    model = ARIMA(series, order=(p, d, q))
                    model_fit = model.fit()

                    if model_fit.aic < best_aic:
                        best_aic = model_fit.aic
                        best_order = (p, d, q)

                except:
                    continue

    model = ARIMA(series, order=best_order)
    model_fit = model.fit()

    forecast = model_fit.forecast(steps=steps)

    return list(forecast)