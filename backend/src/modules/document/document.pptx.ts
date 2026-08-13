import PptxGenJS from "pptxgenjs";
import { dlog } from "./document.logger.js";

/**
 * pptxgenjs ships both a CJS and an ESM build, and the interop wrapper differs
 * between running the TypeScript directly (tsx, in dev) and the compiled
 * output. Under ESM the default import arrives as `{ default: ctor }`, so
 * `new PptxGenJS()` throws "not a constructor". Unwrapping a nested default
 * covers both rather than working in dev and failing in production.
 *
 * The imported binding is still used for its *types* below — only the runtime
 * value needs unwrapping.
 */
const PptxGen = ((PptxGenJS as unknown as { default?: typeof PptxGenJS })
  .default ?? PptxGenJS) as typeof PptxGenJS;
import { isAllowedImageUrl } from "./document.html.js";
import {
  getCalloutColors,
  getThemeTokens,
  type ThemeTokens,
} from "./document.theme.js";
import type {
  DocumentTheme,
  PresentationSpec,
  SlideBlock,
  SlideSpec,
} from "./document.types.js";

/**
 * Renders a validated PresentationSpec to a .pptx buffer.
 *
 * Unlike the PDF and DOCX renderers this one does not consume `DocumentSpec`:
 * a slide is a fixed-size canvas, so *what goes on each slide* is a content
 * decision the model has to make. See the note on PresentationSpec in
 * document.types.ts.
 *
 * Everything here is absolute-positioned in inches on a 13.33 x 7.5in stage
 * (16:9). Blocks are laid out top-down from a cursor, and anything that would
 * overflow the stage is dropped rather than allowed to spill off the slide —
 * PowerPoint has no reflow, so overflow is silent and invisible until someone
 * presents it.
 */

/* ------------------------------------------------------------------ *
 * Stage geometry (inches)
 * ------------------------------------------------------------------ */

const STAGE_W = 13.33;
const STAGE_H = 7.5;
const MARGIN_X = 0.6;
const CONTENT_W = STAGE_W - MARGIN_X * 2;
const TITLE_Y = 0.45;
const TITLE_H = 0.9;
const BODY_TOP = TITLE_Y + TITLE_H + 0.25;
const BODY_BOTTOM = STAGE_H - 0.6;

/** pptxgenjs wants bare hex, same as OOXML. */
const hex = (color: string): string => color.replace(/^#/, "").toUpperCase();

/**
 * Estimated rendered height, in inches.
 *
 * PowerPoint cannot measure text for us, so the layout cursor needs a guess.
 * It is deliberately generous: over-estimating costs whitespace, whereas
 * under-estimating overlaps two blocks on top of each other.
 */
const estimateTextHeight = (
  text: string,
  fontPt: number,
  widthIn: number,
): number => {
  const charsPerLine = Math.max(
    10,
    Math.floor((widthIn * 96) / (fontPt * 0.58)),
  );
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .reduce(
      (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0,
    );
  return (lines * fontPt * 1.35) / 72;
};

/* ------------------------------------------------------------------ *
 * Blocks
 * ------------------------------------------------------------------ */

interface LayoutCursor {
  y: number;
}

/**
 * Places one block and advances the cursor.
 *
 * Returns false when the block did not fit, which stops the slide — carrying
 * on would stack later blocks off the bottom edge.
 */
const placeBlock = (
  slide: PptxGenJS.Slide,
  block: SlideBlock,
  t: ThemeTokens,
  cursor: LayoutCursor,
): boolean => {
  const bodyPt = 16;
  const remaining = BODY_BOTTOM - cursor.y;
  if (remaining <= 0.4) return false;

  const base = {
    x: MARGIN_X,
    w: CONTENT_W,
    fontFace: t.bodyFontName,
    color: hex(t.text),
  };

  switch (block.type) {
    case "paragraph": {
      const h = Math.min(
        estimateTextHeight(block.text, bodyPt, CONTENT_W),
        remaining,
      );
      slide.addText(block.text, {
        ...base,
        y: cursor.y,
        h,
        fontSize: bodyPt,
        valign: "top",
      });
      cursor.y += h + 0.15;
      return true;
    }

    case "list": {
      const items = block.items.filter(
        (item): item is string => typeof item === "string",
      );
      const h = Math.min(
        items.reduce(
          (total, item) =>
            total + estimateTextHeight(item, bodyPt, CONTENT_W - 0.4) + 0.08,
          0,
        ),
        remaining,
      );
      slide.addText(
        items.map((item) => ({
          text: item,
          options: {
            bullet: block.ordered ? { type: "number" as const } : true,
          },
        })),
        {
          ...base,
          y: cursor.y,
          h,
          fontSize: bodyPt,
          valign: "top",
          lineSpacingMultiple: 1.2,
        },
      );
      cursor.y += h + 0.15;
      return true;
    }

    case "table": {
      const columns = block.columns.slice(0, 6);
      const rowHeight = 0.38;
      const rows = block.rows.slice(
        0,
        Math.max(1, Math.floor((remaining - rowHeight) / rowHeight)),
      );

      const header = columns.map((column) => ({
        text: String(column ?? ""),
        options: {
          bold: true,
          color: hex(t.tableHeaderText),
          fill: { color: hex(t.tableHeaderBg) },
        },
      }));

      const body = rows.map((row, rowIndex) =>
        // Pad or trim: pptxgenjs renders a ragged row as a broken grid.
        columns.map((_column, columnIndex) => ({
          text: String(row?.[columnIndex] ?? ""),
          options: {
            color: hex(t.text),
            ...(rowIndex % 2 === 1
              ? { fill: { color: hex(t.accentSoft) } }
              : {}),
          },
        })),
      );

      const h = (rows.length + 1) * rowHeight;
      slide.addTable([header, ...body], {
        x: MARGIN_X,
        y: cursor.y,
        w: CONTENT_W,
        fontFace: t.bodyFontName,
        fontSize: 12,
        border: { type: "solid", pt: 0.5, color: hex(t.border) },
        rowH: rowHeight,
      });
      cursor.y += h + 0.2;

      if (block.caption && cursor.y < BODY_BOTTOM) {
        slide.addText(block.caption, {
          ...base,
          y: cursor.y,
          h: 0.25,
          fontSize: 11,
          italic: true,
          color: hex(t.muted),
        });
        cursor.y += 0.3;
      }
      return true;
    }

    case "callout": {
      const colors = getCalloutColors(block.variant);
      const text = block.title ? `${block.title}\n${block.text}` : block.text;
      const h = Math.min(
        estimateTextHeight(text, bodyPt, CONTENT_W - 0.5) + 0.3,
        remaining,
      );

      slide.addShape("rect", {
        x: MARGIN_X,
        y: cursor.y,
        w: CONTENT_W,
        h,
        fill: { color: hex(colors.bg) },
        line: { color: hex(colors.border), width: 0 },
      });
      // A left accent bar, drawn as its own shape — PowerPoint shapes cannot
      // carry a single-sided border.
      slide.addShape("rect", {
        x: MARGIN_X,
        y: cursor.y,
        w: 0.07,
        h,
        fill: { color: hex(colors.border) },
        line: { color: hex(colors.border), width: 0 },
      });
      slide.addText(
        [
          ...(block.title
            ? [
                {
                  text: block.title,
                  options: { bold: true, color: hex(colors.border), breakLine: true },
                },
              ]
            : []),
          { text: block.text, options: { color: hex(t.text) } },
        ],
        {
          x: MARGIN_X + 0.22,
          y: cursor.y + 0.1,
          w: CONTENT_W - 0.4,
          h: h - 0.2,
          fontFace: t.bodyFontName,
          fontSize: bodyPt - 1,
          valign: "top",
        },
      );
      cursor.y += h + 0.15;
      return true;
    }

    case "keyValue": {
      const rows = block.items.map((item) => [
        {
          text: item.label,
          options: { bold: true, color: hex(t.muted) },
        },
        { text: item.value, options: { color: hex(t.text) } },
      ]);
      const rowHeight = 0.34;
      const h = rows.length * rowHeight;
      if (h > remaining) return false;

      slide.addTable(rows, {
        x: MARGIN_X,
        y: cursor.y,
        w: CONTENT_W,
        colW: [CONTENT_W * 0.32, CONTENT_W * 0.68],
        fontFace: t.bodyFontName,
        fontSize: 14,
        border: { type: "none" },
        rowH: rowHeight,
      });
      cursor.y += h + 0.2;
      return true;
    }

    case "quote": {
      const text = block.attribution
        ? `“${block.text}”\n— ${block.attribution}`
        : `“${block.text}”`;
      const h = Math.min(
        estimateTextHeight(text, bodyPt + 2, CONTENT_W - 0.6),
        remaining,
      );
      slide.addText(text, {
        x: MARGIN_X + 0.3,
        y: cursor.y,
        w: CONTENT_W - 0.6,
        h,
        fontFace: t.bodyFontName,
        fontSize: bodyPt + 2,
        italic: true,
        color: hex(t.muted),
        valign: "top",
      });
      cursor.y += h + 0.2;
      return true;
    }

    case "code": {
      const h = Math.min(
        estimateTextHeight(block.code, 12, CONTENT_W - 0.3) + 0.2,
        remaining,
      );
      slide.addShape("rect", {
        x: MARGIN_X,
        y: cursor.y,
        w: CONTENT_W,
        h,
        fill: { color: hex(t.accentSoft) },
        line: { color: hex(t.border), width: 0.5 },
      });
      slide.addText(block.code, {
        x: MARGIN_X + 0.12,
        y: cursor.y + 0.08,
        w: CONTENT_W - 0.24,
        h: h - 0.16,
        fontFace: t.monoFontName,
        fontSize: 12,
        color: hex(t.text),
        valign: "top",
      });
      cursor.y += h + 0.15;
      return true;
    }

    case "image": {
      // Same allowlist as the other renderers. PowerPoint fetches nothing at
      // open time — pptxgenjs downloads the bytes while packing — so a
      // disallowed URL is dropped here rather than becoming a broken link.
      if (!isAllowedImageUrl(block.url)) {
        dlog("pptx", `image dropped — not on the allowlist: ${block.url.slice(0, 120)}`);
        return true;
      }

      const w = block.width === "half" ? CONTENT_W / 2 : CONTENT_W * 0.72;
      const h = Math.min(remaining - 0.2, 3.6);
      if (h < 0.8) return false;

      slide.addImage({
        path: block.url,
        x: MARGIN_X + (CONTENT_W - w) / 2,
        y: cursor.y,
        w,
        h,
        sizing: { type: "contain", w, h },
      });
      cursor.y += h + 0.12;

      if (block.caption && cursor.y < BODY_BOTTOM) {
        slide.addText(block.caption, {
          x: MARGIN_X,
          y: cursor.y,
          w: CONTENT_W,
          h: 0.25,
          fontFace: t.bodyFontName,
          fontSize: 11,
          align: "center",
          color: hex(t.muted),
        });
        cursor.y += 0.3;
      }
      return true;
    }

    default:
      return true;
  }
};

/* ------------------------------------------------------------------ *
 * Slides
 * ------------------------------------------------------------------ */

const addTitleSlide = (
  pptx: PptxGenJS,
  spec: PresentationSpec,
  slideSpec: SlideSpec,
  t: ThemeTokens,
): void => {
  const slide = pptx.addSlide();
  slide.background = { color: hex(t.accent) };

  slide.addText(slideSpec.title || spec.title, {
    x: MARGIN_X,
    y: 2.5,
    w: CONTENT_W,
    h: 1.4,
    fontFace: t.headingFontName,
    fontSize: 40,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
  });

  const subtitle = slideSpec.subtitle || spec.subtitle;
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN_X,
      y: 3.9,
      w: CONTENT_W,
      h: 0.6,
      fontFace: t.bodyFontName,
      fontSize: 18,
      color: hex(t.accentSoft),
      align: "center",
    });
  }

  if (spec.author) {
    slide.addText(spec.author, {
      x: MARGIN_X,
      y: 4.7,
      w: CONTENT_W,
      h: 0.4,
      fontFace: t.bodyFontName,
      fontSize: 13,
      color: hex(t.accentSoft),
      align: "center",
    });
  }

  if (slideSpec.notes) slide.addNotes(slideSpec.notes);
};

const addSectionSlide = (
  pptx: PptxGenJS,
  slideSpec: SlideSpec,
  t: ThemeTokens,
): void => {
  const slide = pptx.addSlide();
  slide.background = { color: hex(t.accentSoft) };

  slide.addText(slideSpec.title, {
    x: MARGIN_X,
    y: 3.1,
    w: CONTENT_W,
    h: 1.2,
    fontFace: t.headingFontName,
    fontSize: 32,
    bold: true,
    color: hex(t.accent),
    align: "center",
    valign: "middle",
  });

  if (slideSpec.subtitle) {
    slide.addText(slideSpec.subtitle, {
      x: MARGIN_X,
      y: 4.3,
      w: CONTENT_W,
      h: 0.5,
      fontFace: t.bodyFontName,
      fontSize: 16,
      color: hex(t.muted),
      align: "center",
    });
  }

  if (slideSpec.notes) slide.addNotes(slideSpec.notes);
};

const addContentSlide = (
  pptx: PptxGenJS,
  slideSpec: SlideSpec,
  t: ThemeTokens,
  index: number,
  total: number,
): number => {
  const slide = pptx.addSlide();

  slide.addText(slideSpec.title, {
    x: MARGIN_X,
    y: TITLE_Y,
    w: CONTENT_W,
    h: TITLE_H,
    fontFace: t.headingFontName,
    fontSize: 26,
    bold: t.headingWeight >= 600,
    color: hex(t.accent),
    valign: "middle",
  });

  // Accent rule under the title, mirroring the document header.
  slide.addShape("rect", {
    x: MARGIN_X,
    y: TITLE_Y + TITLE_H,
    w: 1.1,
    h: 0.04,
    fill: { color: hex(t.accent) },
    line: { color: hex(t.accent), width: 0 },
  });

  const cursor: LayoutCursor = { y: BODY_TOP };
  let dropped = 0;
  for (const block of slideSpec.blocks) {
    if (!placeBlock(slide, block, t, cursor)) {
      dropped += 1;
    }
  }

  slide.addText(`${index} / ${total}`, {
    x: STAGE_W - MARGIN_X - 1,
    y: STAGE_H - 0.5,
    w: 1,
    h: 0.3,
    fontFace: t.bodyFontName,
    fontSize: 10,
    color: hex(t.muted),
    align: "right",
  });

  if (slideSpec.notes) slide.addNotes(slideSpec.notes);
  return dropped;
};

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export const renderSpecToPptx = async (
  spec: PresentationSpec,
  theme: DocumentTheme,
): Promise<Buffer> => {
  const t = getThemeTokens(theme);
  const pptx = new PptxGen();

  pptx.layout = "LAYOUT_WIDE";
  pptx.title = spec.title;
  if (spec.author) pptx.author = spec.author;

  dlog(
    "pptx",
    `theme=${theme} slides=${spec.slides.length} — building presentation`,
  );

  let droppedBlocks = 0;
  spec.slides.forEach((slideSpec, index) => {
    const layout = slideSpec.layout ?? "content";
    if (layout === "title") {
      addTitleSlide(pptx, spec, slideSpec, t);
    } else if (layout === "section") {
      addSectionSlide(pptx, slideSpec, t);
    } else {
      droppedBlocks += addContentSlide(
        pptx,
        slideSpec,
        t,
        index + 1,
        spec.slides.length,
      );
    }
  });

  if (droppedBlocks) {
    // Worth surfacing: the model over-filled a slide past what the stage can
    // hold, which is a prompt problem rather than a rendering one.
    dlog(
      "pptx",
      `${droppedBlocks} block(s) dropped for overflow — slides are over-filled`,
    );
  }

  const data = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  dlog("pptx", `packed ${data.length} bytes`);
  return Buffer.from(data);
};
