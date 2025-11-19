import logging
import sys
from core.config import settings

# Define log levels
DEBUG = logging.DEBUG
INFO = logging.INFO
ERROR = logging.ERROR


class Logger:
    """Simplified central logging utility with DEBUG, INFO, and ERROR levels."""
    
    def __init__(self, level: int = settings.LOG_LEVEL):
            self._logger = logging.getLogger("attd-backend")
            
            # Create console handler
            handler = logging.StreamHandler(sys.stdout)
            
            # Create formatter
            handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            ))
            
            # Add handler to logger
            self._logger.addHandler(handler)
            
            # Set default level
            self._logger.setLevel(level)
    
    def debug(self, message: str, *args, **kwargs):
        """Log a DEBUG level message."""
        self._logger.debug(message, *args, **kwargs)
    
    def info(self, message: str, *args, **kwargs):
        """Log an INFO level message."""
        self._logger.info(message, *args, **kwargs)

    def warning(self, message: str, *args, **kwargs):
        """Log a WARNING level message."""
        self._logger.warning(message, *args, **kwargs)
    
    def error(self, message: str, *args, **kwargs):
        """Log an ERROR level message."""
        self._logger.error(message, *args, **kwargs)
    
    def set_level(self, level: int):
        """Set the logging level."""
        self._logger.setLevel(level)
        for handler in self._logger.handlers:
            handler.setLevel(level)


# Global logger instance
logger_instance = Logger()