# app/utils/helpers.py
from datetime import datetime
import pytz

def get_local_time():
    """Returns the current date and time in Asia/Makassar (WITA) timezone."""
    timezone = pytz.timezone('Asia/Makassar')
    return datetime.now(timezone)

def format_wita_datetime(value):
    """Formats a UTC datetime for display in Asia/Makassar (WITA)."""
    if not value:
        return None

    timezone = pytz.timezone('Asia/Makassar')
    if value.tzinfo is None:
        value = pytz.utc.localize(value)

    return value.astimezone(timezone).strftime('%d/%m/%Y, %H:%M WITA')

def format_wita_iso(value):
    """Formats a UTC datetime as ISO-8601 in Asia/Makassar (WITA)."""
    if not value:
        return None

    timezone = pytz.timezone('Asia/Makassar')
    if value.tzinfo is None:
        value = pytz.utc.localize(value)

    return value.astimezone(timezone).isoformat(timespec='seconds')

def get_wita_date_string():
    """Returns today's date in Asia/Makassar as YYYY-MM-DD."""
    return get_local_time().strftime('%Y-%m-%d')

def format_rupiah(value):
    """Formats a number into Indonesian Rupiah format."""
    return f"Rp {value:,.0f}".replace(",", ".")
