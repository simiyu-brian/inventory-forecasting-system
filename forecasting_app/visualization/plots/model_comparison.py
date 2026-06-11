import matplotlib.pyplot as plt


def plot_model_scores(results: dict):
    
    # Bar chart of model performance scores (lower is better)
    
    models = []
    scores = []

    for model_name, data in results.items():
        if "score" in data:
            models.append(model_name)
            scores.append(data["score"])

    plt.figure(figsize=(10, 5))
    plt.bar(models, scores)

    plt.title("Model Comparison (Lower Score = Better)")
    plt.xlabel("Models")
    plt.ylabel("Weighted Score")
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.show()