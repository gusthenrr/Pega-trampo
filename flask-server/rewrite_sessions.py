import re
from pathlib import Path

def refactor_app():
    path = Path("app.py")
    text = path.read_text(encoding="utf-8")
    
    old_checkin = """@app.route("/api/sessions/checkin", methods=["POST"])
def session_checkin():
    \"\"\"Candidate uploads check-in photo.\"\"\"
    user_id = current_user_id()
    if not user_id:
        return api_error("Não autorizado", 401)

    application_id = request.form.get("application_id")
    photo = request.files.get("photo")

    if not application_id or not photo:
        return api_error("application_id e photo são obrigatórios", 400)

    MAX_SIZE = 5 * 1024 * 1024
    photo_bytes = photo.read()
    if len(photo_bytes) > MAX_SIZE:
        return api_error("Foto muito grande. Máximo 5MB.", 400)

    allowed = {"image/jpeg", "image/png", "image/webp"}
    mime = photo.content_type or "image/jpeg"
    if mime not in allowed:
        return api_error("Formato não permitido. Use JPG, PNG ou WebP.", 400)

    try:
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("Sessão não encontrada", 404)
        s = rows[0]
        if s["status"] != "accepted":
            return api_error(f"Check-in não permitido no status atual: {s['status']}", 409)

        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkin", mime)
        upload_session_photo(photo_bytes, path, mime)

        now = datetime.now(timezone.utc).isoformat()
        db_write(\"\"\"
            UPDATE job_sessions
            SET checkin_storage_path = %s,
                checkin_mime_type = %s,
                checkin_file_size = %s,
                checkin_at = %s,
                status = 'checked_in'
            WHERE application_id = %s
        \"\"\", path, mime, len(photo_bytes), now, application_id)

        return api_ok(message="Check-in realizado com sucesso!", status="checked_in")
    except Exception as e:
        print(f"Erro no checkin: {e}")
        return api_error("Erro ao processar check-in", 500)"""

    new_checkin = """@app.route("/api/sessions/checkin", methods=["POST"])
def session_checkin():
    \"\"\"Candidate uploads check-in photo.\"\"\"
    user_id = current_user_id()
    if not user_id:
        return api_error("Não autorizado", 401)
        
    data = request.json or {}
    
    # Try getting from JSON first (base64)
    application_id = data.get("application_id")
    photo_b64 = data.get("photo")
    
    # Fallback to form-data if someone uploads using multipart
    if not application_id or not photo_b64:
        application_id = request.form.get("application_id") or application_id
        photo = request.files.get("photo")
        if photo:
            import base64
            mime = photo.content_type or "image/jpeg"
            photo_bytes = photo.read()
            photo_b64 = f"data:{mime};base64," + base64.b64encode(photo_bytes).decode('utf-8')
    
    if not application_id or not photo_b64:
        return api_error("application_id e photo são obrigatórios", 400)
    
    # Process Base64
    try:
        header, encoded = photo_b64.split(",", 1)
        import base64
        photo_bytes = base64.b64decode(encoded)
        mime = header.split(":")[1].split(";")[0]
        
        MAX_SIZE = 5 * 1024 * 1024
        if len(photo_bytes) > MAX_SIZE:
            return api_error("Foto muito grande. Máximo 5MB.", 400)
            
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if mime not in allowed:
            return api_error("Formato não permitido. Use JPG, PNG ou WebP.", 400)
            
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("Sessão não encontrada", 404)
        s = rows[0]
        if s["status"] != "accepted":
            return api_error(f"Check-in não permitido no status atual: {s['status']}", 409)
            
        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkin", mime)
        upload_session_photo(photo_bytes, path, mime)
        
        now = datetime.now(timezone.utc).isoformat()
        db_write(\"\"\"
            UPDATE job_sessions
            SET checkin_storage_path = %s,
                checkin_mime_type = %s,
                checkin_file_size = %s,
                checkin_at = %s,
                status = 'checked_in'
            WHERE application_id = %s
        \"\"\", path, mime, len(photo_bytes), now, application_id)
        
        return api_ok(message="Check-in realizado com sucesso!", status="checked_in")
    except Exception as e:
        print(f"Erro no checkin: {e}")
        return api_error("Erro ao processar check-in", 500)"""

    old_checkout = """@app.route("/api/sessions/checkout", methods=["POST"])
def session_checkout():
    \"\"\"Candidate uploads check-out photo.\"\"\"
    user_id = current_user_id()
    if not user_id:
        return api_error("Não autorizado", 401)

    application_id = request.form.get("application_id")
    photo = request.files.get("photo")

    if not application_id or not photo:
        return api_error("application_id e photo são obrigatórios", 400)

    MAX_SIZE = 5 * 1024 * 1024
    photo_bytes = photo.read()
    if len(photo_bytes) > MAX_SIZE:
        return api_error("Foto muito grande. Máximo 5MB.", 400)

    allowed = {"image/jpeg", "image/png", "image/webp"}
    mime = photo.content_type or "image/jpeg"
    if mime not in allowed:
        return api_error("Formato não permitido. Use JPG, PNG ou WebP.", 400)

    try:
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("Sessão não encontrada", 404)
        s = rows[0]
        if s["status"] != "checked_in":
            return api_error(f"Check-out não permitido no status atual: {s['status']}", 409)

        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkout", mime)
        upload_session_photo(photo_bytes, path, mime)

        now = datetime.now(timezone.utc).isoformat()
        db_write(\"\"\"
            UPDATE job_sessions
            SET checkout_storage_path = %s,
                checkout_mime_type = %s,
                checkout_file_size = %s,
                checkout_at = %s,
                status = 'checked_out'
            WHERE application_id = %s
        \"\"\", path, mime, len(photo_bytes), now, application_id)

        return api_ok(message="Check-out realizado com sucesso!", status="checked_out")
    except Exception as e:
        print(f"Erro no checkout: {e}")
        return api_error("Erro ao processar check-out", 500)"""

    new_checkout = """@app.route("/api/sessions/checkout", methods=["POST"])
def session_checkout():
    \"\"\"Candidate uploads check-out photo.\"\"\"
    user_id = current_user_id()
    if not user_id:
        return api_error("Não autorizado", 401)
        
    data = request.json or {}
    
    application_id = data.get("application_id")
    photo_b64 = data.get("photo")
    
    if not application_id or not photo_b64:
        application_id = request.form.get("application_id") or application_id
        photo = request.files.get("photo")
        if photo:
            import base64
            mime = photo.content_type or "image/jpeg"
            photo_bytes = photo.read()
            photo_b64 = f"data:{mime};base64," + base64.b64encode(photo_bytes).decode('utf-8')
            
    if not application_id or not photo_b64:
        return api_error("application_id e photo são obrigatórios", 400)

    try:
        header, encoded = photo_b64.split(",", 1)
        import base64
        photo_bytes = base64.b64decode(encoded)
        mime = header.split(":")[1].split(";")[0]

        MAX_SIZE = 5 * 1024 * 1024
        if len(photo_bytes) > MAX_SIZE:
            return api_error("Foto muito grande. Máximo 5MB.", 400)

        allowed = {"image/jpeg", "image/png", "image/webp"}
        if mime not in allowed:
            return api_error("Formato não permitido. Use JPG, PNG ou WebP.", 400)
            
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("Sessão não encontrada", 404)
        s = rows[0]
        if s["status"] != "checked_in":
            return api_error(f"Check-out não permitido no status atual: {s['status']}", 409)

        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkout", mime)
        upload_session_photo(photo_bytes, path, mime)

        now = datetime.now(timezone.utc).isoformat()
        db_write(\"\"\"
            UPDATE job_sessions
            SET checkout_storage_path = %s,
                checkout_mime_type = %s,
                checkout_file_size = %s,
                checkout_at = %s,
                status = 'checked_out'
            WHERE application_id = %s
        \"\"\", path, mime, len(photo_bytes), now, application_id)

        return api_ok(message="Check-out realizado com sucesso!", status="checked_out")
    except Exception as e:
        print(f"Erro no checkout: {e}")
        return api_error("Erro ao processar check-out", 500)"""

    text = text.replace(old_checkin, new_checkin)
    text = text.replace(old_checkout, new_checkout)

    path.write_text(text, encoding="utf-8")
    print("sessions base64 implemented.")

if __name__ == "__main__":
    refactor_app()
