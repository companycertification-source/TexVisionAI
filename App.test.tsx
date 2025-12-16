import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// Mock hooks to isolate App component
vi.mock('./hooks/useInspection', () => ({
    useInspection: () => ({
        isAnalyzing: false,
        inspectionState: { report: null, previewUrls: [], selectedFiles: [], error: null },
        startInspection: vi.fn(),
        addImages: vi.fn(),
        resetInspection: vi.fn(),
        setLoadedReport: vi.fn(),
        updateHistoryReport: vi.fn(),
    }),
}));

vi.mock('./hooks/useAppNavigation', () => ({
    useAppNavigation: () => ({
        step: 'login',
        login: vi.fn(),
        logout: vi.fn(),
        goHome: vi.fn(),
        goToHistory: vi.fn(),
        goToSuppliers: vi.fn(),
        goToItems: vi.fn(),
        goToInspectors: vi.fn(),
        goToReport: vi.fn(),
        goBack: vi.fn(),
    })
}));

// Mock services
vi.mock('./services/dataService', () => ({
    dataService: {
        getHistory: vi.fn().mockResolvedValue([]),
        getItems: vi.fn().mockResolvedValue([]),
        getSuppliers: vi.fn().mockResolvedValue([]),
    },
}));

describe('App', () => {
    it('renders login screen by default', () => {
        // Suppress act() warnings for async useEffect data loading
        const originalError = console.error;
        console.error = (...args: any[]) => {
            if (args[0]?.includes?.('Warning: An update to') && args[0]?.includes?.('act')) return;
            originalError(...args);
        };

        render(<App />);
        expect(screen.getByText(/WeldVision AI/i)).toBeInTheDocument();

        console.error = originalError;
    });
});
