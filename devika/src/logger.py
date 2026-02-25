import logging
import os
from functools import wraps
from flask import request
from src.config import Config

class Logger:
    def __init__(self, filename="devika_agent.log"):
        config = Config()
        logs_dir = config.get_logs_dir()
        if not os.path.exists(logs_dir):
            os.makedirs(logs_dir)
        
        self.pathName = os.path.join(logs_dir, filename)
        
        self.logger = logging.getLogger(filename)
        self.logger.setLevel(logging.DEBUG)
        
        # Prevent adding multiple handlers if Logger is instantiated multiple times
        if not self.logger.handlers:
            # File handler
            file_handler = logging.FileHandler(self.pathName, encoding="utf-8")
            file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(file_handler)
            
            # Console handler
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
            self.logger.addHandler(console_handler)

    def read_log_file(self) -> str:
        with open(self.pathName, "r") as file:
            return file.read()

    def info(self, message: str):
        self.logger.info(message)

    def error(self, message: str):
        self.logger.error(message)

    def warning(self, message: str):
        self.logger.warning(message)

    def debug(self, message: str):
        self.logger.debug(message)

    def exception(self, message: str):
        self.logger.exception(message)

    def flush(self):
        # logging handlers don't typically have a flush, but we can call it on the handlers
        for handler in self.logger.handlers:
            handler.flush()

def route_logger(logger: Logger):
    log_enabled = Config().get_logging_rest_api()

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if log_enabled:
                logger.info(f"{request.path} {request.method}")

            response = func(*args, **kwargs)

            from werkzeug.wrappers import Response
            try:
                if log_enabled:
                    if isinstance(response, Response) and response.direct_passthrough:
                        logger.debug(f"{request.path} {request.method} - Response: File response")
                    else:
                        # Handle different response types (json, str, etc)
                        if hasattr(response, 'get_data'):
                            response_summary = response.get_data(as_text=True)
                        else:
                            response_summary = str(response)
                            
                        if 'settings' in request.path:
                            response_summary = "*** Settings are not logged ***"
                        logger.debug(f"{request.path} {request.method} - Response: {response_summary}")
            except Exception as e:
                logger.exception(f"{request.path} {request.method} - {e})")

            return response
        return wrapper
    return decorator
