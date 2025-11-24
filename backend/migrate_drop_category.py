"""
One-time migration script to remove the category column from the places table.
Run this with: python migrate_drop_category.py
"""
import sqlite3
import os

# Use the DATABASE_URL from environment or default
db_path = os.getenv('DATABASE_URL', 'sqlite:///./topoi.db').replace('sqlite:///', '')

print(f"Migrating database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if category column exists
    cursor.execute("PRAGMA table_info(places)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'category' not in columns:
        print("Category column does not exist. Migration not needed.")
        conn.close()
        exit(0)

    print("Category column found. Starting migration...")

    # Disable foreign keys temporarily
    cursor.execute('PRAGMA foreign_keys=off')

    # Start transaction
    cursor.execute('BEGIN TRANSACTION')

    # Create new table without category column
    cursor.execute('''
    CREATE TABLE places_new (
        id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        address VARCHAR NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        notes VARCHAR,
        phone VARCHAR,
        website VARCHAR,
        hours VARCHAR,
        is_public BOOLEAN,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
    )
    ''')

    # Copy data from old table to new table
    cursor.execute('''
    INSERT INTO places_new (id, user_id, name, address, latitude, longitude, notes, phone, website, hours, is_public, created_at, updated_at)
    SELECT id, user_id, name, address, latitude, longitude, notes, phone, website, hours, is_public, created_at, updated_at FROM places
    ''')

    # Drop old table
    cursor.execute('DROP TABLE places')

    # Rename new table
    cursor.execute('ALTER TABLE places_new RENAME TO places')

    # Commit transaction
    conn.commit()

    # Re-enable foreign keys
    cursor.execute('PRAGMA foreign_keys=on')

    print("✓ Migration completed successfully! Category column removed from places table.")

except Exception as e:
    print(f"✗ Migration failed: {e}")
    conn.rollback()
    raise

finally:
    conn.close()
