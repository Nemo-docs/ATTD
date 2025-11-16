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
    settings.POSTGRES_CONNECTION,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession for DB operations."""
    async with AsyncSessionLocal() as session:
        yield session


async def verify_postgres_connection() -> None:
    """Verify the database connectivity by executing a simple statement."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


__all__ = [
    "Base",
    "engine",
    "AsyncSessionLocal",
    "get_async_session",
    "verify_postgres_connection",
]