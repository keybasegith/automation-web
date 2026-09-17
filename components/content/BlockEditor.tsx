"use client";

import { useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  Heading2,
  Heading3,
  Info,
  Link2,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Trash2,
  Type,
} from "lucide-react";
import type { ArticleBlock } from "@/lib/insights/types";

/**
 * The article body editor.
 *
 * Every block here maps one-to-one onto a member of `ArticleBlock`, the union
 * the public Keybase template has always rendered. That is the whole reason it
 * is a block editor rather than a WYSIWYG surface: there is no HTML to parse,
 * no HTML to sanitize, and no field an author could put a font, a colour, a
 * width, or a piece of markup into — because none of those exist in the data
 * model. The advisor owns the words. Keybase owns how they look.
 *
 * The two inline exceptions are `**bold**` and `[text](https://…)`, which the
 * public renderer already understands, and which financial copy genuinely needs
 * for emphasising a figure and citing a release.
 */

type BlockType = ArticleBlock["type"];

const BLOCK_MENU: { type: BlockType; label: string; icon: typeof Type; level?: 2 | 3 }[] = [
  { type: "paragraph", label: "Paragraph", icon: Type },
  { type: "heading", label: "Heading", icon: Heading2, level: 2 },
  { type: "heading", label: "Subheading", icon: Heading3, level: 3 },
  { type: "list", label: "Bullet list", icon: List },
  { type: "list", label: "Numbered list", icon: ListOrdered },
  { type: "callout", label: "Callout", icon: Info },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "table", label: "Table", icon: TableIcon },
];

function blankBlock(entry: (typeof BLOCK_MENU)[number], ordered: boolean): ArticleBlock {
  switch (entry.type) {
    case "heading":
      return { type: "heading", level: entry.level ?? 2, text: "" };
    case "list":
      return ordered
        ? { type: "list", ordered: true, items: [""] }
        : { type: "list", items: [""] };
    case "callout":
      return { type: "callout", text: "" };
    case "quote":
      return { type: "quote", text: "" };
    case "table":
      return { type: "table", columns: ["", ""], rows: [["", ""]] };
    default:
      return { type: "paragraph", text: "" };
  }
}

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  callout: "Callout",
  quote: "Quote",
  table: "Table",
};

const textareaClass =
  "w-full resize-none rounded-lg border border-transparent bg-transparent px-3 py-2 text-[15px] leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-[#006d6e] focus:bg-white focus:ring-2 focus:ring-[#006d6e]/15";

/** Grows with its content so a long paragraph is never edited through a slot. */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  minRows = 1,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        resize(el);
      }}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        resize(e.currentTarget);
        onChange(e.target.value);
      }}
      className={`${textareaClass} ${className}`}
    />
  );
}

export default function BlockEditor({
  body,
  onChange,
  disabled = false,
}: {
  body: ArticleBlock[];
  onChange: (next: ArticleBlock[]) => void;
  disabled?: boolean;
}) {
  const [addingAt, setAddingAt] = useState<number | null>(null);

  const replace = (index: number, block: ArticleBlock) => {
    const next = [...body];
    next[index] = block;
    onChange(next);
  };

  const insert = (index: number, block: ArticleBlock) => {
    const next = [...body];
    next.splice(index, 0, block);
    onChange(next);
    setAddingAt(null);
  };

  const remove = (index: number) => onChange(body.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= body.length) return;
    const next = [...body];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      {body.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
          Nothing written yet. Add the first block below.
        </p>
      )}

      <div className="space-y-1">
        {body.map((block, index) => (
          <div key={index}>
            <BlockRow
              block={block}
              index={index}
              total={body.length}
              disabled={disabled}
              onChange={(b) => replace(index, b)}
              onRemove={() => remove(index)}
              onMove={(dir) => move(index, dir)}
            />
            {!disabled && (
              <AddBar
                open={addingAt === index + 1}
                onToggle={() =>
                  setAddingAt((prev) => (prev === index + 1 ? null : index + 1))
                }
                onPick={(entry, ordered) =>
                  insert(index + 1, blankBlock(entry, ordered))
                }
              />
            )}
          </div>
        ))}
      </div>

      {!disabled && body.length === 0 && (
        <AddBar
          open={addingAt === 0}
          onToggle={() => setAddingAt((prev) => (prev === 0 ? null : 0))}
          onPick={(entry, ordered) => insert(0, blankBlock(entry, ordered))}
          alwaysVisible
        />
      )}
    </div>
  );
}

/** The insert control between two blocks. Reveals on hover, or on focus. */
function AddBar({
  open,
  onToggle,
  onPick,
  alwaysVisible = false,
}: {
  open: boolean;
  onToggle: () => void;
  onPick: (entry: (typeof BLOCK_MENU)[number], ordered: boolean) => void;
  alwaysVisible?: boolean;
}) {
  return (
    <div className={`group relative ${alwaysVisible ? "" : "h-4"}`}>
      <div
        className={`flex items-center justify-center transition ${
          open || alwaysVisible
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-xs font-medium text-slate-500 shadow-sm transition hover:border-[#006d6e] hover:text-[#006d6e]"
        >
          + Add block
        </button>
      </div>

      {open && (
        <div className="relative z-10 mt-2 flex flex-wrap justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {BLOCK_MENU.map((entry) => {
            const Icon = entry.icon;
            const ordered = entry.icon === ListOrdered;
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => onPick(entry, ordered)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BlockRow({
  block,
  index,
  total,
  disabled,
  onChange,
  onRemove,
  onMove,
}: {
  block: ArticleBlock;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (b: ArticleBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="group relative rounded-xl px-1 py-0.5 transition hover:bg-slate-50/70">
      <div className="flex items-start gap-2">
        <span className="mt-2.5 w-16 shrink-0 select-none text-right text-[10px] font-medium uppercase tracking-wider text-slate-300">
          {BLOCK_LABELS[block.type]}
          {block.type === "heading" && ` ${block.level}`}
        </span>

        <div className="min-w-0 flex-1">
          <BlockFields block={block} disabled={disabled} onChange={onChange} />
        </div>

        {!disabled && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              title="Move up"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-200 disabled:opacity-25"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Move down"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-200 disabled:opacity-25"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Remove block"
              onClick={onRemove}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  disabled,
  onChange,
}: {
  block: ArticleBlock;
  disabled: boolean;
  onChange: (b: ArticleBlock) => void;
}) {
  if (disabled) return <ReadOnlyBlock block={block} />;

  switch (block.type) {
    case "heading":
      return (
        <div className="flex items-start gap-2">
          <select
            value={block.level}
            onChange={(e) =>
              onChange({ ...block, level: Number(e.target.value) === 3 ? 3 : 2 })
            }
            aria-label="Heading level"
            className="mt-1.5 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none focus:border-[#006d6e]"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <AutoTextarea
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="Section heading"
            className={
              block.level === 2
                ? "font-serif text-[22px] text-slate-900"
                : "font-serif text-[18px] text-slate-900"
            }
          />
        </div>
      );

    case "paragraph":
      return (
        <InlineTextField
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          placeholder="Write a paragraph…"
        />
      );

    case "callout":
      return (
        <div className="rounded-lg border-l-[3px] border-slate-300 bg-slate-50 py-1 pl-2">
          <AutoTextarea
            value={block.title ?? ""}
            onChange={(title) =>
              onChange({ ...block, title: title || undefined })
            }
            placeholder="Callout label (optional)"
            className="text-xs font-semibold uppercase tracking-wider text-slate-600"
          />
          <InlineTextField
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="The point worth pulling out of the prose…"
          />
        </div>
      );

    case "quote":
      return (
        <div className="rounded-lg border-l-[3px] border-[#006d6e] pl-2">
          <InlineTextField
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            placeholder="Quoted text"
            className="font-serif text-[17px] italic text-slate-800"
          />
          <AutoTextarea
            value={block.attribution ?? ""}
            onChange={(attribution) =>
              onChange({ ...block, attribution: attribution || undefined })
            }
            placeholder="Who said it (optional)"
            className="text-[13px] text-slate-500"
          />
        </div>
      );

    case "list":
      return <ListFields block={block} onChange={onChange} />;

    case "table":
      return <TableFields block={block} onChange={onChange} />;
  }
}

/** A textarea with the two inline marks the public renderer understands. */
function InlineTextField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /** Wrap the selection, or insert the marker and leave the caret inside it. */
  const wrap = (before: string, after: string) => {
    const el = ref.current?.querySelector("textarea");
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + before.length + selected.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div ref={ref} className="group/inline relative">
      <AutoTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          // The shortcuts a writer's hands already know.
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            wrap("**", "**");
          }
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            wrap("[", "](https://)");
          }
        }}
      />
      <div className="mt-0.5 flex items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover/inline:opacity-100">
        <button
          type="button"
          title="Bold (⌘B)"
          onClick={() => wrap("**", "**")}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Link (⌘K)"
          onClick={() => wrap("[", "](https://)")}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ListFields({
  block,
  onChange,
}: {
  block: Extract<ArticleBlock, { type: "list" }>;
  onChange: (b: ArticleBlock) => void;
}) {
  const setItem = (i: number, text: string) => {
    const items = [...block.items];
    items[i] = text;
    onChange({ ...block, items });
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={Boolean(block.ordered)}
            onChange={(e) =>
              onChange({ ...block, ordered: e.target.checked || undefined })
            }
            className="accent-[#006d6e]"
          />
          Numbered
        </label>
      </div>
      <ul className="space-y-0.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right text-xs text-slate-300">
              {block.ordered ? `${i + 1}.` : "•"}
            </span>
            <div className="min-w-0 flex-1">
              <AutoTextarea
                value={item}
                onChange={(text) => setItem(i, text)}
                placeholder="List item"
                onKeyDown={(e) => {
                  // Enter opens the next item; Backspace on an empty one
                  // removes it. What a list is expected to do.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const items = [...block.items];
                    items.splice(i + 1, 0, "");
                    onChange({ ...block, items });
                  }
                  if (e.key === "Backspace" && item === "" && block.items.length > 1) {
                    e.preventDefault();
                    onChange({
                      ...block,
                      items: block.items.filter((_, j) => j !== i),
                    });
                  }
                }}
              />
            </div>
            {block.items.length > 1 && (
              <button
                type="button"
                title="Remove item"
                onClick={() =>
                  onChange({ ...block, items: block.items.filter((_, j) => j !== i) })
                }
                className="mt-1.5 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange({ ...block, items: [...block.items, ""] })}
        className="mt-1 pl-7 text-xs font-medium text-[#006d6e] hover:underline"
      >
        + Add item
      </button>
    </div>
  );
}

function TableFields({
  block,
  onChange,
}: {
  block: Extract<ArticleBlock, { type: "table" }>;
  onChange: (b: ArticleBlock) => void;
}) {
  const setColumn = (i: number, text: string) => {
    const columns = [...block.columns];
    columns[i] = text;
    onChange({ ...block, columns });
  };

  const setCell = (r: number, c: number, text: string) => {
    const rows = block.rows.map((row) => [...row]);
    rows[r][c] = text;
    onChange({ ...block, rows });
  };

  const addColumn = () =>
    onChange({
      ...block,
      columns: [...block.columns, ""],
      rows: block.rows.map((row) => [...row, ""]),
    });

  const removeColumn = (index: number) =>
    onChange({
      ...block,
      columns: block.columns.filter((_, i) => i !== index),
      rows: block.rows.map((row) => row.filter((_, i) => i !== index)),
    });

  const cellClass =
    "w-full rounded border border-slate-200 bg-white px-2 py-1 text-[13px] outline-none focus:border-[#006d6e]";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <input
        value={block.caption ?? ""}
        onChange={(e) =>
          onChange({ ...block, caption: e.target.value || undefined })
        }
        placeholder="Table caption (optional)"
        className="mb-2 w-full rounded border border-transparent px-2 py-1 text-xs text-slate-500 outline-none hover:border-slate-200 focus:border-[#006d6e]"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {block.columns.map((column, c) => (
                <th key={c} scope="col" className="p-0.5 align-top">
                  <input
                    value={column}
                    onChange={(e) => setColumn(c, e.target.value)}
                    placeholder={`Column ${c + 1}`}
                    className={`${cellClass} font-semibold`}
                  />
                  {block.columns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColumn(c)}
                      className="mt-0.5 w-full text-[10px] text-slate-300 hover:text-red-600"
                    >
                      remove
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="p-0.5">
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className={cellClass}
                    />
                  </td>
                ))}
                <td className="p-0.5">
                  {block.rows.length > 1 && (
                    <button
                      type="button"
                      title="Remove row"
                      onClick={() =>
                        onChange({
                          ...block,
                          rows: block.rows.filter((_, i) => i !== r),
                        })
                      }
                      className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...block,
              rows: [...block.rows, block.columns.map(() => "")],
            })
          }
          className="text-xs font-medium text-[#006d6e] hover:underline"
        >
          + Row
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="text-xs font-medium text-[#006d6e] hover:underline"
        >
          + Column
        </button>
      </div>
    </div>
  );
}

/** How a block reads while compliance holds the article. */
function ReadOnlyBlock({ block }: { block: ArticleBlock }) {
  const text =
    block.type === "list"
      ? block.items.join("\n")
      : block.type === "table"
        ? [block.columns.join(" · "), ...block.rows.map((r) => r.join(" · "))].join("\n")
        : block.text;

  return (
    <p className="whitespace-pre-wrap px-3 py-2 text-[15px] leading-relaxed text-slate-600">
      {text || <span className="italic text-slate-300">Empty</span>}
    </p>
  );
}
