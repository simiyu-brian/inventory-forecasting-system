import numpy as np
import pandas as pd


def mae(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    return np.mean(np.abs(y_true - y_pred))

def rmse(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    return np.sqrt(np.mean((y_true - y_pred) ** 2))

def smape(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    denominator = (np.abs(y_true) + np.abs(y_pred)) / 2

    diff = np.abs(y_true - y_pred)

    # avoid division by zero
    denominator = np.where(denominator == 0, 1e-8, denominator)

    return np.mean(diff / denominator) * 100

def wape(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    return np.sum(np.abs(y_true - y_pred)) / (np.sum(y_true) + 1e-8) * 100