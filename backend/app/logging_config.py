"""
Structured JSON logging configuration for CloudWatch.

Outputs one JSON object per log line, suitable for CloudWatch Logs Insights queries.
Uses only Python's built-in logging module (no external dependencies).
"""

import json
import logging
import sys
from datetime import UTC, datetime


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON for CloudWatch."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Merge any extra context passed via logger.info("msg", extra={...})
        # Exclude standard LogRecord attributes to avoid noise
        standard_attrs = {
            "name",
            "msg",
            "args",
            "created",
            "relativeCreated",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "pathname",
            "filename",
            "module",
            "thread",
            "threadName",
            "process",
            "processName",
            "levelname",
            "levelno",
            "message",
            "msecs",
            "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in standard_attrs and not key.startswith("_"):
                log_entry[key] = value

        # Attach exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure the root logger with structured JSON output to stdout."""
    root = logging.getLogger()

    # Avoid adding duplicate handlers on repeated calls (e.g. Lambda warm starts)
    if any(isinstance(h, logging.StreamHandler) and isinstance(h.formatter, JSONFormatter) for h in root.handlers):
        return

    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("mangum").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for use in router modules."""
    return logging.getLogger(name)
