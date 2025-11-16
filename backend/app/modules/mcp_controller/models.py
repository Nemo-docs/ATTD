import asyncio
from datetime import datetime
from typing import Any, Optional, Sequence

from sqlalchemy import String, DateTime, JSON, select, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession

from core.postgres_db import Base, engine, AsyncSessionLocal


class McpEndpoint(Base):
    """Represents a remote MCP endpoint to persist in Postgres."""
    __tablename__ = "mcp_endpoints"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    base_url: Mapped[str] = mapped_column(String(255))
    config: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


async def init_mcp_tables() -> None:
    """Create the MCP tables if they do not exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

