import React, { useState, useEffect } from 'react';
import { InspectionReport, MetaData, ItemMaster } from '../types';
import { analyzeInspection } from '../services/geminiService';
import { dataService } from '../services/dataService';

export interface InspectionState {
    report: InspectionReport | null;
    summary: string | null;
    previewUrls: string[];
    selectedFiles: File[];
    error: string | null;
}

export const useInspection = (
    history: InspectionReport[],
    setHistory: React.Dispatch<React.SetStateAction<InspectionReport[]>>,
    items: ItemMaster[]
) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [inspectionState, setInspectionState] = useState<InspectionState>({
        report: null,
        summary: null,
        previewUrls: [],
        selectedFiles: [],
        error: null,
    });

    // Cleanup Blob URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            inspectionState.previewUrls.forEach(url => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [inspectionState.previewUrls]);

    const saveToHistory = async (newReport: InspectionReport) => {
        // Optimistic update
        setHistory((prev) => [newReport, ...prev]);
        // Async persistence
        await dataService.saveReport(newReport);
    };

    const updateHistoryReport = async (updatedReport: InspectionReport) => {
        setHistory((prev) => {
            const updatedHistory = prev.map((r) =>
                r.inspection_header.inspection_date_time === updatedReport.inspection_header.inspection_date_time
                    ? updatedReport
                    : r
            );
            // If the current report is the one being updated, update local state too
            if (inspectionState.report?.inspection_header.inspection_date_time === updatedReport.inspection_header.inspection_date_time) {
                setInspectionState(prev => ({ ...prev, report: updatedReport, summary: updatedReport.summary || prev.summary }));
            }
            return updatedHistory;
        });

        await dataService.updateReport(updatedReport);
    };

    const startInspection = async (
        files: File[],
        meta: MetaData,
        selectedItemContext?: ItemMaster | null
    ) => {
        // Import validation at runtime to avoid circular dependencies
        const { validateFiles } = await import('../utils/fileValidation');

        // Validate files before processing
        const validation = validateFiles(files);
        if (validation.errors.length > 0) {
            const errorMsg = validation.errors.map(e => e.error).join('\n');
            setInspectionState((prev) => ({
                ...prev,
                error: errorMsg,
            }));
            return false;
        }

        setIsAnalyzing(true);
        // Create preview URLs
        const objectUrls = validation.valid.map((file) => URL.createObjectURL(file));

        setInspectionState((prev) => ({
            ...prev,
            selectedFiles: validation.valid,
            previewUrls: objectUrls,
            error: null,
        }));

        try {
            const base64Promises = validation.valid.map((file) =>
                new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                })
            );

            const base64Images = await Promise.all(base64Promises);

            const { report, summary } = await analyzeInspection(
                base64Images,
                meta,
                history,
                selectedItemContext || undefined
            );

            // Compress images for history storage (85% size reduction)
            const { compressImages } = await import('../utils/imageCompression');
            const compressedImages = await compressImages(base64Images);

            const fullReport: InspectionReport = {
                ...report,
                imageUrls: compressedImages, // Store compressed thumbnails
                summary: summary,
            };

            await saveToHistory(fullReport);

            setInspectionState((prev) => ({
                ...prev,
                report: fullReport,
                summary,
            }));

            return true; // Success
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            setInspectionState((prev) => ({
                ...prev,
                error: errorMessage || 'Failed to analyze image. Please check API Key and try again.',
            }));
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const addImages = async (
        newFiles: File[],
        currentMeta: MetaData,
        selectedItemContext?: ItemMaster | null
    ) => {
        if (!inspectionState.report) return;

        setIsAnalyzing(true);

        // Optimize: Create Blob URLs for immediate preview
        const newObjectUrls = newFiles.map(file => URL.createObjectURL(file));

        try {
            const existingImages = inspectionState.report.imageUrls || [];

            // Convert new files to Base64 for API and Storage ONLY
            const newBase64Promises = newFiles.map((file) =>
                new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                })
            );
            const newBase64Images = await Promise.all(newBase64Promises);
            const allBase64Images = [...existingImages, ...newBase64Images];

            // Update previews with Blob URLs to save memory
            setInspectionState((prev) => ({
                ...prev,
                selectedFiles: [...prev.selectedFiles, ...newFiles],
                previewUrls: [...prev.previewUrls, ...newObjectUrls],
            }));

            const { report, summary } = await analyzeInspection(
                allBase64Images,
                currentMeta,
                history,
                selectedItemContext || undefined
            );

            // Compress images for history storage (85% size reduction)
            const { compressImages } = await import('../utils/imageCompression');
            const compressedImages = await compressImages(allBase64Images);

            const fullReport: InspectionReport = {
                ...report,
                imageUrls: compressedImages, // Store compressed thumbnails
                summary: summary,
                inspection_header: {
                    ...report.inspection_header,
                    inspection_date_time: inspectionState.report.inspection_header.inspection_date_time || report.inspection_header.inspection_date_time,
                },
            };

            await updateHistoryReport(fullReport);

            setInspectionState((prev) => ({
                ...prev,
                report: fullReport,
                summary,
            }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            // Cleanup on error
            newObjectUrls.forEach(url => URL.revokeObjectURL(url));

            setInspectionState((prev) => ({
                ...prev,
                error: errorMessage || 'Failed to analyze new images. Please try again.',
            }));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resetInspection = () => {
        // Cleanup Blob URLs before resetting
        inspectionState.previewUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });

        setInspectionState({
            report: null,
            summary: null,
            previewUrls: [],
            selectedFiles: [],
            error: null,
        });
    };

    const setLoadedReport = (report: InspectionReport) => {
        setInspectionState({
            report,
            summary: report.summary || "Summary not available.",
            previewUrls: report.imageUrls || [],
            selectedFiles: [],
            error: null
        });
    };

    return {
        isAnalyzing,
        inspectionState,
        startInspection,
        addImages,
        resetInspection,
        setLoadedReport,
        updateHistoryReport // Exposed mostly for manual saves if needed elsewhere
    };
};
