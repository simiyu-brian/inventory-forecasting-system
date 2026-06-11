def get_best_model_result(result: dict):
    best = result["best_model"]
    return best, result["results"][best]