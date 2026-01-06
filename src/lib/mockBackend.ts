import { Analysis, Asset, AssetStatus, Batch, BatchStatus, Catalog, Workspace, TechnicalSpecs } from './types';
import { v4 as uuidv4 } from 'uuid';
import { aiService, StockAnalysisResult } from './aiService';
import { exportService, ExportTemplateId } from './exportService';
import { db } from './db'; // Import Local DB
import ExifReader from 'exifreader';

const MOCK_WORKSPACE_ID = 'ws-default';
const STORAGE_KEY = 'stockmeta_full_state';

// Interface for what we save to disk
interface PersistedState {
  workspace: Workspace;
  catalogs: [string, Catalog][];
  batches: [string, Batch][];
  assets: [string, Asset][];
  analyses: [string, Analysis][];
  idxCatalogAssets: [string, string[]][]; // Convert Set to Array
}

class MockBackend {
  private workspace: Workspace = { id: MOCK_WORKSPACE_ID, name: 'Default Workspace', createdAt: new Date().toISOString() };
  
  // In-Memory State
  private catalogs = new Map<string, Catalog>();
  private batches = new Map<string, Batch>();
  private assets = new Map<string, Asset>();
  private analyses = new Map<string, Analysis>();
  private idxCatalogAssets = new Map<string, Set<string>>();
  
  private isInitialized = false;

  constructor() {
    // Constructor cannot be async, so we use an init method called by App.tsx
  }

  // --- PERSISTENCE (SAVE/LOAD) ---

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Loading data from Local Database...");
      const savedData = await db.get(STORAGE_KEY) as PersistedState;
      
      if (savedData) {
        // Restore State
        this.workspace = savedData.workspace;
        this.catalogs = new Map(savedData.catalogs);
        this.batches = new Map(savedData.batches);
        this.assets = new Map(savedData.assets);
        this.analyses = new Map(savedData.analyses);
        
        // Restore Index (Convert Array back to Set)
        this.idxCatalogAssets = new Map(
          savedData.idxCatalogAssets.map(([k, v]) => [k, new Set(v)])
        );
        console.log(`Restored: ${this.assets.size} assets`);
      } else {
        // First time user: Create default catalog
        console.log("No saved data found. Creating new workspace.");
        this.createCatalog('Demo Catalog', 'Welcome! Import images to start.');
        this.save(); // Save initial state
      }
    } catch (e) {
      console.error("Failed to load database:", e);
      // Fallback: Start fresh
      this.createCatalog('Recovery Catalog', 'Database load failed. Starting fresh.');
    }
    
    this.isInitialized = true;
  }

  // Auto-save trigger
  private async save() {
    const state: PersistedState = {
      workspace: this.workspace,
      catalogs: Array.from(this.catalogs.entries()),
      batches: Array.from(this.batches.entries()),
      assets: Array.from(this.assets.entries()),
      analyses: Array.from(this.analyses.entries()),
      idxCatalogAssets: Array.from(this.idxCatalogAssets.entries()).map(([k, set]) => [k, Array.from(set)])
    };
    
    // Save to IndexedDB (Fire and forget, don't await blocking UI)
    db.set(STORAGE_KEY, state).catch(err => console.error("Auto-save failed:", err));
  }

  // --- CATALOG OPERATIONS ---
  
  getCatalogs() {
    return Array.from(this.catalogs.values()).map(c => {
      const assetSet = this.idxCatalogAssets.get(c.id);
      let coverImage: string | undefined;
      
      // [UPDATE] Randomly select a cover image if assets exist
      if (assetSet && assetSet.size > 0) {
        const assetsArray = Array.from(assetSet);
        // Pick a random one or the first one. Let's pick random to spice it up.
        const randomIndex = Math.floor(Math.random() * assetsArray.length);
        const randomId = assetsArray[randomIndex];
        coverImage = this.assets.get(randomId)?.storageKey;
      }

      return {
        ...c,
        assetCount: assetSet?.size || 0,
        coverImage // Return cover image URL
      };
    });
  }

  getCatalog(id: string) {
    return this.catalogs.get(id);
  }

  createCatalog(name: string, note?: string) {
    const id = uuidv4();
    const catalog: Catalog = {
      id,
      workspaceId: MOCK_WORKSPACE_ID,
      name,
      note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.catalogs.set(id, catalog);
    this.idxCatalogAssets.set(id, new Set());
    this.save(); // Save
    return catalog;
  }

  // [UPDATE] Update Catalog (e.g., Rename)
  updateCatalog(id: string, updates: Partial<Catalog>) {
    const current = this.catalogs.get(id);
    if (!current) return;
    
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.catalogs.set(id, updated);
    this.save();
  }

  // [UPDATE] Delete Catalog
  deleteCatalog(id: string) {
    if (!this.catalogs.has(id)) return;

    // 1. Delete all assets inside
    const assetIds = this.idxCatalogAssets.get(id);
    if (assetIds) {
      this.deleteAssets(Array.from(assetIds));
    }

    // 2. Delete index and catalog
    this.idxCatalogAssets.delete(id);
    this.catalogs.delete(id);
    
    this.save();
  }

  // --- IMPORT PROCESS ---

  async uploadBatch(catalogId: string, files: File[]) {
    const batchId = uuidv4();
    const batch: Batch = {
      id: batchId,
      workspaceId: MOCK_WORKSPACE_ID,
      catalogId,
      name: `Batch ${new Date().toLocaleTimeString()}`,
      status: BatchStatus.UPLOADED,
      totalCount: files.length,
      doneCount: 0,
      failCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.batches.set(batchId, batch);

    const newAssets: Asset[] = [];
    const catalogIndex = this.idxCatalogAssets.get(catalogId);
    const baseTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Convert File to Base64/Blob URL for storage persistence
      // Note: For very large apps, we'd store the Blob in IDB directly. 
      // For MVP, we use FileReader to get a DataURL (simpler but uses more RAM).
      const storageKey = await this.fileToDataUrl(file);
      
      const assetId = uuidv4();
      const asset: Asset = {
        id: assetId,
        workspaceId: MOCK_WORKSPACE_ID,
        catalogId,
        batchId,
        originalFilename: file.name,
        mimeType: file.type,
        size: file.size,
        storageKey, // Stores Base64 string
        status: AssetStatus.PENDING,
        createdAt: new Date(baseTime + (i * 10)).toISOString(),
        isFavorite: false
      };
      
      this.assets.set(assetId, asset);
      catalogIndex?.add(assetId);
      newAssets.push(asset);
    }
    
    this.save(); // Save after upload
    this.startWorkerForBatch(batchId);

    return { batch, assets: newAssets };
  }

  // Helper to convert File to persistable string
  private fileToDataUrl(file: File): Promise<string> {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
      });
  }

  getAssets(catalogId: string) {
    const assetIds = this.idxCatalogAssets.get(catalogId);
    if (!assetIds) return [];

    return Array.from(assetIds).map(id => {
        const asset = this.assets.get(id)!;
        return { ...asset, analysis: this.analyses.get(id) };
    });
  }

  deleteAssets(assetIds: string[]) {
      assetIds.forEach(id => {
          const asset = this.assets.get(id);
          if (asset) {
              this.idxCatalogAssets.get(asset.catalogId)?.delete(id);
              this.analyses.delete(id);
              this.assets.delete(id);
          }
      });
      this.save(); // Save
  }

  toggleStar(assetId: string) {
      const asset = this.assets.get(assetId);
      if (asset) {
          asset.isFavorite = !asset.isFavorite;
          this.assets.set(assetId, asset);
          this.save(); // Save
      }
  }

  // --- WORKER SIMULATION ---
  
  private async startWorkerForBatch(batchId: string) {
    const batchAssets = Array.from(this.assets.values())
      .filter(a => a.batchId === batchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    for (const asset of batchAssets) {
        if (!this.batches.has(batchId)) break;
        await this.processAsset(asset.id);
        
        const batch = this.batches.get(batchId);
        if (batch) {
          batch.doneCount++;
          if (batch.status === BatchStatus.UPLOADED) batch.status = BatchStatus.PROCESSING;
          this.batches.set(batchId, batch);
        }
        this.save(); // Save progress
        await new Promise(resolve => setTimeout(resolve, 500)); // Faster 500ms for UX
    }
    
    this.updateBatchStatus(batchId);
    this.save(); // Final save
  }

  private async processAsset(assetId: string) {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    asset.status = AssetStatus.PROCESSING;
    this.assets.set(assetId, asset);
    // Note: Don't save yet, wait for result

    try {
      // 1.5 Extract Metadata (EXIF)
      let technicalSpecs: TechnicalSpecs | undefined;
      let blob: Blob | null = null;

      // Convert stored Base64 back to Blob for processing
      try {
        const res = await fetch(asset.storageKey);
        blob = await res.blob();
        
        // EXIF Extraction
        const arrayBuffer = await blob.arrayBuffer();
        const tags: any = ExifReader.load(arrayBuffer);
        if (tags) {
             const getTag = (name: string) => tags[name]?.description;
             technicalSpecs = {
                make: getTag('Make'),
                model: getTag('Model'),
                lens: getTag('LensModel') || getTag('Lens'),
                exposureTime: getTag('ExposureTime'),
                fNumber: getTag('FNumber'),
                iso: getTag('ISOSpeedRatings') || getTag('ISO'),
                focalLength: getTag('FocalLength'),
                dateTimeOriginal: getTag('DateTimeOriginal'),
                software: getTag('Software') || getTag('ProcessingSoftware'),
                fileType: blob.type,
                fileSize: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
                width: Number(tags['Image Width']?.value) || 0,
                height: Number(tags['Image Height']?.value) || 0,
                gps: (tags['GPSLatitude'] && tags['GPSLongitude']) ? {
                    latitude: getTag('GPSLatitude'),
                    longitude: getTag('GPSLongitude')
                } : undefined
            };
            if (!asset.width && technicalSpecs.width) asset.width = technicalSpecs.width;
            if (!asset.height && technicalSpecs.height) asset.height = technicalSpecs.height;
        }
      } catch (ex) {
        console.warn("EXIF extraction failed", ex);
      }

      // 2. AI Analysis
      let analysisData: StockAnalysisResult | null = null;
      if (blob) {
         try {
             // 12s Timeout
             const aiPromise = aiService.analyzeStockPhoto(blob);
             const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 12000));
             analysisData = await Promise.race([aiPromise, timeoutPromise]);
         } catch (e) {
             console.debug("AI Error", e);
         }
      }

      if (!analysisData) analysisData = this.generateMockAnalysis(asset);

      // 3. Save Result
      const analysis: Analysis = {
        id: uuidv4(),
        assetId: asset.id,
        title: analysisData.title,
        description: analysisData.description || "",
        keywords: analysisData.keywords,
        category: analysisData.category,
        sellScore: analysisData.sellScore,
        scoreRationale: analysisData.scoreRationale || analysisData.pros, // Fallback
        
        // [UPDATE] Mock data filling
        pros: analysisData.pros || ["Simulated Pro 1", "Simulated Pro 2"],
        cons: analysisData.cons || ["Simulated Cons 1"],

        suggestions: analysisData.suggestions,
        qcWarnings: analysisData.qcWarnings || [],
        riskFlags: analysisData.riskFlags,
        composition: analysisData.composition,
        technicalSpecs: technicalSpecs,
        technicalIssues: [],
        updatedAt: new Date().toISOString(),
      };

      this.analyses.set(assetId, analysis);
      
      const updatedAsset = this.assets.get(assetId)!;
      updatedAsset.status = AssetStatus.DONE;
      this.assets.set(assetId, updatedAsset);

    } catch (e: any) {
      console.error("Critical Asset Error", e);
      const failedAsset = this.assets.get(assetId)!;
      failedAsset.status = AssetStatus.FAILED;
      failedAsset.errorMessage = e.message;
      this.assets.set(assetId, failedAsset);
    }
  }

  private updateBatchStatus(batchId: string) {
    const batch = this.batches.get(batchId);
    if (!batch) return;
    batch.status = BatchStatus.DONE;
    this.batches.set(batchId, batch);
  }

  private generateMockAnalysis(asset: Asset): StockAnalysisResult {
    // Keep existing mock logic...
    const filename = asset.originalFilename.toLowerCase();
    let category = "General";
    if (filename.includes('dog') || filename.includes('cat')) category = "Animals";
    if (filename.includes('city')) category = "Architecture";
    if (filename.includes('food')) category = "Food & Drink";
    
    return {
      title: `Stock photo of ${asset.originalFilename} (${category})`,
      description: "Auto-generated description (Simulation Mode)",
      keywords: Array.from({ length: 40 }, (_, i) => `${category.toLowerCase()}${i+1}`),
      category,
      sellScore: 75,
      scoreRationale: ["Simulated Score"],
      // [UPDATE] Default pros/cons for simulation
      pros: [
          "Good exposure and natural lighting",
          "Clear subject separation",
          "Standard aspect ratio suitable for social",
          "No visible trademarks",
          "Sharp focus on main subject"
      ],
      cons: [
          "Composition is a bit centered (static)",
          "Background is slightly distracting",
          "Limited copy space for text",
          "Common subject matter (high competition)",
          "Could benefit from color grading"
      ],
      suggestions: ["Check white balance"],
      qcWarnings: [],
      riskFlags: {
        containsLogoOrText: false,
        containsRecognizablePerson: false,
        requiresModelRelease: false,
        requiresPropertyRelease: false,
        editorialRecommended: false
      },
      composition: { orientation: "Horizontal", copySpace: "Medium", backgroundCleanliness: "Average" }
    };
  }

  updateAnalysis(assetId: string, updates: Partial<Analysis>) {
    const current = this.analyses.get(assetId);
    if (!current) return null;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.analyses.set(assetId, updated);
    this.save(); // Save on edit
    return updated;
  }

  generateCsvExport(catalogId: string, templateId: ExportTemplateId) {
    const assets = this.getAssets(catalogId).filter(a => a.status === AssetStatus.DONE);
    return exportService.generateCsv(assets, templateId);
  }

  // Debug: Reset DB
  async hardReset() {
     await db.clear();
     window.location.reload();
  }
}

export const mockBackend = new MockBackend();