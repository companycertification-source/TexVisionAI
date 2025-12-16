// File validation utilities

export const FILE_VALIDATION = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 10,
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

export interface FileValidationError {
    file: File;
    error: string;
}

export interface FileValidationResult {
    valid: File[];
    errors: FileValidationError[];
}

/**
 * Validates uploaded files for size, type, and count
 */
export const validateFiles = (
    files: File[],
    existingCount: number = 0
): FileValidationResult => {
    const result: FileValidationResult = {
        valid: [],
        errors: [],
    };

    // Check total file count
    if (files.length + existingCount > FILE_VALIDATION.MAX_FILES) {
        return {
            valid: [],
            errors: [
                {
                    file: files[0]!,
                    error: `Maximum ${FILE_VALIDATION.MAX_FILES} files allowed. You're trying to upload ${files.length + existingCount} files.`,
                },
            ],
        };
    }

    files.forEach((file) => {
        // Check file size
        if (file.size > FILE_VALIDATION.MAX_FILE_SIZE) {
            result.errors.push({
                file,
                error: `File "${file.name}" is too large. Maximum size is ${FILE_VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB.`,
            });
            return;
        }

        // Check file type
        if (!(FILE_VALIDATION.ALLOWED_TYPES as readonly string[]).includes(file.type)) {
            result.errors.push({
                file,
                error: `File "${file.name}" has unsupported type. Allowed types: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`,
            });
            return;
        }

        // File is valid
        result.valid.push(file);
    });

    return result;
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validates a single file for dimensions (optional, for image-specific validation)
 */
export const validateImageDimensions = async (
    file: File,
    maxWidth: number = 4096,
    maxHeight: number = 4096
): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            if (img.width > maxWidth || img.height > maxHeight) {
                resolve({
                    valid: false,
                    error: `Image dimensions too large. Maximum: ${maxWidth}x${maxHeight}px, Got: ${img.width}x${img.height}px`,
                });
            } else {
                resolve({ valid: true });
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({
                valid: false,
                error: 'Failed to load image',
            });
        };

        img.src = url;
    });
};
