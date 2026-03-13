import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the worker source using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPDF(
  arrayBuffer: ArrayBuffer,
  onProgress?: (progress: number) => void,
  shouldCancel?: () => boolean
): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        if (shouldCancel && shouldCancel()) {
          throw new Error('Cancelled');
        }
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        
        if (onProgress) {
          onProgress(Math.round((i / pdf.numPages) * 100));
        }
      }
    } finally {
      await pdf.destroy();
    }

    return fullText;
  } catch (error: any) {
    console.error("Error extracting text from PDF:", error);
    if (error.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please remove the password and try again.');
    } else if (error.name === 'InvalidPDFException') {
      throw new Error('This file appears to be corrupted or is not a valid PDF.');
    } else if (error.name === 'MissingPDFException') {
      throw new Error('The PDF file is missing or empty.');
    } else if (error.message === 'Cancelled') {
      throw error;
    }
    throw new Error(`Failed to read PDF: ${error.message || 'Unknown error'}`);
  }
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
