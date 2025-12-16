import { renderHook, act } from '@testing-library/react';
import { useInspection } from './useInspection';
import { describe, it, expect, vi } from 'vitest';

// Mock services
vi.mock('../services/geminiService', () => ({
    analyzeInspection: vi.fn(),
}));

vi.mock('../services/dataService', () => ({
    dataService: {
        saveReport: vi.fn(),
        updateReport: vi.fn(),
    },
}));

describe('useInspection', () => {
    it('initializes with default state', () => {
        const { result } = renderHook(() => useInspection([], vi.fn(), []));

        expect(result.current.isAnalyzing).toBe(false);
        expect(result.current.inspectionState.report).toBeNull();
        expect(result.current.inspectionState.selectedFiles).toHaveLength(0);
    });

    it('resets inspection state', () => {
        const { result } = renderHook(() => useInspection([], vi.fn(), []));

        act(() => {
            result.current.resetInspection();
        });

        expect(result.current.inspectionState.report).toBeNull();
        expect(result.current.inspectionState.error).toBeNull();
    });
});
