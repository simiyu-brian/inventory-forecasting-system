def train_test_split_series(series, test_size=0.2):

    split_index = int(len(series) * (1 - test_size))

    train = series[:split_index]
    test = series[split_index:]

    return train, test