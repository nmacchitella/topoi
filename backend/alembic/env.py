"""Alembic env — reads DATABASE_URL from the environment and points target
metadata at the SQLAlchemy Base used by the app. Importing `models` is what
populates Base.metadata with every table; without that import autogenerate
sees an empty target and produces a DROP-everything migration.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# Make the project root importable so `from database import Base` and
# `import models` resolve when running `alembic` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import Base  # noqa: E402
import models  # noqa: E402,F401  (registers every table on Base.metadata)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Prefer DATABASE_URL from the environment (matches how the app reads it).
# Falls back to whatever alembic.ini has (kept blank by default).
db_url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
