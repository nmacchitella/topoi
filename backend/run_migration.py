#!/usr/bin/env python3
"""
Migration runner script
Usage: python run_migration.py migrations/001_add_user_privacy.sql
"""

import sys
from database import engine
from sqlalchemy import text

def run_migration(sql_file):
    """Run a SQL migration file"""
    print(f"Running migration: {sql_file}")

    with open(sql_file, 'r') as f:
        sql_content = f.read()

    # Split by semicolon to execute each statement separately
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

    with engine.connect() as conn:
        for i, statement in enumerate(statements, 1):
            # Skip comment-only lines
            if statement.startswith('--'):
                continue

            try:
                print(f"Executing statement {i}/{len(statements)}...")
                conn.execute(text(statement))
                conn.commit()
                print(f"✓ Statement {i} executed successfully")
            except Exception as e:
                print(f"✗ Error executing statement {i}: {e}")
                print(f"Statement was: {statement[:100]}...")
                conn.rollback()
                raise

    print("✓ Migration completed successfully!")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_migration.py <migration_file.sql>")
        sys.exit(1)

    run_migration(sys.argv[1])
