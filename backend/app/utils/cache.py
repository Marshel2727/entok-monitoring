import functools
import time
from threading import RLock

from flask import make_response, request


class ResponseCache:
    def __init__(self):
        self._items = {}
        self._lock = RLock()

    def get(self, key):
        now = time.time()
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None

            expires_at, value = item
            if expires_at <= now:
                self._items.pop(key, None)
                return None

            return value

    def set(self, key, value, ttl_seconds):
        expires_at = time.time() + ttl_seconds
        with self._lock:
            self._items[key] = (expires_at, value)

    def clear(self):
        with self._lock:
            self._items.clear()


response_cache = ResponseCache()


def _cache_key(vary_auth):
    auth_part = request.headers.get('Authorization', '') if vary_auth else ''
    return f'{request.method}:{request.full_path}:{auth_part}'


def _cache_control(ttl_seconds, public):
    scope = 'public' if public else 'private'
    return f'{scope}, max-age={ttl_seconds}'


def cached_json(ttl_seconds=30, public=False, vary_auth=True):
    """Cache successful JSON GET responses in-process for short-lived reads."""
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(*args, **kwargs):
            if request.method != 'GET' or ttl_seconds <= 0:
                return view_func(*args, **kwargs)

            key = _cache_key(vary_auth)
            cached = response_cache.get(key)
            if cached:
                body, status_code, content_type = cached
                response = make_response(body, status_code)
                response.content_type = content_type
                response.headers['Cache-Control'] = _cache_control(ttl_seconds, public)
                response.headers['X-Cache'] = 'HIT'
                return response

            response = make_response(view_func(*args, **kwargs))
            if 200 <= response.status_code < 300 and response.is_json:
                response.headers['Cache-Control'] = _cache_control(ttl_seconds, public)
                response.headers['X-Cache'] = 'MISS'
                response_cache.set(
                    key,
                    (response.get_data(), response.status_code, response.content_type),
                    ttl_seconds,
                )

            return response

        return wrapper

    return decorator


def init_cache_headers(app):
    @app.after_request
    def apply_cache_policy(response):
        if request.method != 'GET':
            if 200 <= response.status_code < 400:
                response_cache.clear()
            response.headers['Cache-Control'] = 'no-store'
            return response

        if 'Cache-Control' not in response.headers:
            response.headers['Cache-Control'] = 'no-store'

        return response
