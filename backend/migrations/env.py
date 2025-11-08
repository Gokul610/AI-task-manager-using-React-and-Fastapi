# backend/migrations/env.py

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# --- Import our project's settings and models ---
# This is the crucial part that connects Alembic to our app
import sys
from pathlib import Path

# Add the 'backend' directory to the system path
# This allows Alembic to find our 'app' module
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.config_loader import settings # Reads from .env
from app.core.database import Base         # Our SQLAlchemy Base class
# --- MODIFIED LINE: Import ALL models ---
from app.models import user_model, task_model, log_model # Import all our models
# -----------------------------------------------


# This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# --- Tell Alembic to use our app's database URL ---
# We set this here so that 'env.py' knows our database
# connection string from the .env file.
# We also convert the Pydantic PostgresDsn object to a string
config.set_main_option("sqlalchemy.url", str(settings.SQLALCHEMY_DATABASE_URI))
# --------------------------------------------------


# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Set the target metadata ---
# This is our Base.metadata from database.py,
# which Alembic uses to detect model changes.
target_metadata = Base.metadata
# ---------------------------------


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # This block was modified to use our app's engine
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()