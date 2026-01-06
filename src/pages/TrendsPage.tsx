import React, { useEffect, useState } from 'react';
import { Icons } from '../components/ui/Icons';
import { aiService, TrendItem } from '../lib/aiService';

// --- Helper: Select Icon based on keywords/title ---
const getTrendIcon = (item: TrendItem) => {
  const text = (item.title + item.keywords.join(' ')).toLowerCase();
  if (text.includes('tech') || text.includes('digital') || text.includes('ai')) return Icons.Tech;
  if (text.includes('nature') || text.includes('eco') || text.includes('green')) return Icons.Nature;
  if (text.includes('business') || text.includes('office') || text.includes('work')) return Icons.Business;
  if (text.includes('love') || text.includes('health') || text.includes('care')) return Icons.Lifestyle;
  if (text.includes('travel') || text.includes('vacation') || text.includes('world')) return Icons.Travel;
  if (text.includes('summer') || text.includes('sun')) return Icons.Summer;
  if (text.includes('energy') || text.includes('power')) return Icons.Energy;
  if (text.includes('people') || text.includes('family') || text.includes('team')) return Icons.People;
  return Icons.Art; // Default
};

// --- Helper: Generate Gradient based on text hash ---
const getGradient = (text: string) => {
  const gradients = [
    'from-blue-600 to-indigo-900',
    'from-purple-600 to-blue-900',
    'from-emerald-500 to-teal-900',
    'from-orange-500 to-red-900',
    'from-pink-500 to-rose-900',
    'from-cyan-500 to-blue-800',
    'from-amber-500 to-orange-800'
  ];
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// --- Sub Component for Individual Cards ---
const TrendCard: React.FC<{ item: TrendItem, index: number }> = ({ item, index }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  
  const TrendIcon = getTrendIcon(item);
  const gradientClass = getGradient(item.title);

  const handleGenerateImage = async () => {
    setIsGeneratingImg(true);
    try {
      const base64Image = await aiService.generateImage(item.visualPrompt);
      if (base64Image) {
        setImageSrc(base64Image);
      }
    } catch (e) {
      console.error("Failed to gen image", e);
      alert("Could not generate image. Please check API Quota.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const openGoogleImages = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = `${item.title} stock photo aesthetic`;
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 flex flex-col h-full relative">
      {/* Visual Area (Image or Graphic) */}
      <div className={`aspect-[4/3] relative overflow-hidden group/image bg-slate-900`}>
        
        {imageSrc ? (
          // AI Generated Image
          <img 
            src={imageSrc} 
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 animate-in fade-in duration-500"
          />
        ) : (
          // CSS Gradient Graphic (Default)
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center relative`}>
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
            
            {/* Central Icon */}
            <div className={`text-white opacity-20 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${isGeneratingImg ? 'animate-pulse' : ''}`}>
               <TrendIcon size={120} strokeWidth={1} />
            </div>

            {/* Generating State */}
            {isGeneratingImg && (
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                 <Icons.Spinner size={32} className="animate-spin text-primary" />
                 <span className="text-xs font-bold tracking-wider animate-pulse">CREATING VISION...</span>
               </div>
            )}
          </div>
        )}

        {/* Floating Rank Badge */}
        <div className="absolute top-3 left-3 pointer-events-none z-20">
            <span className="bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              #{index + 1}
            </span>
        </div>

        {/* Action Buttons (Overlay) */}
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 translate-y-2 group-hover:translate-y-0 duration-300">
           {/* Google Search Button */}
           <button 
              onClick={openGoogleImages}
              className="bg-slate-800/90 hover:bg-white hover:text-slate-900 text-white p-2 rounded-lg shadow-lg border border-white/10 backdrop-blur transition-all"
              title="Search on Google Images"
            >
              <Icons.Search size={14} />
            </button>
          
           {/* Generate Button */}
          {!imageSrc && !isGeneratingImg && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateImage();
              }}
              className="bg-primary hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 transform active:scale-95 transition"
            >
              <Icons.Sparkles size={14} /> Visualize
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col relative">
        <div className="absolute -top-6 left-5 z-20">
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider ${imageSrc ? 'bg-purple-600 text-white' : 'bg-surface border border-border text-muted'}`}>
              {imageSrc ? '✨ AI Visualized' : 'Concept Phase'}
            </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={openGoogleImages}>
          {item.title}
          <Icons.ChevronRight className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary" size={16} />
        </h3>
        <p className="text-sm text-muted mb-6 leading-relaxed border-l-2 border-border pl-3 group-hover:border-primary/50 transition-colors">
          {item.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted uppercase font-semibold">
            <Icons.Trending size={12} className="text-green-400" />
            Recommended Keywords
          </div>
          <div className="flex flex-wrap gap-2">
            {item.keywords.slice(0, 5).map((kw, i) => (
              <span key={i} className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-border transition-colors cursor-default">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

export const TrendsPage = () => {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [periodInfo, setPeriodInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const fetchTrends = async (topic?: string) => {
    setLoading(true);
    setError(null);
    setTrends([]); 
    
    // Update Header with Buying Cycle Logic (Rolling 3 Months)
    const now = new Date();
    
    // Start Range (Month + 1)
    const startRange = new Date(now);
    startRange.setMonth(now.getMonth() + 1);
    
    // End Range (Month + 3)
    const endRange = new Date(now);
    endRange.setMonth(now.getMonth() + 3);

    // Format Strings
    const startStr = startRange.toLocaleString('default', { month: 'short' });
    const endStr = endRange.toLocaleString('default', { month: 'short' });
    const yearStr = endRange.getFullYear();
    
    if (topic) {
      setPeriodInfo("Custom Niche Analysis");
      setCurrentTopic(`Target: "${topic}"`);
    } else {
      setPeriodInfo(`Forecast for ${startStr} - ${endStr} ${yearStr}`);
      setCurrentTopic("Upcoming Market Trends");
    }

    try {
      const data = await aiService.getStockTrends(topic);
      if (data && data.length > 0) {
        setTrends(data);
        const isMock = data[0].description.includes("Simulation Mode");
        setIsLive(!isMock);
      } else {
        setError("AI could not generate trends at this moment. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load trends. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    fetchTrends(searchInput);
  };

  return (
    <div className="h-full flex flex-col bg-background text-text overflow-y-auto">
      
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-b from-slate-900 to-background border-b border-border p-8 shrink-0">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 text-primary">
                  <Icons.Sparkles size={16} className="animate-pulse" />
                  <span className="text-xs font-bold tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded text-primary">
                    {periodInfo}
                  </span>
                </div>
                {/* Status Badge */}
                {!loading && (
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isLive ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-yellow-900/30 border-yellow-700 text-yellow-400'}`}>
                     {isLive ? '● LIVE AI DATA' : '○ SIMULATION MODE'}
                   </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">{currentTopic}</h1>
              <p className="text-muted text-sm md:text-base max-w-2xl leading-relaxed">
                Discover high-potential stock photography concepts curated by AI. 
                Optimized for the <strong>3-month buying cycle</strong> to maximize sales potential.
              </p>
            </div>
            
            {/* Search Box */}
            <form onSubmit={handleSearch} className="w-full md:w-96 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center bg-surface rounded-lg">
                <Icons.Search className="absolute left-3 text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Analyze a niche (e.g., 'Remote Work')..." 
                  className="w-full bg-transparent border-none text-white pl-10 pr-12 py-3 rounded-lg focus:ring-0 focus:outline-none placeholder:text-slate-500"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 p-1.5 bg-border rounded-md hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  {loading ? <Icons.Spinner size={14} className="animate-spin"/> : <Icons.ChevronRight size={14} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto w-full">
          
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-t-2 border-blue-300 rounded-full animate-spin reverse"></div>
              </div>
              <p className="text-lg font-medium text-slate-300">Consulting AI Analyst...</p>
              <p className="text-sm text-slate-500">Evaluating global calendar & market gaps</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center text-red-400 bg-red-900/10 rounded-xl border border-red-900/30">
              <Icons.Alert size={48} className="mb-4 opacity-50" />
              <p>{error}</p>
              <button onClick={() => fetchTrends()} className="mt-4 px-4 py-2 bg-surface hover:bg-border rounded text-sm text-white transition">
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trends.map((item, index) => (
                <TrendCard key={index} item={item} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};