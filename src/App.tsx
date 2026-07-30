import React, { useState, useEffect } from 'react';
import { 
  Server, Key, CheckCircle2, AlertCircle, 
  Copy, RefreshCw, Terminal, Layers, Code2, Sparkles, Send, UserCheck, Lock,
  Sun, Moon, BookOpen, Check, ShieldCheck, Globe, LayoutDashboard
} from 'lucide-react';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: 'Auth' | 'Public' | 'Patient' | 'Admin';
  description: string;
  requiresAuth: boolean;
  roleRequired?: 'patient' | 'admin';
  sampleBody?: string;
  sampleQueryParams?: string;
}

const ENDPOINTS: Endpoint[] = [
  // Auth
  { method: 'POST', path: '/api/auth/login', category: 'Auth', description: 'Authenticate user & retrieve JWT Bearer token', requiresAuth: false, sampleBody: '{\n  "email": "admin@clinic.com",\n  "password": "admin123"\n}' },
  { method: 'POST', path: '/api/auth/register', category: 'Auth', description: 'Register a new patient account', requiresAuth: false, sampleBody: '{\n  "name": "Sarah Miller",\n  "email": "sarah.m@example.com",\n  "password": "password123"\n}' },
  { method: 'GET', path: '/api/auth/me', category: 'Auth', description: 'Get profile info of current authenticated user', requiresAuth: true },

  // Public
  { method: 'GET', path: '/api/services', category: 'Public', description: 'List all dental services with category, title, duration, price & discount details', requiresAuth: false },
  { method: 'GET', path: '/api/doctors', category: 'Public', description: 'List medical staff & doctors (including isFeatured status)', requiresAuth: false },
  { method: 'GET', path: '/api/slots', category: 'Public', description: 'Get available 1-hour time slots for a date & doctor/service', requiresAuth: false, sampleQueryParams: '?date=2026-08-05&dentistName=Dr.%20Selamawit%20Moges' },
  { method: 'GET', path: '/api/config', category: 'Public', description: 'Get public website config (top announcement banner & booking cutoff time)', requiresAuth: false },

  // Patient
  { method: 'POST', path: '/api/appointments', category: 'Patient', description: 'Book appointment slot as patient (Status defaults to Pending)', requiresAuth: true, roleRequired: 'patient', sampleBody: '{\n  "serviceTitle": "Professional Teeth Whitening",\n  "date": "2026-08-05",\n  "time": "10:00 AM",\n  "dentistName": "Dr. Selamawit Moges"\n}' },
  { method: 'GET', path: '/api/appointments/me', category: 'Patient', description: 'Fetch all appointments for current logged-in patient', requiresAuth: true, roleRequired: 'patient' },
  { method: 'PUT', path: '/api/appointments/app1/cancel', category: 'Patient', description: 'Cancel an appointment (Sets status to Canceled)', requiresAuth: true, roleRequired: 'patient' },

  // Admin
  { method: 'GET', path: '/api/admin/config', category: 'Admin', description: 'Get complete clinic state (services, doctors, availabilities, blocked dates, announcement, cutoff & appointments)', requiresAuth: true, roleRequired: 'admin' },
  { method: 'GET', path: '/api/admin/appointments', category: 'Admin', description: 'View all clinic appointments across all patients', requiresAuth: true, roleRequired: 'admin' },
  { method: 'POST', path: '/api/admin/appointments', category: 'Admin', description: 'Admin creates appointment for a patient (Status defaults to Confirmed)', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "patientId": "usr2",\n  "patientName": "Jane Doe",\n  "serviceTitle": "Teeth Cleaning & Oral Checkup",\n  "date": "2026-08-05",\n  "time": "02:00 PM",\n  "dentistName": "Dr. Marcus Vance",\n  "status": "Confirmed"\n}' },
  { method: 'PUT', path: '/api/admin/appointments/app1/status', category: 'Admin', description: 'Update status to any enum: Pending, Confirmed, Completed, Arrived, No Show, Canceled', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "status": "Arrived"\n}' },
  { method: 'POST', path: '/api/admin/services', category: 'Admin', description: 'Add a new treatment service with title, category, price, duration & discount', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "category": "Cosmetic",\n  "title": "Veneers Deluxe Smile",\n  "description": "Custom porcelain veneers for a flawless smile makeover.",\n  "duration": "90 mins",\n  "price": 850,\n  "promotionActive": true,\n  "promotionDetails": "10% off full arch",\n  "discountPercent": 10,\n  "discountAmount": 85\n}' },
  { method: 'PUT', path: '/api/admin/services/srv2', category: 'Admin', description: 'Update existing service details by title or ID', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "title": "Professional Teeth Whitening",\n  "price": 240,\n  "promotionActive": true,\n  "discountPercent": 20\n}' },
  { method: 'DELETE', path: '/api/admin/services/srv2', category: 'Admin', description: 'Delete a service by title or ID', requiresAuth: true, roleRequired: 'admin' },
  { method: 'POST', path: '/api/admin/doctors', category: 'Admin', description: 'Add a new doctor (Enforces max 3 featured doctors rule)', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "name": "Dr. Sarah Jenkins",\n  "title": "DDS Periodontist Specialist",\n  "bio": "Expert in gum healthcare and advanced implants.",\n  "imageUrl": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80",\n  "isFeatured": false\n}' },
  { method: 'PUT', path: '/api/admin/doctors/doc1', category: 'Admin', description: 'Update doctor profile details', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "name": "Dr. Selamawit Moges",\n  "title": "Lead Cosmetic & Restorative Specialist"\n}' },
  { method: 'PUT', path: '/api/admin/doctors/doc1/feature', category: 'Admin', description: 'Toggle isFeatured status (Strict max 3 featured limit enforced)', requiresAuth: true, roleRequired: 'admin' },
  { method: 'DELETE', path: '/api/admin/doctors/doc3', category: 'Admin', description: 'Remove a doctor from staff roster', requiresAuth: true, roleRequired: 'admin' },
  { method: 'PUT', path: '/api/admin/availability', category: 'Admin', description: 'Set working doctor IDs for a specific date', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "date": "2026-08-05",\n  "doctorIds": ["doc1", "doc2"]\n}' },
  { method: 'DELETE', path: '/api/admin/availability/2026-08-05', category: 'Admin', description: 'Clear doctor schedule for a date', requiresAuth: true, roleRequired: 'admin' },
  { method: 'POST', path: '/api/admin/blocked-dates', category: 'Admin', description: 'Block a date for clinic closure', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "date": "2026-09-01",\n  "reason": "Labor Day Closure"\n}' },
  { method: 'DELETE', path: '/api/admin/blocked-dates/2026-09-01', category: 'Admin', description: 'Unblock a clinic closure date', requiresAuth: true, roleRequired: 'admin' },
  { method: 'PUT', path: '/api/admin/announcement', category: 'Admin', description: 'Update top site announcement banner', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "text": "✨ Summer Promotion: 20% Off Whitening Sessions!"\n}' },
  { method: 'PUT', path: '/api/admin/cutoff', category: 'Admin', description: 'Update daily booking cutoff time', requiresAuth: true, roleRequired: 'admin', sampleBody: '{\n  "time": "15:00"\n}' }
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('api_theme') as 'dark' | 'light') || 'dark';
  });

  const [activeView, setActiveView] = useState<'tester' | 'guide'>('tester');
  const [serverHealth, setServerHealth] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [token, setToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Selected Endpoint
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(ENDPOINTS[0]);
  const [requestPath, setRequestPath] = useState<string>(ENDPOINTS[0].path);
  const [requestBody, setRequestBody] = useState<string>(ENDPOINTS[0].sampleBody || '');
  
  // Response state
  const [loading, setLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  // Active Category Filter
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    localStorage.setItem('api_theme', theme);
  }, [theme]);

  useEffect(() => {
    checkHealth();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const checkHealth = async () => {
    setServerHealth('checking');
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        setServerHealth('healthy');
      } else {
        setServerHealth('error');
      }
    } catch {
      setServerHealth('error');
    }
  };

  const handleSelectEndpoint = (ep: Endpoint) => {
    setSelectedEndpoint(ep);
    const fullPath = ep.path + (ep.sampleQueryParams || '');
    setRequestPath(fullPath);
    setRequestBody(ep.sampleBody || '');
    setResponseData('');
    setResponseStatus(null);
    setResponseTime(null);
  };

  const quickAuth = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Auth error', err);
    } finally {
      setLoading(false);
    }
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponseData('');
    setResponseStatus(null);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers
      };

      if (['POST', 'PUT'].includes(selectedEndpoint.method) && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(requestPath, options);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      setResponseStatus(res.status);

      let text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseData(JSON.stringify(json, null, 2));
      } catch {
        setResponseData(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData(JSON.stringify({ error: err.message || 'Network error' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    let curl = `curl -X ${selectedEndpoint.method} "http://localhost:3000${requestPath}" \\\n  -H "Content-Type: application/json"`;
    if (token) {
      curl += ` \\\n  -H "Authorization: Bearer ${token}"`;
    }
    if (['POST', 'PUT'].includes(selectedEndpoint.method) && requestBody) {
      curl += ` \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySnippet = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetIndex(index);
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const filteredEndpoints = activeCategory === 'All' 
    ? ENDPOINTS 
    : ENDPOINTS.filter(e => e.category === activeCategory);

  // Dynamic Theme Styling Classes
  const isDark = theme === 'dark';
  const pageBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800';
  const headerBg = isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200';
  const cardBg = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const sidebarBg = isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/70 border-slate-200';
  const codeBoxBg = isDark ? 'bg-slate-950 border-slate-800 text-teal-300' : 'bg-slate-900 border-slate-800 text-teal-300';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${pageBg} font-sans antialiased flex flex-col transition-colors duration-200`}>
      
      {/* Top Header */}
      <header className={`border-b ${headerBg} backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between sticky top-0 z-30 gap-3`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400' : 'bg-teal-500 text-white shadow-md shadow-teal-500/20'}`}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-mono font-bold text-base sm:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Dental Clinic REST API</h1>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-100 text-teal-800 border border-teal-200'}`}>
                Refactored Server Engine
              </span>
            </div>
            <p className={`text-xs ${subText}`}>Node.js + Express API Backend with Full Schema & Enforced Business Logic</p>
          </div>
        </div>

        {/* View Switcher Tabs & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'}`}>
            <button
              onClick={() => setActiveView('tester')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'tester'
                  ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs' : 'bg-white text-teal-700 shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              API Tester
            </button>
            <button
              onClick={() => setActiveView('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'guide'
                  ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs' : 'bg-white text-teal-700 shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Connection Guide & Code Snippets
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Server status indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-300 shadow-xs'}`}>
              <span className={subText}>Status:</span>
              {serverHealth === 'checking' && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
              {serverHealth === 'healthy' && (
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  200 OK
                </span>
              )}
              {serverHealth === 'error' && (
                <span className="flex items-center gap-1 text-rose-500 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> Error
                </span>
              )}
            </div>
            <button 
              onClick={checkHealth}
              className={`p-2 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'}`}
              title="Refresh Server Health"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeView === 'tester' ? (
        /* API TESTER VIEW */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: Endpoint Catalog */}
          <div className={`w-full md:w-80 border-r ${sidebarBg} flex flex-col shrink-0`}>
            
            {/* Quick Authentication Preset Strip */}
            <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'} space-y-3`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  Quick Auth Context
                </span>
                {currentUser && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono border ${isDark ? 'bg-teal-950 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {currentUser.role}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickAuth('admin@clinic.com', 'admin123')}
                  className={`py-1.5 px-2 border rounded text-[11px] font-mono font-medium transition-all text-center truncate ${
                    isDark 
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  ⚡ Admin Token
                </button>
                <button
                  onClick={() => quickAuth('jane.doe@example.com', 'password123')}
                  className={`py-1.5 px-2 border rounded text-[11px] font-mono font-medium transition-all text-center truncate ${
                    isDark 
                      ? 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30' 
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300'
                  }`}
                >
                  👤 Patient Token
                </button>
              </div>

              {token ? (
                <div className={`flex items-center justify-between p-2 rounded border text-[10px] font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <span className="truncate max-w-[180px]">Token Active</span>
                  <button 
                    onClick={() => { setToken(''); setCurrentUser(null); }}
                    className="text-rose-500 font-bold hover:underline shrink-0"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic">No token loaded (Public view)</p>
              )}
            </div>

            {/* Category Tabs */}
            <div className={`flex gap-1 p-2 border-b text-[11px] font-mono overflow-x-auto ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {['All', 'Auth', 'Public', 'Patient', 'Admin'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeCategory === cat 
                      ? isDark 
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold' 
                        : 'bg-teal-600 text-white font-bold shadow-xs'
                      : isDark 
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Endpoint List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEndpoints.map((ep, idx) => {
                const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
                
                let methodBg = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
                if (!isDark) methodBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                
                if (ep.method === 'POST') {
                  methodBg = isDark ? 'bg-amber-950/80 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-300';
                }
                if (ep.method === 'PUT') {
                  methodBg = isDark ? 'bg-blue-950/80 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-300';
                }
                if (ep.method === 'DELETE') {
                  methodBg = isDark ? 'bg-rose-950/80 text-rose-400 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-300';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                      isSelected 
                        ? isDark 
                          ? 'bg-slate-800/90 border-teal-500/50 shadow-md' 
                          : 'bg-white border-teal-500 shadow-md ring-1 ring-teal-500/30'
                        : isDark 
                          ? 'border-transparent hover:bg-slate-900/80 hover:border-slate-800' 
                          : 'border-transparent hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${methodBg}`}>
                        {ep.method}
                      </span>
                      <span className={`font-mono text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {ep.path}
                      </span>
                    </div>
                    <p className={`text-[11px] line-clamp-1 ${subText}`}>
                      {ep.description}
                    </p>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Workspace: Request & Response Inspector */}
          <div className={`flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 ${pageBg}`}>
            
            {/* Endpoint Details Header */}
            <div className={`${cardBg} rounded-2xl p-5 space-y-4`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'} pb-4`}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                    selectedEndpoint.method === 'GET' ? (isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300') :
                    selectedEndpoint.method === 'POST' ? (isDark ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-300') :
                    selectedEndpoint.method === 'PUT' ? (isDark ? 'bg-blue-950 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-300') :
                    (isDark ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-300')
                  }`}>
                    {selectedEndpoint.method}
                  </span>
                  <span className={`font-mono text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEndpoint.path}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {selectedEndpoint.requiresAuth ? (
                    <span className={`flex items-center gap-1 border px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                      <Lock className="w-3 h-3" />
                      Auth Required ({selectedEndpoint.roleRequired || 'Any'})
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 border px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                      <UserCheck className="w-3 h-3" />
                      Public Access
                    </span>
                  )}
                </div>
              </div>

              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
                {selectedEndpoint.description}
              </p>

              {/* Request URL Input & Send Button */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <div className={`flex-1 flex items-center border rounded-xl px-3 font-mono text-xs focus-within:border-teal-500 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                  <span className="text-slate-400 select-none">http://localhost:3000</span>
                  <input
                    type="text"
                    value={requestPath}
                    onChange={e => setRequestPath(e.target.value)}
                    className={`w-full bg-transparent px-1 py-3 focus:outline-none font-mono ${isDark ? 'text-teal-300' : 'text-teal-700 font-bold'}`}
                  />
                </div>
                
                <button
                  onClick={executeRequest}
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-mono font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 disabled:opacity-50 shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Request Payload Editor (for POST/PUT) */}
            {['POST', 'PUT'].includes(selectedEndpoint.method) && (
              <div className={`${cardBg} rounded-2xl p-5 space-y-2`}>
                <label className={`text-xs font-mono font-bold flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Code2 className="w-4 h-4 text-amber-500" />
                  JSON Request Body
                </label>
                <textarea
                  value={requestBody}
                  onChange={e => setRequestBody(e.target.value)}
                  rows={6}
                  className={`w-full rounded-xl p-3 font-mono text-xs focus:outline-none focus:border-amber-500 border resize-y ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-amber-200' 
                      : 'bg-slate-900 border-slate-700 text-amber-300'
                  }`}
                />
              </div>
            )}

            {/* Response Inspector */}
            <div className={`${cardBg} rounded-2xl p-5 space-y-3 flex-1 flex flex-col`}>
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'} pb-3`}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Terminal className="w-4 h-4 text-teal-500" />
                    Response Output
                  </span>
                  
                  {responseStatus !== null && (
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      responseStatus >= 200 && responseStatus < 300 
                        ? (isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                        : (isDark ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-300')
                    }`}>
                      HTTP {responseStatus}
                    </span>
                  )}

                  {responseTime !== null && (
                    <span className={`text-xs font-mono ${subText}`}>
                      ⏱️ {responseTime} ms
                    </span>
                  )}
                </div>

                <button
                  onClick={copyCurl}
                  className={`text-xs font-mono flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                    isDark 
                      ? 'text-slate-400 hover:text-slate-200 bg-slate-800' 
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied cURL!' : 'Copy cURL'}
                </button>
              </div>

              <div className={`flex-1 min-h-[220px] rounded-xl p-4 font-mono text-xs overflow-x-auto relative ${codeBoxBg}`}>
                {loading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                    Processing Express API request...
                  </div>
                ) : responseData ? (
                  <pre className="whitespace-pre-wrap leading-relaxed text-teal-300">{responseData}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8">
                    <Send className="w-6 h-6 opacity-40" />
                    <p className="text-xs">Select an endpoint on the left and click "Send Request"</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* CONNECTION GUIDE VIEW */
        <div className={`flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8 ${pageBg}`}>
          
          {/* Hero Integration Header */}
          <div className={`${cardBg} rounded-3xl p-6 sm:p-8 space-y-4`}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-500 border border-teal-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Complete System Integration Specification
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Connecting Your Public Website & Admin UI to this Express Backend
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${subText}`}>
              This backend is refactored and fully aligned with your original data models and strict business rules. Below you will find copy-paste ready API client modules for both your <strong>Public Website</strong> and <strong>Admin Portal UI</strong>.
            </p>
          </div>

          {/* Core Business Rules Implemented */}
          <div className={`${cardBg} rounded-2xl p-6 space-y-3 border-l-4 border-l-teal-500`}>
            <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-5 h-5 text-teal-500" />
              Key Backend Enforcements & Schema Alignment
            </h3>
            <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
              <li><strong className="text-teal-400">Services Schema:</strong> Fully aligned with <code className="text-amber-300">category</code>, <code className="text-amber-300">title</code> (unique), <code className="text-amber-300">description</code>, <code className="text-amber-300">duration</code>, <code className="text-amber-300">price</code>, <code className="text-amber-300">promotionActive</code>, <code className="text-amber-300">promotionDetails</code>, <code className="text-amber-300">discountPercent</code>, and <code className="text-amber-300">discountAmount</code>.</li>
              <li><strong className="text-teal-400">Max 3 Featured Doctors Limit:</strong> The backend strictly restricts featured doctors (<code className="text-amber-300">isFeatured: true</code>) to a maximum of 3 simultaneously. Attempting to add or feature a 4th doctor returns HTTP 400.</li>
              <li><strong className="text-teal-400">Default Booking Status:</strong> Patient bookings created via <code className="text-amber-300">POST /api/appointments</code> default to <code className="text-emerald-400 font-mono">'Pending'</code>. Admin-created appointments via <code className="text-amber-300">POST /api/admin/appointments</code> default to <code className="text-emerald-400 font-mono">'Confirmed'</code>.</li>
              <li><strong className="text-teal-400">Status Enums:</strong> Complete support for all 6 statuses: <code className="text-slate-200 font-mono">'Pending' | 'Confirmed' | 'Completed' | 'Arrived' | 'No Show' | 'Canceled'</code>.</li>
            </ul>
          </div>

          {/* Snippet 1: Reusable API Client Helper */}
          <div className={`${cardBg} rounded-2xl p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Code2 className="w-5 h-5 text-teal-500" />
                1. Unified API Client Helper (<span className="font-mono text-xs text-teal-500">apiClient.js</span>)
              </h3>
              <button
                onClick={() => copySnippet(CODE_SNIPPET_1, 1)}
                className={`text-xs font-mono flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copiedSnippetIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippetIndex === 1 ? 'Copied Code!' : 'Copy Snippet'}
              </button>
            </div>
            <p className={`text-xs ${subText}`}>
              Place this helper in your frontend project (e.g. <code className="bg-slate-800 text-teal-300 px-1 py-0.5 rounded">src/apiClient.js</code>). It automatically handles Bearer token injection and error responses:
            </p>
            <div className={`rounded-xl p-4 font-mono text-xs overflow-x-auto ${codeBoxBg}`}>
              <pre className="text-teal-300 leading-relaxed">{CODE_SNIPPET_1}</pre>
            </div>
          </div>

          {/* Snippet 2: Public Website Integration Example */}
          <div className={`${cardBg} rounded-2xl p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Globe className="w-5 h-5 text-teal-500" />
                2. Public Website Booking & Services Component (<span className="font-mono text-xs text-teal-500">PublicWebsiteBooking.jsx</span>)
              </h3>
              <button
                onClick={() => copySnippet(CODE_SNIPPET_2, 2)}
                className={`text-xs font-mono flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copiedSnippetIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippetIndex === 2 ? 'Copied Code!' : 'Copy Snippet'}
              </button>
            </div>
            <p className={`text-xs ${subText}`}>
              Shows how your Public Website connects to fetch services, load specialists, check available slots, and submit bookings:
            </p>
            <div className={`rounded-xl p-4 font-mono text-xs overflow-x-auto ${codeBoxBg}`}>
              <pre className="text-teal-300 leading-relaxed">{CODE_SNIPPET_2}</pre>
            </div>
          </div>

          {/* Snippet 3: Admin UI Integration Example */}
          <div className={`${cardBg} rounded-2xl p-6 space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <LayoutDashboard className="w-5 h-5 text-amber-500" />
                3. Admin Portal Management (<span className="font-mono text-xs text-amber-500">AdminDashboard.jsx</span>)
              </h3>
              <button
                onClick={() => copySnippet(CODE_SNIPPET_3, 3)}
                className={`text-xs font-mono flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copiedSnippetIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippetIndex === 3 ? 'Copied Code!' : 'Copy Snippet'}
              </button>
            </div>
            <p className={`text-xs ${subText}`}>
              Shows how your Admin UI loads full clinic state (<code className="bg-slate-800 text-teal-300 px-1 py-0.5 rounded">/api/admin/config</code>), updates status enums, manages services, toggles featured doctors with max-3 validation, and updates announcements:
            </p>
            <div className={`rounded-xl p-4 font-mono text-xs overflow-x-auto ${codeBoxBg}`}>
              <pre className="text-teal-300 leading-relaxed">{CODE_SNIPPET_3}</pre>
            </div>
          </div>

          {/* Complete Endpoint Cheat Sheet */}
          <div className={`${cardBg} rounded-2xl p-6 space-y-4`}>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              4. Master REST API Endpoint Reference Table
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Endpoint</th>
                    <th className="py-2.5 px-3">Auth / Role</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  <tr>
                    <td className="py-2 px-3 text-amber-400 font-bold">POST</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/auth/register</td>
                    <td className="py-2 px-3 text-slate-400">Public</td>
                    <td className="py-2 px-3">Register new patient account</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-400 font-bold">POST</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/auth/login</td>
                    <td className="py-2 px-3 text-slate-400">Public</td>
                    <td className="py-2 px-3">Returns <code className="text-amber-300">{"{ token, user }"}</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/services</td>
                    <td className="py-2 px-3 text-slate-400">Public</td>
                    <td className="py-2 px-3">Get dental services with category, duration, discount</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/doctors</td>
                    <td className="py-2 px-3 text-slate-400">Public</td>
                    <td className="py-2 px-3">Get doctors roster & isFeatured status</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/slots?date=...&dentistName=...</td>
                    <td className="py-2 px-3 text-slate-400">Public</td>
                    <td className="py-2 px-3">Get open 1-hour slots (09:00 AM to 05:00 PM)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-400 font-bold">POST</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/appointments</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Patient)</td>
                    <td className="py-2 px-3">Books appointment slot (Defaults status to <code className="text-amber-300">Pending</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/appointments/me</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Patient)</td>
                    <td className="py-2 px-3">Get logged-in patient's appointments</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-blue-400 font-bold">PUT</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/appointments/:id/cancel</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Patient/Admin)</td>
                    <td className="py-2 px-3">Cancels appointment (Status set to <code className="text-rose-400">Canceled</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/admin/config</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Admin)</td>
                    <td className="py-2 px-3">Get complete DB state in 1 call</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-amber-400 font-bold">POST</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/admin/appointments</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Admin)</td>
                    <td className="py-2 px-3">Admin creates appointment (Defaults status to <code className="text-emerald-400">Confirmed</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-blue-400 font-bold">PUT</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/admin/appointments/:id/status</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Admin)</td>
                    <td className="py-2 px-3">Update status enum (Pending, Confirmed, Completed, etc.)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-blue-400 font-bold">PUT</td>
                    <td className="py-2 px-3 font-bold text-teal-400">/api/admin/doctors/:id/feature</td>
                    <td className="py-2 px-3 text-amber-300">Bearer (Admin)</td>
                    <td className="py-2 px-3">Toggle isFeatured (Max 3 featured limit enforced)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

const CODE_SNIPPET_1 = `// src/apiClient.js - Universal REST API Helper
const API_BASE = 'http://localhost:3000'; // Or your deployment URL

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('clinic_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}),
    ...options.headers,
  };

  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }
  return data;
}

// Auth Helpers
export async function loginUser(email, password) {
  const data = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('clinic_token', data.token);
  return data.user;
}

export function logoutUser() {
  localStorage.removeItem('clinic_token');
}`;

const CODE_SNIPPET_2 = `// src/components/PublicWebsiteBooking.jsx - Public Website Integration
import React, { useState, useEffect } from 'react';
import { apiCall } from '../apiClient';

export default function PublicWebsiteBooking() {
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDentist, setSelectedDentist] = useState('');
  const [bookingDate, setBookingDate] = useState('2026-08-05');
  const [openSlots, setOpenSlots] = useState([]);

  useEffect(() => {
    // 1. Fetch public services & doctors on load
    apiCall('/api/services').then(res => setServices(res.services || []));
    apiCall('/api/doctors').then(res => setDoctors(res.doctors || []));
  }, []);

  useEffect(() => {
    // 2. Fetch available 1-hour slots when date or dentist changes
    if (bookingDate) {
      const query = \`?date=\${bookingDate}\${selectedDentist ? \`&dentistName=\${encodeURIComponent(selectedDentist)}\` : ''}\`;
      apiCall(\`/api/slots\${query}\`).then(res => setOpenSlots(res.slots || []));
    }
  }, [bookingDate, selectedDentist]);

  const handleBookSlot = async (timeSlot) => {
    try {
      // 3. Submit appointment request (Status defaults to 'Pending')
      const result = await apiCall('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceTitle: selectedService || 'General Consultation',
          date: bookingDate,
          time: timeSlot,
          dentistName: selectedDentist || 'Dr. Selamawit Moges'
        })
      });

      alert(\`Booking Submitted! Status: \${result.appointment.status} (ID: \${result.appointment.id})\`);
    } catch (err) {
      alert('Booking error: ' + err.message);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Book a Dental Appointment</h2>
      
      {/* Service Selector */}
      <select value={selectedService} onChange={e => setSelectedService(e.target.value)} className="w-full border p-2 rounded">
        <option value="">-- Select Service --</option>
        {services.map(s => (
          <option key={s.id} value={s.title}>
            {s.title} ({s.duration}) - \${s.price} {s.promotionActive ? \`(\${s.promotionDetails})\` : ''}
          </option>
        ))}
      </select>

      {/* Doctor Selector */}
      <select value={selectedDentist} onChange={e => setSelectedDentist(e.target.value)} className="w-full border p-2 rounded">
        <option value="">-- Select Specialist --</option>
        {doctors.map(d => (
          <option key={d.id} value={d.name}>
            {d.name} ({d.title}) {d.isFeatured ? '⭐ Featured' : ''}
          </option>
        ))}
      </select>

      {/* Date Input */}
      <input 
        type="date" 
        value={bookingDate} 
        onChange={e => setBookingDate(e.target.value)} 
        className="w-full border p-2 rounded"
      />

      {/* Available Slots */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        {openSlots.map(slot => (
          <button 
            key={slot} 
            onClick={() => handleBookSlot(slot)}
            className="bg-teal-600 text-white font-mono text-xs py-2 rounded hover:bg-teal-500 transition-colors"
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}`;

const CODE_SNIPPET_3 = `// src/components/AdminDashboard.jsx - Admin UI Integration
import React, { useState, useEffect } from 'react';
import { apiCall } from '../apiClient';

export default function AdminDashboard() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch entire clinic DB state in 1 call
  const loadAdminData = async () => {
    try {
      const data = await apiCall('/api/admin/config');
      setConfig(data);
    } catch (err) {
      alert('Failed to load admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // 2. Update appointment status enum
  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      await apiCall(\`/api/admin/appointments/\${appId}/status\`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadAdminData(); // Refresh list
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // 3. Toggle Featured Doctor (Backend enforces MAX 3 RULE)
  const handleToggleFeatured = async (doctorId) => {
    try {
      await apiCall(\`/api/admin/doctors/\${doctorId}/feature\`, {
        method: 'PUT'
      });
      loadAdminData();
    } catch (err) {
      alert(err.message); // Displays "Maximum of 3 featured doctors allowed simultaneously" if cap hit
    }
  };

  if (loading) return <div>Loading Admin Portal...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Clinic Management</h1>
      
      {/* Appointments List */}
      <section className="border p-4 rounded-xl">
        <h2 className="font-bold text-lg mb-3">Appointments ({config.appointments.length})</h2>
        {config.appointments.map(app => (
          <div key={app.id} className="flex justify-between items-center py-2 border-b">
            <div>
              <p className="font-bold">{app.patientName} - {app.serviceTitle}</p>
              <p className="text-xs text-gray-500">{app.appointmentDate} at {app.appointmentTime} with {app.dentistName}</p>
            </div>
            
            {/* Status Selector */}
            <select 
              value={app.status} 
              onChange={e => handleUpdateStatus(app.id, e.target.value)}
              className="border text-xs p-1 rounded font-mono font-bold"
            >
              {['Pending', 'Confirmed', 'Completed', 'Arrived', 'No Show', 'Canceled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </section>

      {/* Doctors Roster with Max 3 Featured Enforced */}
      <section className="border p-4 rounded-xl">
        <h2 className="font-bold text-lg mb-3">Doctors Roster</h2>
        {config.doctors.map(doc => (
          <div key={doc.id} className="flex justify-between items-center py-2 border-b">
            <div>
              <p className="font-bold">{doc.name} {doc.isFeatured ? '⭐ (Featured)' : ''}</p>
              <p className="text-xs text-gray-500">{doc.title}</p>
            </div>
            <button 
              onClick={() => handleToggleFeatured(doc.id)}
              className="bg-amber-500 text-white text-xs px-3 py-1 rounded"
            >
              {doc.isFeatured ? 'Unfeature' : 'Feature Doctor'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}`;
