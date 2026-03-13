export type Status = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';

export interface Redaction {
  type: 'RECOVERED' | 'GUESSED' | 'INFERRED';
  text: string;
  score: number;
  method?: string;
  alternatives?: string[];
  explanation?: string;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  result: string;
  redactions: Redaction[];
  forensicSummary?: ForensicSummary;
  timestamp: number;
}

export interface ParsedSegment {
  type: 'text' | 'recovered' | 'guessed' | 'inferred';
  content: string;
  score?: number;
  method?: string;
  alternatives?: string[];
  explanation?: string;
}

// --- Forensic Types ---

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  page: number;
}

export interface RedactionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface TextUnderRedaction {
  text: string;
  box: RedactionBox;
  textItem: TextItem;
  overlapPercent: number;
}

export interface AnnotationInfo {
  type: string;
  subtype: string;
  contents: string;
  page: number;
  rect: number[];
  modificationDate?: string;
  color?: number[];
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  keywords?: string;
  pageCount: number;
}

export interface VersionInfo {
  count: number;
  eofOffsets: number[];
  hasMultipleVersions: boolean;
}

export interface ForensicReport {
  metadata: DocumentMetadata;
  textItems: TextItem[];
  annotations: AnnotationInfo[];
  redactionBoxes: RedactionBox[];
  textUnderRedactions: TextUnderRedaction[];
  versionInfo: VersionInfo;
  orphanedStrings: string[];
  plainText: string;
}

export interface ForensicSummary {
  totalRedactionBoxes: number;
  textRecoveredFromBoxes: number;
  annotationsFound: number;
  versionsDetected: number;
  orphanedStringsFound: number;
  metadataAvailable: boolean;
}

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_TEXT_LENGTH = 50_000;
