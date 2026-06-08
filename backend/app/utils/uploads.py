import base64
import binascii
import os
import re
import uuid
from flask import current_app


DATA_IMAGE_RE = re.compile(r"^data:(image/(png|jpe?g|webp|gif));base64,(.+)$", re.IGNORECASE | re.DOTALL)
EXTENSION_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}


def save_base64_image_if_needed(value, subfolder):
    if not value or not isinstance(value, str):
        return value

    match = DATA_IMAGE_RE.match(value.strip())
    if not match:
        return value

    mime_type = match.group(1).lower()
    encoded_data = match.group(3)
    extension = EXTENSION_BY_MIME.get(mime_type)
    if not extension:
        raise ValueError("Format gambar tidak didukung")

    try:
        image_bytes = base64.b64decode(encoded_data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Data gambar tidak valid") from exc

    if not image_bytes:
        raise ValueError("Data gambar kosong")

    upload_root = current_app.config["UPLOAD_FOLDER"]
    target_dir = os.path.join(upload_root, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(target_dir, filename)
    with open(file_path, "wb") as image_file:
        image_file.write(image_bytes)

    return f"/static/uploads/{subfolder}/{filename}"
