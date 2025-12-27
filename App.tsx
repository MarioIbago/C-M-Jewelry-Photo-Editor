import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  History,
  X,
  ChevronRight,
  User,
  Instagram,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  Database,
  DollarSign
} from 'lucide-react';
import { Button } from './components/Button';
import { AudioInput } from './components/AudioInput';
import { editImageWithGemini, generateJewelryCaption } from './services/geminiService';
import { recordSaleInSheet, SaleData } from './services/googleSheetService';
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
type ActiveTab = 'editor' | 'social' | 'database';

// Initial state for the sales form
const INITIAL_SALE_FORM: SaleData = {
  cliente: '',
  contacto: '',
  tipoCliente: 'Nuevo',
  producto: '',
  codigo: '',
  categoria: 'Brazaletes y Charms',
  cantidad: 1,
  precioUnitario: 0,
  subtotal: 0,
  descuento: 0,
  total: 0,
  costoTotal: 0,
  ganancia: 0,
  metodoPago: 'Efectivo',
  observaciones: '',
  recibeVenta: ''
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  
  // Editor State
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:5');
  
  // Social/Caption State
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [captionIdea, setCaptionIdea] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Database State
  const [saleForm, setSaleForm] = useState<SaleData>(INITIAL_SALE_FORM);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<typeof USERS[0] | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to handle image paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only paste image if we are NOT in the database tab (to allow pasting text in inputs)
      if (activeTab === 'database') return;

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
                  setGeneratedCaption('');
                  setActiveTab('editor'); // Switch to editor on paste
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
  }, [activeTab]);

  // Effect to recalculate financials
  useEffect(() => {
    const sub = saleForm.cantidad * saleForm.precioUnitario;
    const tot = sub - saleForm.descuento;
    const profit = tot - saleForm.costoTotal; // Profit is Total - Cost (Cost should be total cost of items)

    setSaleForm(prev => ({
      ...prev,
      subtotal: sub,
      total: tot,
      ganancia: profit
    }));
  }, [saleForm.cantidad, saleForm.precioUnitario, saleForm.descuento, saleForm.costoTotal]);

  const handleLoginSelect = (user: typeof USERS[0]) => {
    setCurrentUser(user);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
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
        setGeneratedCaption('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setImage(null);
    setProcessedImage(null);
    setPrompt('');
    setError(null);
    setGeneratedCaption('');
    setCaptionIdea('');
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
      const result = await editImageWithGemini(image, prompt, aspectRatio);
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

  const handleGenerateCaption = async () => {
    if (!image && !processedImage) {
      setError("Please upload an image first.");
      return;
    }
    
    setCaptionLoading(true);
    setError(null);
    try {
      const imgToUse = processedImage || image || "";
      const result = await generateJewelryCaption(imgToUse, captionIdea);
      setGeneratedCaption(result);
    } catch (err: any) {
      setError(err.message || "Error generating caption.");
    } finally {
      setCaptionLoading(false);
    }
  };

  const handleSaleSubmit = async () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (!saleForm.cliente || !saleForm.producto) {
      alert("Please fill in required fields (Client Name, Product Name)");
      return;
    }

    setSaleLoading(true);
    try {
      await recordSaleInSheet({
        ...saleForm,
        recibeVenta: currentUser.name
      });
      setSaleSuccess(true);
      setTimeout(() => {
        setSaleSuccess(false);
        setSaleForm(INITIAL_SALE_FORM); // Reset form
      }, 3000);
    } catch (e) {
      alert("Error recording sale to database.");
    } finally {
      setSaleLoading(false);
    }
  };

  const handleSaleChange = (field: keyof SaleData, value: string | number) => {
    setSaleForm(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    const textSize = size === 'large' ? 'text-8xl md:text-9xl' : 'text-2xl'; 
    const pipeSize = size === 'large' ? 'text-6xl md:text-7xl' : 'text-xl';
    const subSize = size === 'large' ? 'text-2xl tracking-[0.45em]' : 'text-[10px] tracking-[0.3em]';
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
    <div className="h-screen w-full font-sans overflow-hidden flex flex-col relative bg-[#050505] selection:bg-white selection:text-black">
      {/* Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-600/10 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* Navbar (Top) */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${image || activeTab === 'database' ? 'bg-black/40 backdrop-blur-2xl border-b border-white/5 h-16' : 'bg-transparent py-8 h-24'}`}>
        <div className="w-full px-6 h-full flex items-center justify-between">
          <button onClick={handleReset} className={`transition-all duration-500 ${(!image && activeTab !== 'database') ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <CMLogo size="normal" />
          </button>
          
          <div className="flex items-center gap-4">
             <a href="https://instagram.com/cmjewelry.mx" target="_blank" rel="noopener noreferrer" className="p-2 text-white/70 hover:text-white transition-colors glass-button rounded-full">
               <Instagram className="w-4 h-4" />
             </a>
             {currentUser ? (
                <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                  <img src={currentUser.avatar} className="w-8 h-8 rounded-full grayscale border border-white/10" alt="User" />
                  <button onClick={handleLogout} className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest font-bold">Logout</button>
                </div>
             ) : (
               <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white glass-button px-4 py-2 rounded-full">
                 <User className="w-3 h-3" /> Staff
               </button>
             )}
            {image && activeTab !== 'database' && (
              <button onClick={() => setShowHistory(true)} className="p-2 rounded-full glass-button text-white">
                <History className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className={`flex-1 relative z-10 flex overflow-hidden ${image || activeTab === 'database' ? 'pt-16' : 'pt-0'}`}>
        {(!image && activeTab !== 'database') ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto">
             <CMLogo size="large" />
             <p className="text-2xl text-white/70 font-light mb-12 tracking-wide">Next-Gen AI Jewelry Retouching.</p>
             <div className="flex flex-col md:flex-row gap-4 w-full max-w-xs md:max-w-none px-6 md:px-0">
               <button onClick={() => fileInputRef.current?.click()} className="w-full md:w-auto px-8 py-4 md:px-16 md:py-6 bg-white text-black rounded-full font-bold tracking-widest hover:scale-105 transition-all shadow-2xl text-xs md:text-base">
                 UPLOAD ASSET
               </button>
               <button onClick={() => setActiveTab('database')} className="w-full md:w-auto px-8 py-4 md:px-16 md:py-6 glass-button text-white rounded-full font-bold tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-2 text-xs md:text-base">
                 <Database className="w-4 h-4" /> SALES DB
               </button>
             </div>
          </div>
        ) : (
          <div className="w-full h-full flex">
            {/* Left Vertical Sidebar Menu */}
            <div className="w-20 lg:w-24 shrink-0 border-r border-white/5 flex flex-col items-center py-8 gap-8 bg-black/20 backdrop-blur-md z-20">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`p-4 rounded-2xl transition-all duration-300 group flex flex-col items-center gap-2 ${activeTab === 'editor' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-[9px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 bg-black px-2 py-0.5 rounded border border-white/10">Edit</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('social')}
                className={`p-4 rounded-2xl transition-all duration-300 group flex flex-col items-center gap-2 ${activeTab === 'social' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <FileText className="w-6 h-6" />
                <span className="text-[9px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 bg-black px-2 py-0.5 rounded border border-white/10">Post</span>
              </button>

              <div className="w-full h-px bg-white/10 my-2"></div>

              <button 
                onClick={() => setActiveTab('database')}
                className={`p-4 rounded-2xl transition-all duration-300 group flex flex-col items-center gap-2 ${activeTab === 'database' ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Database className="w-6 h-6" />
                <span className="text-[9px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 bg-black px-2 py-0.5 rounded border border-white/10">Sales</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* === EDITOR MODE === */}
              {activeTab === 'editor' && (
                <div className="w-full h-full p-4 md:p-6 flex flex-col lg:flex-row gap-6 items-stretch overflow-y-auto lg:overflow-hidden animate-fade-in">
                  
                  {/* Left Column: Image Workspace */}
                  <div className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 items-center">
                    {/* Controls */}
                    <div className="flex justify-center gap-2 mb-4 shrink-0">
                      {['4:5', '9:16'].map(ratio => (
                        <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`px-4 py-1.5 rounded-full border text-[9px] uppercase tracking-widest font-bold transition-all ${aspectRatio === ratio ? 'bg-white text-black border-white' : 'glass-button text-white/60 border-white/10'}`}>
                          {ratio === '4:5' ? 'IG Post' : 'IG Story'}
                        </button>
                      ))}
                    </div>

                    {/* Image Container */}
                    {image ? (
                    <div className="flex-1 relative glass-water rounded-[2rem] p-4 flex items-center justify-center overflow-hidden shadow-2xl w-full max-w-full">
                       <div 
                         className="relative transition-all duration-500 shadow-2xl overflow-hidden rounded-sm"
                         style={{
                           aspectRatio: aspectRatio === '9:16' ? '9/16' : '4/5',
                           height: '100%',
                           maxHeight: '75vh',
                           width: 'auto'
                         }}
                       >
                         <img 
                            src={compareMode ? image! : (processedImage || image!)} 
                            className="w-full h-full object-cover" 
                            alt="Edit" 
                         />
                         {processedImage && (
                            <button onMouseDown={() => setCompareMode(true)} onMouseUp={() => setCompareMode(false)} onMouseLeave={() => setCompareMode(false)} className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-button text-white px-8 py-3 rounded-full text-[9px] uppercase tracking-widest font-bold backdrop-blur-xl border border-white/20 hover:bg-white/10 shadow-lg z-20">
                              Hold to Compare
                            </button>
                         )}
                      </div>
                    </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-white/30 text-sm uppercase tracking-widest">
                        No image loaded
                      </div>
                    )}

                    {/* Save Button */}
                    {processedImage && (
                      <div className="mt-4 shrink-0 w-full max-w-xs">
                         <button onClick={downloadImage} className="w-full h-12 rounded-xl bg-white text-black font-bold uppercase tracking-widest text-[10px] hover:scale-[1.01] transition-all shadow-lg shadow-white/5">
                          Save Local
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Tools */}
                  <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-4 h-auto lg:h-full lg:overflow-y-auto pb-4 lg:pb-0 scrollbar-hide">
                    
                    <div className="glass-water p-5 rounded-[1.5rem] border border-white/10 shrink-0">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-[10px] uppercase tracking-widest text-white/50 font-bold flex items-center gap-2">
                          <Wand2 className="w-3.5 h-3.5" /> Command Center
                        </h2>
                        <AudioInput onTranscription={(text) => setPrompt(prev => prev ? `${prev} ${text}` : text)} />
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your creative vision..."
                        className="w-full h-24 lg:h-32 glass-input rounded-xl p-4 text-sm text-white focus:outline-none resize-none mb-4"
                      />
                      <Button onClick={handleGenerate} loading={loading} className="w-full py-4 rounded-xl bg-white text-black font-bold uppercase tracking-widest text-[10px]">
                        Apply Transformation
                      </Button>
                      {error && <p className="text-red-400 text-[10px] text-center mt-3 uppercase tracking-widest font-bold">{error}</p>}
                    </div>

                    <div className="glass-water p-5 rounded-[1.5rem] border border-white/10 flex-1 flex flex-col min-h-[300px]">
                       <h3 className="text-[10px] uppercase tracking-widest text-white/50 mb-4 font-bold text-center">Studio Presets</h3>
                       <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin grid grid-cols-1 gap-2 content-start">
                         {PRESETS.map((p) => (
                           <button key={p.id} onClick={() => setPrompt(p.prompt)} className="flex items-center gap-3 p-3 rounded-lg glass-button text-left group hover:bg-white/10 transition-all border-transparent hover:border-white/10">
                             <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{p.icon}</span>
                             <span className="text-[10px] text-white/80 group-hover:text-white uppercase tracking-widest font-bold flex-1">{p.name}</span>
                             <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white transition-all" />
                           </button>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === SOCIAL MODE === */}
              {activeTab === 'social' && (
                <div className="w-full h-full p-6 flex flex-col lg:flex-row gap-8 overflow-y-auto lg:overflow-hidden animate-slide-up">
                  {/* Image Preview Side */}
                  <div className="w-full lg:w-1/3 flex flex-col gap-4">
                     <h2 className="text-xl font-serif text-white">Social Studio</h2>
                     <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 flex items-center justify-center">
                        {image ? (
                          <>
                            <img 
                              src={processedImage || image || ""} 
                              className="w-full h-full object-cover" 
                              alt="Social Preview" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 left-4 right-4">
                              <p className="text-white text-xs font-medium bg-black/50 backdrop-blur-md px-3 py-1 rounded-full inline-block mb-1">Preview</p>
                            </div>
                          </>
                        ) : (
                          <p className="text-white/30 text-sm uppercase tracking-widest">No image selected</p>
                        )}
                     </div>
                  </div>

                  {/* Caption Generator Side */}
                  <div className="flex-1 flex flex-col gap-4 max-w-2xl">
                     <div className="glass-water p-6 rounded-[2rem] border border-white/10 h-full flex flex-col">
                        
                        {/* Input Section */}
                        <div className="mb-6">
                           <div className="flex justify-between items-center mb-4">
                              <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Concept / Idea</label>
                              <AudioInput onTranscription={(text) => setCaptionIdea(prev => prev ? `${prev} ${text}` : text)} />
                           </div>
                           <textarea
                             value={captionIdea}
                             onChange={(e) => setCaptionIdea(e.target.value)}
                             placeholder="e.g., Elegant evening wear, engagement ring special offer..."
                             className="w-full h-24 glass-input rounded-xl p-4 text-sm text-white focus:outline-none resize-none mb-4"
                           />
                           <Button onClick={handleGenerateCaption} loading={captionLoading} className="w-full py-4 rounded-xl bg-white text-black font-bold uppercase tracking-widest text-[10px]">
                              Generate Caption
                           </Button>
                        </div>

                        {/* Output Section */}
                        <div className="flex-1 relative flex flex-col min-h-[300px]">
                           <label className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2 block">Generated Caption</label>
                           <div className="flex-1 glass-input rounded-xl p-6 text-sm text-white/90 leading-relaxed font-light whitespace-pre-line relative overflow-y-auto border border-white/5">
                              {generatedCaption ? generatedCaption : <span className="text-white/20 italic">Your AI-generated caption will appear here...</span>}
                              
                              {generatedCaption && (
                                <button 
                                  onClick={copyToClipboard}
                                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/10"
                                >
                                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {/* === DATABASE MODE === */}
              {activeTab === 'database' && (
                <div className="w-full h-full p-4 lg:p-8 overflow-y-auto animate-fade-in flex flex-col items-center">
                  <div className="w-full max-w-7xl">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-serif text-white tracking-widest flex items-center gap-2">
                        <Database className="w-5 h-5 text-white/60" /> Sales Database
                      </h2>
                      {currentUser && <span className="text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/70">Staff: {currentUser.name}</span>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* LEFT COLUMN: Data Entry (Span 8) */}
                      <div className="lg:col-span-8 space-y-6">
                        
                        {/* Client Information */}
                        <div className="glass-water p-6 rounded-[1.5rem] border border-white/10">
                          <h3 className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-4">Client Information</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Client Name</label>
                              <input 
                                type="text" 
                                value={saleForm.cliente}
                                onChange={e => handleSaleChange('cliente', e.target.value)}
                                placeholder="e.g. Maria Gonzalez"
                                className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-4">
                              <div className="w-[70%]">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Contact</label>
                                <input 
                                  type="text" 
                                  value={saleForm.contacto}
                                  onChange={e => handleSaleChange('contacto', e.target.value)}
                                  placeholder="Phone/IG"
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                              </div>
                              <div className="w-[30%]">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Type</label>
                                <select 
                                  value={saleForm.tipoCliente}
                                  onChange={e => handleSaleChange('tipoCliente', e.target.value)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none appearance-none bg-transparent"
                                >
                                  <option value="Nuevo" className="bg-black text-white">Nuevo</option>
                                  <option value="Recurrente" className="bg-black text-white">Recurrente</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="glass-water p-6 rounded-[1.5rem] border border-white/10">
                          <h3 className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-4">Product Details</h3>
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <div className="w-[70%]">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Product Name</label>
                                <input 
                                  type="text" 
                                  value={saleForm.producto}
                                  onChange={e => handleSaleChange('producto', e.target.value)}
                                  placeholder="e.g. Gold Cuff"
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                              </div>
                              <div className="w-[30%]">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Code</label>
                                <input 
                                  type="text" 
                                  value={saleForm.codigo}
                                  onChange={e => handleSaleChange('codigo', e.target.value)}
                                  placeholder="C-001"
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="w-1/2">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Category</label>
                                <select 
                                  value={saleForm.categoria}
                                  onChange={e => handleSaleChange('categoria', e.target.value)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none appearance-none bg-transparent"
                                >
                                  <option value="Brazaletes y Charms" className="bg-black text-white">Brazaletes y Charms</option>
                                  <option value="Cuff" className="bg-black text-white">Cuff</option>
                                  <option value="Anillos" className="bg-black text-white">Anillos</option>
                                  <option value="Collares" className="bg-black text-white">Collares</option>
                                  <option value="Aretes" className="bg-black text-white">Aretes</option>
                                </select>
                              </div>
                              <div className="w-1/2">
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Payment Method</label>
                                <select 
                                  value={saleForm.metodoPago}
                                  onChange={e => handleSaleChange('metodoPago', e.target.value)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none appearance-none bg-transparent"
                                >
                                  <option value="Efectivo" className="bg-black text-white">Efectivo</option>
                                  <option value="Transferencia" className="bg-black text-white">Transferencia</option>
                                  <option value="Tarjeta" className="bg-black text-white">Tarjeta</option>
                                </select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Observations</label>
                              <input 
                                type="text" 
                                value={saleForm.observaciones}
                                onChange={e => handleSaleChange('observaciones', e.target.value)}
                                placeholder="Optional notes..."
                                className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* RIGHT COLUMN: Financials (Span 4) */}
                      <div className="lg:col-span-4 sticky top-4">
                        <div className="glass-water p-6 rounded-[1.5rem] border border-white/10 h-full flex flex-col">
                           <h3 className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-4 flex items-center gap-2">
                             <DollarSign className="w-3 h-3" /> Financials
                           </h3>
                           
                           <div className="space-y-4 flex-1">
                             <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Quantity</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={saleForm.cantidad}
                                  onChange={e => handleSaleChange('cantidad', parseInt(e.target.value) || 0)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                             </div>
                             
                             <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Unit Price ($)</label>
                                <input 
                                  type="number" 
                                  value={saleForm.precioUnitario}
                                  onChange={e => handleSaleChange('precioUnitario', parseFloat(e.target.value) || 0)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                             </div>

                             <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Total Cost ($) <span className="text-[8px] opacity-50">(For profit calc)</span></label>
                                <input 
                                  type="number" 
                                  value={saleForm.costoTotal}
                                  onChange={e => handleSaleChange('costoTotal', parseFloat(e.target.value) || 0)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                             </div>

                             <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 ml-1">Discount ($)</label>
                                <input 
                                  type="number" 
                                  value={saleForm.descuento}
                                  onChange={e => handleSaleChange('descuento', parseFloat(e.target.value) || 0)}
                                  className="w-full glass-input rounded-lg p-3 text-sm text-white focus:outline-none"
                                />
                             </div>
                           </div>

                           <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
                             <div className="flex justify-between text-xs text-white/60">
                               <span>Subtotal:</span>
                               <span>${saleForm.subtotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-lg font-bold text-white">
                               <span>Total:</span>
                               <span>${saleForm.total.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-[10px] text-green-400 font-medium uppercase tracking-wider">
                               <span>Est. Profit:</span>
                               <span>+${saleForm.ganancia.toFixed(2)}</span>
                             </div>
                           </div>

                           <div className="mt-6">
                             <Button 
                                onClick={handleSaleSubmit} 
                                loading={saleLoading} 
                                className={`w-full py-4 rounded-xl text-black font-bold uppercase tracking-widest text-[10px] ${saleSuccess ? 'bg-green-500 text-white' : 'bg-white'}`}
                             >
                               {saleSuccess ? 'Transaction Recorded!' : 'Record Transaction'}
                             </Button>
                           </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </main>

      {/* Staff Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
          <div className="relative glass-water p-8 rounded-2xl w-full max-w-sm flex flex-col gap-4 animate-fade-in border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-serif text-white tracking-widest">Select Staff</h3>
              <button onClick={() => setShowLoginModal(false)}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {USERS.map(user => (
                <button 
                  key={user.name}
                  onClick={() => handleLoginSelect(user)}
                  className="flex items-center gap-4 p-3 rounded-xl glass-button hover:bg-white/10 transition-all text-left group border-transparent hover:border-white/20"
                >
                  <img src={user.avatar} className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all" alt={user.name} />
                  <div>
                    <p className="text-white text-sm font-bold tracking-wide">{user.name}</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest group-hover:text-white/60">Editor</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showHistory && activeTab !== 'database' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md glass-water h-full p-8 flex flex-col animate-slide-up border-l border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-serif tracking-widest text-white">History</h2>
              <button onClick={() => setShowHistory(false)}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {history.length === 0 ? <p className="text-white/20 text-[10px] uppercase tracking-widest text-center mt-20">Archive empty</p> : 
                history.map((h, i) => (
                  <div key={i} onClick={() => { setImage(h.original); setProcessedImage(h.processed); setShowHistory(false); setActiveTab('editor'); }} className="cursor-pointer group">
                    <div className="aspect-video rounded-lg overflow-hidden mb-2 border border-white/10 group-hover:border-white/30 transition-all">
                      <img src={h.processed || h.original} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="History" />
                    </div>
                    <p className="text-[9px] uppercase tracking-widest text-white/40">{new Date(h.timestamp).toLocaleString()}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
      
      {!image && activeTab !== 'database' && (
        <footer className="absolute bottom-0 left-0 right-0 py-8 text-center text-[9px] uppercase tracking-[0.4em] text-white/20 font-medium z-10">
          CM JEWELRY STUDIO &copy; 2026 • AI POWERED
        </footer>
      )}
    </div>
  );
}

export default App;