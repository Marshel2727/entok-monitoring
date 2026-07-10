# app/utils/helpers.py
from datetime import datetime, timezone as dt_timezone
import os
import pytz

try:
    from flask import current_app
except ImportError:  # pragma: no cover
    current_app = None


def get_farm_timezone_name():
    if current_app is not None:
        try:
            return current_app.config.get('FARM_TIMEZONE', 'Asia/Makassar')
        except RuntimeError:
            pass
    return os.getenv('FARM_TIMEZONE', 'Asia/Makassar')


def get_farm_timezone():
    try:
        return pytz.timezone(get_farm_timezone_name())
    except pytz.UnknownTimeZoneError:
        return pytz.timezone('Asia/Makassar')

def get_local_time():
    """Returns the current date and time in Asia/Makassar (WITA) timezone."""
    timezone = get_farm_timezone()
    return datetime.now(timezone)

def format_wita_datetime(value):
    """Formats a UTC datetime for display in Asia/Makassar (WITA)."""
    if not value:
        return None

    timezone = get_farm_timezone()
    if value.tzinfo is None:
        value = pytz.utc.localize(value)

    local_value = value.astimezone(timezone)
    return f"{local_value.strftime('%d/%m/%Y, %H:%M')} {local_value.tzname() or get_farm_timezone_name()}"

def format_wita_iso(value):
    """Formats a UTC datetime as ISO-8601 in Asia/Makassar (WITA)."""
    if not value:
        return None

    timezone = get_farm_timezone()
    if value.tzinfo is None:
        value = pytz.utc.localize(value)

    return value.astimezone(timezone).isoformat(timespec='seconds')

def get_wita_date_string():
    """Returns today's date in Asia/Makassar as YYYY-MM-DD."""
    return get_local_time().strftime('%Y-%m-%d')


def utc_now_iso():
    return datetime.now(dt_timezone.utc).isoformat(timespec='seconds')

def format_rupiah(value):
    """Formats a number into Indonesian Rupiah format."""
    return f"Rp {value:,.0f}".replace(",", ".")
