from datetime import datetime, timezone
import json
import logging
import time
import uuid

from flask import g, jsonify, request
from werkzeug.exceptions import HTTPException


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'timestamp': datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        request_id = getattr(record, 'request_id', None)
        if request_id:
            payload['request_id'] = request_id
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def configure_logging(app):
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    app.logger.handlers.clear()
    app.logger.addHandler(handler)
    app.logger.setLevel(app.config.get('LOG_LEVEL', 'INFO'))

    @app.before_request
    def start_request_trace():
        incoming_id = request.headers.get('X-Request-Id', '').strip()
        g.request_id = incoming_id[:100] if incoming_id else str(uuid.uuid4())
        g.request_started_at = time.perf_counter()

    @app.after_request
    def finish_request_trace(response):
        request_id = getattr(g, 'request_id', '')
        started_at = getattr(g, 'request_started_at', time.perf_counter())
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        response.headers['X-Request-Id'] = request_id
        app.logger.info(
            '%s %s status=%s duration_ms=%s',
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            extra={'request_id': request_id},
        )
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        if isinstance(error, HTTPException):
            return error
        request_id = getattr(g, 'request_id', '')
        app.logger.exception('Unhandled request error', extra={'request_id': request_id})
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': 'Terjadi kesalahan internal pada server.',
            'request_id': request_id,
        }), 500
