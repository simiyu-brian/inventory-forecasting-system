import json
from django.shortcuts import render
from forecasting_app.engine.pipeline import run_pipeline
from forecasting_app.utils.preprocessing import get_time_series, full_pipeline


def dashboard_view(request):
    df, daily = full_pipeline()
    series = get_time_series(df, "Food and beverages")

    result = run_pipeline(series)

    return render(request, "dashboard/index.html", {
        "data": json.dumps(result)
    })