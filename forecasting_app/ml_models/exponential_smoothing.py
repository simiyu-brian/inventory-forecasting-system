import pandas as pd

def exponential_smoothing(series, alpha=0.3, steps=7):
    """
    Weighted smoothing model.
    Gives more weight to recent sales.
    """

    if not isinstance(series, pd.Series):
        series = pd.Series(series)

    smoothed = series.iloc[0]

    for value in series:
        smoothed = alpha * value + (1 - alpha) * smoothed

    return [smoothed] * steps