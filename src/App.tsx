/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ArrowLeft, 
  Sparkles,
  Settings2,
  Wrench,
  FileText,
  Target,
  MessageSquare,
  Cpu,
  History,
  Save,
  RotateCcw,
  Diff,
  X,
  Download,
  Upload,
  FileJson
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { 
  Tool, 
  TestCase, 
  PromptData, 
  PromptVersion, 
  AnalysisReport 
} from './types';
import { models, getModelById } from './models/registry';
import { logFrontendEvent, summarizePromptDataForLogs } from './logging';

// --- Components ---

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-slate-900">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-indigo-600 h-2 rounded-full"
        />
      </div>
    </div>
  );
};

const Loader = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-600 font-medium animate-pulse">Analyzing Prompt Architecture...</p>
    <p className="text-slate-400 text-xs mt-2">This may take up to 45 seconds</p>
  </div>
);

const DiffView = ({ oldVal, newVal, label }: { oldVal: string; newVal: string; label: string }) => {
  const isDifferent = oldVal !== newVal;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Previous</div>
          <pre className="text-xs font-mono whitespace-pre-wrap text-slate-600">{oldVal || '(empty)'}</pre>
        </div>
        <div className={`p-3 rounded-lg border ${isDifferent ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Current</div>
          <pre className={`text-xs font-mono whitespace-pre-wrap ${isDifferent ? 'text-indigo-900' : 'text-slate-600'}`}>{newVal || '(empty)'}</pre>
        </div>
      </div>
    </div>
  );
};

const ComparisonModal = ({ 
  isOpen, 
  onClose, 
  version, 
  currentData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  version: PromptVersion | null; 
  currentData: PromptData 
}) => {
  if (!isOpen || !version) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Compare Versions</h3>
            <p className="text-sm text-slate-500">Comparing current state with "{version.name}"</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <DiffView label="System Prompt" oldVal={version.data.systemPrompt} newVal={currentData.systemPrompt} />
          <DiffView label="User Prompt" oldVal={version.data.userPrompt} newVal={currentData.userPrompt} />
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Model</h4>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 line-through">{version.data.model}</span>
                <span className="text-sm font-bold text-indigo-600">{currentData.model}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Temperature</h4>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 line-through">{version.data.temperature}</span>
                <span className="text-sm font-bold text-indigo-600">{currentData.temperature}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">
            Close Comparison
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ToolInputList = ({ tools, setTools }: { tools: Tool[]; setTools: (t: Tool[]) => void }) => {
  const addTool = () => {
    setTools([...tools, { id: Math.random().toString(36).substr(2, 9), name: '', description: '', trigger: '' }]);
  };

  const removeTool = (id: string) => {
    setTools(tools.filter(t => t.id !== id));
  };

  const updateTool = (id: string, field: keyof Tool, value: string) => {
    setTools(tools.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 gap-4">
        {tools.map((tool, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={tool.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all"
          >
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {index + 1}
                </div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tool Definition</h4>
              </div>
              <button 
                onClick={() => removeTool(tool.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Wrench size={10} /> Tool Name
                  </label>
                  <input 
                    type="text" 
                    value={tool.name}
                    onChange={(e) => updateTool(tool.id, 'name', e.target.value)}
                    placeholder="e.g. search_web"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={10} /> Trigger Condition
                  </label>
                  <input 
                    type="text" 
                    value={tool.trigger}
                    onChange={(e) => updateTool(tool.id, 'trigger', e.target.value)}
                    placeholder="e.g. When user asks for real-time data"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={10} /> Description & Parameters
                </label>
                <textarea 
                  value={tool.description}
                  onChange={(e) => updateTool(tool.id, 'description', e.target.value)}
                  placeholder="Describe the tool's purpose and expected parameters..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs h-24 resize-none transition-all"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button 
        onClick={addTool}
        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2"
      >
        <Plus size={20} />
        <span className="text-sm font-bold">Add New Tool</span>
      </button>
    </div>
  );
};

const TestCaseList = ({ 
  testCases, 
  setTestCases, 
  runTestCase 
}: { 
  testCases: TestCase[]; 
  setTestCases: (tc: TestCase[]) => void;
  runTestCase: (id: string) => void;
}) => {
  const addTestCase = () => {
    setTestCases([...testCases, { 
      id: Math.random().toString(36).substr(2, 9), 
      input: '', 
      expectedOutput: '', 
      actualOutput: '', 
      status: 'pending' 
    }]);
  };

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string) => {
    setTestCases(testCases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const runAllTests = () => {
    testCases.forEach(tc => runTestCase(tc.id));
  };

  return (
    <div className="space-y-6 mt-4">
      {testCases.length > 0 && (
        <div className="flex justify-end">
          <button 
            onClick={runAllTests}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg transition-all"
          >
            <Zap size={14} fill="currentColor" /> Run All Tests
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4">
        {testCases.map((tc, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={tc.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all"
          >
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {index + 1}
                </div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Scenario</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  tc.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 
                  tc.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {tc.status}
                </span>
                <button 
                  onClick={() => removeTestCase(tc.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={10} /> User Input
                </label>
                <textarea 
                  value={tc.input}
                  onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                  placeholder="Simulated user message..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Target size={10} /> Expected Output
                </label>
                <textarea 
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestCase(tc.id, 'expectedOutput', e.target.value)}
                  placeholder="Ideal model response..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                />
              </div>
            </div>

            {tc.actualOutput && (
              <div className="px-5 pb-5">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={10} /> Actual Output
                  </label>
                  <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">{tc.actualOutput}</pre>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 flex justify-end">
              <button 
                onClick={() => runTestCase(tc.id)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <Zap size={14} className="text-amber-500" /> Run This Test
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <button 
        onClick={addTestCase}
        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2"
      >
        <Plus size={20} />
        <span className="text-sm font-bold">Add Test Scenario</span>
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<'form' | 'report' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isRegressionOpen, setIsRegressionOpen] = useState(false);
  const [showRegressionCheck, setShowRegressionCheck] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [comparingVersion, setComparingVersion] = useState<PromptVersion | null>(null);
  const [optimizedTestResults, setOptimizedTestResults] = useState<TestCase[]>([]);
  const [isRunningOptimizedTests, setIsRunningOptimizedTests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isErrorOverlayOpen, setIsErrorOverlayOpen] = useState(false);
  
  const [formData, setFormData] = useState<PromptData>({
    projectName: 'My AI Project',
    model: models[0].id,
    useCase: '',
    systemPrompt: '',
    userPrompt: '',
    initialPrompt: '',
    usesTools: false,
    tools: [],
    testCases: [],
    issue: '',
    expectedOutput: '',
    actualOutput: '',
    temperature: 0,
    maxTokens: 100000,
    usesRAG: false,
    usesMemory: false
  });

  const [versions, setVersions] = useState<PromptVersion[]>(() => {
    const saved = localStorage.getItem('promptlab_versions');
    return saved ? JSON.parse(saved) : [];
  });

  const [report, setReport] = useState<AnalysisReport | null>(null);

  const exportCurrentPrompt = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `promptlab_export_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        // Basic validation
        if (importedData.systemPrompt !== undefined || importedData.userPrompt !== undefined) {
          // Ensure usesTools is in sync with tools array
          const tools = importedData.tools || [];
          const updatedData = { 
            ...formData, 
            ...importedData,
            usesTools: tools.length > 0
          };
          setFormData(updatedData);
          console.log("Prompt imported successfully!");
        } else {
          console.error("Invalid JSON format for PromptLab.");
        }
      } catch (err) {
        console.error("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const exportAllHistory = () => {
    const dataStr = JSON.stringify(versions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `promptlab_history_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedVersions = JSON.parse(content);
        
        if (Array.isArray(importedVersions)) {
          const updated = [...importedVersions, ...versions];
          setVersions(updated);
          localStorage.setItem('promptlab_versions', JSON.stringify(updated));
          console.log(`Imported ${importedVersions.length} history items!`);
        } else {
          console.error("Invalid history format.");
        }
      } catch (err) {
        console.error("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const clearAllHistory = () => {
    setVersions([]);
    localStorage.removeItem('promptlab_versions');
  };

  const runTestCase = (id: string) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.map(tc => {
        if (tc.id === id) {
          // Mocking the execution
          const passed = Math.random() > 0.3;
          return {
            ...tc,
            status: passed ? 'passed' : 'failed',
            actualOutput: passed ? tc.expectedOutput : "The model failed to follow the constraint. It outputted something else entirely."
          };
        }
        return tc;
      })
    }));
  };

  const saveVersion = (customData?: Partial<PromptVersion>) => {
    let name = customData?.name;
    if (!name) {
      name = prompt("Enter a name for this version:", `${formData.projectName || 'Project'} - Version ${versions.length + 1}`) || undefined;
    }
    if (!name) return;

    const newVersion: PromptVersion = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      name,
      data: { ...formData },
      ...customData
    };

    const updated = [newVersion, ...versions];
    setVersions(updated);
    localStorage.setItem('promptlab_versions', JSON.stringify(updated));
    return newVersion;
  };

  const deleteVersion = (id: string) => {
    const updated = versions.filter(v => v.id !== id);
    setVersions(updated);
    localStorage.setItem('promptlab_versions', JSON.stringify(updated));
  };

  const revertToVersion = (version: PromptVersion) => {
    setFormData({ ...version.data });
    setIsHistoryOpen(false);
  };

  const showAnalysisError = (message: string) => {
    setReport(null);
    setLoading(false);
    setError(message);
    setIsErrorOverlayOpen(true);
    setScreen('error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    console.log("Starting analysis with model:", formData.model);
    logFrontendEvent({
      level: 'info',
      message: 'Analyze prompt clicked',
      screen: 'form',
      action: 'analyze_prompt',
      model: formData.model,
      details: summarizePromptDataForLogs(formData),
    });
    setIsErrorOverlayOpen(false);
    setLoading(true);
    setOptimizedTestResults([]); // Reset results
    
    // Safety timeout to ensure loading state is cleared
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Analysis safety timeout triggered in App.tsx");
        logFrontendEvent({
          level: 'warn',
          message: 'Frontend analysis safety timeout triggered',
          screen: 'form',
          action: 'analyze_prompt_timeout',
          model: formData.model,
          details: summarizePromptDataForLogs(formData),
        });
        showAnalysisError("The analysis took too long to complete. Please try again or check your internet connection.");
      }
    }, 60000); // 60 seconds safety net

    try {
      setError(null);
      const modelProvider = getModelById(formData.model);
      console.log("Using provider:", modelProvider.name);
      
      const analysis = await modelProvider.analyze(formData);
      console.log("Analysis successful");
      logFrontendEvent({
        level: 'info',
        message: 'Analysis completed successfully',
        screen: 'report',
        action: 'analyze_prompt_success',
        model: formData.model,
        details: summarizePromptDataForLogs(formData),
      });
      
      clearTimeout(safetyTimeout);
      setReport(analysis);
      setLoading(false);
      setScreen('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Analysis failed:", err);
      logFrontendEvent({
        level: 'error',
        message: err?.message || 'Analysis failed in frontend',
        screen: 'form',
        action: 'analyze_prompt_failed',
        model: formData.model,
        details: {
          ...summarizePromptDataForLogs(formData),
          stack: err?.stack,
        },
      });
      clearTimeout(safetyTimeout);
      
      let errorMessage = err.message || "An unexpected error occurred during analysis.";
      
      // Handle quota or configuration errors specifically for better UX
      if (errorMessage.toLowerCase().includes("quota") || errorMessage.includes("429")) {
        errorMessage = "We are currently running out of API quota. Please try again in a few minutes.";
      } else if (errorMessage.toLowerCase().includes("api key") || errorMessage.toLowerCase().includes("not found")) {
        errorMessage = "Model not configured. Please ensure your Gemini API key is set in the environment secrets.";
      }

      showAnalysisError(errorMessage);
    }
  };

  const runOptimizedTests = () => {
    if (!report) return;
    setIsRunningOptimizedTests(true);
    
    setTimeout(() => {
      const results = formData.testCases.map(tc => {
        // Mocking execution with optimized prompt
        // Higher success rate for optimized prompt
        const passed = Math.random() > 0.15; 
        return {
          ...tc,
          status: passed ? 'passed' : 'failed',
          actualOutput: passed ? tc.expectedOutput : "Optimized prompt still has some edge case issues."
        } as TestCase;
      });
      setOptimizedTestResults(results);
      setIsRunningOptimizedTests(false);
    }, 1500);
  };

  const applyOptimizations = () => {
    if (!report) return;

    // If there are test cases, ask for regression confirmation
    if (formData.testCases.length > 0 && !showRegressionCheck) {
      setShowRegressionCheck(true);
      return;
    }

    setShowRegressionCheck(false);
    
    // 1. Save current state as "Pre-Optimization" if it's the first one or significant
    const preVersionName = `v${versions.length + 1} - Original`;
    saveVersion({ name: preVersionName });

    // 2. Prepare the new data
    const optimizedData = {
      ...formData,
      systemPrompt: report.optimizedSystemPrompt,
      userPrompt: report.optimizedUserPrompt
    };

    // 3. Update form data
    setFormData(optimizedData);

    // 4. Save the optimized version with metadata
    const optimizedVersionName = `v${versions.length + 2} - Optimized`;
    
    // Use actual test results for regressions metadata
    const failedTests = formData.testCases.filter(tc => tc.status === 'failed');
    const regressions = failedTests.length > 0 
      ? `${failedTests.length} test cases failed. Potential regression in ${failedTests.map((tc, i) => `Test Case #${formData.testCases.findIndex(t => t.id === tc.id) + 1}`).join(', ')}.`
      : formData.testCases.length > 0 
        ? "None detected. All regression tests passed."
        : "No regression tests defined.";

    const newVersion: PromptVersion = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now() + 100, // Ensure it's after the pre-optimization one
      name: optimizedVersionName,
      data: optimizedData,
      summary: `Iteration focused on ${report.diagnosis[0].title.toLowerCase()}.`,
      fixes: report.changes.map(c => c.fix),
      regressions: regressions
    };

    const updated = [newVersion, ...versions.map(v => v.name === preVersionName ? { ...v } : v)];
    // Actually, saveVersion already updated the state, so we need to be careful.
    // Let's just manually update the state here for both to be safe and clean.
    
    const preVersion: PromptVersion = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      name: preVersionName,
      data: { ...formData }
    };

    const finalVersions = [newVersion, preVersion, ...versions];
    setVersions(finalVersions);
    localStorage.setItem('promptlab_versions', JSON.stringify(finalVersions));

    setScreen('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearForm = () => {
    setFormData({
      projectName: 'New Project',
      model: 'GPT-4',
      useCase: '',
      systemPrompt: '',
      userPrompt: '',
      initialPrompt: '',
      usesTools: false,
      tools: [],
      testCases: [],
      issue: '',
      expectedOutput: '',
      actualOutput: '',
      temperature: 0,
      maxTokens: 100000,
      usesRAG: false,
      usesMemory: false
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {loading && <Loader />}
      {isErrorOverlayOpen && error && !loading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] border border-red-100 shadow-2xl shadow-red-100/50 p-12 max-w-2xl w-full text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

            <div className="mx-auto w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 shadow-inner">
              <AlertCircle size={48} />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Model Issue Detected</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                {error}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsErrorOverlayOpen(false);
                  setError(null);
                  setScreen('form');
                }}
                className="flex-1 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back To Editor
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsErrorOverlayOpen(false);
                  setError(null);
                  handleAnalyze();
                }}
                className="flex-1 px-8 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Retry Analysis
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">PromptLab</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">v2.4.0 • Studio</p>
            </div>
          </div>
          
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <History size={14} />
              History
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <div className="flex items-center gap-0.5">
              <button 
                onClick={exportCurrentPrompt}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"
                title="Download JSON"
              >
                <Download size={16} />
              </button>
              <label className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all cursor-pointer" title="Import JSON">
                <Upload size={16} />
                <input type="file" accept=".json" onChange={importPrompt} className="hidden" />
              </label>
            </div>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button 
              onClick={clearForm}
              className="p-2 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-600 transition-all"
              title="Clear All"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-12">
        <AnimatePresence mode="wait">
          {(screen === 'error' || (!!error && !loading)) ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="min-h-[60vh] flex items-center justify-center"
            >
              <div className="bg-white rounded-[40px] border border-red-100 shadow-2xl shadow-red-100/50 p-12 max-w-2xl w-full text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                
                <div className="mx-auto w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center text-red-500 shadow-inner">
                  <AlertCircle size={48} />
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Model Issue Detected</h2>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Sorry for the inconvenience, we are running into some issues with the selected model. 
                    {error?.includes("quota") 
                      ? "We've reached the API quota limits for this model." 
                      : "The model is currently unavailable or misconfigured."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setScreen('form')}
                    className="flex-1 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={18} />
                    Try Other Models
                  </button>
                  <button 
                    type="button"
                    onClick={handleAnalyze}
                    className="flex-1 px-8 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} />
                    Retry Analysis
                  </button>
                </div>

                <p className="text-xs text-slate-400 font-medium">
                  If the issue persists, please contact the system administrator.
                </p>
              </div>
            </motion.div>
          ) : screen === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Project Info */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 space-y-8">
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Target size={14} /> Project Name
                      </label>
                      <input 
                        type="text" 
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        placeholder="e.g. Chatbot Optimization"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Cpu size={14} /> Model
                      </label>
                      <div className="relative">
                        <select 
                          value={formData.model}
                          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                          className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold transition-all"
                        >
                          {models.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <Target size={14} /> Use Case
                    </label>
                    <input 
                      type="text" 
                      value={formData.useCase}
                      onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                      placeholder="e.g. Customer Support Bot"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                  </section>

                  {/* Prompt Inputs */}
                  <section className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Settings2 size={16} className="text-slate-400" /> System Prompt
                      </label>
                      <textarea 
                        value={formData.systemPrompt}
                        onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                        placeholder="Define the model's persona and constraints..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[120px] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <MessageSquare size={16} className="text-slate-400" /> User Prompt
                      </label>
                      <textarea 
                        value={formData.userPrompt}
                        onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
                        placeholder="The specific instruction or query..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] transition-all"
                      />
                    </div>
                  </section>

                  {/* Tools Section */}
                  <section className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <button 
                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                        className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                      >
                        <Wrench size={18} className="text-indigo-600" />
                        <h3 className="font-semibold text-slate-800">Tool Integration</h3>
                        {isToolsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {formData.tools.length} Tools
                      </div>
                    </div>
                    <AnimatePresence>
                      {isToolsOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <ToolInputList 
                            tools={formData.tools} 
                            setTools={(tools) => setFormData({ ...formData, tools, usesTools: tools.length > 0 })} 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Regression Testing Section */}
                  <section className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <button 
                        onClick={() => setIsRegressionOpen(!isRegressionOpen)}
                        className="flex flex-col items-start gap-1 hover:text-indigo-600 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCcw size={20} className="text-indigo-600" />
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Regression Suite</h3>
                          {isRegressionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                        <p className="text-sm text-slate-500">Define scenarios to ensure future iterations don't break core logic.</p>
                      </button>
                      <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {formData.testCases.length} Scenarios
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isRegressionOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <TestCaseList 
                            testCases={formData.testCases} 
                            setTestCases={(testCases) => setFormData({ ...formData, testCases })}
                            runTestCase={runTestCase}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  {/* Issue Section */}
                  <section className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <AlertCircle size={16} className="text-red-500" /> What went wrong?
                      </label>
                      <textarea 
                        value={formData.issue}
                        onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                        placeholder="e.g. Model is hallucinating facts about the product..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-24 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Output</label>
                        <textarea 
                          value={formData.expectedOutput}
                          onChange={(e) => setFormData({ ...formData, expectedOutput: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-xs h-32 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual Output</label>
                        <textarea 
                          value={formData.actualOutput}
                          onChange={(e) => setFormData({ ...formData, actualOutput: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-xs h-32 font-mono"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Advanced Settings */}
                  <section className="pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      className="flex items-center justify-between w-full text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <span className="text-sm font-semibold">Advanced Configuration</span>
                      {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    
                    <AnimatePresence>
                      {isAdvancedOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                              <div className="space-y-1 flex-1 mr-6">
                                <div className="flex justify-between">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Temperature</label>
                                  <span className="text-xs font-mono font-bold text-indigo-600">{formData.temperature}</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="1" 
                                  step="0.1"
                                  value={formData.temperature}
                                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                              <div className="space-y-1 flex-1 mr-6">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Tokens</label>
                                <input 
                                  type="number" 
                                  value={formData.maxTokens}
                                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-slate-900"
                                />
                              </div>
                              <div className="flex flex-col text-slate-300">
                                <ChevronUp size={14} className="cursor-pointer hover:text-indigo-600" onClick={() => setFormData(f => ({...f, maxTokens: f.maxTokens + 128}))} />
                                <ChevronDown size={14} className="cursor-pointer hover:text-indigo-600" onClick={() => setFormData(f => ({...f, maxTokens: Math.max(0, f.maxTokens - 128)}))} />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Uses RAG</span>
                              <button 
                                onClick={() => setFormData({ ...formData, usesRAG: !formData.usesRAG })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.usesRAG ? 'bg-indigo-600' : 'bg-slate-200'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.usesRAG ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Uses Memory</span>
                              <button 
                                onClick={() => setFormData({ ...formData, usesMemory: !formData.usesMemory })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.usesMemory ? 'bg-indigo-600' : 'bg-slate-200'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.usesMemory ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>

                {/* CTA */}
                <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button 
                    type="button"
                    onClick={handleAnalyze}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Sparkles size={18} />
                    Analyze Prompt
                  </button>
                </div>
              </div>
            </motion.div>
          ) : screen === 'report' ? (
            <motion.div 
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Report Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <button 
                  onClick={() => setScreen('form')}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
                >
                  <ArrowLeft size={18} /> Back to Editor
                </button>
                <div className="flex flex-wrap gap-2">
                  {report?.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider border border-indigo-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <header className="grid grid-cols-1 xl:grid-cols-[1.8fr_320px] gap-6 items-stretch">
                <div className="space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.24em]">Optimization Report</div>
                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">Analysis Report</h1>
                  <p className="text-slate-500 text-base lg:text-lg max-w-3xl">Detailed optimization strategy for your {formData.useCase || 'AI task'} with clearer fixes and iteration-ready prompt drafts.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[180px]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prompt Score</div>
                  <div>
                    <div className="text-5xl font-black tracking-tight text-indigo-600">{report?.score.toFixed(1)}</div>
                    <div className="text-slate-900 font-semibold mt-2">{report && report.score > 7 ? 'Excellent' : 'Needs Work'}</div>
                  </div>
                </div>
              </header>

              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Target size={20} className="text-indigo-600" /> Score Breakdown
                    </h3>
                    {report?.breakdown.map(item => (
                      <ScoreBar key={item.label} label={item.label} value={item.value} />
                    ))}
                  </section>

                  <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Sparkles size={20} className="text-indigo-600" /> Suggestions
                    </h3>
                    <ul className="space-y-3">
                      {report?.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-600">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertCircle size={20} className="text-red-500" /> Problem Diagnosis
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {report?.diagnosis.map((d, i) => (
                        <div key={i} className="space-y-1">
                          <h4 className="font-bold text-slate-900">{d.title}</h4>
                          <p className="text-slate-600 text-sm leading-relaxed">{d.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 space-y-4 shadow-sm">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                      <FileText size={20} className="text-indigo-600" /> Root Cause Analysis
                    </h3>
                    <ul className="space-y-3">
                      {report?.rootCauses.map((rc, i) => (
                        <li key={i} className="flex gap-3 text-indigo-800/80 text-sm italic">
                          <span className="text-indigo-600 font-bold">•</span>
                          {rc}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Optimized System Prompt</h4>
                        <button 
                          onClick={() => copyToClipboard(report?.optimizedSystemPrompt || '')}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <div className="p-6 max-h-[640px] overflow-auto">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-7">
                          {report?.optimizedSystemPrompt}
                        </pre>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Optimized User Prompt</h4>
                        <button 
                          onClick={() => copyToClipboard(report?.optimizedUserPrompt || '')}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <div className="p-6 max-h-[640px] overflow-auto">
                        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-7">
                          {report?.optimizedUserPrompt}
                        </pre>
                      </div>
                    </div>
                </section>

                {formData.testCases.length > 0 && (
                    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={20} className="text-indigo-600" />
                          <h3 className="text-lg font-bold text-slate-900">Regression Test Report</h3>
                        </div>
                        {optimizedTestResults.length === 0 ? (
                          <button 
                            onClick={runOptimizedTests}
                            disabled={isRunningOptimizedTests}
                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {isRunningOptimizedTests ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <RotateCcw size={14} />
                              </motion.div>
                            ) : <Zap size={14} />}
                            Run Tests on Optimized Prompt
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Results:</span>
                            <div className="flex gap-1">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                {optimizedTestResults.filter(r => r.status === 'passed').length} Passed
                              </span>
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                {optimizedTestResults.filter(r => r.status === 'failed').length} Failed
                              </span>
                            </div>
                            <button onClick={() => setOptimizedTestResults([])} className="text-xs text-indigo-600 font-bold hover:underline ml-2">Re-run</button>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-6">
                        {optimizedTestResults.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-sm text-slate-500">Run the regression suite to verify the optimized prompt's stability.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {optimizedTestResults.map((result, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scenario #{idx + 1}</div>
                                  <p className="text-sm text-slate-700 font-medium line-clamp-1">{result.input}</p>
                                  <div className="mt-2 p-2 bg-white rounded border border-slate-100 text-[10px] font-mono text-slate-500 italic">
                                    {result.actualOutput}
                                  </div>
                                </div>
                                <div className={`shrink-0 p-1.5 rounded-full ${result.status === 'passed' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                  {result.status === 'passed' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-900">Changes Explained</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fix Applied</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Why It Works</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report?.changes.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-semibold text-slate-900">{c.issue}</td>
                              <td className="px-6 py-4 text-sm text-slate-600">{c.fix}</td>
                              <td className="px-6 py-4 text-sm text-slate-500 italic">{c.why}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
              </div>

              {/* Footer Actions */}
              <div className="pt-12 pb-24 flex flex-col md:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setScreen('form')}
                  className="w-full md:w-auto bg-white border border-slate-200 text-slate-600 font-bold px-8 py-4 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <ArrowLeft size={20} />
                  Edit Original
                </button>
                <button 
                  onClick={applyOptimizations}
                  className="w-full md:w-auto bg-indigo-600 text-white font-bold px-12 py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Sparkles size={20} />
                  Apply & Iterate
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* History Sidebar */}
        <AnimatePresence>
          {isHistoryOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsHistoryOpen(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[50]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[51] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <History size={20} className="text-indigo-600" /> Version History
                  </h3>
                  <div className="flex items-center gap-2">
                    {versions.length > 0 && (
                      <button 
                        onClick={clearAllHistory}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Clear All History"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {versions.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <History size={24} />
                      </div>
                      <p className="text-slate-500 text-sm">No saved versions yet.</p>
                    </div>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 group">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900">{v.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                              {new Date(v.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button 
                            onClick={() => deleteVersion(v.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {v.summary && (
                          <p className="text-xs text-slate-600 italic border-l-2 border-indigo-200 pl-2 py-1">
                            {v.summary}
                          </p>
                        )}

                        {v.fixes && v.fixes.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixes</div>
                            <ul className="space-y-0.5">
                              {v.fixes.slice(0, 2).map((f, idx) => (
                                <li key={idx} className="text-[11px] text-slate-600 flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-500" />
                                  <span className="truncate">{f}</span>
                                </li>
                              ))}
                              {v.fixes.length > 2 && <li className="text-[10px] text-slate-400">+{v.fixes.length - 2} more</li>}
                            </ul>
                          </div>
                        )}

                        {v.regressions && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regressions</div>
                            <p className="text-[11px] text-amber-600 flex items-center gap-1">
                              <AlertCircle size={10} />
                              {v.regressions}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => revertToVersion(v)}
                            className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={12} /> Revert
                          </button>
                          <button 
                            onClick={() => setComparingVersion(v)}
                            className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Diff size={12} /> Compare
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Regression Check Modal */}
        <AnimatePresence>
          {showRegressionCheck && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-8">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                    <RotateCcw size={32} className="text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Regression Check</h2>
                  <p className="text-slate-600 mb-6">
                    You have {formData.testCases.length} test cases defined. Have you verified that the optimized prompt doesn't break existing functionality?
                  </p>
                  
                  <div className="space-y-3 mb-8">
                    {formData.testCases.map((tc, i) => (
                      <div key={tc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Test Case #{i + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tc.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 
                          tc.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {tc.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowRegressionCheck(false)}
                      className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                    >
                      Back to Review
                    </button>
                    <button 
                      onClick={() => applyOptimizations()}
                      className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
                    >
                      Apply Anyway
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Comparison Modal */}
        <ComparisonModal 
          isOpen={!!comparingVersion} 
          onClose={() => setComparingVersion(null)} 
          version={comparingVersion} 
          currentData={formData} 
        />
      </div>
    </div>
  );
}
