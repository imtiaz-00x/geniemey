import { unzipSync, strFromU8 } from "fflate";

/** Max upload size: 20 MB per file. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Max characters of extracted text stored per material. */
export const MAX_TEXT_CHARS = 40_000;

export const ACCEPTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
];

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1]!.toLowerCase() : "";
}

export function isAcceptedFile(name: string, mime: string): boolean {
  const ext = extOf(name);
  if (["pdf", "png", "jpg", "jpeg", "webp", "txt", "md", "docx", "pptx"].includes(ext)) return true;
  return ACCEPTED_MIME.includes(mime);
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cap(text: string): string {
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

/**
 * Best-effort client-side text extraction for text formats.
 * Returns null for PDFs/images (the AI reads those directly) and
 * throws for formats we knowingly cannot read (legacy .doc/.ppt).
 */
export async function extractText(file: File): Promise<string | null> {
  const ext = extOf(file.name);
  if (ext === "txt" || ext === "md") return cap(await file.text());
  if (ext === "docx" || ext === "pptx") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let zip: Record<string, Uint8Array>;
    try {
      zip = unzipSync(bytes);
    } catch {
      throw new Error("This file looks damaged. Try re-saving it and upload again.");
    }
    if (ext === "docx") {
      const xml = zip["word/document.xml"];
      if (!xml) throw new Error("Could not read this DOCX file.");
      const parts = [...(strFromU8(xml).matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g))].map((m) => m[1] ?? "");
      const text = parts.join(" ").replace(/\s+/g, " ").trim();
      return text ? cap(text) : null;
    }
    const slideKeys = Object.keys(zip)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a, b) => {
        const na = Number(/slide(\d+)\.xml/.exec(a)?.[1] ?? 0);
        const nb = Number(/slide(\d+)\.xml/.exec(b)?.[1] ?? 0);
        return na - nb;
      });
    if (slideKeys.length === 0) throw new Error("Could not read this PPTX file.");
    const lines: string[] = [];
    for (const key of slideKeys) {
      const texts = [...(strFromU8(zip[key]!).matchAll(/<a:t>([^<]*)<\/a:t>/g))].map((m) => m[1] ?? "");
      const joined = stripTags(texts.join(" "));
      if (joined) lines.push(joined);
    }
    const text = lines.join("\n\n").trim();
    return text ? cap(text) : null;
  }
  if (ext === "doc" || ext === "ppt") {
    throw new Error(
      `Old-style .${ext} files can't be read reliably. Please save it as PDF${ext === "doc" ? " or DOCX" : " or PPTX"} and upload that.`,
    );
  }
  // pdf / images: no local text; the AI reads the file directly.
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKindOf(name: string, mime: string): "pdf" | "image" | "doc" | "slides" | "text" {
  const ext = extOf(name);
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(ext) || mime.startsWith("image/")) return "image";
  if (ext === "docx") return "doc";
  if (ext === "pptx") return "slides";
  return "text";
}

export function safeFileName(name: string): string {
  const clean = name.replace(/[^\w.\- ]+/g, "_").slice(-120);
  return clean || "file";
}
