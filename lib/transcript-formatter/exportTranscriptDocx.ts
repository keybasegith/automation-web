/**
 * Word export for the Transcript Formatter.
 *
 * The .docx is assembled and zipped in the browser and handed straight to the
 * download — there is no upload step and no server round trip, so the
 * transcript stays inside the tab that produced it.
 *
 * `docx` is imported dynamically: it is a large dependency that only matters
 * once someone actually exports, and keeping it out of the module graph also
 * keeps it out of the server render of the page.
 */

import { detectSpeaker } from "./format";

/** Half-points, which is how Word measures type. */
const pt = (points: number): number => points * 2;
const BODY_FONT = "Arial";

/** keybase-transcript-YYYY-MM-DD.docx, dated in the user's own timezone. */
export function transcriptFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `keybase-transcript-${stamp}.docx`;
}

/**
 * Build the document.
 *
 * Every non-empty line of the edited text becomes one paragraph with space
 * after it, so the blank lines in the preview turn into Word spacing rather
 * than into empty paragraphs. Where a line opens with a speaker label, the
 * label is bold and the words after it are not.
 */
async function buildDocument(transcript: string, generatedOn: Date) {
  const { AlignmentType, BorderStyle, Document, Paragraph, TextRun, convertInchesToTwip } =
    await import("docx");

  const heading = (text: string, size: number, spaceAfter: number) =>
    new Paragraph({
      spacing: { after: spaceAfter },
      children: [new TextRun({ text, bold: true, size, font: BODY_FONT })],
    });

  const body = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const speaker = detectSpeaker(line);
      const children = speaker
        ? [
            new TextRun({ text: `${speaker.speaker}:`, bold: true, size: pt(11), font: BODY_FONT }),
            new TextRun({
              text: speaker.text.length > 0 ? ` ${speaker.text}` : "",
              size: pt(11),
              font: BODY_FONT,
            }),
          ]
        : [new TextRun({ text: line, size: pt(11), font: BODY_FONT })];

      return new Paragraph({ spacing: { after: 160, line: 276 }, children });
    });

  return new Document({
    creator: "Keybase Financial Group",
    title: "Meeting Transcript",
    description: "Transcript cleaned with the Keybase Transcript Formatter.",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          heading("Keybase Financial Group", pt(17), 60),
          heading("Meeting Transcript", pt(14), 60),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: `Generated: ${generatedOn.toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`,
                size: pt(10),
                font: BODY_FONT,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "D0D5DD", space: 1 },
            },
            alignment: AlignmentType.LEFT,
            children: [],
          }),
          heading("Transcript", pt(12), 160),
          ...body,
        ],
      },
    ],
  });
}

/**
 * Generate the .docx and trigger the download.
 *
 * Takes whatever is in the editor at the moment the button is pressed, so a
 * manual edit made after cleaning is what lands in the file.
 */
export async function exportTranscriptDocx(
  transcript: string,
  now: Date = new Date()
): Promise<void> {
  const { Packer } = await import("docx");
  const blob = await Packer.toBlob(await buildDocument(transcript, now));

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = transcriptFileName(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next frame; Safari cancels the download if it goes sooner.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
