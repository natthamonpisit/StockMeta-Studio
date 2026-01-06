/**
 * [MAINTENANCE NOTE]
 * ไฟล์นี้เป็น "Single Source of Truth" สำหรับ Type Definitions ทั้งหมดในโปรเจกต์
 * การแก้ Type ที่นี่ จะส่งผลกระทบทั้ง App ควรตรวจสอบให้ดีก่อนแก้ครับ
 */

// สถานะของรูปภาพแต่ละรูป
export enum AssetStatus {
  PENDING = 'PENDING',       // รอคิว
  PROCESSING = 'PROCESSING', // กำลังให้ AI ประมวลผล หรือดึง EXIF
  DONE = 'DONE',             // เสร็จสมบูรณ์
  FAILED = 'FAILED',         // เกิด Error (เช่น ไฟล์เสีย หรือ API error)
}

// สถานะของ Batch (กลุ่มไฟล์ที่อัปโหลดพร้อมกัน)
export enum BatchStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  PARTIAL_FAIL = 'PARTIAL_FAIL', // เสร็จแต่มีบางรูป error
}

// Workspace เอาไว้รองรับระบบ Multi-user ในอนาคต (ตอนนี้ Mock ไว้ก่อน)
export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

// Catalog คือ Folder หรือ Album เก็บรูป
export interface Catalog {
  id: string;
  workspaceId: string;
  name: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  assetCount?: number; // [VIRTUAL FIELD] ไม่ได้เก็บใน DB จริง แต่คำนวณตอน query เพื่อ performance
}

export interface Batch {
  id: string;
  workspaceId: string;
  catalogId: string;
  name?: string;
  status: BatchStatus;
  totalCount: number;
  doneCount: number;
  failCount: number;
  createdAt: string;
}

// [STOCK COMPLIANCE] ข้อมูลความเสี่ยงสำหรับ Stock Photo
export interface RiskFlags {
  containsLogoOrText: boolean;       // มีโลโก้สินค้าไหม (ห้ามมี)
  containsRecognizablePerson: boolean; // มีคนไหม
  requiresModelRelease: boolean;     // ถ้ามีคน ต้องมีใบ Release
  requiresPropertyRelease: boolean;  // ถ้าเป็นสถานที่ส่วนบุคคล ต้องมีใบ Release
  editorialRecommended: boolean;     // แนะนำให้ส่งขายแบบข่าว (Editorial) แทน Commercial
}

// ข้อมูลองค์ประกอบภาพ
export interface CompositionStats {
  orientation: string;           // แนวตั้ง/แนวนอน
  copySpace: string;             // พื้นที่ว่างสำหรับวาง Text (สำคัญมากสำหรับงานโฆษณา)
  backgroundCleanliness: string; // ความสะอาดของฉากหลัง
}

// [EXIF DATA] ข้อมูลทางเทคนิคจากกล้อง
export interface TechnicalSpecs {
  // Capture Settings
  make?: string;        // ยี่ห้อกล้อง
  model?: string;       // รุ่นกล้อง
  lens?: string;        // เลนส์
  fNumber?: string;     // ค่า F
  exposureTime?: string; // Shutter Speed
  iso?: string;         // ISO
  focalLength?: string; // ระยะเลนส์
  dateTimeOriginal?: string; // วันที่ถ่ายจริง
  
  // Software Info
  software?: string;    // โปรแกรมที่ใช้แต่งรูป (Lightroom, Photoshop)

  // File Info
  fileType?: string;
  width?: number;
  height?: number;
  fileSize?: string;

  // GPS (สำคัญสำหรับงาน Travel)
  gps?: {
    latitude: string | number;
    longitude: string | number;
    altitude?: string;
  };
}

// ผลลัพธ์การวิเคราะห์จาก AI + Metadata
export interface Analysis {
  id: string;
  assetId: string;
  title: string;          // ชื่อภาพ (สำคัญต่อ SEO)
  description?: string;
  keywords: string[];     // Keyword 40 คำ (สำคัญที่สุดในการขาย)
  category: string;
  sellScore: number;      // คะแนนประเมินโอกาสขาย (0-100)
  
  // [UPDATE] Detailed Report breakdown
  pros: string[];         // ข้อดี 5 ข้อ
  cons: string[];         // ข้อเสีย 5 ข้อ
  scoreRationale: string[]; // (Legacy support) Summary rationale
  
  suggestions: string[];  // คำแนะนำในการแต่งรูปเพิ่ม
  qcWarnings: string[];   // คำเตือนเรื่องคุณภาพ (Noise, Blur)
  riskFlags: RiskFlags;
  composition: CompositionStats;
  technicalSpecs?: TechnicalSpecs; // Link กับ EXIF ด้านบน
  technicalIssues?: string[]; 
  updatedAt: string;
}

// Main Asset Entity
export interface Asset {
  id: string;
  workspaceId: string;
  catalogId: string;
  batchId: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  storageKey: string; // URL ของรูป (ใน Mock ใช้ Blob URL, ของจริงใช้ S3 Key)
  status: AssetStatus;
  errorMessage?: string;
  createdAt: string;
  analysis?: Analysis; // Join กับตาราง Analysis
  isFavorite?: boolean; // ดาว (Star) สำหรับคัดรูปเกรด A
}

export interface ExportJob {
  id: string;
  workspaceId: string;
  catalogId?: string;
  batchId?: string;
  templateKey: string;
  status: 'READY' | 'GENERATING' | 'DONE' | 'FAILED';
  filePath?: string;
  createdAt: string;
}