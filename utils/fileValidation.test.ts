import { describe, it, expect } from 'vitest';
import { validateFiles, formatFileSize, FILE_VALIDATION } from './fileValidation';

describe('fileValidation', () => {
    describe('validateFiles', () => {
        it('should accept valid image files', () => {
            const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const result = validateFiles([validFile]);

            expect(result.valid).toHaveLength(1);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject files that are too large', () => {
            const largeContent = new Array(FILE_VALIDATION.MAX_FILE_SIZE + 1).fill('a').join('');
            const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
            const result = validateFiles([largeFile]);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]?.error).toContain('too large');
        });

        it('should reject unsupported file types', () => {
            const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const result = validateFiles([invalidFile]);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]?.error).toContain('unsupported type');
        });

        it('should reject when file count exceeds limit', () => {
            const files = Array(11).fill(null).map((_, i) =>
                new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
            );
            const result = validateFiles(files);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]?.error).toContain('Maximum');
        });

        it('should handle multiple files with mixed validity', () => {
            const validFile = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });
            const invalidFile = new File(['test'], 'invalid.pdf', { type: 'application/pdf' });
            const result = validateFiles([validFile, invalidFile]);

            expect(result.valid).toHaveLength(1);
            expect(result.errors).toHaveLength(1);
        });
    });

    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            expect(formatFileSize(0)).toBe('0 Bytes');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
        });
    });
});
