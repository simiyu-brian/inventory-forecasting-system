# Inventory Forecasting System

An intelligent inventory forecasting and sales analytics system built with PostgreSQL, featuring a star schema data warehouse, automated ETL pipeline, and nightly data quality checks.

---

## Features

- **PostgreSQL Database** — Robust relational database for transactional and analytical data
- **Star Schema Data Warehouse** — Optimized dimensional model for fast analytical queries
- **ETL Pipeline** — Automated Extract, Transform, Load process for data ingestion
- **Sales Analytics** — Insights into sales trends, product performance, and demand patterns
- **Automated Nightly Data Quality Checks** — Ensures data integrity and consistency
- **Forecasting Engine** — Predicts future inventory needs based on historical sales data

---

## Project Structure

```
inventory-forecasting-system/
├── scripts/                  # SQL and Python scripts
├── run_pipeline.bat          # Script to run the full ETL pipeline
├── requirements.txt          # Python dependencies
├── .gitignore
└── README.md
```

---

## Tech Stack

| Component        | Technology          |
|-----------------|---------------------|
| Database         | PostgreSQL          |
| Data Warehouse   | Star Schema (PostgreSQL) |
| ETL Pipeline     | Python              |
| Automation       | Batch scripting (.bat) |
| Data Quality     | Automated SQL checks |

---

## Setup & Installation

### Prerequisites

- Python 3.8+
- PostgreSQL 13+
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/simiyu-brian/inventory-forecasting-system.git
cd inventory-forecasting-system
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the Database

- Create a PostgreSQL database
- Update the database connection settings in the configuration file

```sql
CREATE DATABASE inventory_forecasting;
```

### 4. Run the ETL Pipeline

```bash
# On Windows
run_pipeline.bat

# Or run the Python scripts directly
python scripts/etl_pipeline.py
```

---

## Data Warehouse Schema

The system uses a **star schema** with the following structure:

- **Fact Table:** `fact_sales` — stores transactional sales data
- **Dimension Tables:**
  - `dim_product` — product details
  - `dim_date` — date/time hierarchy
  - `dim_location` — warehouse/store locations
  - `dim_supplier` — supplier information

---

## ETL Pipeline

The pipeline runs nightly and performs the following steps:

1. **Extract** — Pull raw data from source systems
2. **Transform** — Clean, validate, and reshape data
3. **Load** — Insert transformed data into the data warehouse
4. **Quality Checks** — Validate row counts, null checks, and referential integrity

---

## Forecasting

The forecasting module uses historical sales data to:

- Predict future demand per product
- Flag low-stock items before they run out
- Recommend reorder quantities and timing

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Author

**Brian Simiyu**  
[GitHub](https://github.com/simiyu-brian)
