from rest_framework.response import Response
from rest_framework.decorators import api_view

from forecasting_app.utils.preprocessing import full_pipeline, get_time_series
from forecasting_app.engine.pipeline import run_pipeline


@api_view(["GET"])
def forecast_product(request, product_line):
    """
    Run full forecasting pipeline for a product line
    """

    try:
        # 1. Load data
        df, daily = full_pipeline()

        # 2. Convert to time series
        series = get_time_series(df, product_line)

        # 3. Run ML pipeline
        result = run_pipeline(series)

        # 4. Get best model output
        best_model = result["best_model"]
        best_output = result["results"][best_model]

        return Response({
            "product_line": product_line,
            "best_model": best_model,
            "score": best_output.get("score"),
            "metrics": best_output.get("metrics"),
            "predictions": best_output.get("predictions"),
            "all_models": {
                k: v.get("score", None)
                for k, v in result["results"].items()
                if "score" in v
            }
        })

    except Exception as e:
        return Response({
            "error": str(e)
        }, status=500)