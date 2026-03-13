import * as pdfjsLib from 'pdfjs-dist';
import { OPS } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type {
  AnnotationInfo,
  DocumentMetadata,
  ForensicReport,
  ForensicSummary,
  RedactionBox,
  TextItem,
  TextUnderRedaction,
} from '../types';
import { detectIncrementalSaves, findOrphanedStrings } from './pdfForensics';

// Set the worker source using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Primary forensic extraction pipeline. Runs all analysis layers and returns
 * a structured ForensicReport with every signal we can extract.
 */
export async function runForensicExtraction(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number, stage: string) => void,
  shouldCancel?: () => boolean
): Promise<ForensicReport> {
  const data = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const allTextItems: TextItem[] = [];
  const allAnnotations: AnnotationInfo[] = [];
  const allRedactionBoxes: RedactionBox[] = [];
  let plainText = '';

  try {
    const totalSteps = pdf.numPages * 3; // text + annotations + operators per page
    let completedSteps = 0;

    const reportProgress = (stage: string) => {
      completedSteps++;
      onProgress?.(Math.round((completedSteps / totalSteps) * 90), stage); // 90% for extraction
    };

    for (let i = 1; i <= pdf.numPages; i++) {
      if (shouldCancel?.()) throw new Error('Cancelled');

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });

      // --- 1. Positional Text Extraction ---
      const textContent = await page.getTextContent();
      let pageText = '';

      for (const item of textContent.items) {
        const textItem = item as any;
        if (!textItem.str) continue;

        const tx = textItem.transform;
        // transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const x = tx[4];
        const y = tx[5];
        const fontSize = Math.abs(tx[3]) || Math.abs(tx[0]) || 12;
        const width = textItem.width || textItem.str.length * fontSize * 0.5;
        const height = textItem.height || fontSize;

        allTextItems.push({
          str: textItem.str,
          x,
          y,
          width,
          height,
          fontName: textItem.fontName || 'unknown',
          page: i,
        });

        pageText += textItem.str + ' ';
      }

      plainText += `--- Page ${i} ---\n${pageText.trim()}\n\n`;
      reportProgress('Extracting text');

      // --- 2. Annotation Extraction ---
      try {
        const annotations = await page.getAnnotations();
        for (const ann of annotations) {
          allAnnotations.push({
            type: ann.annotationType?.toString() || 'unknown',
            subtype: ann.subtype || 'unknown',
            contents: ann.contents || '',
            page: i,
            rect: ann.rect || [],
            modificationDate: ann.modificationDate,
            color: ann.color,
          });
        }
      } catch {
        // Some PDFs have malformed annotations
      }
      reportProgress('Extracting annotations');

      // --- 3. Redaction Box Detection via Operator List ---
      try {
        const ops = await page.getOperatorList();
        const boxes = detectRedactionBoxesFromOps(ops, viewport, i);
        allRedactionBoxes.push(...boxes);
      } catch {
        // Operator list parsing failed — skip
      }
      reportProgress('Detecting redaction boxes');
    }

    // --- 4. Find text that overlaps with redaction boxes ---
    const textUnderRedactions = findTextUnderRedactions(allTextItems, allRedactionBoxes);

    // --- 5. Document Metadata ---
    const metadata = await extractMetadata(pdf);

    // --- 6. Binary Analysis ---
    onProgress?.(92, 'Scanning for hidden versions');
    const versionInfo = detectIncrementalSaves(data);

    onProgress?.(95, 'Scanning for orphaned strings');
    const orphanedStrings = findOrphanedStrings(data);

    onProgress?.(100, 'Extraction complete');

    return {
      metadata: { ...metadata, pageCount: pdf.numPages },
      textItems: allTextItems,
      annotations: allAnnotations,
      redactionBoxes: allRedactionBoxes,
      textUnderRedactions,
      versionInfo,
      orphanedStrings,
      plainText,
    };
  } finally {
    await pdf.destroy();
  }
}

/**
 * Detects filled black rectangles from a page's operator list.
 * These are the most common form of "redaction" — a black box drawn over text.
 */
function detectRedactionBoxesFromOps(
  ops: any,
  viewport: any,
  pageNum: number
): RedactionBox[] {
  const boxes: RedactionBox[] = [];
  let currentColor = [0, 0, 0]; // Default to black
  let currentPath: number[] = [];

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    switch (fn) {
      // Set fill color (RGB)
      case OPS.setFillRGBColor:
        if (args) currentColor = [args[0], args[1], args[2]];
        break;

      // Set fill color (grayscale)
      case OPS.setFillGray:
        if (args) currentColor = [args[0], args[0], args[0]];
        break;

      // Set fill color (CMYK — convert to approx RGB)
      case OPS.setFillCMYKColor:
        if (args) {
          const [c, m, y, k] = args;
          currentColor = [
            (1 - c) * (1 - k),
            (1 - m) * (1 - k),
            (1 - y) * (1 - k),
          ];
        }
        break;

      // Rectangle path
      case OPS.constructPath:
        if (args && args[0] && args[1]) {
          // constructPath args: [operatorCodes[], operands[]]
          const opCodes = args[0];
          const operands = args[1];
          if (opCodes.includes(OPS.rectangle) && operands.length >= 4) {
            currentPath = [operands[0], operands[1], operands[2], operands[3]];
          }
        }
        break;

      // Fill path — if color is dark and we have a rectangle, it's likely a redaction box
      case OPS.fill:
      case OPS.eoFill:
        if (currentPath.length === 4) {
          const isDark = currentColor[0] < 0.15 && currentColor[1] < 0.15 && currentColor[2] < 0.15;
          const [rx, ry, rw, rh] = currentPath;
          // Filter: minimum size to avoid tiny decorative elements
          const absW = Math.abs(rw);
          const absH = Math.abs(rh);
          if (isDark && absW > 10 && absH > 5) {
            boxes.push({
              x: rx,
              y: ry,
              width: absW,
              height: absH,
              page: pageNum,
            });
          }
        }
        currentPath = [];
        break;
    }
  }

  return boxes;
}

/**
 * Finds text items whose bounding boxes overlap with redaction boxes.
 * This is the core forensic insight: text physically present under a black overlay.
 */
function findTextUnderRedactions(
  textItems: TextItem[],
  redactionBoxes: RedactionBox[]
): TextUnderRedaction[] {
  const results: TextUnderRedaction[] = [];

  for (const box of redactionBoxes) {
    const pageTexts = textItems.filter((t) => t.page === box.page);

    for (const text of pageTexts) {
      const overlap = calculateOverlap(
        { x: text.x, y: text.y, w: text.width, h: text.height },
        { x: box.x, y: box.y, w: box.width, h: box.height }
      );

      if (overlap > 0.3) {
        // At least 30% overlap
        results.push({
          text: text.str,
          box,
          textItem: text,
          overlapPercent: Math.round(overlap * 100),
        });
      }
    }
  }

  return results;
}

/**
 * Calculates the overlap ratio between two rectangles (intersection / area of rect A).
 */
function calculateOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  // Handle both positive and negative height (PDF coordinate systems vary)
  const aTop = Math.max(a.y, a.y + a.h);
  const aBottom = Math.min(a.y, a.y + a.h);
  const bTop = Math.max(b.y, b.y + b.h);
  const bBottom = Math.min(b.y, b.y + b.h);

  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(aTop, bTop) - Math.max(aBottom, bBottom));

  const intersectionArea = xOverlap * yOverlap;
  const aArea = Math.abs(a.w * a.h);

  if (aArea === 0) return 0;
  return intersectionArea / aArea;
}

/**
 * Extracts document metadata from the PDF.
 */
async function extractMetadata(pdf: any): Promise<DocumentMetadata> {
  try {
    const metadata = await pdf.getMetadata();
    const info = metadata?.info || {};
    return {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      creationDate: info.CreationDate || undefined,
      modificationDate: info.ModDate || undefined,
      keywords: info.Keywords || undefined,
      pageCount: pdf.numPages,
    };
  } catch {
    return { pageCount: pdf.numPages };
  }
}

/**
 * Builds a human-readable forensic summary from a full report.
 */
export function buildForensicSummary(report: ForensicReport): ForensicSummary {
  return {
    totalRedactionBoxes: report.redactionBoxes.length,
    textRecoveredFromBoxes: report.textUnderRedactions.length,
    annotationsFound: report.annotations.length,
    versionsDetected: report.versionInfo.count,
    orphanedStringsFound: report.orphanedStrings.length,
    metadataAvailable: !!(report.metadata.author || report.metadata.creator || report.metadata.producer),
  };
}

/**
 * Formats the forensic report as a structured text block for the AI prompt.
 */
export function formatForensicReportForPrompt(report: ForensicReport): string {
  const sections: string[] = [];

  // Metadata
  const meta = report.metadata;
  if (meta.author || meta.creator || meta.producer) {
    const metaParts: string[] = [];
    if (meta.author) metaParts.push(`Author: ${meta.author}`);
    if (meta.creator) metaParts.push(`Creator Software: ${meta.creator}`);
    if (meta.producer) metaParts.push(`Producer: ${meta.producer}`);
    if (meta.creationDate) metaParts.push(`Created: ${meta.creationDate}`);
    if (meta.modificationDate) metaParts.push(`Modified: ${meta.modificationDate}`);
    sections.push(`<metadata>\n${metaParts.join('\n')}\n</metadata>`);
  }

  // Version History
  if (report.versionInfo.hasMultipleVersions) {
    sections.push(
      `<version_history>\n${report.versionInfo.count} incremental saves detected. ` +
        `This PDF contains previous versions that may include pre-redaction content.\n</version_history>`
    );
  }

  // Redaction Boxes
  if (report.redactionBoxes.length > 0) {
    const byPage = new Map<number, RedactionBox[]>();
    for (const box of report.redactionBoxes) {
      const list = byPage.get(box.page) || [];
      list.push(box);
      byPage.set(box.page, list);
    }
    const lines: string[] = [];
    for (const [page, boxes] of byPage) {
      lines.push(`Page ${page}: ${boxes.length} black rectangle(s) detected`);
      for (const box of boxes) {
        lines.push(`  - Box at (${Math.round(box.x)}, ${Math.round(box.y)}), size ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    sections.push(`<redaction_boxes>\n${lines.join('\n')}\n</redaction_boxes>`);
  }

  // Text Found Under Redaction Boxes — THE KEY SIGNAL
  if (report.textUnderRedactions.length > 0) {
    const lines = report.textUnderRedactions.map(
      (t) =>
        `Page ${t.textItem.page}: "${t.text}" (${t.overlapPercent}% overlap with redaction box at y=${Math.round(t.box.y)})`
    );
    sections.push(
      `<text_under_redactions>\nThese text fragments were found DIRECTLY UNDER black redaction boxes. ` +
        `They are almost certainly the redacted content:\n${lines.join('\n')}\n</text_under_redactions>`
    );
  }

  // Annotations
  const relevantAnnotations = report.annotations.filter(
    (a) => a.subtype === 'Redact' || a.subtype === 'Highlight' || a.subtype === 'StrikeOut' || a.contents
  );
  if (relevantAnnotations.length > 0) {
    const lines = relevantAnnotations.map(
      (a) => `Page ${a.page}: ${a.subtype} annotation${a.contents ? ` — "${a.contents}"` : ''}`
    );
    sections.push(`<annotations>\n${lines.join('\n')}\n</annotations>`);
  }

  // Orphaned Strings (sample — could be large)
  if (report.orphanedStrings.length > 0) {
    const sample = report.orphanedStrings.slice(0, 50);
    sections.push(
      `<orphaned_strings>\nThese text strings were found embedded in the raw PDF binary but may not be displayed. ` +
        `Some may be remnants of deleted/redacted content:\n${sample.join('\n')}\n</orphaned_strings>`
    );
  }

  return sections.join('\n\n');
}

// Keep the legacy exports for backward compatibility
export async function extractTextFromPDF(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void,
  shouldCancel?: () => boolean
): Promise<string> {
  const report = await runForensicExtraction(
    arrayBuffer,
    (p) => onProgress?.(p),
    shouldCancel
  );
  return report.plainText;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
