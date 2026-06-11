import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX


def sarima_forecast(series, steps=5):
    
    # SARIMA with weekly seasonality
    if len(series) < 14:
        raise ValueError("SARIMA needs at least 14 data points")

    model = SARIMAX(
        series,
        order=(1, 1, 1),
        seasonal_order=(1, 1, 1, 7),
        enforce_stationarity=False,
        enforce_invertibility=False
    )

    model_fit = model.fit(disp=False)

    forecast = model_fit.forecast(steps=steps)

    return list(forecast)