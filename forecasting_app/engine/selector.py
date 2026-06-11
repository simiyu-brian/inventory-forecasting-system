def select_best_model(results):

    best_model = None
    lowest_rmse = float("inf")

    for model_name, data in results.items():

        rmse_score = data["metrics"]["RMSE"]

        if rmse_score < lowest_rmse:
            lowest_rmse = rmse_score
            best_model = model_name

    return best_model