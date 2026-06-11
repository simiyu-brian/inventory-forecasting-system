from utils.preprocessing import DataPreprocessor
from utils.aggregation import Aggregator

FILE = "dataset/supermarket_sales.csv"

df = DataPreprocessor.process(FILE)

print(df.head())

product_data = Aggregator.product_quantity_series(df)

print(product_data.head())