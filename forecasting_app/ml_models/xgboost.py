import pandas as pd
import numpy as np
from xgboost import XGBRegressor


def create_features(series):

    df = pd.DataFrame({"y": pd.to_numeric(series)})

    df["lag1"] = df["y"].shift(1)
    df["lag2"] = df["y"].shift(2)
    df["lag3"] = df["y"].shift(3)
    df["lag7"] = df["y"].shift(7)

    df["roll_mean_7"] = df["y"].rolling(7).mean()
    df["roll_std_7"] = df["y"].rolling(7).std()

    df["trend"] = np.arange(len(df))

    df = df.dropna()

    # force numeric types
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna()

    return df


def xgboost_forecast(series, steps=5):

    series = pd.Series(series)

    df = create_features(series)

    X = df.drop("y", axis=1).astype(float)
    y = df["y"].astype(float)

    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42
    )

    model.fit(X, y)

    history = list(series.values)
    predictions = []

    for i in range(steps):

        df_input = pd.DataFrame([[
            history[-1],
            history[-2] if len(history) > 1 else 0,
            history[-3] if len(history) > 2 else 0,
            history[-7] if len(history) > 7 else 0,
            np.mean(history[-7:]) if len(history) >= 7 else np.mean(history),
            np.std(history[-7:]) if len(history) >= 7 else 0,
            len(history)
        ]], columns=[
            "lag1", "lag2", "lag3", "lag7",
            "roll_mean_7", "roll_std_7",
            "trend"
        ])

        pred = model.predict(df_input)[0]
        pred = max(0, pred) 

        predictions.append(pred)
        history.append(pred)

    return predictions