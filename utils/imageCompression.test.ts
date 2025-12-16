import { describe, it, expect } from 'vitest';
import { estimateBase64Size, formatBytes, getCompressionStats } from './imageCompression';

describe('imageCompression', () => {
    describe('estimateBase64Size', () => {
        it('should estimate size of a base64 string', () => {
            // 100 base64 characters ≈ 75 bytes
            const base64 = 'a'.repeat(100);
            const size = estimateBase64Size(base64);
            expect(size).toBeGreaterThan(70);
            expect(size).toBeLessThan(80);
        });

        it('should handle data URL prefix', () => {
            const base64WithPrefix = 'data:image/jpeg;base64,' + 'a'.repeat(100);
            const size = estimateBase64Size(base64WithPrefix);
            expect(size).toBeGreaterThan(70);
            expect(size).toBeLessThan(80);
        });
    });

    describe('formatBytes', () => {
        it('should format bytes correctly', () => {
            expect(formatBytes(0)).toBe('0 Bytes');
            expect(formatBytes(500)).toBe('500 Bytes');
            expect(formatBytes(1024)).toBe('1 KB');
            expect(formatBytes(1536)).toBe('1.5 KB');
            expect(formatBytes(1048576)).toBe('1 MB');
            expect(formatBytes(1572864)).toBe('1.5 MB');
        });
    });

    describe('getCompressionStats', () => {
        it('should calculate compression statistics', () => {
            const original = 'data:image/jpeg;base64,' + 'a'.repeat(1000);
            const compressed = 'data:image/jpeg;base64,' + 'a'.repeat(100);

            const stats = getCompressionStats(original, compressed);

            expect(stats.originalSize).toBeGreaterThan(stats.compressedSize);
            expect(stats.savings).toBeGreaterThan(80);
            expect(stats.ratio).toContain('smaller');
        });
    });

    // Note: compressImage requires DOM (canvas) and must be tested in browser
    // or with jsdom properly configured with canvas support
});
