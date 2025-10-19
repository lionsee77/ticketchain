#!/usr/bin/env python3
"""Simple database connection test script"""

import os
import sys


def test_db_connection():
    """Test database connection"""
    try:
        import psycopg2

        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
            return False

        print(f"Testing connection to: {database_url}")

        conn = psycopg2.connect(database_url)
        conn.close()

        print("✅ Database connection successful!")
        return True

    except ImportError:
        print("❌ psycopg2 module not found")
        return False
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    if test_db_connection():
        sys.exit(0)
    else:
        sys.exit(1)
