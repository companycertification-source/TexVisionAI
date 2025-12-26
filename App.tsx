import React, { useState, useEffect, useMemo } from 'react';
import { InspectionForm } from './components/InspectionForm';
import { ReportView } from './components/ReportView';
import { LoginView } from './components/LoginView';
import { HistoryView } from './components/HistoryView';
import { SupplierView } from './components/SupplierView';
import { ItemCenter } from './components/ItemCenter';
import { InspectorView } from './components/InspectorView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { dataService } from './services/dataService';
import { MetaData, InspectionReport, ItemMaster } from './types';
import { Shield, Hammer, Activity, LayoutDashboard, Package, Users, UserCheck, Camera, LogOut } from 'lucide-react';
import { useInspection } from './hooks/useInspection';
import { useAppNavigation } from './hooks/useAppNavigation';

const UserAvatar = ({ name }: { name: string }) => (
  <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-600 cursor-default" title={name}>
    {name.charAt(0).toUpperCase()}
  </div>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const App: React.FC = () => {
  // Auth State
  const { user, isAuthenticated, logout: authLogout } = useAuth();

  // Navigation State
  const { step, login, logout, goHome, goToHistory, goToSuppliers, goToItems, goToInspectors, goToReport, goBack } = useAppNavigation();

  // Data State
  const [history, setHistory] = useState<InspectionReport[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [baseSuppliers, setBaseSuppliers] = useState<string[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  // App Context State
  const [meta, setMeta] = useState<MetaData>({
    inspection_type: 'incoming',
    supplier_name: 'Shanghai Industries (Pvt) Ltd.',
    brand: 'Shanghai Industries',
    product_code: '',
    po_number: '',
    inspector_name: '',
    spec_limits: '',
  });
  const [selectedItemContext, setSelectedItemContext] = useState<ItemMaster | null>(null);

  // Inspection Logic Hook
  const {
    isAnalyzing,
    inspectionState,
    startInspection,
    addImages,
    resetInspection,
    setLoadedReport,
    updateHistoryReport
  } = useInspection(history, setHistory, items);

  // Sync navigation with auth state (handles OAuth redirect)
  useEffect(() => {
    if (isAuthenticated && user && step === 'login') {
      console.log('[App] User authenticated, navigating to input step');
      setMeta(prev => ({ ...prev, inspector_name: user.name }));
      login();
    }
  }, [isAuthenticated, user, step, login]);

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyData, itemsData, suppliersData] = await Promise.all([
          dataService.getHistory(),
          dataService.getItems(),
          dataService.getSuppliers()
        ]);

        setHistory(historyData);
        setItems(itemsData);
        setBaseSuppliers(suppliersData);
        setIsHistoryLoaded(true);
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    };
    loadData();
  }, []);

  // Derived Data
  const suppliers = useMemo(() => {
    const historySuppliers = history.map(h => h.inspection_header.supplier_name);
    return Array.from(new Set([...baseSuppliers, ...historySuppliers])).sort();
  }, [history, baseSuppliers]);

  const currentReportItem = useMemo(() => {
    if (!inspectionState.report) return undefined;
    return items.find(i => i.code === inspectionState.report!.inspection_header.product_code);
  }, [inspectionState.report, items]);

  // Handlers
  const handleLoginSuccess = () => {
    if (user) {
      setMeta(prev => ({ ...prev, inspector_name: user.name }));
    }
    login();
  };

  const handleLogout = async () => {
    await authLogout();
    logout();
  };

  const handleStartInspection = async (newMeta: MetaData, files: File[]) => {
    setMeta(newMeta);
    const success = await startInspection(files, newMeta, selectedItemContext);
    if (success) {
      goToReport();
    }
  };

  const handleManualReset = () => {
    resetInspection();
    goBack();
  };

  const handleNewInspection = () => {
    resetInspection();
    goHome();
  };

  const handleSelectHistoryReport = (report: InspectionReport) => {
    const contextItem = items.find(i => i.code === report.inspection_header.product_code);
    setSelectedItemContext(contextItem || null);

    setLoadedReport(report);
    goToReport();
  };

  const handleSaveItem = async (newItem: ItemMaster) => {
    const success = await dataService.saveItem(newItem);
    if (success) {
      const updatedItems = await dataService.getItems();
      setItems(updatedItems);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const success = await dataService.deleteItem(itemId);
    if (success) {
      const updatedItems = await dataService.getItems();
      setItems(updatedItems);
    }
  };

  const handleAddImagesWrapper = (newFiles: File[]) => {
    addImages(newFiles, meta, selectedItemContext);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={step !== 'login' ? handleManualReset : undefined}>
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight">WeldVision AI</span>
                <span className="text-xs block text-slate-400 font-light">Intelligent Quality Control</span>
              </div>
            </div>
            {step !== 'login' && (
              <div className="flex items-center space-x-4 md:space-x-6">
                <button
                  onClick={handleNewInspection}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'input' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">New Inspection</span>
                </button>
                <button
                  onClick={goToHistory}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'history' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Inspection Center</span>
                </button>
                <button
                  onClick={goToItems}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'items' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Item Center</span>
                </button>
                <button
                  onClick={goToSuppliers}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'suppliers' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Vendor Center</span>
                </button>
                <button
                  onClick={goToInspectors}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'inspectors' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">My Performance</span>
                </button>

                <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <UserAvatar name={user?.name || meta.inspector_name || 'Inspector'} />
                  <button onClick={handleLogout} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {inspectionState.error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fadeIn">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm leading-5 font-medium text-red-800">
                  Analysis Error
                </h3>
                <div className="mt-2 text-sm leading-5 text-red-700">
                  <p>{inspectionState.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(step === 'login' || !isAuthenticated) && (
          <ErrorBoundary>
            <LoginView onLoginSuccess={handleLoginSuccess} />
          </ErrorBoundary>
        )}

        {step === 'input' && (
          <ErrorBoundary>
            <div className="animate-fadeIn">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900">Visual Quality Inspection</h1>
                <p className="mt-2 text-lg text-gray-600">Upload package or electrode images for instant defect detection and reporting.</p>
              </div>
              <InspectionForm
                onSubmit={handleStartInspection}
                isAnalyzing={isAnalyzing}
                inspectorName={meta.inspector_name}
                suppliers={suppliers}
                items={items}
                onItemSelect={setSelectedItemContext}
              />

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <FeatureCard icon={<Shield className="w-8 h-8 text-blue-500" />} title="Defect Detection" desc="Automatically identifies dents, tears, and coating issues." />
                <FeatureCard icon={<Hammer className="w-8 h-8 text-orange-500" />} title="OCR & Validation" desc="Extracts batch numbers and validates branding." />
                <FeatureCard icon={<Activity className="w-8 h-8 text-green-500" />} title="Trend Analysis" desc="Tracks supplier quality performance over time." />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {step === 'report' && inspectionState.report && inspectionState.previewUrls.length > 0 && (
          <ErrorBoundary>
            <ReportView
              report={inspectionState.report}
              summary={inspectionState.summary || ""}
              previewUrls={inspectionState.previewUrls}
              referenceItem={currentReportItem}
              history={history}
              isProcessing={isAnalyzing}
              onReset={handleManualReset}
              onSave={updateHistoryReport}
              onAddImages={handleAddImagesWrapper}
            />
          </ErrorBoundary>
        )}

        {step === 'history' && (
          <ErrorBoundary>
            <HistoryView
              history={history}
              onViewReport={handleSelectHistoryReport}
              onBack={handleManualReset}
            />
          </ErrorBoundary>
        )}

        {step === 'suppliers' && (
          <ErrorBoundary>
            <SupplierView
              history={history}
              onBack={handleManualReset}
              onViewReport={handleSelectHistoryReport}
            />
          </ErrorBoundary>
        )}

        {step === 'items' && (
          <ErrorBoundary>
            <ItemCenter
              items={items}
              history={history}
              suppliers={suppliers}
              onBack={handleManualReset}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
            />
          </ErrorBoundary>
        )}

        {step === 'inspectors' && (
          <ErrorBoundary>
            <InspectorView
              history={history}
              currentInspector={meta.inspector_name}
              onBack={handleManualReset}
              onViewReport={handleSelectHistoryReport}
            />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default App;