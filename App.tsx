
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TemperatureChart } from './components/TemperatureChart';
import { Vehicle, BatteryDataPoint, TestResult, WorkflowStage } from './types';
import { getGeminiInsights, chatWithGemini } from './services/geminiService';

const MOCK_VEHICLES: Vehicle[] = [
  { 
    id: 'V-842', 
    name: 'Heavy Delivery 842', 
    status: 'Critical', 
    currentTemp: 52, 
    lastMonthAvgTemp: 44, 
    soh: 86, 
    lastUpdate: 'Live', 
    projectedLoss: 1450, 
    costOfInaction: 1850,
    anomalyProbability: 94,
    soakTestStatus: 'Not Run',
    chargeCapActive: false,
    routeAssigned: false,
    guardrailsActive: false,
    recommendedRoute: 'Route B (Low-grade/Urban)',
    certificationId: 'B-PASSPORT-842-X01'
  },
  { 
    id: 'V-119', 
    name: 'Logistics Van 119', 
    status: 'Healthy', 
    currentTemp: 32, 
    lastMonthAvgTemp: 31, 
    soh: 96, 
    lastUpdate: '2m ago', 
    projectedLoss: 50, 
    costOfInaction: 0,
    anomalyProbability: 4,
    soakTestStatus: 'Success',
    chargeCapActive: false,
    routeAssigned: true,
    guardrailsActive: false,
    recommendedRoute: 'Any',
    certificationId: 'B-PASSPORT-119-A92'
  },
  { 
    id: 'V-402', 
    name: 'Urban Transit 402', 
    status: 'Warning', 
    currentTemp: 41, 
    lastMonthAvgTemp: 35, 
    soh: 91, 
    lastUpdate: '15m ago', 
    projectedLoss: 420, 
    costOfInaction: 650,
    anomalyProbability: 68,
    soakTestStatus: 'Fail-Calibration',
    chargeCapActive: true,
    routeAssigned: true,
    guardrailsActive: true,
    recommendedRoute: 'Route C (Flat/Secondary)',
    certificationId: 'B-PASSPORT-402-Z44'
  },
];

const MOCK_TELEMETRY: BatteryDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  temperature: 42 + Math.sin(i / 3) * 10 + Math.random() * 3,
  twinBaseline: 34 + Math.sin(i / 3) * 4,
  ambientTemp: 22 + Math.random() * 2,
  voltage: 380 + Math.sin(i / 2) * 20,
  voltageTwin: 380 + Math.sin(i / 2) * 15,
  soc: 85 - i * 2,
}));

const App: React.FC = () => {
  // Role toggle removed; defaulting to Technician for advanced diagnostics
  const role = 'technician';
  const [stage, setStage] = useState<WorkflowStage>('detect');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(MOCK_VEHICLES[0]);
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isSoaking, setIsSoaking] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [showPassport, setShowPassport] = useState(false);
  const [activeTab, setActiveTab] = useState<'temp' | 'volt'>('temp');
  const [visibleVehiclesCount, setVisibleVehiclesCount] = useState(3);

  const fetchInsights = useCallback(async () => {
    setIsLoadingInsight(true);
    try {
      const result = await getGeminiInsights({
        vehicle: selectedVehicle,
        telemetry: MOCK_TELEMETRY.slice(-5)
      }, role);
      setInsight(result || 'No diagnostic data available.');
    } catch (err) {
      setInsight('AI Analysis Offline.');
    } finally {
      setIsLoadingInsight(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const runCommandTest = () => {
    setIsTesting(true);
    setTestResults([]);
    setTimeout(() => {
      setTestResults([
        { component: 'Active Cooling Pump', status: 'Pass', details: 'Steady 3.2k RPM' },
        { component: 'Radiator Fan Stage 2', status: 'Fail', details: 'High Resistance' },
        { component: 'Chiller Valve', status: 'Degraded', details: 'Outside bounds' },
      ]);
      setIsTesting(false);
    }, 1800);
  };

  const runSoakTest = () => {
    setIsSoaking(true);
    setTimeout(() => {
      setSelectedVehicle(prev => ({ ...prev, soakTestStatus: 'Fail-Calibration' }));
      setIsSoaking(false);
    }, 2000);
  };

  const toggleChargeCap = () => {
    setSelectedVehicle(prev => ({ ...prev, chargeCapActive: !prev.chargeCapActive }));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    try {
      const aiResponse = await chatWithGemini(userMsg, { vehicle: selectedVehicle, role, stage });
      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Error processing request.' }]);
    }
  };

  const statusStyle = useMemo(() => {
    if (selectedVehicle.status === 'Critical') return 'text-red-600 bg-red-50 border-red-100';
    if (selectedVehicle.status === 'Warning') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  }, [selectedVehicle]);

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#FBFBFF] overflow-hidden">
      {/* Workflow Switcher - Centered Top */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-slate-200 flex items-center gap-1">
          {['detect', 'triage', 'mitigate'].map((s) => (
            <button 
              key={s} 
              onClick={() => setStage(s as WorkflowStage)}
              className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${stage === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Side Navigation - Viewport Bound */}
      <aside className="w-full lg:w-72 bg-[#0F172A] text-white p-6 flex flex-col shrink-0 h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500 w-8 h-8 rounded-lg flex items-center justify-center">
            <i className="fas fa-bolt text-lg"></i>
          </div>
          <span className="text-lg font-black tracking-tighter">VOLTFLOW</span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">Risk Monitoring</h3>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              {MOCK_VEHICLES.slice(0, visibleVehiclesCount).map(v => (
                <button key={v.id} onClick={() => setSelectedVehicle(v)} className={`w-full p-3 rounded-xl transition-all relative overflow-hidden text-left ${selectedVehicle.id === v.id ? 'bg-slate-800 border-l-4 border-blue-500' : 'bg-transparent hover:bg-slate-800/50'}`}>
                  <div className="flex justify-between items-center mb-0.5 text-xs font-semibold">
                    <span>{v.name}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'Critical' ? 'bg-red-500' : v.status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                    <span>SOH {v.soh}%</span>
                    <span className={v.status === 'Critical' ? 'text-red-400' : ''}>{v.currentTemp}°C</span>
                  </div>
                </button>
              ))}
              {MOCK_VEHICLES.length > visibleVehiclesCount && (
                <button onClick={() => setVisibleVehiclesCount(prev => prev + 5)} className="w-full py-3 text-[9px] text-slate-500 font-black uppercase hover:text-white transition-colors flex items-center justify-center gap-2">
                  <i className="fas fa-plus"></i> Show More
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace - Split 18:6 (9:3 columns) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#FBFBFF]">
        {/* Header - Fixed Height */}
        <header className="px-8 pt-24 pb-6 flex flex-col md:flex-row justify-between items-end gap-4 shrink-0">
          <div>
            <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full border mb-2 text-[8px] font-black uppercase tracking-widest ${statusStyle}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedVehicle.status === 'Critical' ? 'bg-red-600' : 'bg-amber-600'}`}></span>
              {selectedVehicle.status} Intervention
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{selectedVehicle.name}</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-tighter">Diagnostic Stage: <span className="text-blue-600 font-bold">{stage}</span> • ID: {selectedVehicle.id}</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setShowPassport(true)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold shadow-sm hover:bg-slate-50 transition-colors">
               <i className="fas fa-certificate mr-1.5 text-blue-500"></i> Passport
             </button>
             <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-4">
                <div className="text-red-600">
                  <p className="text-[8px] font-black uppercase leading-none mb-1">Asset Inaction Cost</p>
                  <p className="text-xl font-black leading-none">${selectedVehicle.costOfInaction}</p>
                </div>
                <div className="bg-red-100 p-2 rounded-lg"><i className="fas fa-chart-line text-red-600 text-xs"></i></div>
             </div>
          </div>
        </header>

        {/* Layout split: 18:6 (9:3) ratio */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 px-8 pb-8 overflow-hidden min-h-0">
          
          <div className="xl:col-span-9 flex flex-col gap-6 overflow-hidden">
            
            {/* Stage Viewport */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden min-h-0">
              
              {stage === 'detect' && (
                <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500 min-h-0">
                  {/* Fixed Height XAI Decision Layer */}
                  <div className="bg-indigo-900 text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col shrink-0 h-[280px]">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <i className="fas fa-brain text-8xl"></i>
                    </div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="bg-white/10 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">XAI Decision Engine</span>
                        <span className="text-[10px] text-white/50 font-bold">Conf. {selectedVehicle.anomalyProbability}%</span>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                        <div className="col-span-8 flex flex-col gap-3 min-h-0">
                           <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/10 overflow-hidden relative">
                              <div className="h-full overflow-y-auto pr-2 text-[11px] text-indigo-100 leading-relaxed custom-scrollbar-light">
                                 {isLoadingInsight ? "Generating diagnostic context via Gemini Flash..." : insight}
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2 shrink-0">
                             {['Deep Scan', 'Audit Trail', 'OEM Sync', 'Calibrate', 'Share'].map(btn => (
                               <button key={btn} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap">{btn}</button>
                             ))}
                           </div>
                        </div>
                        
                        <div className="col-span-4 flex flex-col gap-3 shrink-0">
                          <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex-1 flex flex-col justify-center">
                            <p className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1">Drift Risk</p>
                            <p className="text-3xl font-black text-red-400 leading-none">{selectedVehicle.anomalyProbability}%</p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex-1 flex flex-col justify-center">
                            <p className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1">Asset Erosion</p>
                            <p className="text-3xl font-black text-amber-400 leading-none">${selectedVehicle.projectedLoss}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Trace - Fills Remaining Height */}
                  <div className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden min-h-0">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Digital Twin Correlation Trace</h3>
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {['temp', 'volt'].map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{tab === 'temp' ? 'Thermal' : 'Voltage'}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                       <TemperatureChart data={MOCK_TELEMETRY} showVoltage={activeTab === 'volt'} />
                    </div>
                  </div>
                </div>
              )}

              {stage === 'triage' && (
                <div className="grid md:grid-cols-2 gap-6 h-full animate-in slide-in-from-right-2 duration-500 overflow-hidden">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                      <i className="fas fa-terminal text-blue-500"></i> Hardware Command Probe
                    </h4>
                    <p className="text-[10px] text-slate-500 mb-6 font-medium">Direct remote actuation of cooling relays.</p>
                    <button onClick={runCommandTest} disabled={isTesting} className={`w-full py-4 rounded-xl font-black text-[10px] transition-all shrink-0 ${isTesting ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-black'}`}>
                      {isTesting ? "Executing Actuation..." : "Trigger Cooling Diagnostics"}
                    </button>
                    <div className="mt-6 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                      {testResults.map((r, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                             <p className="text-[10px] font-black text-slate-900 uppercase">{r.component}</p>
                             <p className="text-[9px] text-slate-500 font-medium">{r.details}</p>
                          </div>
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full ${r.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                        </div>
                      ))}
                      {testResults.length === 0 && <div className="text-center py-20 opacity-20 text-[10px] font-bold">Launch Probe to view telemetry feedback</div>}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-widest">
                      <i className="fas fa-moon text-indigo-500"></i> Thermal Soak Benchmark
                    </h4>
                    <p className="text-[10px] text-slate-500 mb-6 font-medium">Equilibrium audit from 12h sleep state.</p>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6 shrink-0">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Current Observation</p>
                      <p className="text-[12px] font-black text-slate-700 uppercase">{selectedVehicle.soakTestStatus}</p>
                    </div>
                    <button onClick={runSoakTest} disabled={isSoaking} className="w-full py-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl font-black text-[10px] hover:bg-indigo-100 transition-all shrink-0">
                      {isSoaking ? "Computing Equilibrium Delta..." : "Analyze Last Sleep Cycle"}
                    </button>
                    <div className="flex-1 min-h-0 flex flex-col justify-center">
                      {selectedVehicle.soakTestStatus === 'Fail-Calibration' && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] text-amber-800 font-bold leading-relaxed flex gap-3">
                          <i className="fas fa-info-circle text-lg mt-0.5"></i>
                          <span>Anomalous cooling curve detected. Suggests high-precision NTC sensor drift. Recommendation: Proceed to Mitigate (Calibration).</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {stage === 'mitigate' && (
                <div className="flex flex-col gap-6 h-full animate-in slide-in-from-bottom-2 duration-500 overflow-hidden">
                  <div className="grid md:grid-cols-3 gap-8 shrink-0">
                    {[
                      { label: 'Charge Cap', val: '30 kW', color: 'blue', action: toggleChargeCap, active: selectedVehicle.chargeCapActive },
                      { label: 'Route Shift', val: 'Urban Load', color: 'indigo', action: () => {}, active: selectedVehicle.routeAssigned },
                      { label: 'SOC Window', val: '20-80%', color: 'emerald', action: () => {}, active: selectedVehicle.guardrailsActive }
                    ].map((m, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</h4>
                        <p className={`text-2xl font-black text-${m.color}-600`}>{m.val}</p>
                        <button onClick={m.action} className={`w-full py-3 rounded-xl font-black text-[10px] transition-all uppercase tracking-wider ${m.active ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {m.active ? 'Deployed' : 'Deploy'}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex-1 bg-blue-600 rounded-[40px] text-white p-10 flex items-center justify-between shadow-2xl relative overflow-hidden min-h-0">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><i className="fas fa-shield-alt text-9xl"></i></div>
                    <div className="relative z-10 flex gap-10 items-center">
                       <div className="w-20 h-20 bg-white/20 rounded-[28px] flex items-center justify-center border border-white/20 shadow-inner"><i className="fas fa-check-double text-3xl"></i></div>
                       <div>
                         <h4 className="text-2xl font-black mb-1 tracking-tight">Strategy Execution Complete</h4>
                         <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100 mb-4 opacity-80">Value Preservation Delta: +$580 / Week</p>
                         <div className="flex gap-4">
                           <div className="text-[9px] font-black px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 tracking-widest uppercase">SOH GAIN: 42%</div>
                           <div className="text-[9px] font-black px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 tracking-widest uppercase">TCO: OPTIMIZED</div>
                         </div>
                       </div>
                    </div>
                    <button className="px-10 py-4 bg-white text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Submit Final Strategy</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Side Panel - Split 3/12 */}
          <div className="xl:col-span-3 h-full flex flex-col overflow-hidden min-h-0">
            <div className="bg-[#0F172A] p-6 rounded-[40px] shadow-2xl flex-1 flex flex-col overflow-hidden border border-slate-800">
              <div className="flex items-center justify-between mb-6 px-1 shrink-0">
                <h3 className="text-white font-black text-xs flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></span> VoltFlow AI
                </h3>
                <span className="text-[8px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-700">v2.5 PRO</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0">
                {chatHistory.length === 0 && (
                  <div className="text-center py-28 opacity-20 space-y-6 flex flex-col items-center">
                    <i className="fas fa-robot text-5xl"></i>
                    <p className="font-black text-[9px] uppercase tracking-[0.3em]">Awaiting Diagnostic Input</p>
                  </div>
                )}
                {chatHistory.map((c, i) => (
                  <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-3xl max-w-[95%] text-[10px] font-medium leading-relaxed shadow-lg ${c.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                       {c.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 relative shrink-0">
                <input 
                  value={chatMessage} 
                  onChange={e => setChatMessage(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-[20px] p-4 text-white text-[10px] font-bold placeholder-slate-600 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner" 
                  placeholder="Explain thermal drift..." 
                />
                <button 
                  onClick={handleSendMessage} 
                  className="absolute right-2 top-2 w-9 h-9 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:bg-blue-500 transition-all active:scale-90"
                >
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal - Passport */}
        {showPassport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
              <div className="bg-slate-900 p-12 text-white flex justify-between items-start relative">
                <div className="absolute top-0 right-0 p-12 opacity-5"><i className="fas fa-certificate text-[120px]"></i></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-1 tracking-tighter">Battery Passport</h2>
                  <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.3em]">CERT: {selectedVehicle.certificationId}</p>
                </div>
                <button onClick={() => setShowPassport(false)} className="w-12 h-12 bg-white/10 rounded-full hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"><i className="fas fa-times text-lg"></i></button>
              </div>
              <div className="p-12 grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Certified SOH</p>
                    <p className="text-6xl font-black text-slate-900">{selectedVehicle.soh}%</p>
                  </div>
                  <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100 flex items-center gap-5 shadow-inner">
                    <div className="bg-emerald-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><i className="fas fa-coins text-lg"></i></div>
                    <div>
                        <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Resale Premium</p>
                        <p className="text-2xl font-black text-emerald-900">+$1,250 <span className="text-xs opacity-50">USD</span></p>
                    </div>
                  </div>
                </div>
                <div className="border-l border-slate-100 pl-12 space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Ledger</p>
                   <ul className="space-y-4">
                     {['Mar 2024: Valve Triage Pass', 'Feb 2024: SOC Safety Cap', 'Jan 2024: Initial Anomaly'].map((log, i) => (
                       <li key={i} className="flex gap-4 items-center">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span>
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{log}</span>
                       </li>
                     ))}
                   </ul>
                </div>
              </div>
              <div className="px-12 pb-12">
                 <button className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all">Export Certified Record</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar-light::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
