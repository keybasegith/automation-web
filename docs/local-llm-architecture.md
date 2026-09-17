# Local LLM architecture

How Internal AI will serve a self-hosted model on the company's own hardware.

> **Status: preparation.** The GB10 has been ordered and is not here. No model
> has been deployed, no model has been benchmarked, and **every performance
> figure in this phase is UNKNOWN UNTIL BENCHMARKED ON THE ACTUAL GB10.**
> Nothing in this repository estimates one.

## Production flow

```
Employee browser
      │  HTTPS, session cookie
      ▼
Company dashboard (Next.js)
      │
      ▼
Authenticated Internal AI API      POST /api/internal-ai/chat
      │  requireInternalAiUser → schema → service
      ▼
LLM provider resolver              mock | local
      │
      ▼
Local provider ──► inference client
      │  HTTP, internal network only, server-to-server
      ▼
Internal network
      │
      ▼
GB10 inference service             vLLM (candidate runtime)
      │
      ▼
Local model                        gpt-oss-120b | qwen3-30b-a3b | gpt-oss-20b
      │
      ▼
GB10 GPU
```

A later phase adds, and only here:

```
                                   ↘
                               Synology
                               RAG storage
```

**RAG is not part of this phase.** No embeddings, no chunking, no vector store,
no document ingestion, no citations, no agents, no tools, no fine-tuning.

The browser talks only to our own backend. It never learns the inference host,
never holds a credential for it, and never opens a connection to it.

## The layers, and why they are separate

Phase 1's flow is unchanged. This phase filled in the last box.

| Layer | File | Responsibility |
| --- | --- | --- |
| Route | `app/api/internal-ai/chat/route.ts` | HTTP, auth, body limits |
| Auth | `lib/internal-ai/session.ts` | Verified server session (Phase 1.5) |
| Schema | `lib/internal-ai/schemas.ts` | Validation |
| Service | `lib/internal-ai/service.ts` | Orchestration, transcript seam |
| Resolver | `providers/llm-provider.ts` | Picks a provider from config |
| Mock | `providers/mock-provider.ts` | Answers that no model is connected |
| Local | `providers/local-provider.ts` | System prompt, attachment policy |
| Client | `providers/inference-client.ts` | HTTP, timeouts, structured errors |
| Registry | `lib/internal-ai/models.ts` | Model identity and intent |

Nothing above the registry names a model, and nothing above the client knows a
URL. That is what lets us change model, or replace the runtime entirely, without
touching the UI or the API contract.

## Mode switching

Exactly two modes, chosen by one variable:

| `LOCAL_LLM_BASE_URL` | Mode | Behaviour |
| --- | --- | --- |
| unset | **mock** | Answers that no model is connected. The default everywhere today. |
| set | **local** | Calls the inference server. The mock is not reachable. |

**There is no silent fallback, by design.** If a deployment is configured for a
real model and that model is unreachable, slow, or returns nonsense, the user
gets an error. It must never receive placeholder text that reads as though a
model had answered — a fabricated answer that looks real is worse than an outage
that looks like one. A test asserts this (`NEVER falls back to the mock`).

## The wire protocol

The client speaks the chat-completions HTTP protocol (`POST /v1/chat/completions`,
`GET /v1/models`) that vLLM and every other serious local runtime expose. **The
protocol is a shape, not a vendor.** No request leaves the company network, no
third-party SDK is installed, and no API key of any kind is read or sent. Tests
assert the absence of external hosts, external SDK imports, and third-party key
names in the whole feature.

Using the common protocol is what makes the runtime swappable: llama.cpp,
SGLang, TGI, or Ollama can all be put behind the same client without an
application change.

## Runtime: vLLM, with caveats

vLLM is the primary candidate — continuous batching is what makes concurrent
chat viable, and it serves the protocol above. **Do not assume compatibility.**
Verify before committing:

- **Arm64 + Blackwell.** The GB10 is a Grace Arm CPU with a Blackwell GPU.
  Confirm a working aarch64 build for this CUDA version; do not assume the
  x86 wheels apply.
- **Unified memory.** 128 GB is coherent and shared with the CPU, which is not
  the discrete-VRAM model vLLM's memory settings assume. `gpu_memory_utilization`
  needs deliberate tuning, and a value that is safe on a discrete card may not be
  here.
- **MXFP4 (gpt-oss).** gpt-oss ships at MXFP4. Confirm the runtime supports that
  quantisation on this GPU. A runtime that silently upcasts to bf16 changes the
  memory profile completely and may not fit at all.
- **Reasoning channels.** All three candidates emit reasoning separately from
  the answer. The client reads `content` only and never surfaces
  `reasoning_content`; confirm the runtime's parser is configured to separate
  them, or reasoning will appear in users' answers.
- **Qwen3 thinking mode.** Switchable. Pin one mode per benchmark run or the
  numbers are not comparable.

If vLLM does not work out, the substitution point is one file:
`providers/inference-client.ts`.

## Configuration

Server-only. Nothing is prefixed `NEXT_PUBLIC_`, so nothing reaches a browser
bundle; a test enforces that across the feature.

| Variable | Default | Purpose |
| --- | --- | --- |
| `INTERNAL_AI_ENABLED` | `true` | Master switch; false 404s the page and API. |
| `LOCAL_LLM_BASE_URL` | unset | Inference server origin. **Setting this enables local mode.** |
| `LOCAL_LLM_MODEL` | unset | Registry id or provider model name. |
| `LOCAL_LLM_TIMEOUT_MS` | `120000` | Whole-request budget, enforced with an abort signal. |
| `LOCAL_LLM_MAX_TOKENS` | `2048` | Output cap. |
| `LOCAL_LLM_TEMPERATURE` | `0.2` | Sampling. `0` is honoured as a real value. |
| `LOCAL_LLM_REASONING_EFFORT` | unset | `low`/`medium`/`high` where supported. |

## Streaming

**Prepared, not yet shipped.** The existing non-streaming endpoint is unchanged
and remains the only path a user request takes.

What exists and is tested against synthetic byte streams:

- `providers/sse.ts` — a real SSE parser handling events split across chunks,
  multi-byte characters split across chunks, CRLF, comment heartbeats, and the
  `[DONE]` sentinel.
- `inferenceClient.stream()` — yields `{type:"delta"}` frames then a `{type:"done"}`
  frame carrying the model and token usage.

What remains, when we choose to ship it:

1. Add `POST /api/internal-ai/chat/stream` returning `text/event-stream`, keeping
   the existing endpoint untouched so a failure is never user-visible.
2. Forward the client's abort signal so a closed browser tab stops generation
   rather than paying for tokens nobody will read.
3. Consume it in the browser with `fetch` + `ReadableStream` — no `EventSource`,
   which cannot POST.
4. Write the transcript on the `done` frame, not per delta.

SSE over a POST body is preferred to WebSockets: it is one direction, it needs
no extra infrastructure, and it survives the existing auth and proxy layers
unchanged.

There is deliberately **no fake streaming** — no chunking of an already-complete
answer to look responsive.

## Security

- No external inference service, no external embeddings, no external analytics.
  Enforced by tests against external hosts, SDK imports, and API-key names.
- Prompt content is never logged; server logs carry a code and a request id.
- The inference URL is server-only and appears in no response.
- No credential is sent to the inference server: it is reachable only from the
  application host on the internal network, which is where the trust boundary
  is. If that ever stops being true, add mutual TLS — do not add a shared
  secret in an env var.
- Attachments are declined explicitly by the local provider rather than being
  ignored, so a user is never led to believe a file was read.
