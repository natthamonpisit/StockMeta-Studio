import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import { Icons } from './src/components/ui/Icons';
import { CatalogViewerPage } from './src/pages/CatalogViewerPage';
import { TrendsPage } from './src/pages/TrendsPage';
import { mockBackend } from './src/lib/mockBackend';
import { ExportTemplateId } from './src/lib/exportService';

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

const LibraryPage = ({ onSelectCatalog }: { onSelectCatalog: (id: string) => void }) => {
  const catalogs = mockBackend.getCatalogs();

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Icons.Library /> Library</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {catalogs.map(cat => (
          <div 
            key={cat.id} 
            onClick={() => onSelectCatalog(cat.id)}
            className="bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-primary transition group relative"
          >
            <div className="h-32 bg-slate-900 rounded mb-3 flex items-center justify-center text-muted group-hover:bg-slate-800 transition-colors">
               <Icons.Image size={32} />
            </div>
            <h3 className="font-semibold truncate pr-4">{cat.name}</h3>
            <div className="text-sm text-muted flex justify-between mt-2">
              <span>{cat.assetCount} Images</span>
              <span className="text-xs">{new Date(cat.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {catalogs.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted border border-dashed border-border rounded-lg bg-surface/50">
            <Icons.Upload className="mx-auto mb-2 opacity-50"/>
            <p>No catalogs found. Go to Import to start.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ExportPage = ({ onBack }: { onBack: () => void }) => {
  const [output, setOutput] = useState<string | null>(null);
  const catalogs = mockBackend.getCatalogs();
  const [selectedCat, setSelectedCat] = useState(catalogs[0]?.id || '');
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

// --- MAIN APP SHELL ---

enum View { TRENDS = 'TRENDS', LIBRARY = 'LIBRARY', IMPORT = 'IMPORT', VIEWER = 'VIEWER', EXPORT = 'EXPORT', SETTINGS = 'SETTINGS' }

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.TRENDS);
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
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

  const renderContent = () => {
    switch (currentView) {
      case View.TRENDS: return <TrendsPage />;
      case View.IMPORT: return <ImportPage onImportDone={navigateToCatalog} />;
      case View.LIBRARY: return <LibraryPage onSelectCatalog={navigateToCatalog} />;
      case View.VIEWER: return activeCatalogId ? <CatalogViewerPage catalogId={activeCatalogId} onBack={() => setCurrentView(View.LIBRARY)} onNavigateExport={() => setCurrentView(View.EXPORT)} /> : <LibraryPage onSelectCatalog={navigateToCatalog} />;
      case View.EXPORT: return <ExportPage onBack={() => setCurrentView(View.LIBRARY)} />;
      case View.SETTINGS: return (
         <div className="p-10 text-center text-muted">
            <h3 className="text-xl font-bold text-white mb-4">Settings</h3>
            <div className="max-w-md mx-auto bg-surface p-6 rounded border border-border">
                <p className="mb-4">Database is running locally in your browser (IndexedDB).</p>
                <button 
                  onClick={async () => {
                      if(confirm("Warning: This will delete ALL images and metadata. Continue?")) {
                          await mockBackend.hardReset();
                      }
                  }}
                  className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded text-sm w-full border border-red-800"
                >
                    Hard Reset Database
                </button>
            </div>
         </div>
      );
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