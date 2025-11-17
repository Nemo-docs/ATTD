"""Async SQLAlchemy engine and session factory for PostgreSQL."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from typing import AsyncGenerator

from core.config import settings


class Base(DeclarativeBase):
    """Declarative base for ORM models."""
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession for DB operations."""
    async with AsyncSessionLocal() as session:
        yield session



async def init_tables() -> None:
    """Create the tables if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def verify_postgres_connection() -> None:
    """Verify the database connectivity by executing a simple statement."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
