import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ExtractedBookFile {
  fileName: string;
  text: string;
  pageCount: number;
  charCount: number;
}

const MAX_EXTRACTED_CHARS = 80_000;

export async function extractTextFromBookFile(file: File): Promise<ExtractedBookFile> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const chunks: string[] = [];
    let totalLen = 0;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) {
        chunks.push(pageText);
        totalLen += pageText.length;
      }
      if (totalLen >= MAX_EXTRACTED_CHARS) break;
    }

    const fullText = chunks.join('\n\n').slice(0, MAX_EXTRACTED_CHARS).trim();
    if (!fullText) {
      throw new Error('File PDF tidak memiliki teks yang dapat dibaca (kemungkinan hasil scan gambar).');
    }
    return {
      fileName: name,
      text: fullText,
      pageCount: doc.numPages,
      charCount: fullText.length,
    };
  }

  // TXT, MD, CSV, JSON, HTML, dll.
  const rawText = await file.text();
  const cleanText = rawText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);

  if (!cleanText) {
    throw new Error('File kosong atau tidak berisi teks yang dapat diringkas.');
  }

  return {
    fileName: name,
    text: cleanText,
    pageCount: Math.max(1, Math.ceil(cleanText.length / 2200)),
    charCount: cleanText.length,
  };
}
