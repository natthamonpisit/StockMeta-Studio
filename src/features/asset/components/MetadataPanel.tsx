import React, { useState, useEffect } from 'react';
import { Analysis, RiskFlags, CompositionStats, TechnicalSpecs } from '../../../lib/types';
import { METADATA_PANEL_SCHEMA, MetadataFieldConfig } from '../schemas/metadataPanelSchema';
import { Icons } from '../../../components/ui/Icons';
import { mockBackend } from '../../../lib/mockBackend';

interface MetadataPanelProps {
  assetId: string;
  analysis: Analysis | undefined;
  isLoading: boolean;
  errorMessage?: string; 
  onUpdate: () => void;
}

/**
 * [COMPONENT NOTE] MetadataPanel
 * Component นี้ใช้หลักการ "Configuration-Driven UI"
 * โดยจะ Render Field ต่างๆ ตาม METADATA_PANEL_SCHEMA 
 * ทำให้ง่ายต่อการเพิ่ม/ลด Field โดยไม่ต้องแก้ Code HTML เยอะ
 */
export const MetadataPanel: React.FC<MetadataPanelProps> = ({ assetId, analysis, isLoading, errorMessage, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<Analysis>>({});
  const [keywordInput, setKeywordInput] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync prop 'analysis' to local state
  useEffect(() => {
    if (analysis) {
      setFormData(analysis);
    }
  }, [analysis]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (analysis) {
      mockBackend.updateAnalysis(assetId, formData);
      onUpdate(); // Trigger refresh in parent
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000); // Reset icon after 2s
  };

  // [RENDERER LOGIC]
  // Function นี้ทำหน้าที่แปลง Field Config เป็น JSX Component
  const renderField = (field: MetadataFieldConfig) => {
    const value = (formData as any)[field.key];

    switch (field.type) {
      case 'text':
        return (
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-surface border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-primary"
              value={value || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.validation?.maxLength}
            />
            <button 
              onClick={() => copyToClipboard(value as string, field.key)}
              className="px-3 bg-border rounded hover:bg-slate-600 transition text-muted hover:text-white"
              title="Copy"
            >
              {copiedField === field.key ? <Icons.Check size={14} className="text-green-400"/> : <Icons.Copy size={14}/>}
            </button>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            className="w-full bg-surface border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-primary min-h-[80px]"
            value={value || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        return (
          <select
            className="w-full bg-surface border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-primary"
            value={value || ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
          >
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'composition_info':
        const comp = value as CompositionStats;
        if (!comp) return null;
        return (
            <div className="flex gap-2 text-[10px] text-muted uppercase tracking-wider">
                <span className="bg-surface px-2 py-1 rounded border border-border">{comp.orientation || 'N/A'}</span>
                <span className="bg-surface px-2 py-1 rounded border border-border">Copy Space: {comp.copySpace || 'N/A'}</span>
            </div>
        );

      // [CUSTOM RENDERER] Technical Specs (EXIF)
      case 'technical_specs':
        const specs = value as TechnicalSpecs;
        if (!specs) return <div className="text-xs text-muted italic p-2 border border-dashed border-border rounded">No EXIF data found</div>;
        
        return (
          <div className="bg-slate-950/50 rounded border border-border p-2 space-y-3">
             {/* 1. Camera Capture Info */}
             <div className="space-y-1">
               <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase"><Icons.Art size={10}/> Capture</div>
               <div className="grid grid-cols-2 gap-1 text-xs">
                 <div className="text-muted">Model: <span className="text-slate-200">{specs.model || '-'}</span></div>
                 <div className="text-muted">Lens: <span className="text-slate-200 truncate" title={specs.lens}>{specs.lens || '-'}</span></div>
               </div>
               <div className="flex gap-2 text-[10px] font-mono text-slate-400 mt-1">
                 <span className="bg-slate-900 border border-border px-1 rounded">{specs.iso ? `ISO ${specs.iso}` : '-'}</span>
                 <span className="bg-slate-900 border border-border px-1 rounded">{specs.fNumber ? `${specs.fNumber}` : '-'}</span>
                 <span className="bg-slate-900 border border-border px-1 rounded">{specs.exposureTime ? `${specs.exposureTime}s` : '-'}</span>
                 <span className="bg-slate-900 border border-border px-1 rounded">{specs.focalLength ? `${specs.focalLength}` : '-'}</span>
               </div>
               <div className="text-[10px] text-muted truncate">{specs.dateTimeOriginal}</div>
             </div>

             <div className="h-px bg-border/50"></div>

             {/* 2. Software / Processing Tool */}
             <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase"><Icons.Tech size={10}/> Software / Tool</div>
                <div className="text-xs text-slate-200 truncate" title={specs.software}>{specs.software || 'Unknown'}</div>
             </div>

             <div className="h-px bg-border/50"></div>

             {/* 3. File & GPS */}
             <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                   <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase"><Icons.Image size={10}/> File</div>
                   <div className="text-[10px] text-muted">{specs.width && specs.height ? `${specs.width} x ${specs.height} px` : '-'}</div>
                   <div className="text-[10px] text-muted">{specs.fileSize} • {specs.fileType?.split('/')[1]?.toUpperCase()}</div>
                </div>
                <div className="space-y-1 border-l border-border/50 pl-2">
                   <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold uppercase"><Icons.Travel size={10}/> Location</div>
                   {specs.gps ? (
                     <div className="text-[10px] text-slate-200 flex items-center gap-1">
                        <Icons.Check size={8} className="text-green-500"/> GPS Embedded
                     </div>
                   ) : (
                     <div className="text-[10px] text-muted italic">Not found</div>
                   )}
                </div>
             </div>
          </div>
        );

      case 'keywords':
        const keywords = (value as string[]) || [];
        const addKeyword = () => {
          const trimmed = keywordInput.trim();
          if (trimmed && !keywords.includes(trimmed)) {
            handleChange(field.key, [...keywords, trimmed]);
            setKeywordInput('');
          }
        };
        const removeKeyword = (kw: string) => {
          handleChange(field.key, keywords.filter(k => k !== kw));
        };
        const handleCopyKeywords = () => {
          copyToClipboard(keywords.join(', '), field.key);
        };

        return (
          <div className="space-y-2">
             <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${keywords.length >= 40 ? 'bg-green-900/30 text-green-400' : 'bg-orange-900/30 text-orange-400'}`}>
                     {keywords.length}/40
                   </span>
                </div>
                <button 
                  onClick={handleCopyKeywords}
                  className="text-[10px] flex items-center gap-1 text-primary hover:text-blue-300 transition"
                >
                  {copiedField === field.key ? <Icons.Check size={10}/> : <Icons.Copy size={10}/>}
                  COPY ALL
                </button>
             </div>

            <div className="flex flex-wrap gap-1 max-h-60 overflow-y-auto p-2 bg-surface border border-border rounded content-start">
              {keywords.map(kw => (
                <span key={kw} className="bg-slate-900 border border-border text-xs px-2 py-1 rounded flex items-center gap-1 group hover:border-primary/50 transition-colors">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="text-muted hover:text-red-400 transition-colors">
                    <Icons.Close size={10} />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && <span className="text-xs text-muted p-2 italic">No keywords yet...</span>}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-surface border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-primary"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="Add keyword..."
              />
              <button onClick={addKeyword} className="bg-border px-3 rounded hover:bg-primary hover:text-white">
                <Icons.Check size={16} />
              </button>
            </div>
          </div>
        );

      case 'readonly_list':
        const list = (value as string[]) || [];
        if (list.length === 0) return <div className="text-xs text-muted italic">None</div>;
        return (
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 bg-slate-900/50 p-2 rounded border border-border">
            {list.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted flex-col gap-2">
        <Icons.Spinner className="animate-spin text-primary" size={32} />
        <span className="text-sm font-medium animate-pulse">Running Risk Analysis...</span>
        <span className="text-xs text-slate-500">Checking Trademarks & Releases</span>
      </div>
    );
  }

  // Error State Display
  if (!analysis) {
    if (errorMessage) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted p-6 text-center bg-red-950/20">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                    <Icons.Alert className="text-red-500" size={24} />
                </div>
                <h3 className="text-red-400 font-bold mb-2">Analysis Failed</h3>
                <p className="text-xs text-slate-400 bg-black/40 p-3 rounded border border-border mb-4 font-mono">
                    {errorMessage}
                </p>
                <div className="text-[10px] text-slate-500">
                    This can happen due to API limits or image corruption.<br/>
                    The system will auto-retry in the background.
                </div>
            </div>
        );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-muted p-6 text-center">
        <Icons.Alert className="mb-2 opacity-50" />
        <p className="font-medium">Analysis Pending</p>
        <p className="text-xs text-slate-500 mt-2">Waiting for worker process...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-border shadow-xl z-10 relative">
      <div className="p-4 border-b border-border flex justify-between items-center bg-slate-950">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
             <Icons.List size={16} className="text-primary"/> Metadata Editor
        </h2>
        <button 
          onClick={handleSave}
          className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-600 transition flex items-center gap-1 shadow-lg shadow-primary/20"
        >
          <Icons.Check size={12} /> SAVE
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {METADATA_PANEL_SCHEMA.map(field => {
            // [LOGIC] Only show 'Suggestions' if there are actual suggestions
            if (field.key === 'suggestions') {
                 const list = (formData as any)[field.key] as string[];
                 if (!list || list.length === 0) return null;
            }
            return (
                <div key={field.key}>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                    {field.label}
                    </label>
                    {renderField(field)}
                </div>
            )
        })}
      </div>
    </div>
  );
};