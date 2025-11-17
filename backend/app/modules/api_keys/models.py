from uuid import uuid4

from sqlalchemy import Integer, BigInteger, String, Date, DateTime, Column, Enum, ARRAY, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, BYTEA

from core.postgres_db import Base




class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(String, nullable=False)  # Clerk user ID
    key_hash = Column(BYTEA, nullable=False, unique=True, index=True)

    scopes = Column(ARRAY(String), nullable=False, default=list)

    status = Column(
        Enum("active", "revoked", "expired", name="api_key_status"),
        nullable=False,
        default="active",
        server_default="active",
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    name = Column(String, nullable=True)
    description = Column(String, nullable=True)

    rate_limit_daily = Column(Integer, nullable=True)
    rate_limit_monthly = Column(Integer, nullable=True)




class APIUsageDaily(Base):
    __tablename__ = "api_usage_log_daily"

    date = Column(Date, primary_key=True)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id", ondelete="CASCADE"), primary_key=True)
    request_count = Column(BigInteger, nullable=False, default=0)


class APIUsageMonthly(Base):
    __tablename__ = "api_usage_log_monthly"

    month = Column(Date, primary_key=True)  # first day of month
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id", ondelete="CASCADE"), primary_key=True)
    request_count = Column(BigInteger, nullable=False, default=0)
