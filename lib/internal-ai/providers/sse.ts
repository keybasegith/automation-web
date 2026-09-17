/**
 * Server-sent event parsing for streamed completions.
 *
 * Pure and transport-agnostic: it takes a byte stream and yields the JSON
 * payload of each `data:` event, so it can be exercised against fabricated
 * chunks in a unit test without an inference server. That matters — the
 * awkward parts of SSE are the ones a live server exercises only occasionally:
 * an event split across two network chunks, a multi-byte character split
 * across two chunks, CRLF line endings, comment/heartbeat lines, and the
 * terminating sentinel.
 *
 * This is preparation for streaming, not streaming itself. Nothing calls it on
 * a user request path yet; see docs/local-llm-architecture.md.
 */

/** The sentinel a chat-completions stream sends to mean "no more events". */
export const STREAM_DONE = "[DONE]";

/**
 * Yield each `data:` payload from an SSE byte stream, as raw strings.
 *
 * Stops at the `[DONE]` sentinel. Comment lines (`:` heartbeats) and any
 * non-`data` field are skipped. The caller parses JSON, because what a payload
 * means is the protocol's business, not the framing's.
 */
export async function* readSseData(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, undefined> {
  const reader = stream.getReader();
  // `stream: true` is what makes a multi-byte character split across two
  // chunks decode correctly instead of becoming a replacement character.
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line; \r\n is legal and does occur.
      let separator = findSeparator(buffer);
      while (separator) {
        const rawEvent = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator.length);

        const payload = dataPayload(rawEvent);
        if (payload !== null) {
          if (payload === STREAM_DONE) return;
          yield payload;
        }
        separator = findSeparator(buffer);
      }
    }

    // A server that ends the stream without a trailing blank line still leaves
    // a complete final event in the buffer.
    buffer += decoder.decode();
    const trailing = dataPayload(buffer);
    if (trailing !== null && trailing !== STREAM_DONE) yield trailing;
  } finally {
    // Releasing matters on the error path: an abandoned reader keeps the
    // underlying connection from being torn down.
    reader.releaseLock();
  }
}

function findSeparator(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 };
  if (lf !== -1) return { index: lf, length: 2 };
  return null;
}

/**
 * The concatenated `data:` value of one event, or null when the event carries
 * none. Per the SSE spec a single event may repeat `data:`, and each line
 * contributes one line of the payload.
 */
function dataPayload(rawEvent: string): string | null {
  const lines = rawEvent.split(/\r?\n/);
  const parts: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue; // blank or comment/heartbeat
    if (!line.startsWith("data:")) continue; // event:, id:, retry:, …
    // Exactly one optional leading space is stripped, per the spec.
    parts.push(line.slice(5).replace(/^ /, ""));
  }

  if (parts.length === 0) return null;
  const payload = parts.join("\n").trim();
  return payload.length > 0 ? payload : null;
}
