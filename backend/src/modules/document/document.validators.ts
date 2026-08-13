import Joi from "joi";
import {
  DOCUMENT_FORMATS,
  DOCUMENT_THEMES,
  MAX_BLOCKS,
  MAX_BLOCKS_PER_SLIDE,
  MAX_NOTES_CHARS,
  MAX_SLIDES,
  MAX_SOURCE_TEXT_CHARS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_ROWS,
  MAX_TEXT_CHARS,
  MAX_TITLE_CHARS,
  SLIDE_BLOCK_TYPES,
  type SpecKind,
} from "./document.types.js";

/* ------------------------------------------------------------------ *
 * API input
 * ------------------------------------------------------------------ */

export const createDocumentSchema = Joi.object({
  prompt: Joi.string().trim().max(4000).required().messages({
    "string.empty": "Prompt is required",
    "any.required": "Prompt is required",
    "string.max": "Prompt cannot exceed 4000 characters",
  }),
  chatId: Joi.number().integer().optional().allow(null),
  messageId: Joi.number().integer().optional().allow(null),
  title: Joi.string().trim().max(MAX_TITLE_CHARS).optional().allow(""),
  // Any enum value is accepted here; the service rejects the ones with no
  // renderer, so the error names the formats that genuinely work today rather
  // than the ones that merely exist in the schema.
  format: Joi.string()
    .valid(...DOCUMENT_FORMATS)
    .optional(),
  theme: Joi.string()
    .valid(...DOCUMENT_THEMES)
    .optional(),
  sourceText: Joi.string()
    .trim()
    .max(MAX_SOURCE_TEXT_CHARS)
    .optional()
    .allow(""),
});

export const validateCreateDocumentSchema = (data: unknown) => {
  return createDocumentSchema.validate(data, { abortEarly: false });
};

/* ------------------------------------------------------------------ *
 * Model output
 *
 * The spec model is instructed to return this shape, but a model can always
 * drift. Validating here (rather than trusting it) is what lets the worker
 * retry with the validation error fed back, instead of rendering garbage.
 * ------------------------------------------------------------------ */

const text = (max = MAX_TEXT_CHARS) => Joi.string().allow("").max(max);

/**
 * Optional fields must tolerate null, not just "".
 *
 * Models routinely emit `"attribution": null` for an absent optional value,
 * which is semantically identical to omitting the key — but a bare
 * Joi.string().allow("") rejects it, forcing a full retry and doubling the
 * cost of the document for nothing.
 */
const optionalText = (max = MAX_TEXT_CHARS) =>
  Joi.string().allow("", null).max(max).optional();

/**
 * One schema per block type, keyed by type.
 *
 * Keyed rather than inlined into `alternatives()` so the presentation spec can
 * compose its own narrower subset from the same definitions — two hand-written
 * copies would drift the moment a block gains a field.
 */
const BLOCK_SCHEMAS: Record<string, Joi.ObjectSchema> = {
  heading: Joi.object({
    type: Joi.string().valid("heading").required(),
    level: Joi.number().valid(1, 2, 3).required(),
    text: text(500).required(),
  }),
  paragraph: Joi.object({
    type: Joi.string().valid("paragraph").required(),
    text: text().required(),
  }),
  list: Joi.object({
    type: Joi.string().valid("list").required(),
    ordered: Joi.boolean().allow(null).optional(),
    items: Joi.array().items(text(2000).allow(null)).min(1).max(200).required(),
  }),
  table: Joi.object({
    type: Joi.string().valid("table").required(),
    columns: Joi.array()
      .items(text(200))
      .min(1)
      .max(MAX_TABLE_COLUMNS)
      .required(),
    rows: Joi.array()
      .items(Joi.array().items(text(2000).allow(null)).max(MAX_TABLE_COLUMNS))
      .max(MAX_TABLE_ROWS)
      .required(),
    caption: optionalText(300),
  }),
  callout: Joi.object({
    type: Joi.string().valid("callout").required(),
    variant: Joi.string()
      .valid("info", "warning", "success", "danger")
      .required(),
    title: optionalText(200),
    text: text(4000).required(),
  }),
  keyValue: Joi.object({
    type: Joi.string().valid("keyValue").required(),
    items: Joi.array()
      .items(
        Joi.object({
          label: text(200).required(),
          value: text(2000).required(),
        }),
      )
      .min(1)
      .max(100)
      .required(),
  }),
  quote: Joi.object({
    type: Joi.string().valid("quote").required(),
    text: text(4000).required(),
    attribution: optionalText(200),
  }),
  code: Joi.object({
    type: Joi.string().valid("code").required(),
    language: Joi.string().alphanum().max(20).allow("", null).optional(),
    code: text().required(),
  }),
  image: Joi.object({
    type: Joi.string().valid("image").required(),
    // Only https — the renderer additionally enforces a host allowlist. A
    // model-supplied file://, data: or http:// URL is an SSRF / local-file
    // read against our own renderer, so it never gets past this line.
    url: Joi.string().uri({ scheme: ["https"] }).max(2000).required(),
    caption: optionalText(300),
    width: Joi.string().valid("full", "half").allow(null).optional(),
  }),
  divider: Joi.object({ type: Joi.string().valid("divider").required() }),
  pageBreak: Joi.object({ type: Joi.string().valid("pageBreak").required() }),
};

/**
 * Validates a block by dispatching on its `type`.
 *
 * Deliberately NOT `Joi.alternatives().try(...)`. When a value fails every
 * branch of an alternatives schema, Joi reports only "does not match any of
 * the allowed types" and throws away the per-branch reasons — so a rejected
 * spec was undiagnosable, and the retry fed the model an error it could not
 * act on, turning a repair into a full reroll.
 *
 * Dispatching first means the error names the actual field: `blocks[150].
 * language must only contain alpha-numeric characters`.
 */
const makeBlockValidator = (allowedTypes: readonly string[]) =>
  Joi.any().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("block must be an object");
    }

    const type = (value as { type?: unknown }).type;
    if (typeof type !== "string") {
      throw new Error('block is missing a string "type"');
    }
    if (!allowedTypes.includes(type)) {
      throw new Error(
        `unknown block type "${type}" (allowed: ${allowedTypes.join(", ")})`,
      );
    }

    const { error, value: validated } = BLOCK_SCHEMAS[type].validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    return validated;
  });

const ALL_BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS);

const blockSchema = makeBlockValidator(ALL_BLOCK_TYPES);

export const documentSpecSchema = Joi.object({
  title: Joi.string().trim().max(MAX_TITLE_CHARS).required(),
  subtitle: optionalText(300),
  author: optionalText(200),
  coverPage: Joi.boolean().allow(null).optional(),
  showPageNumbers: Joi.boolean().allow(null).optional(),
  blocks: Joi.array().items(blockSchema).min(1).max(MAX_BLOCKS).required(),
});

export const validateDocumentSpec = (data: unknown) => {
  return documentSpecSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/* ------------------------------------------------------------------ *
 * Presentation spec
 * ------------------------------------------------------------------ */

/**
 * Slides accept a subset of the block vocabulary.
 *
 * Composed from the same `BLOCK_SCHEMAS` entries the document spec uses, so a
 * change to how a table or callout validates cannot drift between the two.
 */
const slideBlockSchema = makeBlockValidator(SLIDE_BLOCK_TYPES);

const slideSchema = Joi.object({
  layout: Joi.string().valid("title", "section", "content").allow(null).optional(),
  title: Joi.string().trim().allow("").max(MAX_TITLE_CHARS).required(),
  subtitle: optionalText(300),
  blocks: Joi.array()
    .items(slideBlockSchema)
    // A slide with no blocks is legitimate — title and section slides are
    // exactly that.
    .max(MAX_BLOCKS_PER_SLIDE)
    .default([]),
  notes: optionalText(MAX_NOTES_CHARS),
});

export const presentationSpecSchema = Joi.object({
  title: Joi.string().trim().max(MAX_TITLE_CHARS).required(),
  subtitle: optionalText(300),
  author: optionalText(200),
  slides: Joi.array().items(slideSchema).min(1).max(MAX_SLIDES).required(),
});

export const validatePresentationSpec = (data: unknown) => {
  return presentationSpecSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/** Dispatches to the right validator for the format's spec kind. */
export const validateSpecForKind = (kind: SpecKind, data: unknown) =>
  kind === "presentation"
    ? validatePresentationSpec(data)
    : validateDocumentSpec(data);

/* ------------------------------------------------------------------ *
 * Salvage
 * ------------------------------------------------------------------ */

export interface PruneResult {
  /** The spec with invalid blocks removed. Unchanged when nothing failed. */
  spec: unknown;
  dropped: number;
  total: number;
  /** Human-readable reason per dropped block, for the log. */
  reasons: string[];
}

/**
 * Removes the individual blocks that fail validation, leaving the rest intact.
 *
 * Exists because a whole-spec retry is a *reroll*, not a repair: the model
 * regenerates from scratch and typically returns a shorter document, so two
 * bad blocks out of 150 can cost half the content plus a second full model
 * call. Dropping the bad blocks keeps everything else and costs nothing.
 *
 * Only meaningful for block-level failures — a spec missing its title prunes
 * nothing, reports `dropped: 0`, and the caller falls through to a real retry.
 */
export const pruneInvalidBlocks = (
  kind: SpecKind,
  data: unknown,
): PruneResult => {
  const reasons: string[] = [];
  let dropped = 0;
  let total = 0;

  const validator =
    kind === "presentation" ? slideBlockSchema : blockSchema;

  const filterBlocks = (blocks: unknown, label: string): unknown[] => {
    if (!Array.isArray(blocks)) return [];
    return blocks.filter((block, index) => {
      total += 1;
      const { error } = validator.validate(block);
      if (!error) return true;
      dropped += 1;
      reasons.push(`${label}[${index}]: ${error.message}`);
      return false;
    });
  };

  if (!data || typeof data !== "object") {
    return { spec: data, dropped: 0, total: 0, reasons };
  }

  if (kind === "presentation") {
    const source = data as { slides?: unknown };
    if (!Array.isArray(source.slides)) {
      return { spec: data, dropped: 0, total: 0, reasons };
    }
    const slides = source.slides.map((slide, slideIndex) => {
      if (!slide || typeof slide !== "object") return slide;
      const typed = slide as { blocks?: unknown };
      return {
        ...typed,
        blocks: filterBlocks(typed.blocks, `slides[${slideIndex}].blocks`),
      };
    });
    return { spec: { ...source, slides }, dropped, total, reasons };
  }

  const source = data as { blocks?: unknown };
  if (!Array.isArray(source.blocks)) {
    return { spec: data, dropped: 0, total: 0, reasons };
  }
  return {
    spec: { ...source, blocks: filterBlocks(source.blocks, "blocks") },
    dropped,
    total,
    reasons,
  };
};
