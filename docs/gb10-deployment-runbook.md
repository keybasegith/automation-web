# GB10 deployment runbook

To be worked through when the Dell/NVIDIA GB10 physically arrives. Nothing here
has been executed — the machine does not exist yet.

Record actual values in the blanks as you go. Where a step says *measure*, the
answer is **UNKNOWN UNTIL BENCHMARKED ON THE ACTUAL GB10**; do not fill it in
from a datasheet or a blog post.

Expected system: GB10 Grace Blackwell Superchip, 20-core Grace Arm CPU, 128 GB
coherent unified memory, 2 TB NVMe, with Synology flash storage attached.

---

## 1. Hardware validation

- [ ] Confirm the exact Dell model and service tag; record it.
- [ ] `nvidia-smi` — GPU detected, driver version recorded.
- [ ] Confirm unified memory total and that it reports as coherent/shared.
      **This is the number that decides which models fit.**
- [ ] `df -h` / `lsblk` — confirm NVMe capacity and free space. Model weights
      are large; confirm before downloading, not during.
- [ ] Confirm Synology is mounted, and record the mount path and protocol.
      *(Storage only in this phase. RAG is a later phase.)*
- [ ] Confirm network reachability from the application host, and record the
      GB10's internal address / DNS name.
- [ ] Confirm the machine is **not** reachable from outside the company network.

## 2. NVIDIA stack

- [ ] Record OS and kernel (`uname -a`, `/etc/os-release`). Confirm it is an
      aarch64 build — the CPU is Arm, and x86 packages will not apply.
- [ ] NVIDIA driver installed; version recorded.
- [ ] CUDA toolkit version recorded, and confirmed compatible with the driver.
- [ ] Container runtime installed, if used (Docker or Podman).
- [ ] NVIDIA Container Toolkit installed.
- [ ] GPU visible from inside a container:
      `docker run --rm --gpus all <cuda-image> nvidia-smi`
- [ ] Confirm the GPU is idle and nothing else on the box will contend with it.

## 3. Inference runtime

- [ ] Choose the runtime. vLLM is the primary candidate; confirm an aarch64 +
      Blackwell build exists for this CUDA version **before** committing to it.
      See the caveats in `docs/local-llm-architecture.md`.
- [ ] Install it. Record version and install method.
- [ ] **Bind to the internal interface only.** Not `0.0.0.0` unless a firewall
      is definitely in front of it. There is no authentication on the inference
      port; the network is the control.
- [ ] Pull the first model. Start with **gpt-oss-20b** — the smallest candidate
      is the fastest way to prove the whole path works end to end.
- [ ] Confirm the model loads; *measure* load time.
- [ ] Confirm the reasoning parser is configured so reasoning is returned
      separately from the answer, not inside it.
- [ ] `curl http://<host>:<port>/v1/models` returns the served model.
- [ ] `curl` a single completion and read the output.
- [ ] Confirm the port is **not** reachable from outside the internal network.
      Test from an external host; do not infer it from configuration.

## 4. Application connection

- [ ] Set `LOCAL_LLM_BASE_URL` to the GB10 origin (no trailing `/v1`; the
      client appends the path).
- [ ] Set `LOCAL_LLM_MODEL` to a registry id (`gpt-oss-20b`) or the served
      provider name.
- [ ] Leave `INTERNAL_AI_ENABLED` at its default, or set it to `true`.
- [ ] Restart the application so the config layer re-reads the environment.
- [ ] Confirm the server-to-server call works: sign in, open `/internal-ai`,
      ask a question, and confirm a **real** answer comes back with the served
      model name attached — not the mock's "model is not connected yet".
- [ ] Confirm the failure path: stop the inference server, ask again, and
      confirm the user sees an **error** and not a mock answer.
- [ ] Confirm the inference URL appears nowhere in the browser: check the page
      source, the JS bundles, and the network tab.

## 5. Benchmark and select

- [ ] `MODEL=gpt-oss-20b npm run ai:benchmark`
- [ ] `MODEL=qwen3-30b-a3b npm run ai:benchmark`
- [ ] `MODEL=gpt-oss-120b npm run ai:benchmark` — confirm it fits in unified
      memory first; if it does not, that is a result, so record it.
- [ ] Run all three in one session against one server, with nothing else
      running on the box. Results from different days are not comparable.
- [ ] Read the `humanReview` prompts in each summary. The automated score is a
      filter, not a verdict.
- [ ] `MODEL=<candidate> npm run ai:loadtest` for the concurrency sweep
      (1 → 5 → 10 → 20 → 40).
- [ ] Score the candidates with the weights in
      `lib/internal-ai/benchmark/scoring.ts` and record the decision, including
      why the winner beat the others.

## 6. Security

- [ ] Firewall: the inference port is reachable **only** from the application
      host. Verify by testing from elsewhere.
- [ ] No public route to the inference service — no port forward, no reverse
      proxy, no tunnel.
- [ ] Internal DNS entry created, if used.
- [ ] Confirm the runtime sends no telemetry. Check its settings explicitly and
      disable any usage reporting.
- [ ] Confirm no prompt content is written to the inference server's logs, or
      that those logs are treated as confidential if it is.
- [ ] Confirm the application still logs no prompt content (unchanged from
      Phase 1, but re-verify after the environment change).
- [ ] Confirm Internal AI is still behind authentication: sign out and confirm
      `/internal-ai` redirects and `POST /api/internal-ai/chat` returns 401.
- [ ] Agree who may change `LOCAL_LLM_*` in production, and where those values
      are stored. They are not secrets, but pointing the app at the wrong host
      is a data-egress event.

## 7. Operations

- [ ] Decide what happens when the GB10 is down: today, users get an error.
      Confirm that is acceptable, or plan a maintenance banner.
- [ ] Restart policy for the inference service; confirm it survives a reboot.
- [ ] Monitoring: GPU utilisation, memory, request rate, error rate.
      The runtime's own metrics endpoint is the cheapest source.
- [ ] Capacity: record the concurrency the sweep supported, and revisit when
      usage grows. ~200 employees is not 200 concurrent requests.
- [ ] Decide the retention and access policy for transcripts **before**
      enabling persistence (`lib/internal-ai/transcript.ts` writes nothing
      today, deliberately).

---

## Rollback

Unset `LOCAL_LLM_BASE_URL` and restart. The feature returns to mock mode, which
tells users plainly that no model is connected. Nothing else needs to change,
and no data is lost — nothing is persisted.
