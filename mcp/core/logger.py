import sys
import logging
from core.config import settings


# Define log levels
DEBUG = logging.DEBUG
INFO = logging.INFO
ERROR = logging.ERROR


def setup_logger(
    name: str = "mcp",
    level: int = settings.LOG_LEVEL,
) -> logging.Logger:
    """
    Set up and return a logger with the specified configuration.
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, or ERROR)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Avoid adding duplicate handlers
    if logger.handlers:
        return logger
    
    # Set the logging level
    logger.setLevel(level)
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    
    # Set the formatter
    handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
    
    # Add the handler to the logger
    logger.addHandler(handler)
    
    return logger


# Create default logger instance
logger = setup_logger()

