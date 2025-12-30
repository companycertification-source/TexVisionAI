import { useState } from 'react';
import { AppState } from '../types';

export const useAppNavigation = () => {
    const [step, setStep] = useState<AppState['step']>('login');
    const [previousStep, setPreviousStep] = useState<AppState['step'] | undefined>();

    const login = () => setStep('input');
    const logout = () => {
        setStep('login');
        setPreviousStep(undefined);
    };

    const goHome = () => {
        setStep('input');
        setPreviousStep(undefined);
    };

    const goToHistory = () => setStep('history');
    const goToSuppliers = () => setStep('suppliers');
    const goToItems = () => setStep('items');
    const goToInspectors = () => setStep('inspectors');
    const goToAdmin = () => setStep('admin');
    const goToSchedule = () => setStep('schedule');

    const goToReport = () => {
        // Logic from App.tsx: when viewing a report, we want to know where we came from
        // to go back there.
        setPreviousStep(step);
        setStep('report');
    };

    const goBack = () => {
        setStep(previousStep || 'input');
        setPreviousStep(undefined);
    };

    return {
        step,
        login,
        logout,
        goHome,
        goToHistory,
        goToSuppliers,
        goToItems,
        goToInspectors,
        goToAdmin,
        goToSchedule,
        goToReport,
        goBack
    };
};
