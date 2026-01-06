import React, { useState, useEffect, useCallback } from 'react';
import { mockBackend } from '../lib/mockBackend';
import { Catalog, Asset, AssetStatus, Analysis } from '../lib/types';
import { Icons } from '../components/ui/Icons';
import { MetadataPanel } from '../features/asset/components/MetadataPanel';

// --- NEW COMPONENT: Detailed Score Modal ---
const AnalysisDetailModal = ({ analysis, onClose }: { analysis: Analysis, onClose: () => void }) => {
    const score = analysis.sellScore;
    let scoreColor = 'text-red-500';
    if (score > 50) { scoreColor = 'text-yellow-500'; }
    if (score > 80) { scoreColor = 'text-green-500'; }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
                
                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className={`text-3xl font-bold ${scoreColor}`}>{score}/100</div>
                             <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${score > 80 ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                {score > 80 ? 'Excellent Commercial Value' : 'Average Commercial Value'}
                             </div>
                        </div>
                        <h3 className="text-xl font-bold text-white leading-tight">{analysis.title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><Icons.Close /></button>
                </div>

                {/* Body: Pros & Cons Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* PROS COLUMN */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-widest text-xs mb-2">
                            <Icons.Trending className="text-green-400" size={16}/> 5 Strong Points (Pros)
                        </div>
                        <ul className="space-y-3">
                            {(analysis.pros || []).map((pro, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-300 bg-green-900/10 p-3 rounded border border-green-900/30">
                                    <Icons.Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                                    <span>{pro}</span>
                                </li>
                            ))}
                            {(!analysis.pros || analysis.pros.length === 0) && <div className="text-muted italic text-xs">No specific pros listed.</div>}
                        </ul>
                    </div>

                    {/* CONS COLUMN */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-widest text-xs mb-2">
                            <Icons.Alert className="text-red-400" size={16}/> 5 Weak Points (Risks)
                        </div>
                        <ul className="space-y-3">
                            {(analysis.cons || []).map((con, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-300 bg-red-900/10 p-3 rounded border border-red-900/30">
                                    <Icons.Close size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <span>{con}</span>
                                </li>
                            ))}
                            {(!analysis.cons || analysis.cons.length === 0) && <div className="text-muted italic text-xs">No specific cons listed.</div>}
                        </ul>
                    </div>

                </div>

                {/* Footer: Suggestions */}
                <div className="p-6 bg-slate-950/50 border-t border-border">
                    <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs mb-3">
                         <Icons.Sparkles size={14}/> Editing Suggestions
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {analysis.suggestions.map((s, i) => (
                             <span key={i} className="text-xs bg-blue-900/20 text-blue-200 px-3 py-1.5 rounded-full border border-blue-500/30">
                                 {s}
                             </span>
                         ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- ANALYSIS HUD (HEAD-UP DISPLAY) ---
const AssetAnalysisHUD = ({ analysis, isLoading }: { analysis?: Analysis, isLoading: boolean }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="w-full bg-slate-900 border-b border-border p-4 flex items-center gap-4 animate-pulse">
         <div className="h-8 w-8 bg-slate-800 rounded-full"></div>
         <div className="h-4 w-32 bg-slate-800 rounded"></div>
         <div className="flex-1"></div>
         <div className="h-6 w-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (!analysis) return null;

  // 2. Score Visualization Logic
  const score = analysis.sellScore;
  let scoreColor = 'text-red-500';
  if (score > 50) { scoreColor = 'text-yellow-500'; }
  if (score > 80) { scoreColor = 'text-green-500'; }

  const risks = analysis.riskFlags;
  
  // Use the first Pro as the highlight teaser
  const highlightTeaser = (analysis.pros && analysis.pros.length > 0) 
      ? analysis.pros[0] 
      : (analysis.scoreRationale?.[0] || "No data available");
  
  return (
    <>
        <div className="w-full bg-[#0b0f19] border-b border-border p-3 shadow-md flex flex-col md:flex-row gap-4 md:items-center relative z-20">
        
        {/* SCORE CIRCLE & SUMMARY */}
        <div className="flex items-center gap-3 border-r border-border pr-6 min-w-[320px]">
            <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                <path className={`${scoreColor} transition-all duration-1000`} strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
            <span className={`absolute text-xs font-bold ${scoreColor}`}>{score}</span>
            </div>
            
            <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex justify-between items-center w-full">
                    <div className="text-[9px] text-muted uppercase tracking-wider font-bold">Sell Potential</div>
                    {/* [UPDATE] SEE MORE BUTTON */}
                    <button 
                        onClick={() => setShowDetailModal(true)}
                        className="text-[9px] text-primary hover:text-white underline decoration-dotted transition-colors flex items-center gap-1"
                    >
                        See Full Report <Icons.ChevronRight size={10}/>
                    </button>
                </div>

                <div className={`text-xs font-bold ${scoreColor} mb-0.5`}>
                    {score > 80 ? 'HIGH VALUE' : score > 50 ? 'AVERAGE' : 'POOR'}
                </div>
                
                {/* Teaser Text */}
                <p className="text-[10px] text-slate-400 leading-tight truncate w-full" title={highlightTeaser}>
                    {highlightTeaser}
                </p>
            </div>
        </div>

        {/* RISK FLAGS (Badges) */}
        <div className="flex-1 flex flex-wrap gap-2 items-center">
            {/* Model Release Check */}
            {risks.requiresModelRelease ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-900/20 border border-orange-500/50 text-orange-400 text-[10px] rounded-full font-medium">
                <Icons.People size={10} /> Model Release Req
            </span>
            ) : (
                analysis.category === 'People' && <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-900/20 border border-green-500/50 text-green-400 text-[10px] rounded-full font-medium opacity-50"><Icons.Check size={10}/> No Release Needed</span>
            )}

            {/* Trademark/Logo Check */}
            {risks.containsLogoOrText ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-900/20 border border-red-500/50 text-red-400 text-[10px] rounded-full font-medium">
                <Icons.Alert size={10} /> Logo Detected
            </span>
            ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-900/20 border border-green-500/50 text-green-400 text-[10px] rounded-full font-medium opacity-50"><Icons.Shield size={10}/> Clean (No Logos)</span>
            )}

            {/* Editorial Recommendation */}
            {risks.editorialRecommended && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-900/20 border border-blue-500/50 text-blue-400 text-[10px] rounded-full font-medium">
                <Icons.Library size={10} /> Editorial Only
            </span>
            )}
            
            {/* QC Warnings */}
            {analysis.qcWarnings.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-900/20 border border-yellow-500/50 text-yellow-400 text-[10px] rounded-full font-medium">
                <Icons.ShieldAlert size={10} /> {analysis.qcWarnings.length} QC Warnings
            </span>
            )}
        </div>
        </div>

        {/* MODAL PORTAL */}
        {showDetailModal && <AnalysisDetailModal analysis={analysis} onClose={() => setShowDetailModal(false)} />}
    </>
  );
};

// --- OPTIMIZED SUB-COMPONENTS ---

interface AssetThumbnailProps {
  asset: Asset;
  isSelected: boolean;
  isInSelectionMode: boolean;
  isChecked: boolean;
  onClick: (id: string) => void;
}

const AssetThumbnail = React.memo(({ asset, isSelected, isInSelectionMode, isChecked, onClick }: AssetThumbnailProps) => {
  return (
    <div 
      onClick={() => onClick(asset.id)}
      className={`
          flex-shrink-0 w-20 h-20 relative rounded cursor-pointer overflow-hidden transition-all group
          ${isSelected && !isInSelectionMode ? 'border-2 border-primary ring-2 ring-primary/50' : 'border border-transparent hover:border-border'}
          ${isInSelectionMode && isChecked ? 'ring-2 ring-blue-500 opacity-100' : ''}
          ${isInSelectionMode && !isChecked ? 'opacity-60 hover:opacity-100' : ''}
      `}
    >
      <img src={asset.storageKey} className="w-full h-full object-cover" loading="lazy" />
      
      {/* Status Indicators (Top Right) */}
      <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
          {asset.status === AssetStatus.PROCESSING && <Icons.Spinner size={10} className="animate-spin text-blue-400"/>}
          {asset.status === AssetStatus.DONE && <div className="bg-green-500 rounded-full w-1.5 h-1.5 shadow-sm border border-white/20"></div>}
          {asset.isFavorite && <Icons.Star size={10} className="text-yellow-400 fill-yellow-400 drop-shadow-md"/>}
          {asset.status === AssetStatus.FAILED && <div className="bg-red-500 rounded-full w-2 h-2 shadow-sm border border-white/20"></div>}
      </div>

      {/* Selection Mode Overlay (Checkbox) */}
      {isInSelectionMode && (
          <div className={`absolute inset-0 flex items-center justify-center bg-black/20 ${isChecked ? 'bg-blue-500/20' : ''}`}>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-white bg-black/40'}`}>
                {isChecked && <Icons.Check size={12} className="text-white" />}
             </div>
          </div>
      )}

      {/* Filename Overlay (Hover Only) */}
      {!isInSelectionMode && (
        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-[2px] text-[8px] truncate px-1 text-center text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            {asset.originalFilename}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.asset.id === next.asset.id &&
    prev.asset.status === next.asset.status &&
    prev.asset.isFavorite === next.asset.isFavorite &&
    prev.isSelected === next.isSelected &&
    prev.isInSelectionMode === next.isInSelectionMode &&
    prev.isChecked === next.isChecked
  );
});

// --- MAIN PAGE COMPONENT ---

interface CatalogViewerPageProps {
  catalogId: string;
  onBack: () => void;
  onNavigateExport: () => void;
}

export const CatalogViewerPage: React.FC<CatalogViewerPageProps> = ({ catalogId, onBack, onNavigateExport }) => {
  // Data State
  const [catalog, setCatalog] = useState<Catalog | undefined>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // UI State
  const [sortOrder, setSortOrder] = useState<'DATE' | 'NAME' | 'SCORE_HIGH' | 'SCORE_LOW'>('DATE');
  const [selectionMode, setSelectionMode] = useState(false); // Toggle ระหว่าง View Mode / Select Mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // [POLLING STRATEGY]
  // เนื่องจาก AI Worker ทำงานแบบ Async เราจึงต้อง Polling ข้อมูลมาอัปเดตหน้าจอเรื่อยๆ
  const fetch = useCallback(() => {
    const c = mockBackend.getCatalog(catalogId);
    let a = mockBackend.getAssets(catalogId);
    
    // Client-side Sorting Logic
    a = a.sort((x, y) => {
        if (sortOrder === 'NAME') return x.originalFilename.localeCompare(y.originalFilename);
        if (sortOrder === 'SCORE_HIGH') return (y.analysis?.sellScore || 0) - (x.analysis?.sellScore || 0);
        if (sortOrder === 'SCORE_LOW') return (x.analysis?.sellScore || 0) - (y.analysis?.sellScore || 0);
        
        // DEFAULT: DATE ASC (Oldest -> Newest)
        // เหตุผล: เพื่อให้ลำดับในหน้าจอ ตรงกับลำดับการประมวลผลของ Worker (1, 2, 3...)
        return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(); 
    });

    setCatalog(c);
    setAssets(a);
    
    // Auto-select logic: ถ้ารูปแรกยังไม่ถูกเลือก ให้เลือกรูปแรกสุดเสมอ (เฉพาะใน View Mode)
    if (!selectedAssetId && a.length > 0 && !selectionMode) {
        setSelectedAssetId(a[0].id);
    }
  }, [catalogId, sortOrder, selectedAssetId, selectionMode]);

  // Setup Polling Interval
  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [fetch]);

  // Selection Helper
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleAssetClick = (id: string) => {
      if (selectionMode) {
          toggleSelection(id);
      } else {
          setSelectedAssetId(id);
      }
  };

  // --- ACTIONS ---

  const handleBulkDelete = () => {
      if (selectedIds.size === 0) return;
      if (confirm(`Delete ${selectedIds.size} images?`)) {
          mockBackend.deleteAssets(Array.from(selectedIds));
          setSelectedIds(new Set());
          setSelectionMode(false);
          fetch(); // Force refresh immediately
      }
  };

  const handleDeleteCurrent = () => {
    if (!selectedAssetId) return;
    if (confirm('Delete this image?')) {
        const currentIndex = assets.findIndex(a => a.id === selectedAssetId);
        mockBackend.deleteAssets([selectedAssetId]);
        
        fetch();
        
        // Smart Selection: เมื่อลบรูปปัจจุบัน ให้ขยับไปเลือกรูปถัดไป หรือรูปก่อนหน้า
        if (assets.length > 1) {
            const nextAsset = assets[currentIndex + 1] || assets[currentIndex - 1];
            if (nextAsset) setSelectedAssetId(nextAsset.id);
            else setSelectedAssetId(null);
        } else {
            setSelectedAssetId(null);
        }
    }
  };

  const handleStar = () => {
      if (selectedIds.size === 0) return;
      selectedIds.forEach(id => mockBackend.toggleStar(id));
      setSelectedIds(new Set());
      setSelectionMode(false);
      fetch();
  };

  const handleSelectModeToggle = () => {
      if (selectionMode) {
          setSelectionMode(false); // Exit
          setSelectedIds(new Set());
      } else {
          setSelectionMode(true); // Enter
          setSelectedIds(new Set());
      }
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // Keyboard Navigation (Arrow Keys) - Only active in View Mode
  useEffect(() => {
    if (selectionMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedAssetId) return;
      const index = assets.findIndex(a => a.id === selectedAssetId);
      if (e.key === 'ArrowRight' && index < assets.length - 1) setSelectedAssetId(assets[index + 1].id);
      if (e.key === 'ArrowLeft' && index > 0) setSelectedAssetId(assets[index - 1].id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedAssetId, assets, selectionMode]);

  if (!catalog) return <div className="p-8 flex items-center gap-2 text-muted"><Icons.Spinner className="animate-spin"/> Loading catalog...</div>;

  return (
    <div className="h-full flex flex-col bg-background text-text">
      {/* --- TOP BAR --- */}
      <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-surface shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-muted hover:text-white flex items-center gap-1 text-xs">
            <Icons.ChevronLeft size={14} /> Back
          </button>
          <div className="font-semibold text-sm hidden md:block">{catalog.name}</div>
          <div className="h-4 w-px bg-border mx-2 hidden md:block"></div>
          
          {/* View/Select Tools */}
          <div className="flex bg-slate-900 rounded p-0.5 gap-0.5 border border-border">
             <button 
                onClick={handleSelectModeToggle}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 ${selectionMode ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'}`}
             >
                {selectionMode ? <Icons.Check size={12}/> : <Icons.Grid size={12}/>}
                {selectionMode ? 'DONE' : 'SELECT'}
             </button>
             
             <div className="w-px bg-border my-1 mx-1"></div>

             <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold text-muted focus:outline-none hover:text-white cursor-pointer"
             >
                 {/* Explicit styling required for some browsers */}
                 <option className="text-black bg-white" value="DATE">DATE</option>
                 <option className="text-black bg-white" value="NAME">NAME</option>
                 <option className="text-black bg-white" value="SCORE_HIGH">SCORE (HIGH)</option>
                 <option className="text-black bg-white" value="SCORE_LOW">SCORE (LOW)</option>
             </select>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
            {selectionMode ? (
                // Actions for Selection Mode
                <>
                    <span className="text-[10px] text-muted mr-2">{selectedIds.size} selected</span>
                    <button 
                        onClick={handleStar}
                        disabled={selectedIds.size === 0}
                        className="p-1.5 rounded hover:bg-slate-700 text-muted hover:text-yellow-400 disabled:opacity-30 transition"
                        title="Star Selected"
                    >
                        <Icons.Star size={16} />
                    </button>
                    <button 
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                        className="p-1.5 rounded hover:bg-red-900/50 text-muted hover:text-red-400 disabled:opacity-30 transition"
                        title="Delete Selected"
                    >
                        <Icons.Trash size={16} />
                    </button>
                </>
            ) : (
                // Actions for View Mode
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted font-mono bg-slate-900 px-2 py-0.5 rounded border border-border">
                        {assets.filter(a => a.status === AssetStatus.DONE).length}/{assets.length} READY
                    </span>
                    
                    {/* Single Delete Button */}
                    <button 
                        onClick={handleDeleteCurrent}
                        disabled={!selectedAssetId}
                        className="p-1.5 rounded hover:bg-red-900/30 text-muted hover:text-red-400 transition"
                        title="Delete Current Image"
                    >
                        <Icons.Trash size={16} />
                    </button>

                    <div className="h-4 w-px bg-border"></div>

                    <button onClick={onNavigateExport} className="flex items-center gap-2 text-xs bg-primary hover:bg-blue-600 text-white px-3 py-1.5 rounded transition shadow-lg shadow-primary/20">
                        <Icons.Export size={14} /> EXPORT
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* 1. HUD (Full Width) - Only in View Mode */}
        {!selectionMode && (
            <div className="shrink-0 z-20">
            <AssetAnalysisHUD 
                analysis={selectedAsset?.analysis} 
                isLoading={selectedAsset?.status === AssetStatus.PROCESSING} 
            />
            </div>
        )}

        {/* 2. Main Split View */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {/* Left: Viewer / Grid */}
          <div className="flex-1 flex flex-col bg-[#0b0f19] relative min-w-0">
            
            {selectionMode ? (
                 // MODE A: GRID VIEW (Select multiple)
                 <div className="flex-1 overflow-y-auto p-4">
                     <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                         {assets.map(asset => (
                             <div key={asset.id} className="aspect-square">
                                <AssetThumbnail 
                                    asset={asset}
                                    isSelected={false}
                                    isInSelectionMode={true}
                                    isChecked={selectedIds.has(asset.id)}
                                    onClick={handleAssetClick}
                                />
                             </div>
                         ))}
                     </div>
                 </div>
            ) : (
                // MODE B: SINGLE VIEW (Focus Mode)
                <>
                    {/* Main Image Container */}
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative min-h-0">
                    {selectedAsset ? (
                        <div className="w-full h-full flex items-center justify-center relative">
                            {/* [FIX] Object-Contain ensures image fits within available space without scrolling */}
                            <img 
                            src={selectedAsset.storageKey} 
                            alt={selectedAsset.originalFilename} 
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                            />
                            {/* Quick Action Overlay (Star) */}
                            <button 
                                onClick={() => {
                                    mockBackend.toggleStar(selectedAsset.id);
                                    fetch();
                                }}
                                className="absolute top-0 right-0 p-2 bg-black/40 backdrop-blur rounded-bl-xl hover:bg-black/60 transition z-10"
                            >
                                <Icons.Star 
                                    size={20} 
                                    className={selectedAsset.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-white/50"}
                                />
                            </button>
                        </div>
                    ) : (
                        <div className="text-muted text-sm">Select an image to analyze</div>
                    )}
                    </div>
                    
                    {/* Filmstrip (Bottom Reel) */}
                    <div className="h-28 bg-surface border-t border-border flex overflow-x-auto p-2 gap-2 items-center shrink-0 z-10">
                    {assets.map(asset => (
                        <AssetThumbnail 
                        key={asset.id} 
                        asset={asset} 
                        isSelected={selectedAssetId === asset.id} 
                        isInSelectionMode={false}
                        isChecked={false}
                        onClick={handleAssetClick} 
                        />
                    ))}
                    </div>
                </>
            )}
          </div>

          {/* Right: Metadata Panel (Collapsible) */}
          {/* Hide entirely during selection mode to save space */}
          {!selectionMode && (
            <div className="w-80 flex-shrink-0 border-l border-border bg-surface flex flex-col z-10 shadow-xl">
                <MetadataPanel 
                assetId={selectedAsset?.id || ''} 
                analysis={selectedAsset?.analysis}
                errorMessage={selectedAsset?.errorMessage}
                isLoading={selectedAsset?.status === AssetStatus.PROCESSING}
                onUpdate={fetch}
                />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};