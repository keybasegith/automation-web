/**
 * Low-level AcroForm writing shared by the NAAF and CRQ fillers.
 *
 * Runs unchanged in Node (API routes) and the browser: pdf-lib only, no DOM,
 * no filesystem. Callers hand in the template bytes.
 *
 * The official forms group their tick boxes in two ways, often mixed within
 * one printed row:
 *   - one checkbox FIELD with several WIDGETS, each widget carrying its own
 *     on-value (e.g. NAAF `nTitle` has six widgets, on-values 0..5);
 *   - one field per printed option, each with the on-value "Yes".
 * A mapping therefore names a *target*: "field" for a single-widget box, or
 * "field=onValue" for one widget of a multi-widget field. Selecting a target
 * sets that widget's /AS and the field's /V to the on-value and turns every
 * other widget of the group Off.
 *
 * Every binding WRITES its box, blank included: the NAAF template ships with
 * PEP "No" and "Canadian" pre-ticked and the CRQ template with "0" in every
 * score box, and a value the state does not hold must not be printed.
 */

import {
  PDFCheckBox,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFPage,
  PDFTextField,
  StandardFonts,
  TextAlignment,
  type PDFForm,
  type PDFWidgetAnnotation,
} from "pdf-lib";

// ---------------------------------------------------------------- mapping model

/** "field" (single-widget box) or "field=onValue" (one widget of a multi-widget field). */
export type Target = string;

export type Binding<S> =
  /** Text written into a text field. Blank values leave the box empty. */
  | { kind: "text"; field: string; get: (s: S) => string | number | null | undefined; align?: "right" }
  /**
   * Two values sharing one text field whose printed labels sit side by side
   * (e.g. "First Name" and "Initials" under one box). The second value is
   * padded to start under the label at `secondAtX` (PDF points) when it fits.
   */
  | { kind: "pair"; field: string; get: (s: S) => [string, string]; secondAtX: number }
  /** A multi-line text field. */
  | { kind: "multiline"; field: string; get: (s: S) => string }
  /** One tick box, on when `get` is true. */
  | { kind: "check"; target: Target; get: (s: S) => boolean }
  /** A single-choice group: exactly the chosen option's box is ticked. */
  | { kind: "choice"; get: (s: S) => string | null | undefined; options: Readonly<Record<string, Target>> };

export const text = <S>(
  field: string,
  get: (s: S) => string | number | null | undefined,
  align?: "right",
): Binding<S> => ({ kind: "text", field, get, align });

export const check = <S>(target: Target, get: (s: S) => boolean): Binding<S> => ({ kind: "check", target, get });

/** `options` must list every value of `O`, so a new option cannot be silently dropped. */
export const choice = <S, O extends string>(
  get: (s: S) => O | null | undefined,
  options: Readonly<Record<O, Target>>,
): Binding<S> => ({ kind: "choice", get, options });

// ---------------------------------------------------------------- filler

const OFF = PDFName.of("Off");

const parseTarget = (target: Target): { field: string; on: string | null } => {
  const at = target.lastIndexOf("=");
  return at < 0 ? { field: target, on: null } : { field: target.slice(0, at), on: target.slice(at + 1) };
};

const onValueOf = (widget: PDFWidgetAnnotation): PDFName | undefined => widget.getOnValue();

/** Greedy word wrap at a given font size. A word wider than the line is kept whole. */
export function wrapText(font: PDFFont, value: string, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export class AcroFormFiller {
  readonly form: PDFForm;
  private readonly charset: Set<number>;
  private pageByRef: Map<string, PDFPage> | null = null;

  private constructor(
    readonly doc: PDFDocument,
    /** Courier-Bold: the forms' own text font (/CoBo), so filled text matches the template. */
    readonly font: PDFFont,
  ) {
    this.form = doc.getForm();
    this.charset = new Set(font.getCharacterSet());
  }

  static async load(template: Uint8Array | ArrayBuffer): Promise<AcroFormFiller> {
    const doc = await PDFDocument.load(template);
    const font = await doc.embedFont(StandardFonts.CourierBold);
    return new AcroFormFiller(doc, font);
  }

  apply<S>(state: S, bindings: readonly Binding<S>[]): void {
    for (const b of bindings) {
      switch (b.kind) {
        case "text":
          this.setText(b.field, b.get(state));
          if (b.align === "right") this.textField(b.field).setAlignment(TextAlignment.Right);
          break;
        case "multiline":
          this.setMultiline(b.field, b.get(state));
          break;
        case "pair": {
          const [first, second] = b.get(state);
          this.setPair(b.field, first, second, b.secondAtX);
          break;
        }
        case "check":
          this.setTarget(b.target, b.get(state));
          break;
        case "choice":
          this.setChoice(b.options, b.get(state));
          break;
      }
    }
  }

  /** Characters the embedded font cannot encode become "?" rather than failing the whole fill. */
  sanitize(value: string, multiline = false): string {
    const flat = multiline ? value.replace(/\r\n?/g, "\n") : value.replace(/\s+/g, " ");
    let out = "";
    for (const ch of flat.trim()) {
      const cp = ch.codePointAt(0)!;
      out += ch === "\n" || this.charset.has(cp) ? ch : "?";
    }
    return out;
  }

  private textField(name: string): PDFTextField {
    return this.form.getTextField(name);
  }

  private fontSizeOf(field: PDFTextField): number {
    const da = field.acroField.getDefaultAppearance() ?? "";
    const m = /([\d.]+)\s+Tf/.exec(da);
    const size = m ? Number(m[1]) : 0;
    return size > 0 ? size : 10;
  }

  private widthOf(field: PDFTextField): number {
    return field.acroField.getWidgets()[0].getRectangle().width;
  }

  /**
   * Clears a text field. Some templates ship with values in them (every CRQ
   * score box holds "0"), and a blank in the state must print as a blank.
   */
  clearText(name: string): void {
    const field = this.textField(name);
    if (field.getText()) field.setText(undefined);
  }

  /** Writes single-line text, shrinking the font only when the value would overflow the box. */
  setText(name: string, raw: string | number | null | undefined): void {
    const value = raw === null || raw === undefined ? "" : this.sanitize(String(raw));
    if (!value) return this.clearText(name);
    const field = this.textField(name);
    field.setText(value);
    const size = this.fontSizeOf(field);
    const available = this.widthOf(field) - 4;
    const needed = this.font.widthOfTextAtSize(value, size);
    if (needed > available) {
      field.setFontSize(Math.max(4, Math.floor(((size * available) / needed) * 2) / 2));
    }
  }

  /** Two values in one box, the second starting under its own printed label when it fits. */
  setPair(name: string, first: string, second: string, secondAtX: number): void {
    const a = this.sanitize(first);
    const b = this.sanitize(second);
    if (!b) return this.setText(name, a);
    if (!a) return this.setText(name, b);
    const field = this.textField(name);
    const size = this.fontSizeOf(field);
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const charWidth = this.font.widthOfTextAtSize(" ", size); // Courier: monospaced
    // pdf-lib insets single-line text by 2pt (1pt border + 1pt padding).
    const column = Math.round((secondAtX - rect.x - 2) / charWidth);
    const padded = a.length < column ? a.padEnd(column, " ") + b : `${a} ${b}`;
    if (this.font.widthOfTextAtSize(padded, size) <= rect.width - 4) {
      field.setText(padded);
    } else {
      this.setText(name, `${a} ${b}`);
    }
  }

  /** Multi-line text, shrinking the font until the wrapped lines fit the box height. */
  setMultiline(name: string, raw: string): void {
    const value = this.sanitize(raw, true);
    if (!value) return this.clearText(name);
    const field = this.textField(name);
    field.setText(value);
    const rect = field.acroField.getWidgets()[0].getRectangle();
    let size = this.fontSizeOf(field);
    while (size > 4) {
      const lines = wrapText(this.font, value, size, rect.width - 4).length;
      if (lines * size * 1.2 <= rect.height - 2) break;
      size -= 0.5;
    }
    field.setFontSize(size);
  }

  /**
   * Ticks one target (or clears it). For a multi-widget field this turns every
   * other widget of that field Off.
   */
  setTarget(target: Target, on: boolean): void {
    const { field, on: onValue } = parseTarget(target);
    this.setCheckbox(field, on ? (onValue ?? "*") : null);
  }

  /** Single-choice group. Targets may span several fields and several widgets of one field. */
  setChoice(options: Readonly<Record<string, Target>>, value: string | null | undefined): void {
    const selected = value === null || value === undefined ? null : options[value];
    if (value !== null && value !== undefined && selected === undefined) {
      throw new Error(`No PDF box is mapped for option ${JSON.stringify(value)}`);
    }
    const chosen = selected ? parseTarget(selected) : null;
    const fields = new Set(Object.values(options).map((t) => parseTarget(t).field));
    for (const field of fields) {
      this.setCheckbox(field, chosen && chosen.field === field ? (chosen.on ?? "*") : null);
    }
  }

  /**
   * Low-level: `onValue` "*" selects every widget (a single-widget box, or
   * duplicated widgets of one box); a specific value selects the widget(s)
   * carrying it; null turns the field Off.
   */
  setCheckbox(name: string, onValue: string | null): void {
    const field: PDFCheckBox = this.form.getCheckBox(name);
    const acro = field.acroField;
    let chosen: PDFName | undefined;
    for (const widget of acro.getWidgets()) {
      const on = onValueOf(widget);
      const match = onValue !== null && on !== undefined && (onValue === "*" || on.decodeText() === onValue);
      if (match) {
        widget.setAppearanceState(on);
        chosen = on;
      } else {
        widget.setAppearanceState(OFF);
      }
    }
    if (onValue !== null && chosen === undefined) {
      throw new Error(`Checkbox ${name} has no widget with on-value ${onValue}`);
    }
    acro.dict.set(PDFName.of("V"), chosen ?? OFF);
  }

  /** The page a widget sits on. Widgets' /P entries are optional, so page /Annots are the fallback. */
  pageOf(widget: PDFWidgetAnnotation): PDFPage {
    if (!this.pageByRef) {
      this.pageByRef = new Map();
      for (const page of this.doc.getPages()) {
        const annots = page.node.Annots();
        if (!annots) continue;
        for (let i = 0; i < annots.size(); i++) {
          this.pageByRef.set(String(annots.get(i)), page);
        }
      }
    }
    const ref = this.doc.context.getObjectRef(widget.dict);
    const byAnnots = ref ? this.pageByRef.get(String(ref)) : undefined;
    if (byAnnots) return byAnnots;
    const p = widget.P();
    const byP = p ? this.doc.getPages().find((page) => page.ref === p) : undefined;
    if (byP) return byP;
    throw new Error("Could not find the page of a form widget");
  }

  /**
   * Draws a PNG/JPEG data URL inside the first widget of `fieldName`, scaled to
   * fit with its aspect ratio kept, left-aligned and vertically centred. The
   * text field itself is left empty.
   */
  async drawImage(fieldName: string, dataUrl: string): Promise<void> {
    const m = /^data:image\/(png|jpe?g);base64,/i.exec(dataUrl.trim());
    if (!m) throw new Error(`Signature for ${fieldName} must be a PNG or JPEG data URL`);
    const image = m[1].toLowerCase() === "png" ? await this.doc.embedPng(dataUrl.trim()) : await this.doc.embedJpg(dataUrl.trim());
    const widget = this.form.getField(fieldName).acroField.getWidgets()[0];
    const rect = widget.getRectangle();
    const pad = 1;
    const scale = Math.min((rect.width - 2 * pad) / image.width, (rect.height - 2 * pad) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    this.pageOf(widget).drawImage(image, {
      x: rect.x + pad,
      y: rect.y + (rect.height - height) / 2,
      width,
      height,
    });
  }

  /**
   * Template defect: the CRQ's acknowledgement field "99" has its /Parent set
   * to the AcroForm dictionary itself (which is why it reads "undefined.99").
   * pdf-lib cannot remove such a field when flattening, so the bogus link is
   * dropped first. Done only before flattening: it renames the field to "99".
   */
  private repairOrphanParents(): void {
    const acroForm = this.form.acroForm.dict;
    for (const field of this.form.getFields()) {
      const parent = field.acroField.dict.get(PDFName.of("Parent"));
      if (parent && this.doc.context.lookup(parent) === acroForm) {
        field.acroField.dict.delete(PDFName.of("Parent"));
      }
    }
  }

  async save(flatten: boolean): Promise<Uint8Array> {
    this.form.updateFieldAppearances(this.font);
    if (flatten) {
      this.repairOrphanParents();
      this.form.flatten({ updateFieldAppearances: false });
    }
    return this.doc.save();
  }
}
