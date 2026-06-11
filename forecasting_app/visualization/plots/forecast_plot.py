import matplotlib.pyplot as plt


def plot_forecast(series, forecast, model_name):
    """
    Show future forecast beyond actual data
    """

    plt.figure(figsize=(10, 5))

    plt.plot(series.values, label="Historical Data")

    future_index = range(len(series), len(series) + len(forecast))

    plt.plot(
        future_index,
        forecast,
        label=f"{model_name} Forecast",
        marker="o"
    )

    plt.title(f"Future Forecast - {model_name}")
    plt.xlabel("Time")
    plt.ylabel("Sales")

    plt.legend()
    plt.tight_layout()
    plt.show()