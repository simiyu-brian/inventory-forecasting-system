import pandas as pd


class Aggregator:

    @staticmethod
    def product_quantity_series(df):
        """
        Product Line Quantity Forecasting
        """

        grouped = (
            df.groupby(
                ["Date", "Product line"]
            )["Quantity"]
            .sum()
            .reset_index()
        )

        return grouped

    @staticmethod
    def revenue_series(df):
        """
        Revenue Forecasting
        """

        grouped = (
            df.groupby("Date")["Sales"]
            .sum()
            .reset_index()
        )

        return grouped

    @staticmethod
    def branch_quantity_series(df):
        """
        Branch Forecasting
        """

        grouped = (
            df.groupby(
                ["Date", "Branch"]
            )["Quantity"]
            .sum()
            .reset_index()
        )

        return grouped