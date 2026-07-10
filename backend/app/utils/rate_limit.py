from collections import defaultdict, deque
from functools import wraps
from threading import Lock
import time

from flask import current_app, jsonify, request


_buckets = defaultdict(deque)
_lock = Lock()


def _default_key():
    device_id = request.headers.get('X-Device-Id', '').strip()
    remote = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip()
    return f'{request.endpoint}:{device_id or remote}'


def rate_limit(limit, window_seconds=60, key_func=None):
    """Small in-process limiter for the current single-worker deployment."""
    def decorator(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            now = time.monotonic()
            key = (key_func or _default_key)()
            resolved_limit = int(current_app.config.get(limit, 1)) if isinstance(limit, str) else int(limit)

            with _lock:
                bucket = _buckets[key]
                while bucket and now - bucket[0] >= window_seconds:
                    bucket.popleft()

                if len(bucket) >= resolved_limit:
                    retry_after = max(1, int(window_seconds - (now - bucket[0])))
                    response = jsonify({
                        'status': 'error',
                        'code': 'RATE_LIMITED',
                        'message': 'Terlalu banyak permintaan. Coba lagi sebentar.',
                        'retry_after_seconds': retry_after,
                    })
                    response.status_code = 429
                    response.headers['Retry-After'] = str(retry_after)
                    return response

                bucket.append(now)

            return func(*args, **kwargs)

        return wrapped
    return decorator
