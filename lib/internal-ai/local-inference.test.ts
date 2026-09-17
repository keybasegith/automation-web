/**
 * Local inference tests.
 *
 * Every one of these runs against a fake server built from a function. No
 * model, no GPU, and no network are needed, which is the point: the standard
 * suite must stay runnable on a laptop long after the GB10 exists.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { getInternalAiConfig } from "@/lib/internal-ai/config";
import { InternalAiError } from "@/lib/internal-ai/errors";
import {
  enabledModels,
  getModel,
  LOCAL_MODELS,
  selectModel,
} from "@/lib/internal-ai/models";
import {
  createInferenceClient,
  type FetchLike,
} from "@/lib/internal-ai/providers/inference-client";
import { createLocalProvider } from "@/lib/internal-ai/providers/local-provider";
import { getLLMProvider } from "@/lib/internal-ai/providers/llm-provider";
import { readSseData } from "@/lib/internal-ai/providers/sse";

const ENV_KEYS = [
  "LOCAL_LLM_BASE_URL",
  "LOCAL_LLM_MODEL",
  "LOCAL_LLM_TIMEOUT_MS",
  "LOCAL_LLM_MAX_TOKENS",
  "LOCAL_LLM_TEMPERATURE",
  "LOCAL_LLM_REASONING_EFFORT",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  vi.restoreAllMocks();
});

/** Point the config at a fake host and return the resolved config. */
function localConfig(overrides: Record<string, string> = {}) {
  process.env.LOCAL_LLM_BASE_URL = "http://gb10.internal:8000";
  process.env.LOCAL_LLM_MODEL = "gpt-oss-20b";
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
  return getInternalAiConfig();
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const completion = (content: string, model = "openai/gpt-oss-20b") => ({
  model,
  choices: [{ message: { role: "assistant", content }, finish_reason: "stop" }],
  usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
});

/** A fake server that records what it was asked. */
function fakeServer(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { impl, calls };
}

const sseStream = (chunks: string[]): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

// ---------------------------------------------------------------------------

describe("model registry", () => {
  it("carries the three evaluation candidates, all enabled", () => {
    expect(LOCAL_MODELS.map((m) => m.id)).toEqual([
      "gpt-oss-120b",
      "qwen3-30b-a3b",
      "gpt-oss-20b",
    ]);
    expect(enabledModels()).toHaveLength(3);
  });

  it("covers the three intended roles", () => {
    expect(LOCAL_MODELS.map((m) => m.role).sort()).toEqual([
      "baseline",
      "performance",
      "quality",
    ]);
  });

  it("gives every entry a distinct id and provider name", () => {
    expect(new Set(LOCAL_MODELS.map((m) => m.id)).size).toBe(LOCAL_MODELS.length);
    expect(new Set(LOCAL_MODELS.map((m) => m.providerModelName)).size).toBe(
      LOCAL_MODELS.length
    );
  });

  it("states no throughput or latency figure", () => {
    // Performance is UNKNOWN UNTIL BENCHMARKED ON THE ACTUAL GB10. A number in
    // the registry would be read as a measurement.
    const text = JSON.stringify(LOCAL_MODELS).toLowerCase();
    for (const claim of ["tokens/sec", "tokens per second", "tok/s", "ms latency"]) {
      expect(text).not.toContain(claim);
    }
  });

  it("holds no host, key, or weight path", () => {
    const text = JSON.stringify(LOCAL_MODELS).toLowerCase();
    for (const leak of ["http://", "https://", "api_key", "/models/", ".safetensors"]) {
      expect(text).not.toContain(leak);
    }
  });

  it("looks a model up by id, case-insensitively", () => {
    expect(getModel("QWEN3-30B-A3B")?.displayName).toBe("Qwen3 30B-A3B");
    expect(getModel("nope")).toBeUndefined();
  });
});

describe("model selection", () => {
  it("resolves a registry id to its provider name", () => {
    const selection = selectModel("gpt-oss-120b");
    expect(selection.kind).toBe("registered");
    expect(selection.providerModelName).toBe("openai/gpt-oss-120b");
    expect(selection.displayName).toBe("GPT-OSS 120B");
  });

  it("also accepts the provider's own name", () => {
    const selection = selectModel("Qwen/Qwen3-30B-A3B");
    expect(selection.kind).toBe("registered");
    expect(selection.model?.id).toBe("qwen3-30b-a3b");
  });

  it("passes an unregistered model through rather than blocking a deployment", () => {
    const selection = selectModel("some-org/experimental-model");
    expect(selection.kind).toBe("unregistered");
    expect(selection.providerModelName).toBe("some-org/experimental-model");
  });

  it.each([undefined, null, "", "   "])("reports %p as unset", (value) => {
    expect(selectModel(value).kind).toBe("unset");
    expect(selectModel(value).providerModelName).toBeNull();
  });
});

describe("config parsing", () => {
  it("is mock mode with an empty environment", () => {
    const config = getInternalAiConfig();
    expect(config.providerMode).toBe("mock");
    expect(config.localInference).toBeNull();
  });

  it("becomes local mode only when a base URL is set", () => {
    const config = localConfig();
    expect(config.providerMode).toBe("local");
    expect(config.localInference?.baseUrl).toBe("http://gb10.internal:8000");
  });

  it("trims a trailing slash so paths do not double up", () => {
    const config = localConfig({ LOCAL_LLM_BASE_URL: "http://gb10.internal:8000/" });
    expect(config.localInference?.baseUrl).toBe("http://gb10.internal:8000");
  });

  it("applies documented defaults", () => {
    const inference = localConfig().localInference;
    expect(inference?.timeoutMs).toBe(120_000);
    expect(inference?.maxTokens).toBe(2048);
    expect(inference?.temperature).toBe(0.2);
    expect(inference?.reasoningEffort).toBeNull();
  });

  it("reads overrides", () => {
    const inference = localConfig({
      LOCAL_LLM_TIMEOUT_MS: "30000",
      LOCAL_LLM_MAX_TOKENS: "512",
      LOCAL_LLM_TEMPERATURE: "0.7",
      LOCAL_LLM_REASONING_EFFORT: "high",
    }).localInference;
    expect(inference?.timeoutMs).toBe(30_000);
    expect(inference?.maxTokens).toBe(512);
    expect(inference?.temperature).toBe(0.7);
    expect(inference?.reasoningEffort).toBe("high");
  });

  it("keeps temperature 0, which is a real setting and not 'unset'", () => {
    expect(localConfig({ LOCAL_LLM_TEMPERATURE: "0" }).localInference?.temperature).toBe(0);
  });

  it("clamps temperature into range and ignores nonsense", () => {
    expect(localConfig({ LOCAL_LLM_TEMPERATURE: "9" }).localInference?.temperature).toBe(2);
    expect(localConfig({ LOCAL_LLM_TEMPERATURE: "-3" }).localInference?.temperature).toBe(0);
    expect(localConfig({ LOCAL_LLM_TEMPERATURE: "hot" }).localInference?.temperature).toBe(0.2);
  });

  it("ignores an unrecognised reasoning effort", () => {
    expect(
      localConfig({ LOCAL_LLM_REASONING_EFFORT: "extreme" }).localInference?.reasoningEffort
    ).toBeNull();
  });
});

describe("inference client requests", () => {
  it("posts to the configured host, and only that host", async () => {
    const server = fakeServer(() => jsonResponse(completion("hello")));
    const client = createInferenceClient(localConfig().localInference!, server.impl);
    await client.complete([{ role: "user", content: "hi" }]);

    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].url).toBe(
      "http://gb10.internal:8000/v1/chat/completions"
    );
  });

  it("sends the registry's provider name, not the registry id", async () => {
    const server = fakeServer(() => jsonResponse(completion("hello")));
    const config = localConfig({ LOCAL_LLM_MODEL: "qwen3-30b-a3b" });
    await createInferenceClient(config.localInference!, server.impl).complete([
      { role: "user", content: "hi" },
    ]);
    const body = JSON.parse(String(server.calls[0].init.body));
    expect(body.model).toBe("Qwen/Qwen3-30B-A3B");
  });

  it("sends the configured generation settings", async () => {
    const server = fakeServer(() => jsonResponse(completion("hello")));
    const config = localConfig({
      LOCAL_LLM_MAX_TOKENS: "256",
      LOCAL_LLM_TEMPERATURE: "0.9",
      LOCAL_LLM_REASONING_EFFORT: "low",
    });
    await createInferenceClient(config.localInference!, server.impl).complete([
      { role: "user", content: "hi" },
    ]);
    const body = JSON.parse(String(server.calls[0].init.body));
    expect(body).toMatchObject({
      max_tokens: 256,
      temperature: 0.9,
      reasoning_effort: "low",
      stream: false,
    });
  });

  it("omits reasoning effort when none is configured", async () => {
    const server = fakeServer(() => jsonResponse(completion("hello")));
    await createInferenceClient(localConfig().localInference!, server.impl).complete([
      { role: "user", content: "hi" },
    ]);
    expect(JSON.parse(String(server.calls[0].init.body))).not.toHaveProperty(
      "reasoning_effort"
    );
  });

  it("sends no credential of any kind", async () => {
    const server = fakeServer(() => jsonResponse(completion("hello")));
    await createInferenceClient(localConfig().localInference!, server.impl).complete([
      { role: "user", content: "hi" },
    ]);
    const headers = server.calls[0].init.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).toEqual([
      "content-type",
      "accept",
    ]);
  });

  it("refuses to be built without a model name", () => {
    process.env.LOCAL_LLM_BASE_URL = "http://gb10.internal:8000";
    const config = getInternalAiConfig();
    expect(() => createInferenceClient(config.localInference!)).toThrow(InternalAiError);
  });
});

describe("inference client responses", () => {
  const client = (handler: (url: string, init: RequestInit) => Response) =>
    createInferenceClient(localConfig().localInference!, fakeServer(handler).impl);

  it("returns the answer, the server's model, and usage", async () => {
    const result = await client(() =>
      jsonResponse(completion("The answer.", "openai/gpt-oss-20b"))
    ).complete([{ role: "user", content: "hi" }]);

    expect(result.text).toBe("The answer.");
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(result.usage).toEqual({
      promptTokens: 11,
      completionTokens: 7,
      totalTokens: 18,
    });
  });

  it("reports the model the server actually ran, not the one we asked for", async () => {
    // A deployment serving something else must not be labelled as the request.
    const result = await client(() =>
      jsonResponse(completion("hi", "some-other-model"))
    ).complete([{ role: "user", content: "hi" }]);
    expect(result.model).toBe("some-other-model");
  });

  it("never returns the reasoning channel as the answer", async () => {
    const result = await client(() =>
      jsonResponse({
        model: "m",
        choices: [
          {
            message: {
              role: "assistant",
              content: "Final answer.",
              reasoning_content: "Let me think step by step about the user…",
            },
          },
        ],
      })
    ).complete([{ role: "user", content: "hi" }]);
    expect(result.text).toBe("Final answer.");
    expect(result.text).not.toContain("step by step");
  });

  it.each([
    ["a 500", () => jsonResponse({ error: "boom" }, 500)],
    ["a 404", () => jsonResponse({ error: "no such model" }, 404)],
    ["a 503", () => jsonResponse({ error: "loading" }, 503)],
  ])("fails loudly on %s", async (_label, handler) => {
    await expect(
      client(handler).complete([{ role: "user", content: "hi" }])
    ).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it("fails loudly on a body that is not JSON", async () => {
    await expect(
      client(() => new Response("<html>gateway error</html>", { status: 200 })).complete([
        { role: "user", content: "hi" },
      ])
    ).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it.each([
    ["no choices", { model: "m", choices: [] }],
    ["a missing message", { model: "m", choices: [{}] }],
    ["an empty answer", { model: "m", choices: [{ message: { content: "   " } }] }],
    ["a non-string answer", { model: "m", choices: [{ message: { content: 42 } }] }],
  ])("fails loudly on %s", async (_label, body) => {
    await expect(
      client(() => jsonResponse(body)).complete([{ role: "user", content: "hi" }])
    ).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it("says so when an empty answer was caused by the token limit", async () => {
    try {
      await client(() =>
        jsonResponse({
          model: "m",
          choices: [{ message: { content: "" }, finish_reason: "length" }],
        })
      ).complete([{ role: "user", content: "hi" }]);
      throw new Error("expected a rejection");
    } catch (error) {
      expect((error as InternalAiError).detail).toContain("token limit");
    }
  });

  it("keeps the host and the failure detail out of what the user sees", async () => {
    try {
      await client(() => jsonResponse({}, 500)).complete([{ role: "user", content: "hi" }]);
      throw new Error("expected a rejection");
    } catch (error) {
      const err = error as InternalAiError;
      expect(err.publicMessage).not.toContain("gb10");
      expect(err.publicMessage).not.toContain("500");
      expect(err.detail).toContain("500");
    }
  });

  it("times out rather than hanging a request forever", async () => {
    const config = localConfig({ LOCAL_LLM_TIMEOUT_MS: "20" }).localInference!;
    const slow: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      });

    const started = Date.now();
    await expect(
      createInferenceClient(config, slow).complete([{ role: "user", content: "hi" }])
    ).rejects.toMatchObject({ code: "model_unavailable" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("reports a timeout as a timeout", async () => {
    const config = localConfig({ LOCAL_LLM_TIMEOUT_MS: "20" }).localInference!;
    const slow: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      });
    try {
      await createInferenceClient(config, slow).complete([{ role: "user", content: "hi" }]);
      throw new Error("expected a rejection");
    } catch (error) {
      expect((error as InternalAiError).detail).toContain("exceeded 20ms");
    }
  });

  it("fails loudly when the host cannot be reached at all", async () => {
    const refuse: FetchLike = () => Promise.reject(new TypeError("fetch failed"));
    await expect(
      createInferenceClient(localConfig().localInference!, refuse).complete([
        { role: "user", content: "hi" },
      ])
    ).rejects.toMatchObject({ code: "model_unavailable" });
  });

  it("lists the models a server is serving", async () => {
    const models = await client(() =>
      jsonResponse({ data: [{ id: "openai/gpt-oss-20b" }, { id: "other" }] })
    ).listModels();
    expect(models).toEqual(["openai/gpt-oss-20b", "other"]);
  });
});

describe("SSE parsing", () => {
  const collect = async (chunks: string[]) => {
    const out: string[] = [];
    for await (const data of readSseData(sseStream(chunks))) out.push(data);
    return out;
  };

  it("reads one event per chunk", async () => {
    expect(await collect(['data: {"a":1}\n\n', 'data: {"a":2}\n\n'])).toEqual([
      '{"a":1}',
      '{"a":2}',
    ]);
  });

  it("reassembles an event split across chunks", async () => {
    expect(await collect(['data: {"a":', '1}\n\n'])).toEqual(['{"a":1}']);
  });

  it("reassembles a multi-byte character split across chunks", async () => {
    // "é" is two bytes; splitting between them must not produce U+FFFD.
    const bytes = new TextEncoder().encode('data: {"t":"é"}\n\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 12));
        controller.enqueue(bytes.slice(12));
        controller.close();
      },
    });
    const out: string[] = [];
    for await (const data of readSseData(stream)) out.push(data);
    expect(out).toEqual(['{"t":"é"}']);
  });

  it("handles CRLF line endings", async () => {
    expect(await collect(['data: {"a":1}\r\n\r\n'])).toEqual(['{"a":1}']);
  });

  it("skips comment heartbeats and non-data fields", async () => {
    expect(await collect([': keep-alive\n\n', 'event: ping\nid: 7\n\n', 'data: {"a":1}\n\n']))
      .toEqual(['{"a":1}']);
  });

  it("stops at the done sentinel and ignores anything after it", async () => {
    expect(await collect(['data: {"a":1}\n\n', "data: [DONE]\n\n", 'data: {"a":2}\n\n']))
      .toEqual(['{"a":1}']);
  });

  it("yields a final event that arrives without a trailing blank line", async () => {
    expect(await collect(['data: {"a":1}'])).toEqual(['{"a":1}']);
  });

  it("joins a multi-line data payload", async () => {
    expect(await collect(["data: line one\ndata: line two\n\n"])).toEqual([
      "line one\nline two",
    ]);
  });
});

describe("streamed completions", () => {
  const streamingClient = (chunks: string[]) =>
    createInferenceClient(
      localConfig().localInference!,
      async () => new Response(sseStream(chunks), { status: 200 })
    );

  const frame = (content: string) =>
    `data: ${JSON.stringify({
      model: "openai/gpt-oss-20b",
      choices: [{ delta: { content } }],
    })}\n\n`;

  it("yields each delta then a done frame carrying model and usage", async () => {
    const client = streamingClient([
      frame("Hello"),
      frame(" there"),
      `data: ${JSON.stringify({
        model: "openai/gpt-oss-20b",
        choices: [],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      })}\n\n`,
      "data: [DONE]\n\n",
    ]);

    const frames = [];
    for await (const f of client.stream([{ role: "user", content: "hi" }])) frames.push(f);

    expect(frames).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: " there" },
      {
        type: "done",
        model: "openai/gpt-oss-20b",
        usage: { promptTokens: 5, completionTokens: 2, totalTokens: 7 },
      },
    ]);
  });

  it("survives one malformed frame without losing the stream", async () => {
    const client = streamingClient([frame("a"), "data: {not json\n\n", frame("b"), "data: [DONE]\n\n"]);
    const text = [];
    for await (const f of client.stream([{ role: "user", content: "hi" }])) {
      if (f.type === "delta") text.push(f.text);
    }
    expect(text.join("")).toBe("ab");
  });

  it("asks the server to include usage on the final frame", async () => {
    const server = fakeServer(() => new Response(sseStream(["data: [DONE]\n\n"])));
    const client = createInferenceClient(localConfig().localInference!, server.impl);
    // Drain the stream; this test is about the request, not the frames.
    for await (const frame of client.stream([{ role: "user", content: "hi" }])) {
      expect(frame.type).toBe("done");
    }
    const body = JSON.parse(String(server.calls[0].init.body));
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });
});

describe("local provider", () => {
  it("answers from the model and reports status ok", async () => {
    const server = fakeServer(() => jsonResponse(completion("A real answer.")));
    const provider = createLocalProvider(localConfig(), server.impl);
    const result = await provider.generateResponse({ message: "hi" });

    expect(result).toEqual({
      message: "A real answer.",
      model: "openai/gpt-oss-20b",
      status: "ok",
    });
  });

  it("sends the system prompt ahead of the user message", async () => {
    const server = fakeServer(() => jsonResponse(completion("ok")));
    await createLocalProvider(localConfig(), server.impl).generateResponse({
      message: "what is a trial balance?",
    });
    const body = JSON.parse(String(server.calls[0].init.body));
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "what is a trial balance?",
    });
  });

  it("NEVER falls back to the mock when the server is down", async () => {
    // The single most important behaviour in this phase.
    const down: FetchLike = () => Promise.reject(new TypeError("fetch failed"));
    const provider = createLocalProvider(localConfig(), down);

    await expect(provider.generateResponse({ message: "hi" })).rejects.toMatchObject({
      code: "model_unavailable",
    });

    // And what it throws must not read like an answer.
    await provider.generateResponse({ message: "hi" }).catch((error: InternalAiError) => {
      expect(error.publicMessage).not.toContain("GB10 system is available");
      expect(error.publicMessage).not.toContain("not connected yet");
    });
  });

  it("declines attachments rather than answering around them", async () => {
    const server = fakeServer(() => jsonResponse(completion("ok")));
    const provider = createLocalProvider(localConfig(), server.impl);
    await expect(
      provider.generateResponse({
        message: "read this",
        attachments: [
          {
            name: "q3.pdf",
            mimeType: "application/pdf",
            sizeBytes: 10,
            kind: "document",
            bytes: new Uint8Array(10),
          },
        ],
      })
    ).rejects.toMatchObject({ code: "invalid_request" });
    expect(server.calls).toHaveLength(0);
  });
});

describe("mode switching", () => {
  it("never reaches the network in mock mode", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const provider = await getLLMProvider();
    const result = await provider.generateResponse({ message: "hi" });
    expect(provider.id).toBe("mock");
    expect(result.status).toBe("model_not_connected");
    expect(spy).not.toHaveBeenCalled();
  });

  it("stops offering the mock once local mode is configured", async () => {
    localConfig();
    const provider = await getLLMProvider();
    expect(provider.id).toBe("local");
  });
});
