import logging
import functools
from typing import Callable
import os

# Create logger
logger = logging.getLogger('app')
logger.setLevel(logging.INFO)

# Create console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(levelname)s:%(name)s:%(message)s')
console_handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(console_handler)

def enable_debug_logging():
    """Enable debug logging for the application."""
    logger.setLevel(logging.DEBUG)
    console_handler.setLevel(logging.DEBUG)

def disable_debug_logging():
    """Disable debug logging for the application."""
    logger.setLevel(logging.INFO)
    console_handler.setLevel(logging.INFO)

def debug_log(func: Callable) -> Callable:
    """Decorator to add debug logging to a function."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        if logger.level <= logging.DEBUG:
            logger.debug(f"Entering {func.__name__}")
            if args:
                logger.debug(f"Args: {args}")
            if kwargs:
                logger.debug(f"Kwargs: {kwargs}")
        
        result = await func(*args, **kwargs)
        
        if logger.level <= logging.DEBUG:
            logger.debug(f"Exiting {func.__name__}")
        
        return result
    return wrapper

# Set initial debug state from environment variable
if os.getenv('DEBUG', '').lower() == 'true':
    enable_debug_logging() 