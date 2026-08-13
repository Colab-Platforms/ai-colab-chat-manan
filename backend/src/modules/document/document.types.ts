/**
 * The document spec is the contract between the model and the renderer.
 *
 * The model only ever describes *what the document says* — semantic blocks and
 * their text. It never emits HTML, CSS, colours or layout. The renderer owns
 * all presentation, which keeps output visually consistent and means model
 * output is escaped data rather than markup we have to trust.
 */

export type DocumentTheme = "professional" | "minimal" | "report";

export const DOCUMENT_THEMES: DocumentTheme[] = [
  "professional",
  "minimal",
  "report",
];

/** Mirrors `GeneratedDocumentFormat` in schema.prisma. */
export type DocumentFormat = "PDF" | "DOCX" | "PPTX" | "XLSX";

export const DOCUMENT_FORMATS: DocumentFormat[] = [
  "PDF",
  "DOCX",
  "PPTX",
  "XLSX",
];

export interface DocumentFormatMeta {
  /** Human label used in chat copy and the UI card. */
  label: string;
  /** File extension, no dot. Also the Cloudinary `format` value. */
  extension: string;
  mimeType: string;
}

/**
 * Everything that differs between formats *outside* the renderer itself.
 *
 * Kept as one table rather than scattered conditionals so adding a format is a
 * single entry plus a renderer, and nothing can be half-added — the old code
 * hardcoded "pdf" in the upload call and ".pdf" in the filename, which is
 * exactly the kind of thing a second format silently inherits.
 */
export const DOCUMENT_FORMAT_META: Record<DocumentFormat, DocumentFormatMeta> = {
  PDF: {
    label: "PDF",
    extension: "pdf",
    mimeType: "application/pdf",
  },
  DOCX: {
    label: "Word document",
    extension: "docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  PPTX: {
    label: "PowerPoint presentation",
    extension: "pptx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  XLSX: {
    label: "Excel spreadsheet",
    extension: "xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};

export const isDocumentFormat = (value: unknown): value is DocumentFormat =>
  typeof value === "string" &&
  (DOCUMENT_FORMATS as string[]).includes(value);

export type CalloutVariant = "info" | "warning" | "success" | "danger";

export type DocumentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | {
      type: "callout";
      variant: CalloutVariant;
      title?: string;
      text: string;
    }
  | { type: "keyValue"; items: Array<{ label: string; value: string }> }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "code"; language?: string; code: string }
  | { type: "image"; url: string; caption?: string; width?: "full" | "half" }
  | { type: "divider" }
  | { type: "pageBreak" };

export interface DocumentSpec {
  title: string;
  subtitle?: string;
  author?: string;
  coverPage?: boolean;
  showPageNumbers?: boolean;
  blocks: DocumentBlock[];
}

/* ------------------------------------------------------------------ *
 * Presentations
 *
 * A deck is not a paginated document: a slide is a bounded container, so the
 * model has to decide what goes on each one. That decision cannot be made
 * after the fact by a renderer splitting a flat block list — it needs the
 * meaning of the content. Hence a second spec shape rather than pagination.
 *
 * Slide bodies deliberately reuse `DocumentBlock`, so the block vocabulary,
 * its validation and its escaping rules are shared with documents. Only the
 * blocks that make no sense on a slide are excluded (see SLIDE_BLOCK_TYPES).
 * ------------------------------------------------------------------ */

export type SlideLayout = "title" | "section" | "content";

/** `heading` is dropped because the slide title already fills that role. */
export const SLIDE_BLOCK_TYPES = [
  "paragraph",
  "list",
  "table",
  "callout",
  "keyValue",
  "quote",
  "code",
  "image",
] as const;

export type SlideBlock = Extract<
  DocumentBlock,
  { type: (typeof SLIDE_BLOCK_TYPES)[number] }
>;

export interface SlideSpec {
  layout?: SlideLayout;
  title: string;
  subtitle?: string;
  blocks: SlideBlock[];
  /** Speaker notes — the one thing a deck has that a document does not. */
  notes?: string;
}

export interface PresentationSpec {
  title: string;
  subtitle?: string;
  author?: string;
  slides: SlideSpec[];
}

export type AnySpec = DocumentSpec | PresentationSpec;

/**
 * Which spec shape a format's model call produces and its renderer consumes.
 *
 * Adding a format means deciding this first — it determines the system prompt,
 * the validator and the renderer signature, so it is the real fork in the
 * pipeline. XLSX will need a third kind; PDF and DOCX share the first.
 */
export type SpecKind = "document" | "presentation";

export const FORMAT_SPEC_KIND: Record<DocumentFormat, SpecKind> = {
  PDF: "document",
  DOCX: "document",
  PPTX: "presentation",
  // Placeholder until XLSX gets its own sheet-shaped spec; it has no renderer,
  // so nothing reads this yet.
  XLSX: "document",
};

export const isPresentationSpec = (spec: AnySpec): spec is PresentationSpec =>
  Array.isArray((spec as PresentationSpec).slides);

export const MAX_SLIDES = 60;
export const MAX_BLOCKS_PER_SLIDE = 8;
export const MAX_NOTES_CHARS = 2000;

export interface CreateDocumentInput {
  prompt: string;
  chatId?: number;
  messageId?: number;
  title?: string;
  format?: DocumentFormat;
  theme?: DocumentTheme;
  sourceText?: string;
}

export interface ListDocumentsQuery {
  page?: number;
  limit?: number;
  status?: string;
  chatId?: number;
}

// Caps mirror the spirit of the existing attachment-parsing limits: keep a
// single document bounded so one request cannot exhaust memory or the wallet.
export const MAX_BLOCKS = 300;
export const MAX_TABLE_ROWS = 500;
export const MAX_TABLE_COLUMNS = 12;
export const MAX_TEXT_CHARS = 20_000;
export const MAX_SOURCE_TEXT_CHARS = 60_000;
export const MAX_TITLE_CHARS = 200;
