/**
 * Supabase Storage Service
 * 
 * Handles image uploads to Supabase Storage buckets for efficient,
 * scalable image storage instead of storing base64 in the database.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET_NAME = 'inspection-images';

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

/**
 * Checks if Supabase Storage is available
 */
export const isStorageConfigured = (): boolean => {
    return isSupabaseConfigured() && supabase !== null;
};

/**
 * Converts base64 to Blob for upload
 */
const base64ToBlob = (base64: string): Blob => {
    // Extract mime type and data
    const match = base64.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid base64 string format');
    }

    const mimeType = match[1] || 'image/jpeg';
    const base64Data = match[2] || '';

    // Decode base64
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

/**
 * Generates a unique filename for the image
 */
const generateFileName = (inspectionId: string, imageIndex: number): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${inspectionId}/${timestamp}_${imageIndex}_${random}.jpg`;
};

/**
 * Uploads a single image to Supabase Storage
 */
export const uploadImage = async (
    base64Image: string,
    inspectionId: string,
    imageIndex: number = 0
): Promise<UploadResult> => {
    if (!isStorageConfigured() || !supabase) {
        return {
            success: false,
            error: 'Supabase Storage not configured. Using base64 fallback.',
        };
    }

    try {
        const blob = base64ToBlob(base64Image);
        const fileName = generateFileName(inspectionId, imageIndex);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) {
            // Check if bucket doesn't exist
            if (error.message?.includes('not found') || error.message?.includes('bucket')) {
                return {
                    success: false,
                    error: `Storage bucket "${BUCKET_NAME}" not found. Please create it in Supabase Dashboard.`,
                };
            }
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return {
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
        return {
            success: false,
            error: errorMessage,
        };
    }
};

/**
 * Uploads multiple images to Supabase Storage
 */
export const uploadImages = async (
    base64Images: string[],
    inspectionId: string
): Promise<{
    urls: string[];
    errors: string[];
    usedFallback: boolean;
}> => {
    const urls: string[] = [];
    const errors: string[] = [];

    // If storage not configured, return base64 as fallback
    if (!isStorageConfigured()) {
        return {
            urls: base64Images, // Return original base64 strings
            errors: ['Supabase Storage not configured. Using base64 storage.'],
            usedFallback: true,
        };
    }

    // Upload all images in parallel
    const results = await Promise.all(
        base64Images.map((img, index) => uploadImage(img, inspectionId, index))
    );

    results.forEach((result, index) => {
        if (result.success && result.url) {
            urls.push(result.url);
        } else {
            // On error, keep original base64 as fallback
            urls.push(base64Images[index] || '');
            if (result.error) {
                errors.push(`Image ${index + 1}: ${result.error}`);
            }
        }
    });

    return {
        urls,
        errors,
        usedFallback: errors.length > 0,
    };
};

/**
 * Deletes an image from Supabase Storage
 */
export const deleteImage = async (path: string): Promise<boolean> => {
    if (!isStorageConfigured() || !supabase) {
        return false;
    }

    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        return !error;
    } catch {
        return false;
    }
};

/**
 * Deletes all images for an inspection
 */
export const deleteInspectionImages = async (inspectionId: string): Promise<boolean> => {
    if (!isStorageConfigured() || !supabase) {
        return false;
    }

    try {
        const { data: files, error: listError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(inspectionId);

        if (listError || !files) {
            return false;
        }

        const filePaths = files.map(file => `${inspectionId}/${file.name}`);

        if (filePaths.length === 0) {
            return true;
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

        return !error;
    } catch {
        return false;
    }
};

/**
 * Gets storage usage statistics (if available)
 */
export const getStorageStats = async (): Promise<{
    totalFiles: number;
    estimatedSize: string;
} | null> => {
    if (!isStorageConfigured() || !supabase) {
        return null;
    }

    try {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list('', { limit: 1000 });

        if (error || !data) {
            return null;
        }

        // Estimate based on file count (rough estimate)
        const avgFileSize = 75 * 1024; // 75KB average for compressed images
        const estimatedBytes = data.length * avgFileSize;

        const formatBytes = (bytes: number) => {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        };

        return {
            totalFiles: data.length,
            estimatedSize: formatBytes(estimatedBytes),
        };
    } catch {
        return null;
    }
};
