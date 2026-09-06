import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:secret123@postgres_server:5432/db_sit"

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE defects 
            ADD COLUMN IF NOT EXISTS fixing_status_by_vendor VARCHAR(100);
        """))
        conn.commit()
        print("✓ Column 'fixing_status_by_vendor' added successfully to defects table")
except Exception as e:
    print(f"Error: {str(e)}")
finally:
    engine.dispose()
