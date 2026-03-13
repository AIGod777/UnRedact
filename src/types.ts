export type Status = 'idle' | 'extracting' | 'analyzing' | 'done' | 'error';

export interface Redaction {
  type: 'RECOVERED' | 'GUESSED';
  text: string;
  score: number;
  alternatives?: string[];
  explanation?: string;
}

export interface HistoryItem {
  id: string;
  fileName: string;
  result: string;
  redactions: Redaction[];
  timestamp: number;
}

export interface ParsedSegment {
  type: 'text' | 'recovered' | 'guessed';
  content: string;
  score?: number;
  alternatives?: string[];
  explanation?: string;
}

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_TEXT_LENGTH = 50_000;
