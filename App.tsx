import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { InspectionForm } from './components/InspectionForm';
import { ReportView } from './components/ReportView';
import { LoginView } from './components/LoginView';
import { HistoryView } from './components/HistoryView';
import { SupplierView } from './components/SupplierView';
import { ItemCenter } from './components/ItemCenter';
import { InspectorView } from './components/InspectorView';
import { AdminPanel } from './components/AdminPanel';
// Lazy load ScheduleMonitor to prevent initialization order issues
// Lazy load ScheduleMonitor and WorkStationCenter
const ScheduleMonitor = lazy(() => import('./components/ScheduleMonitor'));
const WorkStationCenter = lazy(() => import('./components/WorkStationCenter'));
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';
import { useRole } from './contexts/RoleContext';
import { dataService } from './services/dataService';
import { getWorkStations } from './services/scheduleService';
import { MetaData, InspectionReport, ItemMaster, WorkStation } from './types';
import { Shield, Scissors, Activity, LayoutDashboard, Shirt, Users, UserCheck, Camera, LogOut, Settings, Clock, Factory } from 'lucide-react';
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
  // Auth & Role State
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const { isAdmin, role, isLoading: isRoleLoading, isManager: roleIsManager } = useRole();
  // Admins have access to all modules, managers have access to management modules
  const isManager = isAdmin || roleIsManager || role === 'manager';

  // Navigation State
  const { step, login, logout, goHome, goToHistory, goToSuppliers, goToItems, goToInspectors, goToAdmin, goToSchedule, goToWorkStations, goToReport, goBack } = useAppNavigation();

  // Data State
  const [history, setHistory] = useState<InspectionReport[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [baseSuppliers, setBaseSuppliers] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // App Context State
  const [meta, setMeta] = useState<MetaData>({
    inspection_type: 'incoming',
    supplier_name: 'FabriCo Ltd',
    brand: 'FabriCo',
    style_number: '',
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

  // Sync navigation with auth state
  useEffect(() => {
    if (isAuthenticated && user && step === 'login') {
      console.log('[App] Auth synced, jumping to input');
      setMeta(prev => ({ ...prev, inspector_name: user.name || prev.inspector_name }));
      login();
    }
  }, [isAuthenticated, user, step, login]);

  // Optimized Data Load
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isAuthenticated) return;

      console.log('[App] Starting optimized data load...');
      setIsDataLoading(true);

      try {
        const results = await Promise.race([
          Promise.all([
            dataService.getItems().catch(() => []),
            dataService.getHistory().catch(() => []),
            dataService.getSuppliers().catch(() => []),
            getWorkStations().catch(() => [])
          ]),
          new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Data timeout')), 4000))
        ]);

        if (results) {
          setItems(results[0]);
          setHistory(results[1]);
          setBaseSuppliers(results[2]);
          setWorkStations(results[3]);
          console.log('[App] Data loaded successfully');
        }
      } catch (error) {
        console.warn('[App] Data load constrained:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated]);

  // Derived Data
  const suppliers = useMemo(() => {
    const historySuppliers = history.map(h => h.inspection_header.supplier_name);
    return Array.from(new Set([...baseSuppliers, ...historySuppliers])).sort();
  }, [history, baseSuppliers]);

  const currentReportItem = useMemo(() => {
    if (!inspectionState.report) return undefined;
    return items.find(i => i.code === inspectionState.report!.inspection_header.style_number);
  }, [inspectionState.report, items]);

  // Handlers
  const handleLoginSuccess = useCallback(() => {
    if (user) setMeta(prev => ({ ...prev, inspector_name: user.name }));
    login();
  }, [user, login]);

  const handleLogout = useCallback(async () => {
    console.log('[App] Logout sequence initiated');
    try {
      await authLogout(); // Should be non-blocking now
      logout(); // Nav reset
      goHome();
    } catch (error) {
      console.error('[App] Logout error:', error);
    }
  }, [authLogout, logout, goHome]);

  const handleStartInspection = async (newMeta: MetaData, files: File[]) => {
    setMeta(newMeta);
    const success = await startInspection(files, newMeta, selectedItemContext);
    if (success) goToReport();
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
    const contextItem = items.find(i => i.code === report.inspection_header.style_number);
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
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Scissors className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight">TexVision AI</span>
                <span className="text-xs block text-slate-400 font-light">Textile Inspection Portal</span>
              </div>
            </div>

            {isAuthenticated && (
              <div className="flex items-center space-x-2 md:space-x-6">
                <button onClick={handleNewInspection} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'input' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Inspect</span>
                </button>
                <button onClick={goToHistory} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'history' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <button onClick={goToItems} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'items' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Shirt className="w-4 h-4" />
                  <span className="hidden lg:inline">Items</span>
                </button>
                <button onClick={goToSuppliers} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'suppliers' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                  <Users className="w-4 h-4" />
                  <span className="hidden lg:inline">Vendors</span>
                </button>
                <button onClick={goToInspectors} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'inspectors' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                  <UserCheck className="w-4 h-4" />
                  <span className="hidden lg:inline">Performance</span>
                </button>

                {isManager && (
                  <>
                    <button onClick={goToSchedule} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'schedule' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                      <Clock className="w-4 h-4" />
                      <span className="hidden lg:inline">Schedule</span>
                    </button>
                    <button onClick={goToWorkStations} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'workstations' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                      <Factory className="w-4 h-4" />
                      <span className="hidden lg:inline">Stations</span>
                    </button>
                  </>
                )}

                {isAdmin && (
                  <button onClick={goToAdmin} className={`flex items-center gap-2 text-sm font-medium transition-colors ${step === 'admin' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                    <Settings className="w-4 h-4" />
                    <span className="hidden lg:inline">Admin</span>
                  </button>
                )}

                <div className="h-4 w-px bg-slate-700 mx-2"></div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="hidden sm:block">
                    <UserAvatar name={user?.name || meta.inspector_name || 'User'} />
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors" title="Logout">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
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
            <p className="text-sm font-medium text-red-800">{inspectionState.error}</p>
          </div>
        )}

        {(!isAuthenticated || step === 'login') && (
          <ErrorBoundary>
            <LoginView onLoginSuccess={handleLoginSuccess} />
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'input' && (
          <ErrorBoundary>
            <div className="animate-fadeIn">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900">Textile Quality Inspection</h1>
                <p className="mt-2 text-lg text-gray-600">Automated fabric & garment verification via AI.</p>
              </div>
              <InspectionForm
                onSubmit={handleStartInspection}
                isAnalyzing={isAnalyzing}
                inspectorName={meta.inspector_name}
                suppliers={suppliers}
                items={items}
                workStations={workStations}
                onItemSelect={setSelectedItemContext}
              />
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <FeatureCard icon={<Shield className="w-8 h-8 text-blue-500" />} title="Defect Detection" desc="AI identifies stains, tears, and stitching issues." />
                <FeatureCard icon={<Scissors className="w-8 h-8 text-orange-500" />} title="Label Validation" desc="Cross-check care labels and style numbers." />
                <FeatureCard icon={<Activity className="w-8 h-8 text-green-500" />} title="Trend Analysis" desc="Track quality records over time." />
              </div>
            </div>
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'report' && inspectionState.report && (
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

        {isAuthenticated && step === 'history' && (
          <ErrorBoundary>
            <HistoryView history={history} onViewReport={handleSelectHistoryReport} onBack={handleManualReset} />
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'items' && (
          <ErrorBoundary>
            <ItemCenter items={items} history={history} suppliers={suppliers} onBack={handleManualReset} onSaveItem={handleSaveItem} onDeleteItem={handleDeleteItem} />
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'suppliers' && (
          <ErrorBoundary>
            <SupplierView history={history} onBack={handleManualReset} onViewReport={handleSelectHistoryReport} />
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'inspectors' && (
          <ErrorBoundary>
            <InspectorView history={history} currentInspector={meta.inspector_name} onBack={handleManualReset} onViewReport={handleSelectHistoryReport} />
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'schedule' && isManager && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
              <ScheduleMonitor onBack={handleManualReset} />
            </Suspense>
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'workstations' && isManager && (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>}>
              <WorkStationCenter onBack={handleManualReset} />
            </Suspense>
          </ErrorBoundary>
        )}

        {isAuthenticated && step === 'admin' && isAdmin && (
          <ErrorBoundary>
            <AdminPanel onClose={handleManualReset} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default App;