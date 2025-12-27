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
import { AudioInput } from './components/AudioInput';
import { editImageWithGemini } from './services/geminiService';
import { Preset, EditHistory } from './types';

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
      setError("Please describe the transformation.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await editImageWithGemini(image, prompt);
      setProcessedImage(result);
      
      const newHistoryItem: EditHistory = {
        original: image,
        processed: result,
        prompt: prompt,
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev]);
    } catch (err: any) {
      setError(err.message || "Error generating transformation.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `CM_Studio_Edit_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const CMLogo = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => {
    const textSize = size === 'large' ? 'text-8xl md:text-9xl' : 'text-3xl';
    const pipeSize = size === 'large' ? 'text-6xl md:text-7xl' : 'text-2xl';
    const subSize = size === 'large' ? 'text-2xl tracking-[0.45em]' : 'text-xs tracking-[0.3em]';
    const gap = size === 'large' ? 'gap-1.5' : 'gap-0.5';
    
    return (
      <div className={`flex flex-col items-center justify-center text-white ${size === 'large' ? 'mb-10' : ''}`}>
        <div className={`flex items-center justify-center ${gap}`}>
          <span className={`font-serif ${textSize} leading-none font-medium tracking-tighter`}>C</span>
          <span className={`font-serif ${pipeSize} leading-none font-light text-white/40 relative ${size === 'large' ? '-top-3' : '-top-0.5'}`}>|</span>
          <span className={`font-serif ${textSize} leading-none font-medium tracking-tighter`}>M</span>
        </div>
        <span className={`font-serif ${subSize} text-white/80 mt-1 text-center w-full uppercase font-light`}>
          Jewelry
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden flex flex-col relative bg-[#050505] selection:bg-white selection:text-black">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-600/10 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${image ? 'bg-black/40 backdrop-blur-2xl border-b border-white/5' : 'bg-transparent py-8'}`}>
        <div className="max-w-[1800px] mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
          <button onClick={handleReset} className={`transition-all duration-500 ${!image ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <CMLogo size="normal" />
          </button>
          
          <div className="flex items-center gap-6">
             <a href="https://instagram.com/cmjewelry.mx" target="_blank" rel="noopener noreferrer" className="p-3 text-white/70 hover:text-white transition-colors glass-button rounded-full">
               <Instagram className="w-5 h-5" />
             </a>
             {currentUser ? (
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <img src={currentUser.avatar} className="w-10 h-10 rounded-full grayscale border border-white/10" alt="User" />
                  <button onClick={handleLogout} className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest font-bold">Logout</button>
                </div>
             ) : (
               <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white glass-button px-6 py-3 rounded-full">
                 <User className="w-4 h-4" /> Staff
               </button>
             )}
            {image && (
              <button onClick={() => setShowHistory(true)} className="p-3 rounded-full glass-button text-white">
                <History className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className={`flex-1 flex flex-col relative z-10 ${!image ? 'justify-center items-center' : 'pt-32 pb-12 px-4 md:px-8 max-w-[1800px] mx-auto w-full md:flex-row items-start gap-12'}`}>
        {!image ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
             <CMLogo size="large" />
             <p className="text-2xl text-white/70 font-light mb-12 tracking-wide">Next-Gen AI Jewelry Retouching.</p>
             <button onClick={() => fileInputRef.current?.click()} className="px-16 py-6 bg-white text-black rounded-full font-bold tracking-widest hover:scale-105 transition-all shadow-2xl">
               UPLOAD ASSET
             </button>
          </div>
        ) : (
          <>
            <div className="flex-1 w-full flex flex-col items-center">
              <div className="flex gap-4 mb-8">
                {['4:5', '9:16'].map(ratio => (
                  <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`px-6 py-2 rounded-full border text-[10px] uppercase tracking-widest font-bold transition-all ${aspectRatio === ratio ? 'bg-white text-black border-white' : 'glass-button text-white/60 border-white/10'}`}>
                    {ratio === '4:5' ? 'IG Post' : 'IG Story'}
                  </button>
                ))}
              </div>

              <div className={`glass-water rounded-[2.5rem] overflow-hidden relative shadow-2xl flex items-center justify-center p-2 transition-all duration-500 ${aspectRatio === '4:5' ? 'aspect-[4/5] max-h-[70vh]' : 'aspect-[9/16] max-h-[75vh]'}`}>
                <div className="relative w-full h-full rounded-[2.2rem] overflow-hidden bg-black/40">
                  <img src={compareMode ? image! : (processedImage || image!)} className="w-full h-full object-contain" alt="Edit" />
                  {processedImage && (
                    <button onMouseDown={() => setCompareMode(true)} onMouseUp={() => setCompareMode(false)} onMouseLeave={() => setCompareMode(false)} className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-button text-white px-10 py-4 rounded-full text-[10px] uppercase tracking-widest font-bold backdrop-blur-xl">
                      Hold to Compare
                    </button>
                  )}
                </div>
              </div>

              {processedImage && (
                <div className="flex gap-6 mt-10 w-full max-w-md">
                  <button onClick={downloadImage} className="flex-1 h-16 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Save Local</button>
                  <button onClick={() => setDbStatus('saving')} className="flex-1 h-16 rounded-2xl glass-button text-white font-bold uppercase tracking-widest text-[10px]">Cloud Sync</button>
                </div>
              )}
            </div>

            <div className="w-full lg:w-[420px] flex flex-col gap-8 sticky top-32">
              <div className="glass-water p-8 rounded-[2rem]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[10px] uppercase tracking-widest text-white/50 font-bold flex items-center gap-3">
                    <Wand2 className="w-4 h-4" /> AI Command Center
                  </h2>
                  <AudioInput onTranscription={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)} />
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your creative vision..."
                  className="w-full h-40 glass-input rounded-2xl p-6 text-sm text-white focus:outline-none resize-none mb-6"
                />
                <Button onClick={handleGenerate} loading={loading} className="w-full py-5 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-[10px]">
                  Apply Transformation
                </Button>
                {error && <p className="text-red-400 text-[10px] text-center mt-4 uppercase tracking-widest font-bold">{error}</p>}
              </div>

              <div className="glass-water p-8 rounded-[2rem] overflow-hidden">
                 <h3 className="text-[10px] uppercase tracking-widest text-white/50 mb-6 font-bold text-center">Studio Presets</h3>
                 <div className="grid grid-cols-1 gap-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                   {PRESETS.map((p) => (
                     <button key={p.id} onClick={() => setPrompt(p.prompt)} className="flex items-center gap-4 p-4 rounded-xl glass-button text-left group">
                       <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{p.icon}</span>
                       <span className="text-[10px] text-white uppercase tracking-widest font-bold flex-1">{p.name}</span>
                       <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white transition-all" />
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md glass-water h-full p-10 flex flex-col animate-slide-up">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-2xl font-serif tracking-widest">History</h2>
              <button onClick={() => setShowHistory(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              {history.length === 0 ? <p className="text-white/20 text-[10px] uppercase tracking-widest text-center mt-20">Archive empty</p> : 
                history.map((h, i) => (
                  <div key={i} onClick={() => { setImage(h.original); setProcessedImage(h.processed); setShowHistory(false); }} className="cursor-pointer group">
                    <div className="aspect-video rounded-xl overflow-hidden mb-4 border border-white/10 group-hover:border-white/30 transition-all">
                      <img src={h.processed || h.original} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="History" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">{new Date(h.timestamp).toLocaleString()}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 text-center text-[10px] uppercase tracking-[0.4em] text-white/20 font-medium z-10">
        CM JEWELRY STUDIO &copy; 2026 • AI POWERED
      </footer>
    </div>
  );
}

export default App;