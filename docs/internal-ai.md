# Internal AI — Phase 1

A private assistant inside the automation dashboard, at `/internal-ai`, reached
from the **Internal AI** card on the dashboard home grid and from the sidebar.

Phase 1 builds the application around a model that does not exist yet. There is
no model connected, and the interface says so in three places rather than
implying otherwise: the dashboard card footnote, the status badge in the page
header, and the assistant's own reply.

## Attachments

Images and documents can be attached by dropping them anywhere on the chat
surface, pasting (screenshots included), or using the paperclip. Files travel
with the message in one multipart request — there is no separate upload step,
because there is nowhere for a file to wait between two requests.

Nothing reads them and nothing keeps them. The mock provider acknowledges each
file by name, kind, and size so a user can confirm the upload arrived intact,
and states plainly that no model has looked at it. Bytes are read into memory,
handed to the provider, and dropped when the request returns: no disk, no
object storage, no filename in a log line.

`lib/internal-ai/attachments.ts` holds one policy that both sides apply. The
browser's copy explains a rejection before the upload starts; the server's copy
is the enforcement, and re-checks every file's type and size regardless of what
the browser allowed. Accepted: common image formats, PDF, plain text, Markdown,
CSV, JSON, RTF, and Office/OpenDocument files. Video and audio are not
accepted. SVG is accepted as a document and never rendered as an image.

## What is deliberately not here

No RAG, no embeddings, no vector store, no document *understanding* (an
attachment is carried, never parsed), no agents or tool execution, and **no
external AI service of any kind**. This feature contains no
code path to OpenAI, Anthropic, Gemini, Azure OpenAI, or Bedrock, reads no API
key, and is not to acquire one: Internal AI answers from company-controlled
infrastructure or it does not answer. A test asserts this against the source
(`lib/internal-ai/internal-ai.test.ts`, "no external AI dependency").

## Shape

```
app/internal-ai/                 page + AppShell layout (the auth gate)
app/api/internal-ai/chat/        POST /api/internal-ai/chat
components/internal-ai/          workspace, bubbles, composer, chips, drop zone
lib/internal-ai/
  attachments.ts                 accepted types and size limits, both sides
  config.ts                      every env var this feature reads, read once
  session.ts                     the single authorization choke point
  schemas.ts                     request validation
  service.ts                     route → provider, plus the transcript seam
  transcript.ts                  the row shape storage will use; writes nothing
  providers/
    llm-provider.ts              the LLMProvider interface + resolver
    mock-provider.ts             Phase 1: answers that no model is connected
    local-provider.ts            the file to fill in for the GB10 host
```

A request runs: route → `requireInternalAiUser` → `parseChatRequest` →
`respondToChatMessage` → `getLLMProvider` → provider. The UI knows only the
route; the route knows only the service; the service knows only the interface.

### Wire contract

```
POST /api/internal-ai/chat
  { "message": string, "conversationId"?: string }
→ { "message": string, "conversationId": string, "model": string, "status": string }
```

`status` is `model_not_connected` while the mock answers, and `ok` only once a
real model has. The UI never renders a connected state from anything else.

## Privacy

- Prompts are not logged. Server logs carry an error code and a request id.
- Prompts are not sent to analytics or any third party; no analytics module is
  imported by this feature.
- Nothing is persisted. A conversation lives in the browser tab that started
  it and is gone on reload — see `transcript.ts` for why, and for the table
  shape a future phase should create.
- Responses are `cache-control: no-store` and `x-robots-tag: noindex`.
- No configuration value is exposed to the browser; nothing here is prefixed
  `NEXT_PUBLIC_`.

## Configuration

All optional. With an empty environment the feature runs on the mock provider,
which is the intended Phase 1 state. See `.env.example` for the full comments.

| Variable | Effect |
| --- | --- |
| `INTERNAL_AI_ENABLED` | `false` makes the page and the API 404. Defaults to true. |
| `LOCAL_LLM_BASE_URL` | Base URL of the self-hosted inference server. **Setting it selects the local provider**, which is not implemented yet, so leave it empty until it is. |
| `LOCAL_LLM_MODEL` | Model name to request from that server. |
| `INTERNAL_AI_MAX_MESSAGE_LENGTH` | Longest message accepted. Defaults to 4000. |
| `INTERNAL_AI_MAX_ATTACHMENTS` | Files per message. Defaults to 10. |
| `INTERNAL_AI_MAX_ATTACHMENT_MB` | Per-file ceiling. Defaults to 25. |
| `INTERNAL_AI_MAX_UPLOAD_MB` | Total per message. Defaults to 50. |

**Serverless body limit.** A serverless host caps the whole request body well
below those defaults — on Vercel it is 4.5 MB, enforced before this code runs,
so a large upload fails at the platform with an error this route never sees.
Lower the two MB values for any serverless deployment, or serve this route from
a host without that cap.

## Connecting the GB10 system

The local provider is now implemented (Phase 2). Connecting the hardware is
configuration, not code:

1. Set `LOCAL_LLM_BASE_URL` and `LOCAL_LLM_MODEL` in the deployment environment
   only — never in a client bundle, never in git.
2. Restart, and verify both paths: a real answer with the served model's name,
   and an **error** (not a mock answer) when the server is stopped.

Full detail: `docs/local-llm-architecture.md` for the architecture, model
registry, and streaming plan; `docs/gb10-deployment-runbook.md` for the
step-by-step; `benchmarks/internal-ai/README.md` for model evaluation.

Streaming, transcript persistence, document text extraction, and per-user rate
limiting are the natural next pieces, and none of them requires the UI to be
rebuilt.

## Known gap

The automation dashboard has no server-side session: `AppShell` gates pages on
a `localStorage` flag that never reaches the server, so the API cannot verify a
signed-in user. `requireInternalAiUser` enforces what it can today — the
request must come from this application — and is the single function to change
when real sessions land. This is a dashboard-wide gap that Internal AI inherits
rather than one this feature introduced; every other dashboard API route is in
the same position.
