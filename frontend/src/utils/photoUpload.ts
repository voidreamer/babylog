import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { resizeImage } from './imageResize';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

/**
 * Pick a photo from camera or gallery.
 * On native: uses Capacitor Camera plugin with prompt (camera or gallery).
 * On web: creates a hidden file input.
 */
export async function pickPhoto(): Promise<File | null> {
    if (Capacitor.isNativePlatform()) {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt,
                quality: 90,
                allowEditing: true,
                width: 512,
                height: 512,
            });

            if (!photo.webPath) return null;

            const response = await fetch(photo.webPath);
            const blob = await response.blob();
            return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        } catch {
            // User cancelled
            return null;
        }
    }

    // Web fallback: hidden file input
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const file = input.files?.[0] || null;
            resolve(file);
        };
        // Handle cancel (no file selected)
        input.addEventListener('cancel', () => resolve(null));
        input.click();
    });
}

/**
 * Resize and upload a profile photo to Supabase Storage.
 * Returns the public URL of the uploaded photo.
 */
export async function uploadProfilePhoto(
    file: File,
    babyId: number,
    userId: string,
): Promise<string> {
    // Resize to 512px max, 0.85 quality
    const resized = await resizeImage(file, 512, 0.85);
    const timestamp = Date.now();
    const path = `${userId}/${babyId}/profile_${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, resized, {
            contentType: 'image/jpeg',
            upsert: true,
        });

    if (uploadError) {
        if (uploadError.message?.includes('Bucket not found')) {
            throw new Error('Photo storage is not configured. Please create a "photos" bucket in Supabase Storage.');
        }
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // Update baby record with the new photo URL
    await api.updateBaby(babyId, { profile_photo_url: publicUrl });

    return publicUrl;
}
