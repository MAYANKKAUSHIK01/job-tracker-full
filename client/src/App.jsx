import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Upload, X, Briefcase, CheckCircle, Clock, MapPin, Search, Sparkles, Filter, ChevronRight } from 'lucide-react';

// ➤ LIVE BACKEND URL
const API_URL = 'https://job-tracker-full.onrender.com/api';

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [resumeText, setResumeText] = useState('');
  const [view, setView] = useState('feed'); 
  const [filters, setFilters] = useState({ search: '', remote: false, fullTime: false, minScore: 0 });
  const [popupJob, setPopupJob] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: 'Hello! I can help you find jobs or track your applications.' }]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/jobs`);
      setJobs(res.data);
    } catch (e) { console.error("API Error"); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await axios.post(`${API_URL}/upload-resume`, formData);
      setResumeText(res.data.text);
      await scoreAllJobs(res.data.text);
      setIsUploading(false);
    } catch (err) { setIsUploading(false); alert("Upload failed"); }
  };

  const scoreAllJobs = async (text) => {
    const scored = await Promise.all(jobs.map(async (job) => {
      const res = await axios.post(`${API_URL}/match`, { resumeText: text, jobDescription: job.description });
      return { ...job, match: res.data };
    }));
    setJobs(scored.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0)));
  };

  const handleApply = (job) => {
    window.open('https://google.com', '_blank');
    setTimeout(() => setPopupJob(job), 1000);
  };

  // ➤ IMPROVED TRACKING FUNCTION
  const saveApplication = async (status) => {
    try {
      if (status !== 'No') {
        // 1. Send data to backend
        await axios.post(`${API_URL}/track`, {
          jobId: popupJob.id, 
          jobTitle: popupJob.title, 
          company: popupJob.company, 
          status: status === 'Earlier' ? 'Applied' : status
        });
        
        // 2. Success Feedback
        alert("✅ Application Saved to Dashboard!");
      }
    } catch (err) {
      console.error("Tracking Error:", err);
      // 3. Error Feedback
      alert("⚠️ Error saving application. Please check your connection.");
    } finally {
      // 4. ALWAYS close the modal
      setPopupJob(null);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', text: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    const res = await axios.post(`${API_URL}/chat`, { message: chatInput });
    setChatHistory([...newHistory, { role: 'ai', text: res.data.reply }]);
  };

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(filters.search.toLowerCase()) || j.skills.some(s => s.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesRemote = filters.remote ? j.location === 'Remote' : true;
    const matchesType = filters.fullTime ? j.type === 'Full-time' : true;
    const matchesScore = j.match ? j.match.score >= filters.minScore : true;
    return matchesSearch && matchesRemote && matchesType && matchesScore;
  });

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Abstract Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      {/* HEADER */}
      <nav className="sticky top-0 z-30 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg text-white">
              <Briefcase size={20} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              JobTracker<span className="text-blue-600">.ai</span>
            </span>
          </div>
          <div className="flex gap-1 bg-slate-100/50 p-1 rounded-xl">
            {['feed', 'dashboard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  view === tab ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'feed' ? 'Job Feed' : 'Dashboard'}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* SIDEBAR */}
        <aside className="w-full lg:w-1/4 space-y-6">
          {/* Resume Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Your Resume</h3>
              {resumeText && <CheckCircle size={16} className="text-green-500" />}
            </div>
            
            <label className={`block w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              resumeText ? 'border-green-200 bg-green-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
            }`}>
              <input type="file" onChange={handleUpload} className="hidden" accept=".pdf,.txt" />
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${resumeText ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isUploading ? <div className="animate-spin text-2xl">⟳</div> : <Upload size={20} />}
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {isUploading ? "Analyzing..." : resumeText ? "Update Resume" : "Upload PDF / TXT"}
                </p>
                <p className="text-xs text-slate-400">AI Scoring requires this</p>
              </div>
            </label>
          </div>

          {/* Filters Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-28">
            <div className="flex items-center gap-2 mb-6">
              <Filter size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Smart Filters</h3>
            </div>
            
            <div className="space-y-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all" 
                  placeholder="Role, skill, or keyword..." 
                  value={filters.search} 
                  onChange={e => setFilters({...filters, search: e.target.value})} 
                />
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Remote Only', key: 'remote' },
                  { label: 'Full-time Only', key: 'fullTime' }
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                    <span className="text-sm text-slate-600 font-medium group-hover:text-blue-600">{opt.label}</span>
                    <div className="relative inline-block w-10 h-6 align-middle select-none">
                      <input type="checkbox" checked={filters[opt.key]} onChange={e => setFilters({...filters, [opt.key]: e.target.checked})} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-blue-500" style={{top: '2px', left: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}} />
                      <div className={`block overflow-hidden h-6 rounded-full transition-colors duration-200 ${filters[opt.key] ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Match Score</span>
                  <span>{filters.minScore}%+</span>
                </div>
                <input 
                  type="range" 
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                  min="0" max="100" 
                  value={filters.minScore} 
                  onChange={e => setFilters({...filters, minScore: Number(e.target.value)})} 
                />
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="w-full lg:w-3/4">
          {view === 'feed' ? (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Recommended Jobs</h2>
                  <p className="text-slate-500 text-sm">Based on your skills & preferences</p>
                </div>
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {filteredJobs.length} Results
                </span>
              </div>

              {filteredJobs.map((job, index) => (
                <div key={job.id} 
                  className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 border border-slate-100 hover:border-blue-100 hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">{job.company}</span>
                        {job.posted && <span className="w-1 h-1 bg-slate-300 rounded-full"></span>}
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10}/> Recently</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
                          <MapPin size={10} /> {job.location}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
                          <Briefcase size={10} /> {job.type}
                        </span>
                        {job.skills.slice(0, 3).map(s => (
                          <span key={s} className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Score Ring */}
                    {job.match && (
                      <div className="flex flex-col items-center">
                        <div className={`relative flex items-center justify-center w-16 h-16 rounded-full border-4 ${
                           job.match.score > 70 ? 'border-green-500 bg-green-50 text-green-700' : 
                           job.match.score > 40 ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}>
                          <span className="text-lg font-bold">{job.match.score}</span>
                          <span className="absolute -bottom-1 text-[8px] uppercase font-bold bg-white px-1">Score</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Insight */}
                  {job.match && (
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 flex gap-3 items-start">
                      <Sparkles className="text-purple-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-sm text-slate-600 italic leading-relaxed">
                        "{job.match.reason}"
                      </p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                    <button 
                      onClick={() => handleApply(job)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200"
                    >
                      Apply Now <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DashboardView apps={[]} /> // Pass apps data if you have it
          )}
        </div>
      </main>

      {/* MODERN POPUP MODAL */}
      {popupJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setPopupJob(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Did you apply?</h3>
              <p className="text-slate-500 mt-2">You just visited <span className="font-semibold text-slate-900">{popupJob.title}</span>.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => saveApplication('Applied')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 transition-all transform active:scale-95">
                Yes, I Applied
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => saveApplication('Earlier')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-3.5 rounded-xl font-semibold transition-colors">
                  Applied Earlier
                </button>
                <button onClick={() => saveApplication('No')} className="bg-slate-50 hover:bg-slate-100 text-slate-600 py-3.5 rounded-xl font-semibold transition-colors">
                  Just Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI CHAT WIDGET */}
      <div className={`fixed right-6 bottom-24 z-40 transition-all duration-300 origin-bottom-right transform ${chatOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <span className="font-bold">AI Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={18}/></button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                className="w-full bg-slate-100 text-sm p-3 pr-10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ask to filter jobs..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
              />
              <button onClick={handleChat} className="absolute right-2 top-2 p-1 text-blue-600 hover:bg-blue-100 rounded-lg">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setChatOpen(!chatOpen)} 
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 transition-all hover:scale-110 active:scale-95 ${
          chatOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
        } text-white`}
      >
        {chatOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

    </div>
  );
}

// Minimal Dashboard for View Switching
function DashboardView() {
  const [apps, setApps] = useState([]);
  useEffect(() => { axios.get(`${API_URL}/applications`).then(r => setApps(r.data)) }, []);
  const STAGES = ['Applied', 'Interview', 'Offer', 'Rejected'];

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Application Timeline</h2>
      {apps.length === 0 ? (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
          <Briefcase size={40} className="mx-auto mb-2 opacity-50"/>
          <p>No applications tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {apps.map(app => (
            <div key={app.id} className="relative pl-6 border-l-2 border-slate-200">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-blue-500"></div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{app.jobTitle}</h3>
                  <p className="text-slate-500 text-sm font-medium">{app.company}</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {new Date(app.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1 mt-4">
                {STAGES.map((step, i) => {
                  const active = STAGES.indexOf(app.status) >= i;
                  return (
                    <div key={step} className={`flex-1 h-1.5 rounded-full transition-all ${active ? 'bg-green-500' : 'bg-slate-100'}`} />
                  );
                })}
              </div>
              <div className="mt-2 text-right text-xs font-bold text-green-600 uppercase tracking-wide">{app.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}