import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import { Icons } from './src/components/ui/Icons';
import { CatalogViewerPage } from './src/pages/CatalogViewerPage';
import { TrendsPage } from './src/pages/TrendsPage';
import { mockBackend } from './src/lib/mockBackend';
import { ExportTemplateId } from './src/lib/exportService';
import { db } from './src/lib/db'; // Direct DB Access for Inspector

// --- SAFE COMPONENTS (Error Handling) ---

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 p-8 text-center bg-surface/50 m-4 rounded-xl border border-red-900/50">
          <Icons.Alert size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-bold mb-2">Something went wrong</h3>
          <p className="text-sm opacity-80 mb-4 font-mono bg-black/50 p-2 rounded max-w-md break-words">{this.state.error}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: '' })}
            className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 rounded text-sm transition"
          >
            Try Recovering
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- SUB PAGES ---

const ImportPage = ({ onImportDone }: { onImportDone: (catalogId: string) => void }) => {
  const [name, setName] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) return;

    setIsUploading(true);
    // Auto-generate name
    const catalogName = name.trim() || `Import ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const catalog = mockBackend.createCatalog(catalogName);
    await mockBackend.uploadBatch(catalog.id, Array.from(files));
    setIsUploading(false);
    onImportDone(catalog.id);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-surface rounded-lg border border-border">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Icons.Upload /> Import Images</h2>
      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New Catalog Name</label>
          <input 
            className="w-full bg-background border border-border rounded p-2 focus:border-primary focus:outline-none placeholder:text-slate-600"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`Default: Import ${new Date().toLocaleDateString()}`}
          />
        </div>
        <div>
           <label className="block text-sm font-medium mb-1">Select Images</label>
           <input 
             type="file" 
             multiple 
             accept="image/*"
             onChange={e => setFiles(e.target.files)}
             className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
             required
           />
           <p className="text-xs text-muted mt-2">
             Images are saved to your browser's local database. They will persist even if you close the tab.
           </p>
        </div>
        <button 
          disabled={isUploading}
          className="w-full bg-primary text-white font-bold py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 flex justify-center items-center shadow-lg shadow-primary/20"
        >
          {isUploading ? <Icons.Spinner className="animate-spin mr-2"/> : null}
          {isUploading ? 'Importing...' : 'Start Import'}
        </button>
      </form>
    </div>
  );
};

// [UPDATE] Rename Modal Component
const RenameModal = ({ 
  isOpen, 
  currentName, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  currentName: string; 
  onClose: () => void; 
  onSave: (newName: string) => void; 
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border p-6 rounded-lg w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-bold mb-4">Rename Catalog</h3>
        <input 
          autoFocus
          className="w-full bg-slate-900 border border-border rounded p-2 mb-4 focus:border-primary focus:outline-none text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter') onSave(name);
             if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button 
            onClick={() => onSave(name)} 
            className="px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const LibraryPage = ({ 
  onSelectCatalog,
  onNavigateExport 
}: { 
  onSelectCatalog: (id: string) => void;
  onNavigateExport: (catalogId: string) => void; 
}) => {
  const [catalogs, setCatalogs] = useState(mockBackend.getCatalogs());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Rename State
  const [renameTarget, setRenameTarget] = useState<{id: string, name: string} | null>(null);

  // Refresh catalogs when component mounts
  useEffect(() => {
    setCatalogs(mockBackend.getCatalogs());
    
    // Close menu when clicking outside
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (confirm("Are you sure you want to delete this catalog and ALL images inside?")) {
      mockBackend.deleteCatalog(id);
      setCatalogs(mockBackend.getCatalogs());
    }
  };

  const handleExportShortcut = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    onNavigateExport(id);
  };

  const handleRenameInit = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setRenameTarget({ id, name });
  };

  const performRename = (newName: string) => {
    if (renameTarget && newName.trim()) {
      mockBackend.updateCatalog(renameTarget.id, { name: newName.trim() });
      setCatalogs(mockBackend.getCatalogs());
    }
    setRenameTarget(null);
  };

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  return (
    <>
      <div className="p-8 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Icons.Library /> Library</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {catalogs.map(cat => (
            <div 
              key={cat.id} 
              onClick={() => onSelectCatalog(cat.id)}
              className="group bg-surface border border-border rounded-xl cursor-pointer hover:border-primary transition-all hover:shadow-xl hover:shadow-primary/10 relative overflow-visible"
            >
              {/* Thumbnail Area */}
              <div className="aspect-video bg-slate-900 rounded-t-xl overflow-hidden relative border-b border-border/50">
                {(cat as any).coverImage ? (
                    <img 
                      src={(cat as any).coverImage} 
                      alt="Cover" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted group-hover:bg-slate-800 transition-colors">
                      <Icons.Image size={32} className="opacity-20" />
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
              </div>

              {/* [UPDATE] Expanded Menu */}
              <div className="absolute top-2 right-2 z-20">
                <button 
                    onClick={(e) => handleMenuToggle(e, cat.id)}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <Icons.More size={16} />
                </button>
                
                {activeMenuId === cat.id && (
                    <div className="absolute top-8 right-0 bg-surface border border-border rounded shadow-xl w-40 z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100 py-1">
                        <button 
                          onClick={(e) => handleRenameInit(e, cat.id, cat.name)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                        >
                          <Icons.Sparkles size={12}/> Rename
                        </button>
                        <button 
                          onClick={(e) => handleExportShortcut(e, cat.id)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors"
                        >
                          <Icons.Export size={12}/> Export CSV
                        </button>
                        <div className="h-px bg-border my-1"></div>
                        <button 
                          onClick={(e) => handleDelete(e, cat.id)}
                          className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                        >
                          <Icons.Trash size={12}/> Delete
                        </button>
                    </div>
                )}
              </div>

              {/* Info Area */}
              <div className="p-4">
                <h3 className="font-bold truncate text-slate-200 group-hover:text-primary transition-colors mb-1">{cat.name}</h3>
                <div className="text-xs text-muted flex justify-between items-center">
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-border/50">{cat.assetCount} Assets</span>
                  <span className="opacity-60">{new Date(cat.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Create New Card (Shortcut) */}
          {catalogs.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted border border-dashed border-border rounded-xl bg-surface/30">
              <Icons.Upload className="mx-auto mb-3 opacity-30" size={48}/>
              <p className="font-medium text-slate-400">Your library is empty.</p>
              <p className="text-xs text-slate-500 mt-1">Go to the Import tab to add your first batch.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Rename Modal Portal */}
      <RenameModal 
        isOpen={!!renameTarget} 
        currentName={renameTarget?.name || ''} 
        onClose={() => setRenameTarget(null)}
        onSave={performRename}
      />
    </>
  );
};

const ExportPage = ({ onBack, initialCatalogId }: { onBack: () => void, initialCatalogId?: string }) => {
  const [output, setOutput] = useState<string | null>(null);
  const catalogs = mockBackend.getCatalogs();
  // [UPDATE] Use initialCatalogId if provided, otherwise default to first
  const [selectedCat, setSelectedCat] = useState(initialCatalogId || catalogs[0]?.id || '');
  const [template, setTemplate] = useState<ExportTemplateId>('shutterstock');

  const handleExport = () => {
    if(!selectedCat) return;
    const csv = mockBackend.generateCsvExport(selectedCat, template);
    setOutput(csv);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-surface rounded-lg border border-border">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack}><Icons.ChevronLeft /></button>
        <h2 className="text-xl font-bold">Export Metadata</h2>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-400 uppercase tracking-wider text-[10px]">1. Select Catalog</label>
          <select 
             className="w-full bg-background border border-border rounded p-3 text-sm focus:border-primary focus:outline-none"
             value={selectedCat}
             onChange={e => setSelectedCat(e.target.value)}
          >
            {catalogs.map(c => <option key={c.id} value={c.id}>{c.name} ({c.assetCount} images)</option>)}
          </select>
        </div>

        <div>
           <label className="block text-sm font-medium mb-2 text-slate-400 uppercase tracking-wider text-[10px]">2. Choose Agency Template</label>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={() => setTemplate('shutterstock')} className={`p-4 rounded border text-left transition ${template === 'shutterstock' ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-border hover:bg-slate-800'}`}>
                 <div className="font-bold mb-1 text-sm">Shutterstock</div>
                 <div className="text-[10px] text-muted">Format: CSV</div>
              </button>
              <button onClick={() => setTemplate('adobe')} className={`p-4 rounded border text-left transition ${template === 'adobe' ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-border hover:bg-slate-800'}`}>
                 <div className="font-bold mb-1 text-sm">Adobe Stock</div>
                 <div className="text-[10px] text-muted">Format: CSV</div>
              </button>
              <button onClick={() => setTemplate('istock')} className={`p-4 rounded border text-left transition ${template === 'istock' ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-900 border-border hover:bg-slate-800'}`}>
                 <div className="font-bold mb-1 text-sm">iStock / Getty</div>
                 <div className="text-[10px] text-muted">DeepMeta</div>
              </button>
           </div>
        </div>

        <button 
          onClick={handleExport} 
          disabled={!selectedCat}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition"
        >
           <Icons.Export size={18}/> Generate CSV
        </button>

        {output && (
          <div className="mt-8 pt-6 border-t border-border animate-in slide-in-from-bottom-2 fade-in">
            <h3 className="font-bold text-sm text-green-400 flex items-center gap-2 mb-2"><Icons.Check size={14}/> CSV Generated</h3>
            <textarea readOnly className="w-full h-40 bg-slate-950 text-[10px] font-mono p-3 border border-border rounded text-slate-300 focus:outline-none" value={output} />
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(output)}`} download={`${template}_export.csv`} className="mt-3 block w-full text-center bg-slate-800 hover:bg-slate-700 text-sm py-2 rounded border border-border transition text-white font-medium">Download .CSV File</a>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SETTINGS PAGE (With Data Inspector) ---

const SettingsPage = () => {
  const [inspectorData, setInspectorData] = useState<string | null>(null);

  const loadRawData = async () => {
    try {
      // Direct Read from IndexedDB (Bypassing App State)
      // This confirms data is actually on disk.
      const raw = await db.get('stockmeta_full_state');
      if (raw) {
        // Beautify specifically the Analyses part which contains titles/keywords
        const analysisSample = raw.analyses.map(([, val]: any) => ({
             id: val.assetId.substring(0, 5) + '...',
             title: val.title,
             keywords_count: val.keywords.length,
             keywords_sample: val.keywords.slice(0, 5).join(', ') + '...'
        }));
        setInspectorData(JSON.stringify(analysisSample, null, 2));
      } else {
        setInspectorData("No data found in IndexedDB yet.");
      }
    } catch (e: any) {
      setInspectorData("Error reading DB: " + e.message);
    }
  };

  return (
    <div className="p-10 text-center text-muted h-full overflow-y-auto">
      <h3 className="text-xl font-bold text-white mb-4">Settings & Diagnostics</h3>
      <div className="max-w-md mx-auto space-y-6">
          
          <div className="bg-surface p-6 rounded border border-border">
              <h4 className="font-bold text-sm text-slate-300 mb-2">Storage Status</h4>
              <p className="mb-4 text-xs">Database is running locally (IndexedDB).</p>
              
              {!inspectorData ? (
                  <button 
                    onClick={loadRawData}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm w-full border border-slate-600 flex items-center justify-center gap-2"
                  >
                      <Icons.Search size={14}/> Inspect Local Data
                  </button>
              ) : (
                  <div className="text-left">
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-green-400">RAW DATA FROM DISK</span>
                          <button onClick={() => setInspectorData(null)} className="text-[10px] underline">Close</button>
                      </div>
                      <pre className="text-[10px] bg-black p-3 rounded border border-slate-700 overflow-auto max-h-60 font-mono text-green-500">
                          {inspectorData}
                      </pre>
                  </div>
              )}
          </div>

          <div className="bg-red-950/10 p-6 rounded border border-red-900/30">
              <h4 className="font-bold text-sm text-red-400 mb-2">Danger Zone</h4>
              <button 
                onClick={async () => {
                    if(confirm("Warning: This will delete ALL images and metadata. Continue?")) {
                        await mockBackend.hardReset();
                    }
                }}
                className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded text-sm w-full border border-red-800 flex items-center justify-center gap-2"
              >
                  <Icons.Trash size={14}/> Hard Reset Database
              </button>
          </div>
      </div>
    </div>
  );
};

// --- MAIN APP SHELL ---

enum View { TRENDS = 'TRENDS', LIBRARY = 'LIBRARY', IMPORT = 'IMPORT', VIEWER = 'VIEWER', EXPORT = 'EXPORT', SETTINGS = 'SETTINGS' }

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.TRENDS);
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  // [UPDATE] State for Quick Export shortcut
  const [exportCatalogId, setExportCatalogId] = useState<string | undefined>(undefined);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Initialize DB on App Start
  useEffect(() => {
    const init = async () => {
       await mockBackend.initialize();
       setIsDbLoaded(true);
    };
    init();
  }, []);

  const navItems = [
    { view: View.TRENDS, icon: Icons.Trending, label: 'Trends' },
    { view: View.LIBRARY, icon: Icons.Library, label: 'Library' },
    { view: View.IMPORT, icon: Icons.Upload, label: 'Import' },
    { view: View.EXPORT, icon: Icons.Export, label: 'Exports' },
    { view: View.SETTINGS, icon: Icons.Settings, label: 'Settings' },
  ];

  const navigateToCatalog = (id: string) => { setActiveCatalogId(id); setCurrentView(View.VIEWER); };
  
  // [UPDATE] Handle Quick Export Navigation
  const navigateToExport = (catalogId: string) => { 
      setExportCatalogId(catalogId);
      setCurrentView(View.EXPORT);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.TRENDS: return <TrendsPage />;
      case View.IMPORT: return <ImportPage onImportDone={navigateToCatalog} />;
      case View.LIBRARY: return <LibraryPage onSelectCatalog={navigateToCatalog} onNavigateExport={navigateToExport} />;
      case View.VIEWER: return activeCatalogId ? <CatalogViewerPage catalogId={activeCatalogId} onBack={() => setCurrentView(View.LIBRARY)} onNavigateExport={() => { setExportCatalogId(activeCatalogId); setCurrentView(View.EXPORT); }} /> : <LibraryPage onSelectCatalog={navigateToCatalog} onNavigateExport={navigateToExport} />;
      // [UPDATE] Pass initialCatalogId to ExportPage
      case View.EXPORT: return <ExportPage onBack={() => setCurrentView(View.LIBRARY)} initialCatalogId={exportCatalogId} />;
      case View.SETTINGS: return <SettingsPage />;
      default: return <TrendsPage />;
    }
  };

  if (!isDbLoaded) {
      return (
          <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-primary gap-4">
              <Icons.Spinner size={48} className="animate-spin"/>
              <div className="text-sm font-bold tracking-widest animate-pulse">INITIALIZING LOCAL DATABASE...</div>
          </div>
      )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text font-sans selection:bg-primary/30">
      <aside className="w-16 flex-none flex flex-col items-center py-4 bg-slate-900 border-r border-border gap-6 z-20 shadow-xl">
        <div className="font-bold text-blue-500 text-xl tracking-tighter cursor-pointer hover:text-blue-400 transition" onClick={() => setCurrentView(View.TRENDS)}>SM</div>
        <nav className="flex flex-col gap-4 w-full">
          {navItems.map(item => (
            <button key={item.view} onClick={() => setCurrentView(item.view)} className={`w-full h-12 flex flex-col items-center justify-center gap-1 text-[10px] transition-all relative group ${currentView === item.view ? 'text-primary bg-slate-800' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}>
              <item.icon size={22} strokeWidth={currentView === item.view ? 2.5 : 2} className="transition-transform group-hover:scale-110" />
              <span className="font-medium tracking-tight">{item.label}</span>
              {currentView === item.view && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r shadow-lg shadow-blue-500/50"></div>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-background">
        <ErrorBoundary>{renderContent()}</ErrorBoundary>
      </main>
    </div>
  );
}