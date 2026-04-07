import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

import psycopg2

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

print("Fetching abstracts from Postgres...")

cursor.execute("""
    SELECT abstract FROM papers
    WHERE abstract IS NOT NULL
    AND abstract != 'No abstract available'
    AND LENGTH(abstract) > 100
    ORDER BY citation_count DESC
    LIMIT 100000
""")

rows = cursor.fetchall()
print(f"Fetched {len(rows)} abstracts")

output_path = os.path.join(os.path.dirname(__file__), '../../data/training_text.txt')

with open(output_path, 'w', encoding='utf-8') as f:
    for row in rows:
        abstract = row[0].strip()
        if abstract:
            f.write(abstract + "\n\n")

print(f"Saved to {output_path}")
cursor.close()
conn.close()