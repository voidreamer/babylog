import { useState, useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { resizeImage, getImagePreviewUrl } from '../utils/imageResize';
import { api } from '../api/client';

interface PhotoUploadProps {
  babyId: number;
  currentPhotoUrl?: string | null;
  onPhotoUploaded: (publicUrl: string, storageKey: string) => void;
  onPhotoRemoved?: () => void;
}

export default function PhotoUpload({
  babyId,
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoRemoved,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB max before resize)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setError(null);

    // Show preview immediately
    const previewUrl = getImagePreviewUrl(file);
    setPreview(previewUrl);

    setUploading(true);
    try {
      // Resize image
      const resized = await resizeImage(file);

      // Get presigned upload URL
      const { upload_url, storage_key, public_url } = await api.getPhotoUploadUrl(
        babyId,
        file.name,
        'image/jpeg',
      );

      // Upload directly to storage
      await api.uploadPhotoToStorage(upload_url, resized, 'image/jpeg');

      setPreview(public_url);
      onPhotoUploaded(public_url, storage_key);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
      setPreview(currentPhotoUrl || null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onPhotoRemoved?.();
  };

  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="Photo preview"
            style={{
              width: '100%',
              maxWidth: 200,
              height: 'auto',
              borderRadius: 12,
              objectFit: 'cover',
              opacity: uploading ? 0.5 : 1,
            }}
          />
          {uploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="spinner" />
            </div>
          )}
          {!uploading && (
            <button
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 12,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <Camera size={18} />
          Add Photo
        </button>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
