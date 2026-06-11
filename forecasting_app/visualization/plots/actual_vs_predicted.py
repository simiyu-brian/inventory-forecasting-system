import matplotlib.pyplot as plt


def plot_actual_vs_predicted(series, predictions, model_name):
    """
    Compare actual vs predicted values
    """

    plt.figure(figsize=(10, 5))

    plt.plot(series.values, label="Actual Sales", marker="o")

    start = len(series) - len(predictions)

    plt.plot(
        range(start, len(series)),
        predictions,
        label=f"{model_name} Predictions",
        marker="o"
    )

    plt.title(f"Actual vs Predicted - {model_name}")
    plt.xlabel("Time")
    plt.ylabel("Sales")

    plt.legend()
    plt.tight_layout()
    plt.show()