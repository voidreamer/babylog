import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Baby, User
from ..schemas import PhotoUploadRequest, PhotoUploadResponse
from ..auth import get_current_user
from ..config import get_settings
from .utils import verify_baby_access
from ..auth import get_user_email

router = APIRouter(prefix="/photos", tags=["photos"])

FREE_PHOTO_LIMIT = 50


@router.post("/upload", response_model=PhotoUploadResponse)
def get_upload_url(
    req: PhotoUploadRequest,
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """Generate a presigned upload URL for Supabase Storage.

    Flow: Frontend gets signed URL -> uploads directly to storage -> saves key to record.
    """
    settings = get_settings()
    user_id = user.get("sub")
    verify_baby_access(db, req.baby_id, user_id, user_email)

    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(
            status_code=501,
            detail="Photo storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
        )

    # Check photo limit for free users
    db_user = db.query(User).filter(User.user_id == user_id).first()
    is_premium = db_user and db_user.is_premium if db_user else False

    if not is_premium:
        # Count existing photos (rough estimate from milestone photo_urls)
        from ..models import Milestone
        photo_count = db.query(Milestone).filter(
            Milestone.baby_id == req.baby_id,
            Milestone.photo_url.isnot(None),
        ).count()
        if photo_count >= FREE_PHOTO_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limited to {FREE_PHOTO_LIMIT} photos. Upgrade to premium for unlimited."
            )

    # Generate unique storage key
    ext = req.filename.rsplit(".", 1)[-1] if "." in req.filename else "jpg"
    storage_key = f"{user_id}/{req.baby_id}/{uuid.uuid4().hex}.{ext}"
    bucket = settings.photo_bucket

    # Create signed upload URL using Supabase Storage REST API
    import httpx
    upload_url_endpoint = f"{settings.supabase_url}/storage/v1/object/{bucket}/{storage_key}"
    # For presigned uploads, we generate a signed URL
    signed_url_endpoint = f"{settings.supabase_url}/storage/v1/object/sign/{bucket}/{storage_key}"

    # Use the upload endpoint directly — frontend will PUT with the service key
    # Instead, create a signed upload URL
    try:
        resp = httpx.post(
            f"{settings.supabase_url}/storage/v1/object/upload/sign/{bucket}/{storage_key}",
            headers={
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "Content-Type": "application/json",
            },
            json={},
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Storage error: {resp.text}")
        signed_data = resp.json()
        upload_url = f"{settings.supabase_url}/storage/v1{signed_data.get('url', '')}"
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Storage connection error: {str(e)}")

    public_url = f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{storage_key}"

    return PhotoUploadResponse(
        upload_url=upload_url,
        storage_key=storage_key,
        public_url=public_url,
    )


@router.delete("/{storage_key:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    storage_key: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a photo from Supabase Storage."""
    settings = get_settings()
    user_id = user.get("sub")

    if not settings.supabase_url or not settings.supabase_service_key:
        raise HTTPException(status_code=501, detail="Photo storage not configured")

    # Verify the storage key belongs to this user
    if not storage_key.startswith(f"{user_id}/"):
        raise HTTPException(status_code=403, detail="Access denied")

    import httpx
    bucket = settings.photo_bucket
    try:
        resp = httpx.delete(
            f"{settings.supabase_url}/storage/v1/object/{bucket}/{storage_key}",
            headers={
                "Authorization": f"Bearer {settings.supabase_service_key}",
            },
            timeout=10,
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=502, detail=f"Storage delete error: {resp.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Storage connection error: {str(e)}")

    return None
