import subprocess
import sys
from datetime import datetime

def run_script(name, path):
    print(f"\n{'='*50}")
    print(f"RUNNING: {name}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print('='*50)
    result = subprocess.run([sys.executable, path], capture_output=False, text=True)
    if result.returncode == 0:
        print(f"\n{name} completed successfully")
    else:
        print(f"\n{name} FAILED — stopping pipeline")
        sys.exit(1)

print("\n" + "="*50)
print("INVENTORY FORECASTING PIPELINE")
print(f"Pipeline started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*50)

# Step 1 — Ingest raw POS data
run_script("Step 1: Data Ingestion", r"C:\Users\admin\Documents\ingest.py")

# Step 2 — Run ETL into star schema
run_script("Step 2: ETL Transformation", r"C:\Users\admin\Documents\etl.py")

# Step 3 — Run data quality checks
run_script("Step 3: Data Quality Checks", r"C:\Users\admin\Documents\data_quality.py")

print("\n" + "="*50)
print(f"PIPELINE COMPLETE")
print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*50)