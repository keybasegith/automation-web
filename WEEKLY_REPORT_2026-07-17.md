# Weekly Report — Keybase Financial Group

**Week of:** July 13–17, 2026
**Focus areas:** Compliance & Business Processing (shadowing + automation workflow design), Business Processing Settlement Automation, In-House Website ERP
**Status:** Deep in build mode — foundations laid across three parallel workstreams

---

## Summary

This was a heads-down, high-output week spent going deep on the operational
heart of the firm. I spent the majority of my time **embedded alongside the
Compliance and Business Processing teams**, shadowing their day-to-day work
closely so I could understand not just *what* they do but *why* each step
exists — and then translating those observations into **detailed, end-to-end
automation workflow drafts**. In parallel, I broke ground on the **Business
Processing Settlement automation system** and pushed the **in-house website ERP**
forward to the point where Krissy will soon be able to manage the entire public
website herself, with no code and no outside agency — the way she'd edit
something in Canva.

The through-line for the week: turn manual, repetitive, error-prone back-office
processes into **documented, automatable systems**, while making sure the firm
owns and controls its own tools end to end.

---

## What I worked on

### 1. Shadowing Compliance & Business Processing + workflow design

- Spent the bulk of the week **shadowing members of the Compliance and Business
  Processing teams**, sitting with them through their real workflows to map every
  step, hand-off, and decision point in detail.
- Rather than passively observing, I actively **documented each process as a
  structured automation workflow** — capturing inputs, validation rules,
  exception cases, and the exact points where a system could take over manual
  effort.
- This produced a growing library of **drafted automation blueprints** that will
  serve as the specification layer for the tools I'm building — so the automation
  reflects how the team *actually* works, not an outsider's assumptions.
- Where processes were ambiguous, I flagged them and asked to **re-shadow** so
  the final workflows are accurate and battle-tested rather than approximate.

### 2. Business Processing Settlement automation system (kicked off)

- Began work on the **Business Processing Settlement automation system**, one of
  the more complex and high-value processes in the back office.
- To make sure I captured the settlement logic correctly, I **requested a second
  shadowing session with Karthika** to get further clarification on the finer
  details of the settlement flow — the nuances that don't surface in a single
  pass.
- Off the back of that, I **drafted an initial version of the settlement
  automation workflow**, laying out the structure the system will follow.
- **Current dependency:** to build and validate this against real-world data, I
  need the **Fundserv Transaction Details file** as a working example. **Karthika
  will be sending that to me shortly**, at which point I can move from draft to a
  concrete, data-driven implementation.

### 3. In-house Website ERP — self-service content management (major progress)

- Continued developing an **ERP built directly inside the Keybase website** — an
  admin dashboard that lets an authorized team member **change website content
  without touching any code**.
- The vision: Krissy (and eventually others) will be able to **post news,
  publish articles, update content, and edit pages of the live website
  themselves**, through a simple visual interface — essentially editing the site
  **the way you would in Canva**.
- This is deliberately **not the "normal" way** websites are built, and that's
  the point. Krissy shared that the firm had **repeated, painful problems with
  the previous website agency** — being dependent on an outside vendor for every
  small change. So I took a different path:
  - The Keybase site is **fully custom, code-based — no templates**, giving us
    complete control over design, performance, and behavior.
  - On top of that, I'm building an **ERP layer inside the site** so the firm can
    **manage its own website in-house**, ending the reliance on any external
    agency.
- This week I brought that to life for the **Key Executives** section: a live,
  **visual "click-to-edit" editor** where an admin can update names, titles,
  bios, and photos, reorder or hide people, and **publish changes that go live
  immediately** — all behind a secure admin login. It's the first proven module
  of a system that will extend to news, articles, and the rest of the site.

---

## Meetings & coordination

- Coordinated with **Karthika** on the Business Processing Settlement flow —
  arranged a **follow-up shadowing session** for deeper clarification and is
  sending over the **Fundserv Transaction Details file** for me to build against.

## Open items / next steps

- **Receive the Fundserv Transaction Details file** from Karthika and use it to
  turn the drafted settlement workflow into a working, data-driven automation.
- Continue **refining the compliance & business-processing workflow drafts** into
  build-ready specifications, re-shadowing where needed for accuracy.
- **Extend the website ERP** beyond Key Executives to news, articles, and
  additional editable page content, so Krissy can fully self-manage the site.
