import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import Database

if __name__ == "__main__":
    db = Database()
    db.initialize_db()
    print("Database schema initialized.") 