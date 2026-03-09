import uuid
from datetime import datetime, timezone


def generate_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_text(text: str) -> str:
    """Sanitize text for PDF - replace special Unicode characters"""
    if not text:
        return ""
    text = str(text)
    replacements = {
        '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u2026': '...',
        '\u2022': '*', '\u00b7': '*',
        '\u00b0': 'o', '\u00b4': "'", '`': "'",
        '\u00a0': ' ',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode('latin-1', errors='replace').decode('latin-1')
