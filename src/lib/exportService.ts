import { Asset, Analysis } from './types';

export type ExportTemplateId = 'shutterstock' | 'adobe' | 'istock' | 'generic';

interface CsvRow {
  [key: string]: string | number;
}

// --- CATEGORY MAPPING LOGIC ---
// แต่ละเว็บเรียก Category ไม่เหมือนกัน เราต้องแปลงจาก App Category ไปเป็นของเว็บนั้นๆ
const mapCategory = (appCategory: string, agency: ExportTemplateId): string => {
  const c = appCategory.toLowerCase();

  if (agency === 'shutterstock') {
    // Reference: Shutterstock Contributor CSV Guidelines
    if (c === 'animals') return 'Animals/Wildlife';
    if (c === 'architecture') return 'Buildings/Landmarks';
    if (c === 'business') return 'Business/Finance';
    if (c === 'food & drink') return 'Food and Drink';
    if (c === 'nature') return 'Nature';
    if (c === 'people') return 'People';
    if (c === 'technology') return 'Technology';
    if (c === 'travel') return 'Holidays';
    return 'Miscellaneous';
  }

  if (agency === 'adobe') {
    // Adobe Stock accepts broad category IDs or names. Using Names for readability.
    if (c === 'technology') return 'Science'; // Adobe groups Tech under Science/Industry
    if (c === 'nature') return 'Landscape';
    return appCategory; // Adobe is quite flexible with standard names
  }

  // iStock uses controlled vocabulary, usually handled by DeepMeta via Keywords.
  // We keep it generic here as the CSV is mostly for metadata injection.
  return appCategory;
};

// --- ESCAPE LOGIC ---
// CSV พังทันทีถ้ามีเครื่องหมาย , หรือ " ในเนื้อหา เราต้องครอบ "..." และ escape " เป็น ""
const escapeCsv = (text: string | undefined): string => {
  if (!text) return "";
  const cleaned = text.replace(/"/g, '""'); // Double quotes escape
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    return `"${cleaned}"`;
  }
  return cleaned;
};

// --- GENERATORS ---

export const exportService = {
  
  generateCsv(assets: Asset[], template: ExportTemplateId): string {
    let header = "";
    let rows: string[] = [];

    // 1. SHUTTERSTOCK
    if (template === 'shutterstock') {
      header = "Filename,Description,Keywords,Categories";
      rows = assets.map(a => {
        const d = a.analysis!;
        return [
          escapeCsv(a.originalFilename),
          escapeCsv(d.title), // SS uses Title as Description usually
          escapeCsv(d.keywords.join(',')), // Comma separated
          escapeCsv(mapCategory(d.category, 'shutterstock'))
        ].join(",");
      });
    }

    // 2. ADOBE STOCK
    else if (template === 'adobe') {
      header = "Filename,Title,Keywords,Category";
      rows = assets.map(a => {
        const d = a.analysis!;
        return [
          escapeCsv(a.originalFilename),
          escapeCsv(d.title),
          escapeCsv(d.keywords.join(', ')), // Space after comma preferred
          escapeCsv(mapCategory(d.category, 'adobe'))
        ].join(",");
      });
    }

    // 3. ISTOCK / GETTY (DeepMeta / ESP Format)
    else if (template === 'istock') {
      // Standard layout for importing into keywording tools like DeepMeta
      header = "Filename,Title,Description,Keywords,DateCreated";
      rows = assets.map(a => {
        const d = a.analysis!;
        const tech = d.technicalSpecs;
        return [
          escapeCsv(a.originalFilename),
          escapeCsv(d.title), // Title (Brief)
          escapeCsv(d.description || d.title), // Description (Detailed)
          escapeCsv(d.keywords.join(',')),
          escapeCsv(tech?.dateTimeOriginal || '')
        ].join(",");
      });
    }

    // 4. GENERIC (Fallback)
    else {
      header = "Filename,Title,Description,Keywords,Category,SellScore";
      rows = assets.map(a => {
        const d = a.analysis!;
        return [
          escapeCsv(a.originalFilename),
          escapeCsv(d.title),
          escapeCsv(d.description),
          escapeCsv(d.keywords.join(';')),
          escapeCsv(d.category),
          d.sellScore
        ].join(",");
      });
    }

    return header + "\n" + rows.join("\n");
  }
};