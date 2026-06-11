import pandas as pd
import numpy as np

def naive_forecast(series, steps=7):

    if not isinstance(series, pd.Series):
        series = pd.Series(series)

    last_value = int(series.iloc[-1])

    forecast = np.repeat(last_value, steps)

    return forecast.tolist()