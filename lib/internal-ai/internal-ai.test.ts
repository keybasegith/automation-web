import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { InternalAiError } from "@/lib/internal-ai/errors";
import { createMockProvider, MOCK_RESPONSE } from "@/lib/internal-ai/providers/mock-provider";
import {
  checkAttachment,
  classifyAttachment,
  formatBytes,
  type AttachmentLimits,
} from "@/lib/internal-ai/attachments";
import { parseChatForm } from "@/lib/internal-ai/schemas";
import { getLLMProvider } from "@/lib/internal-ai/providers/llm-provider";
import { parseChatRequest } from "@/lib/internal-ai/schemas";
import { requireInternalAiUser } from "@/lib/internal-ai/session";
import { issueSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { respondToChatMessage } from "@/lib/internal-ai/service";
import {
  buildTurnRecords,
  persistTurn,
  TRANSCRIPT_PERSISTENCE_ENABLED,
} from "@/lib/internal-ai/transcript";

const ENV_KEYS = [
  "INTERNAL_AI_ENABLED",
  "LOCAL_LLM_BASE_URL",
  "LOCAL_LLM_MODEL",
  "INTERNAL_AI_MAX_MESSAGE_LENGTH",
  "INTERNAL_AI_MAX_ATTACHMENTS",
  "INTERNAL_AI_MAX_ATTACHMENT_MB",
  "INTERNAL_AI_MAX_UPLOAD_MB",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

/** The id the single internal account is issued under. */
const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

const sessionCookie = (token = issueSessionToken(ADMIN_ID)) =>
  `${SESSION_COOKIE_NAME}=${token}`;

const request = (headers: Record<string, string> = {}) =>
  new Request("https://app.example.com/api/internal-ai/chat", {
    method: "POST",
    headers,
  });

/** A request that carries a valid dashboard session. */
const signedIn = (headers: Record<string, string> = {}) =>
  request({ cookie: sessionCookie(), "sec-fetch-site": "same-origin", ...headers });

const user = { id: "user-1", email: "admin@keybase.com" };

describe("config", () => {
  it("runs on the mock provider with an empty environment", () => {
    const config = getInternalAiConfig();
    expect(config.enabled).toBe(true);
    expect(config.providerMode).toBe("mock");
    expect(config.localBaseUrl).toBeNull();
  });

  it("selects the local provider only when an inference host is configured", () => {
    process.env.LOCAL_LLM_BASE_URL = "http://gb10.internal:8000/v1";
    expect(getInternalAiConfig().providerMode).toBe("local");
  });

  it("honours the master switch", () => {
    process.env.INTERNAL_AI_ENABLED = "false";
    expect(getInternalAiConfig().enabled).toBe(false);
  });
});

describe("mock provider", () => {
  it("says plainly that no model is connected", async () => {
    const result = await createMockProvider().generateResponse({ message: "hello" });
    expect(result.message).toBe(MOCK_RESPONSE);
    expect(result.status).toBe("model_not_connected");
    expect(result.model).toBe("mock");
  });

  it("does not echo the prompt back", async () => {
    const secret = "client account 12345 balance";
    const result = await createMockProvider().generateResponse({ message: secret });
    expect(result.message).not.toContain(secret);
  });
});

describe("provider resolution", () => {
  it("uses the mock when no inference server is configured", async () => {
    const provider = await getLLMProvider();
    expect(provider.id).toBe("mock");
  });

  it("switches to the local provider, and away from the mock, when one is", async () => {
    process.env.LOCAL_LLM_BASE_URL = "http://gb10.internal:8000";
    process.env.LOCAL_LLM_MODEL = "gpt-oss-20b";
    const provider = await getLLMProvider();
    expect(provider.id).toBe("local");
  });

  it("refuses to run rather than answer without a model name", async () => {
    // A server asked to complete with no model either errors or picks one for
    // us; neither is acceptable when the UI labels the answer with a model.
    process.env.LOCAL_LLM_BASE_URL = "http://gb10.internal:8000";
    const provider = await getLLMProvider();
    await expect(provider.generateResponse({ message: "hi" })).rejects.toMatchObject({
      code: "model_unavailable",
    });
  });
});

describe("parseChatRequest", () => {
  it("accepts a message and trims it", () => {
    expect(parseChatRequest({ message: "  hello  " }, 4000)).toEqual({
      message: "hello",
      conversationId: undefined,
    });
  });

  it.each([
    ["a non-object body", "nope"],
    ["a missing message", {}],
    ["a blank message", { message: "   " }],
    ["a non-string message", { message: 42 }],
    ["an unrecognised conversation id", { message: "hi", conversationId: "abc" }],
  ])("rejects %s", (_label, body) => {
    expect(() => parseChatRequest(body, 4000)).toThrow(InternalAiError);
  });

  it("enforces the length limit", () => {
    expect(() => parseChatRequest({ message: "x".repeat(11) }, 10)).toThrow(
      /limited to 10 characters/
    );
  });

  it("keeps the submitted content out of the rejection", () => {
    try {
      parseChatRequest({ message: "  " }, 4000);
      throw new Error("expected a rejection");
    } catch (error) {
      const err = error as InternalAiError;
      expect(err.publicMessage).toBe("A message is required.");
      expect(err.detail).not.toContain("  ");
    }
  });

  it("accepts a conversation id it minted", () => {
    const id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    expect(parseChatRequest({ message: "hi", conversationId: id }, 4000).conversationId).toBe(id);
  });
});

describe("requireInternalAiUser", () => {
  it("accepts a same-origin request carrying a valid session", async () => {
    await expect(requireInternalAiUser(signedIn())).resolves.toMatchObject({
      id: ADMIN_ID,
      email: expect.any(String),
    });
  });

  it("accepts a request without a session", async () => {
    // Public workspace access does not require a cookie.
    await expect(
      requireInternalAiUser(request({ "sec-fetch-site": "same-origin" }))
    ).resolves.toMatchObject({ id: ADMIN_ID });
  });

  it("ignores an obsolete forged session cookie", async () => {
    const forged = `${ADMIN_ID}.${Date.now() + 60_000}.not-a-real-signature`;
    await expect(
      requireInternalAiUser(
        request({ cookie: sessionCookie(forged), "sec-fetch-site": "same-origin" })
      )
    ).resolves.toMatchObject({ id: ADMIN_ID });
  });

  it("ignores an obsolete expired session", async () => {
    const expired = issueSessionToken(ADMIN_ID, Date.now() - 9 * 60 * 60 * 1000);
    await expect(
      requireInternalAiUser(
        request({ cookie: sessionCookie(expired), "sec-fetch-site": "same-origin" })
      )
    ).resolves.toMatchObject({ id: ADMIN_ID });
  });

  it("rejects a valid session driven from another site", async () => {
    await expect(
      requireInternalAiUser(signedIn({ "sec-fetch-site": "cross-site" }))
    ).rejects.toBeInstanceOf(InternalAiError);
  });

  it("rejects a mismatched Origin when Fetch Metadata is absent", async () => {
    await expect(
      requireInternalAiUser(
        request({
          cookie: sessionCookie(),
          origin: "https://attacker.example",
          host: "app.example.com",
        })
      )
    ).rejects.toBeInstanceOf(InternalAiError);
  });
});

describe("respondToChatMessage", () => {
  it("mints a conversation id for a first message", async () => {
    const result = await respondToChatMessage({ message: "hello", attachments: [] }, user);
    expect(result.conversationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.message).toBe(MOCK_RESPONSE);
    expect(result.status).toBe("model_not_connected");
  });

  it("keeps the conversation id across turns", async () => {
    const first = await respondToChatMessage({ message: "hello", attachments: [] }, user);
    const second = await respondToChatMessage(
      { message: "again", conversationId: first.conversationId, attachments: [] },
      user
    );
    expect(second.conversationId).toBe(first.conversationId);
  });

  it("refuses when the feature is switched off", async () => {
    process.env.INTERNAL_AI_ENABLED = "false";
    await expect(respondToChatMessage({ message: "hello", attachments: [] }, user)).rejects.toMatchObject({
      code: "disabled",
    });
  });
});

describe("no external AI dependency", () => {
  const root = process.cwd();
  const sources = [path.join(root, "lib/internal-ai"), path.join(root, "app/api/internal-ai")];

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  const featureFiles = () =>
    sources.flatMap(walk).filter((file) => !file.endsWith("internal-ai.test.ts"));

  /**
   * Hosts and SDKs, not words.
   *
   * An earlier version of this test banned the substring "openai" outright.
   * That broke the moment the model registry recorded gpt-oss's real
   * Hugging Face id, `openai/gpt-oss-120b` — an open-weights repo name that
   * has nothing to do with the OpenAI API. Banning the substring would have
   * forced the registry to lie about a model's identity, so the test now bans
   * what actually matters: reaching a third party.
   */
  const BANNED_HOSTS = [
    "api.openai.com",
    "api.anthropic.com",
    "generativelanguage.googleapis.com",
    "bedrock-runtime",
    "openai.azure.com",
    "api.cohere.ai",
    "api-inference.huggingface.co",
    "api.mistral.ai",
    "api.groq.com",
    "api.together.xyz",
  ];

  const BANNED_IMPORTS = [
    'from "openai"',
    'from "@anthropic-ai/sdk"',
    'from "@google/generative-ai"',
    'from "@aws-sdk/client-bedrock-runtime"',
    'require("openai")',
  ];

  const BANNED_SECRETS = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
    "AZURE_OPENAI",
  ];

  it("contacts no third-party inference host", () => {
    for (const file of featureFiles()) {
      const text = readFileSync(file, "utf8").toLowerCase();
      for (const host of BANNED_HOSTS) {
        expect(
          text.includes(host.toLowerCase()),
          `${path.relative(root, file)} references ${host}`
        ).toBe(false);
      }
    }
  });

  it("imports no third-party AI SDK", () => {
    for (const file of featureFiles()) {
      const text = readFileSync(file, "utf8");
      for (const marker of BANNED_IMPORTS) {
        expect(
          text.includes(marker),
          `${path.relative(root, file)} contains ${marker}`
        ).toBe(false);
      }
    }
  });

  it("reads no third-party API key", () => {
    for (const file of featureFiles()) {
      const text = readFileSync(file, "utf8");
      for (const secret of BANNED_SECRETS) {
        expect(
          text.includes(secret),
          `${path.relative(root, file)} reads ${secret}`
        ).toBe(false);
      }
    }
  });

  it("builds every outbound URL from the configured base URL alone", () => {
    // The one file that makes outbound calls must not contain an absolute URL:
    // every request is `${config.baseUrl}` plus a path.
    const client = readFileSync(
      path.join(root, "lib/internal-ai/providers/inference-client.ts"),
      "utf8"
    );
    const absoluteUrls = client.match(/https?:\/\/[^\s"'`]+/g) ?? [];
    expect(absoluteUrls).toEqual([]);
    expect(client).toContain("${config.baseUrl}");
  });

  it("reads no NEXT_PUBLIC_ variable anywhere in the feature", () => {
    // Anything so prefixed is inlined into the browser bundle at build time,
    // which is exactly how the inference host would leak. Comments are
    // stripped first: several files say "nothing here is NEXT_PUBLIC_", and
    // that sentence is not a declaration.
    const withoutComments = (text: string) =>
      text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    for (const file of featureFiles()) {
      expect(
        withoutComments(readFileSync(file, "utf8")).includes("NEXT_PUBLIC_"),
        `${path.relative(root, file)} reads a NEXT_PUBLIC_ variable`
      ).toBe(false);
    }
  });
});

describe("transcript records", () => {
  it("builds the two rows a turn would persist", () => {
    const rows = buildTurnRecords({
      conversationId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      userId: "00000000-0000-0000-0000-000000000001",
      prompt: "hello",
      reply: MOCK_RESPONSE,
      model: "mock",
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "user", content: "hello", model: null });
    expect(rows[1]).toMatchObject({ role: "assistant", content: MOCK_RESPONSE, model: "mock" });
    for (const row of rows) {
      expect(row.conversationId).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
      expect(row.userId).toBe("00000000-0000-0000-0000-000000000001");
      expect(Number.isNaN(Date.parse(row.createdAt))).toBe(false);
    }
    expect(rows[0].id).not.toBe(rows[1].id);
  });

  it("writes nothing in Phase 1", async () => {
    expect(TRANSCRIPT_PERSISTENCE_ENABLED).toBe(false);
    await expect(persistTurn([])).resolves.toBeUndefined();
  });
});

describe("attachment policy", () => {
  const limits: AttachmentLimits = {
    maxCount: 3,
    maxBytesPerFile: 1024,
    maxTotalBytes: 2048,
  };
  const file = (name: string, mimeType: string, sizeBytes: number) => ({
    name,
    mimeType,
    sizeBytes,
  });

  it("classifies images and documents", () => {
    expect(classifyAttachment("photo.png", "image/png")).toBe("image");
    expect(classifyAttachment("scan.PDF", "application/pdf")).toBe("document");
    expect(classifyAttachment("book.xlsx", "")).toBe("document");
  });

  it("falls back to the extension when the browser reports no MIME type", () => {
    // Safari commonly sends an empty type for .heic and .csv.
    expect(classifyAttachment("IMG_0001.heic", "")).toBe("image");
    expect(classifyAttachment("ledger.csv", "")).toBe("document");
  });

  it("does not preview vector art as an image", () => {
    expect(classifyAttachment("logo.svg", "image/svg+xml")).toBe("document");
  });

  it("refuses a type that is not on the list", () => {
    const check = checkAttachment(file("clip.mp4", "video/mp4", 10), limits);
    expect(check).toMatchObject({ ok: false, rejection: { reason: "type" } });
  });

  it.each([
    ["an empty file", file("empty.pdf", "application/pdf", 0), "empty"],
    ["an oversize file", file("big.pdf", "application/pdf", 2000), "file_size"],
  ])("refuses %s", (_label, descriptor, reason) => {
    expect(checkAttachment(descriptor, limits)).toMatchObject({
      ok: false,
      rejection: { reason },
    });
  });

  it("refuses past the file count", () => {
    const check = checkAttachment(file("d.pdf", "application/pdf", 10), limits, {
      count: 3,
      bytes: 30,
    });
    expect(check).toMatchObject({ ok: false, rejection: { reason: "count" } });
  });

  it("refuses past the total upload size", () => {
    const check = checkAttachment(file("d.pdf", "application/pdf", 900), limits, {
      count: 1,
      bytes: 1500,
    });
    expect(check).toMatchObject({ ok: false, rejection: { reason: "total_size" } });
  });

  it("accepts a file inside every limit", () => {
    expect(checkAttachment(file("a.png", "image/png", 500), limits)).toEqual({
      ok: true,
      kind: "image",
    });
  });

  it("formats sizes readably", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("parseChatForm", () => {
  const config = () => getInternalAiConfig();
  const form = (
    fields: { message?: string; conversationId?: string },
    files: File[] = []
  ) => {
    const fd = new FormData();
    if (fields.message !== undefined) fd.set("message", fields.message);
    if (fields.conversationId) fd.set("conversationId", fields.conversationId);
    for (const f of files) fd.append("attachments", f, f.name);
    return fd;
  };
  const png = (name = "photo.png", bytes = 8) =>
    new File([new Uint8Array(bytes)], name, { type: "image/png" });

  it("accepts a message with files and reads their bytes", async () => {
    const parsed = await parseChatForm(form({ message: "look" }, [png()]), config());
    expect(parsed.message).toBe("look");
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0]).toMatchObject({
      name: "photo.png",
      kind: "image",
      sizeBytes: 8,
    });
    expect(parsed.attachments[0].bytes).toBeInstanceOf(Uint8Array);
    expect(parsed.attachments[0].bytes).toHaveLength(8);
  });

  it("accepts files with no text at all", async () => {
    const parsed = await parseChatForm(form({ message: "" }, [png()]), config());
    expect(parsed.message).toBe("");
    expect(parsed.attachments).toHaveLength(1);
  });

  it("rejects an empty message with no files", async () => {
    await expect(parseChatForm(form({ message: "  " }), config())).rejects.toMatchObject({
      code: "invalid_request",
      publicMessage: "A message or a file is required.",
    });
  });

  it("enforces the type allow-list on the server, whatever the browser sent", async () => {
    const video = new File([new Uint8Array(4)], "clip.mp4", { type: "video/mp4" });
    await expect(parseChatForm(form({ message: "hi" }, [video]), config())).rejects.toMatchObject(
      { code: "invalid_request" }
    );
  });

  it("enforces the file count", async () => {
    process.env.INTERNAL_AI_MAX_ATTACHMENTS = "2";
    const files = [png("a.png"), png("b.png"), png("c.png")];
    await expect(parseChatForm(form({ message: "hi" }, files), config())).rejects.toMatchObject({
      code: "invalid_request",
    });
  });

  it("enforces the per-file size limit", async () => {
    process.env.INTERNAL_AI_MAX_ATTACHMENT_MB = "0.000001"; // ~1 byte
    await expect(
      parseChatForm(form({ message: "hi" }, [png("a.png", 4096)]), config())
    ).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("keeps a rejection free of file content", async () => {
    const doc = new File([new Uint8Array(4)], "secret.mp4", { type: "video/mp4" });
    try {
      await parseChatForm(form({ message: "hi" }, [doc]), config());
      throw new Error("expected a rejection");
    } catch (error) {
      const err = error as InternalAiError;
      expect(err.detail).toBe("attachment rejected: type");
    }
  });

  it("still validates the conversation id", async () => {
    await expect(
      parseChatForm(form({ message: "hi", conversationId: "nope" }), config())
    ).rejects.toMatchObject({ code: "invalid_request" });
  });
});

describe("mock provider with attachments", () => {
  const payload = (name: string, kind: "image" | "document", sizeBytes: number) => ({
    name,
    mimeType: kind === "image" ? "image/png" : "application/pdf",
    sizeBytes,
    kind,
    bytes: new Uint8Array(sizeBytes),
  });

  it("acknowledges what arrived and says nothing read it", async () => {
    const result = await createMockProvider().generateResponse({
      message: "review these",
      attachments: [payload("q3.pdf", "document", 2048), payload("chart.png", "image", 1024)],
    });
    expect(result.message).toContain(MOCK_RESPONSE);
    expect(result.message).toContain("Received 2 files");
    expect(result.message).toContain("q3.pdf");
    expect(result.message).toContain("2.0 KB");
    expect(result.message).toContain("Nothing has read them");
    expect(result.status).toBe("model_not_connected");
  });

  it("reads no file content", async () => {
    const secret = new TextEncoder().encode("ACCOUNT 998877");
    const result = await createMockProvider().generateResponse({
      message: "",
      attachments: [
        { name: "a.pdf", mimeType: "application/pdf", sizeBytes: secret.length, kind: "document", bytes: secret },
      ],
    });
    expect(result.message).not.toContain("998877");
  });

  it("says nothing about attachments when there are none", async () => {
    const result = await createMockProvider().generateResponse({ message: "hi" });
    expect(result.message).toBe(MOCK_RESPONSE);
  });
});

describe("transcript attachments", () => {
  it("records attachment metadata and never file content", () => {
    const rows = buildTurnRecords({
      conversationId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      userId: "00000000-0000-0000-0000-000000000001",
      prompt: "see attached",
      reply: MOCK_RESPONSE,
      model: "mock",
      attachments: [
        { name: "q3.pdf", mimeType: "application/pdf", sizeBytes: 2048, kind: "document" },
      ],
    });
    expect(rows[0].attachments).toEqual([
      { name: "q3.pdf", mimeType: "application/pdf", sizeBytes: 2048, kind: "document" },
    ]);
    expect(JSON.stringify(rows)).not.toContain("bytes");
    expect(rows[1].attachments).toEqual([]);
  });
});
