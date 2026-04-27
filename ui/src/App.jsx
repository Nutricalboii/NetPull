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
  Settings as SettingsIcon,
  LayoutGrid,
  List as ListIcon,
  X,
  FileVideo,
  Folder,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://localhost:8000";

function App() {
  const [downloads, setDownloads] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [protocol, setProtocol] = useState('http');
  const [extracting, setExtracting] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [settings, setSettings] = useState({ download_path: 'downloads' });

  const fetchDownloads = async () => {
    try {
      const res = await axios.get(`${API_BASE}/downloads/`);
      setDownloads(res.data);
    } catch (err) {
      console.error("Failed to fetch downloads", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/`);
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  useEffect(() => {
    fetchDownloads();
    fetchSettings();
    const interval = setInterval(fetchDownloads, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUrlChange = async (url) => {
    setNewUrl(url);
    const lowerUrl = url.toLowerCase();
    if ((lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) && url.length > 20) {
      setExtracting(true);
      setProtocol('ytdlp');
      try {
        const res = await axios.post(`${API_BASE}/extract/?url=${encodeURIComponent(url)}`);
        setMetadata(res.data);
      } catch (err) {
        console.error("Metadata extraction failed", err);
      } finally {
        setExtracting(false);
      }
    }
  };

  const addDownload = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/downloads/`, {
        url: newUrl,
        protocol_type: protocol,
        quality: selectedFormat,
        thumbnail_url: metadata?.thumbnail,
        filename: metadata?.title
      });
      resetModal();
      fetchDownloads();
    } catch (err) {
      alert("Failed to add download");
    }
  };

  const resetModal = () => {
    setNewUrl('');
    setMetadata(null);
    setProtocol('http');
    setIsAddModalOpen(false);
  };

  const saveSettings = async () => {
    try {
      await axios.post(`${API_BASE}/settings/`, settings);
      setIsSettingsOpen(false);
    } catch (err) {
      alert("Failed to save settings");
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

  const deleteDownload = async (id) => {
    if (!confirm("Are you sure you want to delete this download from list?")) return;
    try {
      await axios.delete(`${API_BASE}/downloads/${id}`);
      fetchDownloads();
    } catch (err) {
      console.error("Delete failed", err);
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
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full text-left px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 transition-all flex items-center gap-3"
          >
            <SettingsIcon className="w-4 h-4" />
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
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Folder className="w-3 h-3" />
              {settings.download_path}
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
                    <div className="relative w-24 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                      {d.thumbnail_url ? (
                        <img src={d.thumbnail_url} className="w-full h-full object-cover" alt="thumb" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          {d.protocol_type === 'ytdlp' ? <FileVideo className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate pr-4 text-gray-200">{d.filename || d.url}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{d.protocol_type}</span>
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
                    <button 
                      onClick={() => deleteDownload(d.id)}
                      className="p-2.5 rounded-xl hover:bg-red-900/20 text-gray-400 hover:text-red-400 transition-all border border-transparent hover:border-red-900/30"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.downloaded_bytes / d.total_size * 100) || 0}%` }}
                    className={`absolute inset-0 rounded-full transition-all duration-500 ${d.status === 'done' ? 'bg-green-500' : d.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] w-full max-w-lg rounded-[2rem] p-10 border border-gray-700 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Default Download Path</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#0f172a] border border-gray-700 rounded-2xl py-4 px-5 text-gray-300 flex items-center gap-3">
                    <Folder className="w-5 h-5 text-gray-500" />
                    <input 
                      type="text"
                      value={settings.download_path}
                      onChange={(e) => setSettings({...settings, download_path: e.target.value})}
                      className="bg-transparent border-none focus:outline-none flex-1"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 px-1">Relative to project root or absolute path.</p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={saveSettings}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Download Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] p-10 border border-gray-700 shadow-2xl relative overflow-hidden"
          >
            <button onClick={resetModal} className="absolute top-6 right-6 p-2 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white transition-all">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-bold mb-8">New Download</h2>
            
            <form onSubmit={addDownload} className="space-y-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">URL / Magnet Link</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text"
                    value={newUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="Paste your link here..."
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-2xl py-4 px-5 text-lg focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-700"
                  />
                  {extracting && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-blue-400 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Extracting...
                    </div>
                  )}
                </div>
              </div>

              {metadata && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[#0f172a]/50 rounded-3xl p-6 border border-gray-700 flex gap-6"
                >
                  <img src={metadata.thumbnail} className="w-40 h-24 object-cover rounded-xl border border-gray-700 shadow-lg" alt="" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-200 line-clamp-2 mb-2">{metadata.title}</h4>
                    <div className="flex flex-wrap gap-2">
                      {['4K', '1080p', '720p', 'audio-only'].map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSelectedFormat(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedFormat === f 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={extracting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-900/30 active:scale-95"
                >
                  {metadata ? 'Start Fetching' : 'Add to Queue'}
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
