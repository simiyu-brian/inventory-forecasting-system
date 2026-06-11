from forecasting_app.utils.metrics import (
    mae,
    rmse,
    mape
)


def evaluate_model(y_true, y_pred):

    return {
        "MAE": mae(y_true, y_pred),
        "RMSE": rmse(y_true, y_pred),
        "MAPE": mape(y_true, y_pred)
    }