import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Download, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Plus, 
  Search,
  Settings,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://localhost:8000";

function App() {
  const [downloads, setDownloads] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [protocol, setProtocol] = useState('http');

  const fetchDownloads = async () => {
    try {
      const res = await axios.get(`${API_BASE}/downloads/`);
      setDownloads(res.data);
    } catch (err) {
      console.error("Failed to fetch downloads", err);
    }
  };

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 2000);
    return () => clearInterval(interval);
  }, []);

  const addDownload = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/downloads/`, {
        url: newUrl,
        protocol_type: protocol
      });
      setNewUrl('');
      setIsAddModalOpen(false);
      fetchDownloads();
    } catch (err) {
      alert("Failed to add download");
    }
  };

  const togglePause = async (id, currentStatus) => {
    try {
      const action = currentStatus === 'paused' ? 'resume' : 'pause';
      await axios.post(`${API_BASE}/downloads/${id}/${action}`);
      fetchDownloads();
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-blue-400" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredDownloads = downloads.filter(d => {
    if (activeTab === 'all') return true;
    if (activeTab === 'downloading') return d.status === 'active';
    if (activeTab === 'completed') return d.status === 'done';
    return true;
  });

  return (
    <div className="flex h-screen bg-[#0f172a] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Download className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">NetPull</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {['all', 'downloading', 'completed', 'scheduled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 capitalize flex items-center gap-3 ${
                activeTab === tab 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-900/10' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {tab === 'all' && <LayoutGrid className="w-4 h-4" />}
              {tab === 'downloading' && <Play className="w-4 h-4" />}
              {tab === 'completed' && <CheckCircle className="w-4 h-4" />}
              {tab === 'scheduled' && <Clock className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <button className="w-full text-left px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 transition-all flex items-center gap-3">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#1e293b]/50 backdrop-blur-md border-b border-gray-700 flex items-center justify-between px-8 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search downloads..." 
              className="w-full bg-[#0f172a] border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Download
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-300">
              {activeTab === 'all' ? 'All Downloads' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </h2>
            <div className="flex bg-[#1e293b] rounded-lg p-1">
              <button className="p-1.5 rounded bg-[#0f172a] shadow-sm"><ListIcon className="w-4 h-4" /></button>
              <button className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-colors"><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          <AnimatePresence>
            {filteredDownloads.map((d) => (
              <motion.div 
                key={d.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1e293b] border border-gray-700 p-5 rounded-2xl flex flex-col gap-4 hover:border-gray-600 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gray-800 rounded-xl group-hover:bg-gray-700 transition-colors">
                      {getStatusIcon(d.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate pr-4 text-gray-200">{d.filename || d.url}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{d.protocol_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{(d.downloaded_bytes / (1024 * 1024)).toFixed(1)} MB / {(d.total_size / (1024 * 1024)).toFixed(1)} MB</span>
                        <span>•</span>
                        <span className="capitalize">{d.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {d.status !== 'done' && (
                      <button 
                        onClick={() => togglePause(d.id, d.status)}
                        className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all border border-transparent hover:border-gray-700"
                      >
                        {d.status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                      </button>
                    )}
                    <button className="p-2.5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-all border border-transparent hover:border-gray-700">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="relative h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.downloaded_bytes / d.total_size * 100) || 0}%` }}
                    className={`absolute inset-0 rounded-full ${d.status === 'done' ? 'bg-green-500' : d.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`}
                  />
                </div>

                {/* Subtle highlight effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredDownloads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Download className="w-16 h-16 mb-4" />
              <p className="text-lg">No downloads found</p>
            </div>
          )}
        </main>
      </div>

      {/* Add Download Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] w-full max-w-lg rounded-3xl p-8 border border-gray-700 shadow-2xl shadow-black/50"
          >
            <h2 className="text-2xl font-bold mb-6">New Download</h2>
            <form onSubmit={addDownload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">URL / Magnet Link</label>
                <input 
                  autoFocus
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/file.zip"
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Protocol</label>
                <div className="grid grid-cols-4 gap-3">
                  {['http', 'ftp', 'ytdlp', 'torrent'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProtocol(p)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        protocol === p 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-[#0f172a] border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  Start Download
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;
