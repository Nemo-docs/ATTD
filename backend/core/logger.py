import logging
import sys
from core.config import settings

# Define log levels
DEBUG = logging.DEBUG
INFO = logging.INFO
ERROR = logging.ERROR

logger = logging.getLogger("attd-backend")

handler = logging.StreamHandler(sys.stdout)

handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(filename)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))

logger.addHandler(handler)

logger.setLevel(settings.LOG_LEVEL)

# Global logger instance
logger_instance = logger