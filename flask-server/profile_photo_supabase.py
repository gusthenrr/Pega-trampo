import re
from pathlib import Path

def refactor_app():
    path = Path("app.py")
    text = path.read_text(encoding="utf-8")
    
    # 1. Add process_profile_image function
    process_portfolio_images_str = """def process_portfolio_images(image_list, user_id):"""
    process_profile_image_str = """def process_profile_image(b64_string, user_id):
    if not b64_string or not isinstance(b64_string, str):
        return None
    if not b64_string.startswith("data:image"):
        # Se for signed URL ou vazio
        if b64_string.startswith("http") and ("sign/" in b64_string and SUPABASE_BUCKET in b64_string):
            try:
                from urllib.parse import urlparse
                parsed = urlparse(b64_string)
                path_part = parsed.path.split("/object/sign/")[1]
                path = path_part.split("%s")[0]
                return path
            except Exception:
                pass
        return b64_string
    try:
        header, encoded = b64_string.split(",", 1)
        import base64
        file_data = base64.b64decode(encoded)
        mime_type = header.split(":")[1].split(";")[0]
        ext = "jpg" if "jpeg" in mime_type else mime_type.split("/")[-1]
        from datetime import datetime, timezone
        ts = int(datetime.now(timezone.utc).timestamp())
        path = f"profile_photos/{user_id}/avatar_{ts}.{ext}"
        if supabase:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                path, 
                file_data, 
                file_options={"content-type": mime_type}
            )
            return path
        else:
            print("WARN: Supabase not configured")
    except Exception as e:
        print(f"Error uploading profile photo base64: {e}")
    return b64_string

"""
    text = text.replace(process_portfolio_images_str, process_profile_image_str + process_portfolio_images_str)

    # 2. Modify `/api/user-profile` where it parses and inserts `imagem_profile`
    # payload setup:
    old_profile_save_1 = """            "birth_date": enc(data.get("birthDate")),
            "imagem_profile": data.get("imagem_profile"),
            "image_job": image_job_val,
        }"""
    
    new_profile_save_1 = """            "birth_date": enc(data.get("birthDate")),
            "imagem_profile": process_profile_image(data.get("imagem_profile"), user_id),
            "image_job": image_job_val,
        }"""
        
    text = text.replace(old_profile_save_1, new_profile_save_1)
    
    # 3. Modify `/api/resumes` to process `up_imagem_profile` with signed URLs
    old_resumes_return_1 = """        if up_imagem_profile:
            item["profilePhoto"] = up_imagem_profile"""
    new_resumes_return_1 = """        if up_imagem_profile:
            item["profilePhoto"] = get_signed_url(up_imagem_profile) or up_imagem_profile"""
    text = text.replace(old_resumes_return_1, new_resumes_return_1)
    
    # 4. Modify `/api/get_dados` to process `up_imagem_profile`
    old_get_dados_return_1 = """if up_imagem_profile:
                item["profilePhoto"] = up_imagem_profile"""
    new_get_dados_return_1 = """if up_imagem_profile:
                item["profilePhoto"] = get_signed_url(up_imagem_profile) or up_imagem_profile"""
    text = text.replace(old_get_dados_return_1, new_get_dados_return_1)

    # 5. Modify /api/user-profile (GET branch, assuming it sends data back)
    # the endpoint isn't fully returning there, it just gets saved. Let's see if /api/resumes/<id> updates it.
    old_resume_save = """            if up_imagem_profile:
                item["profilePhoto"] = up_imagem_profile"""
    new_resume_save = """            if up_imagem_profile:
                item["profilePhoto"] = get_signed_url(up_imagem_profile) or up_imagem_profile"""
    text = text.replace(old_resume_save, new_resume_save)

    old_profile_get = """profile_data["imagem_profile"] = p.get("imagem_profile")"""
    new_profile_get = """profile_data["imagem_profile"] = get_signed_url(p.get("imagem_profile")) or p.get("imagem_profile")"""
    text = text.replace(old_profile_get, new_profile_get)

    path.write_text(text, encoding="utf-8")
    print("app.py profile photo modified successfully.")

if __name__ == "__main__":
    refactor_app()
