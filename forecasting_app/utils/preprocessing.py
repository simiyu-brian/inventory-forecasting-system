import pandas as pd
import os

try:
    from django.conf import settings
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False



def load_data(file_path=None):

    # If user explicitly provides a path, use it
    if file_path is not None:
        df = pd.read_csv(file_path)
        return df

    # Django-based auto path
    if DJANGO_AVAILABLE:
        base_dir = settings.BASE_DIR
        file_path = os.path.join(base_dir, "dataset", "supermarket_sales.csv")
    else:
        # fallback for non-Django environments
        file_path = os.path.join(
            os.getcwd(),
            "dataset",
            "supermarket_sales.csv"
        )

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset not found at: {file_path}")

    return pd.read_csv(file_path)


def clean_data(df):

    df["Date"] = pd.to_datetime(df["Date"])
    df = df.dropna()

    return df


def aggregate_daily_sales(df):

    return df.groupby(
        ["Date", "Product line"]
    )["Sales"].sum().reset_index()

def get_time_series(df, product_line):

    filtered = df[df["Product line"] == product_line]

    ts = filtered.groupby("Date")["Sales"].sum()

    # fill missing dates
    ts = ts.asfreq("D")

    # better imputation (IMPORTANT)
    ts = ts.interpolate(method="linear")

    # fallback for start/end NaNs
    ts = ts.bfill().ffill()

    return ts

def full_pipeline(file_path=None):

    df = load_data(file_path)
    df = clean_data(df)
    daily = aggregate_daily_sales(df)

    return df, daily