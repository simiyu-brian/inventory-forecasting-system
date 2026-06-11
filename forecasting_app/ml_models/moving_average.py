import pandas as pd
import numpy as np

def moving_average_forecast(series, window=3, steps=7):
    """
    Moving average forecasting.
    Smooths noise in supermarket sales.
    """

    if not isinstance(series, pd.Series):
        series = pd.Series(series)

    avg = series.rolling(window=window).mean().iloc[-1]

    if np.isnan(avg):
        avg = series.mean()

    return [avg] * steps