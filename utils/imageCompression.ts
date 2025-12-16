/**
 * Image Compression Utilities
 * 
 * Provides compression for storing images efficiently in history.
 * Uses smaller dimensions and lower quality for thumbnails while
 * maintaining full resolution for AI analysis.
 */

export interface CompressionOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number; // 0-1
    format: 'image/jpeg' | 'image/webp';
}

// History thumbnails: Small, efficient for storage
export const HISTORY_COMPRESSION: CompressionOptions = {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.6,
    format: 'image/jpeg',
};

// Full resolution for AI analysis (already exists in geminiService)
export const ANALYSIS_COMPRESSION: CompressionOptions = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'image/jpeg',
};

/**
 * Compresses a base64 image to specified dimensions and quality
 * Returns a new base64 string with reduced size
 */
export const compressImage = (
    base64Input: string,
    options: CompressionOptions = HISTORY_COMPRESSION
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions maintaining aspect ratio
                if (width > options.maxWidth || height > options.maxHeight) {
                    const ratio = Math.min(
                        options.maxWidth / width,
                        options.maxHeight / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw with smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to compressed format
                const compressedDataUrl = canvas.toDataURL(options.format, options.quality);
                resolve(compressedDataUrl);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for compression'));
        };

        img.src = base64Input;
    });
};

/**
 * Compresses multiple images in parallel
 */
export const compressImages = async (
    base64Images: string[],
    options: CompressionOptions = HISTORY_COMPRESSION
): Promise<string[]> => {
    return Promise.all(
        base64Images.map(img => compressImage(img, options))
    );
};

/**
 * Estimates the size of a base64 string in bytes
 */
export const estimateBase64Size = (base64: string): number => {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',')
        ? base64.split(',')[1] || base64
        : base64;

    // Base64 encoding: 4 characters = 3 bytes
    // Account for padding
    const padding = (base64Data.match(/=+$/) || [''])[0]?.length || 0;
    return Math.floor((base64Data.length * 3) / 4) - padding;
};

/**
 * Formats bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + (sizes[i] || 'Bytes');
};

/**
 * Calculates compression ratio
 */
export const getCompressionStats = (
    originalBase64: string,
    compressedBase64: string
): { originalSize: number; compressedSize: number; savings: number; ratio: string } => {
    const originalSize = estimateBase64Size(originalBase64);
    const compressedSize = estimateBase64Size(compressedBase64);
    const savings = ((originalSize - compressedSize) / originalSize) * 100;

    return {
        originalSize,
        compressedSize,
        savings,
        ratio: `${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${savings.toFixed(1)}% smaller)`,
    };
};
