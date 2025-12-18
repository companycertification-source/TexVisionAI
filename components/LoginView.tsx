import React, { useState } from 'react';
import { Shield, UserCheck, Info, X, Camera, Cpu, FileCheck, Zap, ScanEye, History, ArrowRight, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, loginWithGoogle, demoLogin, isLoading, error, clearError } = useAuth();

  const [showInfo, setShowInfo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(email, password);
    if (success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleDemoLogin = () => {
    demoLogin();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <>
      <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fadeIn">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-slate-900 p-8 text-center relative">
            {/* How it Works button in header */}
            <button
              onClick={() => setShowInfo(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition-all shadow-md hover:shadow-lg border border-slate-700"
            >
              <Info className="w-4 h-4" />
              How it Works
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">WeldVision AI</h1>
            <p className="text-slate-400 mt-2 font-medium">Quality Control & Inspection Portal</p>
            <p className="text-slate-500 text-xs mt-4 leading-relaxed border-t border-slate-800 pt-4">
              Streamline quality control with AI-powered visual inspection for incoming and finished welding electrodes.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Secure Login</h2>
              <p className="text-sm text-gray-500">Authorized Personnel Only</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all shadow-md text-white ${isLoading || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Google Login Button */}
              <button
                type="button"
                onClick={loginWithGoogle}
                disabled={isLoading}
                aria-label="Continue with Google"
                className="flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all text-sm disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                Demo Login
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400">
                Demo credentials: any email with password "demo123"
              </p>
              <p className="text-xs text-gray-400">
                System v2.5.1 • Powered by Gemini AI • Build: 2025-12-18
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Infographic Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative flex flex-col">

            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
                  <p className="text-xs text-gray-500">End-to-end Automated Quality Control</p>
                </div>
              </div>
              <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10">

              {/* 1. The Workflow (Infographic Style) */}
              <section>
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-gray-900">How WeldVision Works</h3>
                  <p className="text-gray-500 text-sm">Three simple steps from physical stock to digital insight.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                  {/* Connecting Line (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 -z-10"></div>

                  {/* Step 1 */}
                  <div className="relative flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-blue-100 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-blue-600" />
                      </div>
                    </div>
                    <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full absolute top-0 right-1/4 translate-x-2">STEP 1</div>
                    <h4 className="font-bold text-gray-900 mb-2">Configure & Capture</h4>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                      Select context (Incoming/FG), calculate ISO 2859-1 sample sizes, and capture images of electrodes or cartons.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-purple-100 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
                        <Cpu className="w-10 h-10 text-purple-600" />
                      </div>
                    </div>
                    <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full absolute top-0 right-1/4 translate-x-2">STEP 2</div>
                    <h4 className="font-bold text-gray-900 mb-2">Gemini 2.5 Analysis</h4>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                      Vision model detects defects (dents, coating issues), verifies against Item Master standards, and reads OCR text.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-green-100 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                        <FileCheck className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full absolute top-0 right-1/4 translate-x-2">STEP 3</div>
                    <h4 className="font-bold text-gray-900 mb-2">Decision & Analytics</h4>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                      Instant Accept/Reject based on AQL. Updates vendor performance scorecards and generates traceability logs.
                    </p>
                  </div>
                </div>
              </section>

              {/* 2. Key Benefits (Grid) */}
              <section className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold text-gray-900">Why Use WeldVision?</h3>
                  <p className="text-gray-500 text-sm">Replacing manual subjectivity with digital precision.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <Zap className="w-8 h-8 text-yellow-500 mb-3" />
                    <h5 className="font-bold text-gray-900 mb-1">10x Faster</h5>
                    <p className="text-xs text-gray-500">Reduce inspection time from minutes to seconds with instant analysis.</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <ScanEye className="w-8 h-8 text-blue-500 mb-3" />
                    <h5 className="font-bold text-gray-900 mb-1">Standardized</h5>
                    <p className="text-xs text-gray-500">Consistent judgment based on ISO 2859-1 standards and visual benchmarks.</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <History className="w-8 h-8 text-purple-500 mb-3" />
                    <h5 className="font-bold text-gray-900 mb-1">Vendor History</h5>
                    <p className="text-xs text-gray-500">Track supplier performance over time to negotiate better terms.</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <Shield className="w-8 h-8 text-green-500 mb-3" />
                    <h5 className="font-bold text-gray-900 mb-1">Full Traceability</h5>
                    <p className="text-xs text-gray-500">Every decision is logged with images, timestamps, and inspector IDs.</p>
                  </div>
                </div>
              </section>

              {/* Call to Action */}
              <div className="text-center">
                <button
                  onClick={() => { setShowInfo(false); handleDemoLogin(); }}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:-translate-y-1"
                >
                  Try the Live Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};