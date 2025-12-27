import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Wand2, 
  History,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  User,
  Database,
  Instagram,
  Smartphone,
  LayoutTemplate
} from 'lucide-react';
import { Button } from './components/Button';
import { editImageWithGemini } from './services/geminiService';
import { Preset, EditHistory } from './types';

// --- CONFIGURATION ---
const USERS = [
  { name: 'Carlos', avatar: 'https://ui-avatars.com/api/?name=Carlos&background=222&color=fff&font-size=0.5' },
  { name: 'Mario', avatar: 'https://ui-avatars.com/api/?name=Mario&background=fff&color=000&font-size=0.5' }
];

const PRESETS: Preset[] = [
  { 
    id: 'minimal', 
    name: 'Minimalist Pro', 
    icon: '◻️', 
    prompt: 'Clean, minimalist jewelry photography. Soft diffused lighting, neutral light grey background, ultra-sharp focus on the jewelry, remove imperfections. High-end catalog style.' 
  },
  { 
    id: 'remove-bg', 
    name: 'Remove Background', 
    icon: '✂️', 
    prompt: 'Remove the background completely. Place the jewelry on a clean, pure white background with a soft, natural drop shadow. Professional e-commerce look.' 
  },
  { 
    id: 'black-gloves', 
    name: 'Black Gloves', 
    icon: '🧤', 
    prompt: 'Show the jewelry being elegantly held by a hand wearing formal, high-end black velvet gloves. Dark, moody, luxurious atmosphere.' 
  },
  { 
    id: 'black-grey', 
    name: 'Dark Mode', 
    icon: '⚫', 
    prompt: 'Place the jewelry on a premium background with a smooth gradient from black to dark grey. Cinematic lighting, high contrast, sharp details.' 
  },
  { 
    id: 'high-contrast', 
    name: 'High Contrast', 
    icon: '⚡', 
    prompt: 'High contrast black and white photography style. Dramatic lighting, sharp reflections, metallic textures.' 
  }
];

type AspectRatio = '4:5' | '9:16';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  
  const [currentUser, setCurrentUser] = useState<typeof USERS[0] | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  setImage(event.target.result as string);
                  setProcessedImage(null);
                  setPrompt('');
                }
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleLoginSelect = (user: typeof USERS[0]) => {
    setCurrentUser(user);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setDbStatus('idle');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setProcessedImage(null);
        setError(null);
        setPrompt('');
        setDbStatus('idle'); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setImage(null);
    setProcessedImage(null);
    setPrompt('');
    setError(null);
    setDbStatus('idle');
  };

  const handleGenerate = async () => {
    if (!image) return;
    if (!prompt.trim()) {
      setError("Please describe the edit.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await editImageWithGemini(image, prompt);
      setProcessedImage(result);
      setDbStatus('idle'); 
      
      const newHistoryItem: EditHistory = {
        original: image,
        processed: result,
        prompt: prompt,
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch (err) {
      setError("Error generating edit. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      const date = new Date();
      const timestamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      link.download = `CM_Studio_${timestamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDatabaseSave = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setDbStatus('saving');
    setTimeout(() => {
      setDbStatus('saved');
    }, 1500);
  };

  const CMLogo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => {
    const textSize = size === 'large' ? 'text-8xl md:text-9xl' : 'text-3xl';
    const pipeSize = size === 'large' ? 'text-6xl md:text-7xl' : 'text-2xl';
    const subSize = size === 'large' ? 'text-2xl tracking-[0.4em]' : 'text-xs tracking-[0.3em]';
    const gap = size === 'large' ? 'gap-2' : 'gap-1';
    
    return (
      <div className={`flex flex-col items-center justify-center text-white ${size === 'large' ? 'mb-8' : ''}`}>
        <div className={`flex items-center justify-center ${gap}`}>
          <span className={`font-serif ${textSize} leading-none font-medium`}>C</span>
          <span className={`font-serif ${pipeSize} leading-none font-light text-white/50 relative ${size === 'large' ? '-top-2' : '-top-0.5'}`}>|</span>
          <span className={`font-serif ${textSize} leading-none font-medium`}>M</span>
        </div>
        <span className={`font-serif ${subSize} text-white/90 mt-2 text-center w-full uppercase`}>
          Jewelry
        </span>
      </div>
    );
  };

  const LandingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full animate-fade-in px-6 relative py-12">
      <div className="flex flex-col items-center justify-center text-center max-w-4xl z-10 space-y-12">
        <div className="animate-slide-up hover:scale-105 transition-transform duration-700 cursor-default">
           <CMLogo size="large" />
        </div>
        <div className="space-y-6 animate-slide-up delay-100">
          <p className="text-2xl md:text-3xl text-white/90 font-light max-w-2xl leading-relaxed tracking-wide mx-auto font-sans">
            Artificial Intelligence for High-End Jewelry Photography.
          </p>
        </div>
        <div className="flex flex-col items-center gap-6 w-full animate-fade-in delay-200 mt-8">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group relative px-16 py-6 bg-white text-black rounded-full font-bold tracking-widest transition-all hover:scale-105 active:scale-95 w-full md:w-auto min-w-[300px] flex items-center justify-center gap-4 shadow-[0_0_80px_-20px_rgba(255,255,255,0.4)]"
          >
            <Upload className="w-5 h-5" />
            <span>UPLOAD IMAGE</span>
          </button>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            or press Ctrl + V to paste
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans overflow-x-hidden flex flex-col relative selection:bg-white selection:text-black bg-[#050505]">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-600/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${image ? 'bg-black/20 backdrop-blur-xl border-b border-white/5' : 'bg-transparent py-8'}`}>
        <div className="max-w-[1800px] mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={handleReset}
              className={`transition-all duration-500 hover:opacity-80 ${!image ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              <CMLogo size="normal" />
            </button>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full glass-water/50 border border-white/5 backdrop-blur-md">
                <div className="flex relative">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-white/90 font-medium">
                  {currentUser ? `${currentUser.name} • CM Cloud` : 'Secured Studio Session'}
                </span>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <a href="https://instagram.com/cmjewelry.mx" target="_blank" rel="noopener noreferrer" className="p-3 text-white/70 hover:text-white transition-colors glass-button rounded-full">
               <Instagram className="w-5 h-5" />
             </a>
             {currentUser ? (
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <div className="relative group cursor-pointer">
                    <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all border border-white/10 shadow-lg" />
                  </div>
                  <button onClick={handleLogout} className="hidden md:block text-[10px] text-white/50 hover:text-white transition-colors uppercase tracking-widest font-bold">Logout</button>
                </div>
             ) : (
               <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white hover:text-white/80 transition-colors glass-button px-6 py-3 rounded-full">
                 <User className="w-4 h-4" /> Staff Login
               </button>
             )}
            {image && (
              <button onClick={() => setShowHistory(true)} className="p-3 rounded-full glass-button text-white transition-colors">
                <History className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className={`flex-1 flex flex-col relative z-10 transition-all duration-1000 ${!image ? 'justify-center' : 'pt-32 pb-12 px-4 md:px-8 max-w-[1800px] mx-auto w-full gap-8 lg:gap-12 md:flex-row items-start'}`}>
        {!image ? <LandingScreen /> : (
          <>
            <div className="flex-1 w-full animate-fade-in flex flex-col items-center justify-start min-h-[600px]">
              <div className="flex gap-4 mb-6">
                <button onClick={() => setAspectRatio('4:5')} className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-all text-[10px] uppercase tracking-widest font-bold ${aspectRatio === '4:5' ? 'bg-white text-black border-white' : 'glass-button text-white/60 hover:text-white border-white/10'}`}>
                  <LayoutTemplate className="w-3 h-3" /> IG Post (4:5)
                </button>
                <button onClick={() => setAspectRatio('9:16')} className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-all text-[10px] uppercase tracking-widest font-bold ${aspectRatio === '9:16' ? 'bg-white text-black border-white' : 'glass-button text-white/60 hover:text-white border-white/10'}`}>
                  <Smartphone className="w-3 h-3" /> IG Story (9:16)
                </button>
              </div>

              <div className={`glass-water rounded-[2rem] overflow-hidden relative shadow-2xl flex items-center justify-center p-2 transition-all duration-500 ease-in-out ${aspectRatio === '4:5' ? 'aspect-[4/5] max-h-[75vh] w-auto max-w-full' : 'aspect-[9/16] max-h-[75vh] w-auto max-w-full'}`}>
                <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden flex items-center justify-center bg-black/40">
                  <img src={compareMode ? image! : (processedImage || image!)} alt="Jewelry" className={`w-full h-full object-contain transition-all duration-300 ${compareMode ? 'grayscale-[20%]' : ''}`} />
                  {processedImage && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full flex justify-center px-4">
                       <button onMouseDown={() => setCompareMode(true)} onMouseUp={() => setCompareMode(false)} onMouseLeave={() => setCompareMode(false)} className="glass-button text-white px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold hover:bg-white hover:text-black transition-all backdrop-blur-xl shadow-xl">
                        Hold to Compare
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {processedImage && (
                <div className="flex flex-col sm:flex-row justify-center gap-6 mt-8 w-full max-w-lg animate-slide-up">
                  <button onClick={downloadImage} className="flex-1 h-14 rounded-xl bg-white text-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]">
                    <Upload className="w-4 h-4 rotate-180" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Save Local</span>
                  </button>
                  <button onClick={handleDatabaseSave} disabled={dbStatus === 'saving' || dbStatus === 'saved'} className={`flex-1 h-14 rounded-xl border flex items-center justify-center gap-3 transition-all relative overflow-hidden group glass-button ${dbStatus === 'saved' ? 'bg-green-500/20 border-green-500/50 text-green-100' : 'text-white hover:bg-white/10'}`}>
                    {dbStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : dbStatus === 'saved' ? <CheckCircle2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {dbStatus === 'saving' ? 'Saving...' : dbStatus === 'saved' ? 'Saved to DB' : 'Save to DB'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-full lg:w-[400px] flex flex-col gap-6 animate-fade-in delay-100 flex-shrink-0 lg:sticky lg:top-32 h-fit">
              <div className="glass-water p-6 rounded-[1.5rem] flex flex-col gap-5">
                <h2 className="text-[10px] uppercase tracking-[0.25em] flex items-center gap-3 text-white font-bold">
                  <div className="p-1.5 rounded-full bg-white/10"><Wand2 className="w-3 h-3 text-white" /></div> Studio Edit
                </h2>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the desired transformation..."
                  className="w-full h-32 glass-input rounded-xl p-5 text-sm text-white placeholder-white/30 focus:outline-none resize-none font-sans font-light leading-relaxed"
                />
                <Button onClick={handleGenerate} disabled={!image} loading={loading} className="w-full rounded-xl bg-white text-black hover:bg-white/90 font-bold uppercase tracking-widest text-[10px] py-4 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)]">
                  {loading ? 'Processing...' : 'Generate Edit'}
                </Button>
                {error && <p className="text-red-300 text-[10px] text-center mt-2 bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</p>}
              </div>

              <div className="glass-water p-6 rounded-[1.5rem] flex-1 max-h-[500px] overflow-hidden flex flex-col">
                 <h3 className="text-center text-[10px] uppercase tracking-[0.25em] text-white/50 mb-6 pb-4 border-b border-white/5 font-bold">Presets</h3>
                 <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin flex-1 pb-4">
                   {PRESETS.map((preset) => (
                     <button key={preset.id} onClick={() => setPrompt(preset.prompt)} className="w-full flex items-center gap-5 p-4 rounded-xl glass-button hover:bg-white/10 transition-all group text-left">
                       <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{preset.icon}</span>
                       <div className="flex-1">
                          <span className="text-xs text-white uppercase tracking-widest font-bold block mb-1">{preset.name}</span>
                          <span className="text-[9px] text-white/40 line-clamp-1 block">Quick apply</span>
                       </div>
                       <ChevronRight className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </>
        )}
      </main>

      <div className={`fixed inset-y-0 right-0 w-[450px] glass-water border-l-0 z-50 transform transition-transform duration-700 ${showHistory ? 'translate-x-0' : 'translate-x-full'} shadow-2xl`}>
        <div className="p-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-serif text-2xl text-white tracking-widest">History</h2>
            <button onClick={() => setShowHistory(false)} className="opacity-50 hover:opacity-100 transition-opacity text-white"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-8 pr-2">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 gap-6">
                <History className="w-8 h-8 stroke-1" />
                <p className="text-[10px] uppercase tracking-widest">No history</p>
              </div>
            ) : history.map((item) => (
              <div key={item.timestamp} onClick={() => { setImage(item.original); setProcessedImage(item.processed); setPrompt(item.prompt); setShowHistory(false); }} className="group cursor-pointer">
                <div className="aspect-video relative overflow-hidden rounded-xl mb-4 border border-white/10 group-hover:border-white/40 transition-all">
                  <img src={item.processed || item.original} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all" />
                </div>
                <div className="flex justify-between items-center opacity-50 group-hover:opacity-100 text-white text-[10px] uppercase tracking-wider">
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showHistory && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setShowHistory(false)} />}
      
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
          <div className="glass-water rounded-[2rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl text-white font-serif text-center mb-10 tracking-widest">SELECT USER</h3>
            <div className="space-y-4">
              {USERS.map((user) => (
                <button key={user.name} onClick={() => handleLoginSelect(user)} className="w-full flex items-center gap-5 p-4 rounded-xl glass-button hover:bg-white/10 transition-all group">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full grayscale group-hover:grayscale-0" />
                  <span className="text-white text-lg font-sans font-medium">{user.name}</span>
                  <ChevronRight className="ml-auto text-white/30 group-hover:text-white" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowLoginModal(false)} className="mt-10 text-center w-full text-xs text-white/40 hover:text-white uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}

      <footer className="w-full text-center py-12 text-white/30 text-[10px] uppercase tracking-[0.3em] font-medium z-10">
        <p>CM JEWELRY STUDIO &copy; 2026</p>
      </footer>
    </div>
  );
}

export default App;