// This file drives the UI rendering for the metadata panel.

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'keywords' 
  | 'select' 
  | 'readonly_progress' 
  | 'readonly_list'
  | 'risk_flags' 
  | 'composition_info'
  | 'technical_specs'; // NEW

export interface MetadataFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // For select
  validation?: {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    exactCount?: number; // For keywords
  };
  placeholder?: string;
}

export const METADATA_PANEL_SCHEMA: MetadataFieldConfig[] = [
  // Moved Score, Risk, Warnings to HUD (Center View)
  {
    key: 'title',
    label: 'Title',
    type: 'text',
    validation: { required: true, maxLength: 200 },
    placeholder: 'Subject + Action + Context (No Brands)'
  },
  {
    key: 'keywords',
    label: 'Keywords (40)',
    type: 'keywords',
    validation: { exactCount: 40 }
  },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: ['Animals', 'Architecture', 'Business', 'Food & Drink', 'Nature', 'People', 'Technology', 'Travel', 'General'],
    validation: { required: true }
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Detailed visual description...'
  },
  // NEW TECHNICAL PANEL
  {
    key: 'technicalSpecs',
    label: 'Camera & File Info',
    type: 'technical_specs'
  },
  {
    key: 'composition',
    label: 'Composition',
    type: 'composition_info'
  },
  {
    key: 'suggestions',
    label: 'Editing Suggestions',
    type: 'readonly_list',
  }
];