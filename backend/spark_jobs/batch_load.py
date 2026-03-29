import os
import sys

os.environ["PYSPARK_PYTHON"] = sys.executable
os.environ["PYSPARK_DRIVER_PYTHON"] = sys.executable
# Set these BEFORE importing pyspark — critical on Windows
os.environ["JAVA_HOME"] = r"C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
os.environ["HADOOP_HOME"] = r"C:\hadoop"
os.environ["PATH"] = os.environ["JAVA_HOME"] + r"\bin;" + os.environ["PATH"]

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, trim, regexp_replace, when
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

spark = SparkSession.builder \
    .appName("ResearchPlatformLoader") \
    .master("local[*]") \
    .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3") \
    .config("spark.sql.adaptive.enabled", "false") \
    .config("spark.driver.extraJavaOptions", "--add-opens java.base/sun.security.action=ALL-UNNAMED") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

CSV_PATH = os.path.join(os.path.dirname(__file__), "../../data/dblp-v10.csv")

print("Reading CSV...")
df = spark.read.csv(CSV_PATH, header=True, inferSchema=True, multiLine=True, escape='"')

print(f"Total rows: {df.count()}")
df.show(3, truncate=True)

from pyspark.sql.functions import col, trim, regexp_replace, when

df_clean = df \
    .dropDuplicates(["title"]) \
    .filter(col("title").isNotNull()) \
    .filter(col("title") != "") \
    .withColumn("title", trim(regexp_replace(col("title"), r'\x00', ''))) \
    .withColumn("abstract", when(
        col("abstract").isNotNull(),
        trim(regexp_replace(
            regexp_replace(col("abstract"), r'\x00', ''),
            r'\s+', ' '
        ))
    ).otherwise("No abstract available")) \
    .withColumn("category", when(
        col("venue").isNotNull(), trim(col("venue"))
    ).otherwise("General")) \
    .withColumn("authors", regexp_replace(col("authors").cast("string"), r'\x00', '')) \
    .select(
        col("title"),
        col("abstract"),
        col("authors"),
        col("category"),
        col("n_citation").cast("integer").alias("citation_count")
    )

print(f"Rows after cleaning: {df_clean.count()}")

DB_URL = "jdbc:postgresql://localhost:5433/research_db"
DB_PROPS = {
    "user": "admin",
    "password": "secret",
    "driver": "org.postgresql.Driver"
}

print("Writing to Postgres...")
df_clean.write.jdbc(
    url=DB_URL,
    table="papers",
    mode="append",
    properties=DB_PROPS
)

print("Done! Papers loaded successfully.")
spark.stop()