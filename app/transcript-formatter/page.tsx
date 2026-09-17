import TranscriptFormatter from "@/components/transcript-formatter/TranscriptFormatter";

// Behind authentication, and the tool holds no server state worth prerendering.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Transcript Formatter · Keybase",
};

export default function TranscriptFormatterPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">Finance</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Transcript Formatter
        </h2>
        <p className="max-w-3xl text-sm text-slate-500">
          Clean raw meeting transcripts and export them as editable Word documents. Paste a
          transcript, choose how it should be tidied, edit the result if you need to, and download
          the .docx.
        </p>
      </header>

      <TranscriptFormatter />
    </div>
  );
}
