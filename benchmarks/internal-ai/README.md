# Internal AI benchmark

Compares local model candidates on the same prompts, the same settings, and the
same hardware, so the choice between them is an argument about evidence rather
than about impressions.

> **No results exist yet.** Every performance figure this framework produces is
> **UNKNOWN UNTIL BENCHMARKED ON THE ACTUAL GB10.** Nothing in this repository
> estimates one. If the inference server is unreachable the runner prints
> `benchmark not executed: inference server unavailable` and writes nothing.

## Running it

```bash
MODEL=gpt-oss-120b   npm run ai:benchmark
MODEL=qwen3-30b-a3b  npm run ai:benchmark -- --stream
MODEL=gpt-oss-20b    npm run ai:benchmark -- --category=finance
```

`MODEL` takes a registry id from `lib/internal-ai/models.ts` or a provider model
name. `LOCAL_LLM_BASE_URL` must point at the inference server. Results land in
`benchmark-results/<timestamp>/<model>.json` with a `.md` summary beside them.

Run all three candidates in one session, against one server, without restarting
anything else on the box. Numbers from different days on a differently loaded
machine are not comparable.

## Files

- `prompts.json` — the questions. Version-controlled so a run is reproducible.
- `expected-behaviors.json` — criteria, not answers.
- Long-context prompts are **generated** (`lib/internal-ai/benchmark/dataset.ts`)
  from a fixed seed rather than stored, so the repo stays small and every model
  still sees byte-identical input.

## What is graded automatically, and what is not

Grading is mechanical: substring presence, word counts, JSON shape, refusal
detection. There is **no model-as-judge**. Judging with an external API is
precisely what this system is forbidden to do, and judging with the model under
test would be marking its own homework.

So the automated score is a **filter, not a verdict**. It catches what is
objectively decidable — wrong arithmetic, invalid JSON, an invented policy — and
routes everything else to a person via the `humanReview` note carried into the
summary. **A high automated score is necessary for a candidate, never
sufficient.** Read the answers.

Criteria vocabulary:

| Key | Meaning |
| --- | --- |
| `mustMention` | Facts the answer has to contain. Numbers match regardless of punctuation. |
| `mustNotMention` | Phrases whose presence indicates fabrication. |
| `maxWords` | Length instructions were followed. |
| `mustRefuse` | The only correct answer is to say the information was not provided. |
| `citationRequired` | The answer must point at the supplied clause, not assert from nowhere. |
| `formatValidity` | Parses as a JSON object or array. |
| `requiredStructure` | Keys, types, enums, length. |
| `needleAnswer` | Recalls the fact planted mid-context. |
| `humanReview` | The question a person must answer after reading. |

## Categories

| Category | What it is really testing |
| --- | --- |
| `office` | Summarising, rewriting, everyday business reasoning. |
| `finance` | Accounting concepts, statement arithmetic, hypothetical scenarios. |
| `compliance` | Following a supplied synthetic policy — and **not inventing rules it was not given**. |
| `structured` | Valid JSON on request, with the exact schema asked for. |
| `longcontext` | Retrieval from 8k / 32k / 64k of synthetic filler. |
| `reasoning` | Multi-step arithmetic and constraint problems with verifiable answers. |

Two compliance prompts have no answer in the material on purpose. The correct
behaviour is to say so. **A confident fabricated policy is a hard fail
regardless of every other score** — this assistant will be used by staff who
cannot easily tell a real internal rule from an invented one.

## Data policy

Synthetic only. No real client, employee, account, or policy data may be added
to this directory — it is version-controlled and world-readable to everyone with
repository access. A test asserts the absence of common markers, which is a
backstop, not permission to get close to the line.

## Turning results into a decision

`lib/internal-ai/benchmark/scoring.ts` holds the weights:

| Dimension | Weight |
| --- | --- |
| Answer quality | 30% |
| Latency | 20% |
| Concurrency | 20% |
| Instruction following | 10% |
| Structured output reliability | 10% |
| Operational stability | 10% |

Latency and concurrency together (40%) outweigh answer quality (30%), on
purpose: an assistant that is right but takes 40 seconds under load will not be
used. **Do not automatically choose the largest model.**

Four **hard gates** disqualify a candidate regardless of its weighted score:
it fell over during the concurrency sweep, it invented a policy, it did not fit
in unified memory at the target concurrency, or it could not produce valid JSON
on request. A disqualified model always ranks last.

The weights are a starting point and are meant to be revisited once we know what
production traffic actually looks like. Change them deliberately, and record why
in the commit message.

## Deriving the six dimension scores

The runner produces raw measurements; a human maps them to the 0–1 dimension
scores. Suggested mapping, to be firmed up once we have one real run to
calibrate against:

- **Answer quality** — mean automated score over `office`, `finance`,
  `reasoning`, adjusted after reading the `humanReview` prompts.
- **Latency** — p95 total latency at concurrency 1, scored relative to the
  best candidate.
- **Concurrency** — highest sweep level holding ≥95% success and acceptable
  p95, relative to the best candidate.
- **Instruction following** — `maxWords`, `citationRequired`, and code-fence
  checks.
- **Structured output** — the `structured` category score.
- **Operational stability** — failure rate across the whole run, plus whether
  the server needed intervention.
