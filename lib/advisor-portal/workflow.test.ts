import { test } from "vitest";
import assert from "node:assert/strict";
import { transition, validatePage, EMPTY_PAGE } from "./workflow.js";
test("advisors cannot approve and IT cannot bypass compliance", () => {
  assert.throws(() =>
    transition({ status: "submitted" }, "advisor", "approve"),
  );
  assert.throws(() => transition({ status: "submitted" }, "it", "publish"));
  assert.throws(() => transition({ status: "returned" }, "it", "publish"));
});
test("return requires actionable feedback", () => {
  assert.throws(() =>
    transition({ status: "submitted" }, "compliance", "return", "  "),
  );
  assert.equal(
    transition(
      { status: "submitted" },
      "compliance",
      "return",
      "Please substantiate the statistic.",
    ).status,
    "returned",
  );
});
test("approved content is unchanged and cannot be reviewed again", () => {
  const r = { status: "submitted", content: structuredClone(EMPTY_PAGE) };
  const approved = transition(r, "compliance", "approve");
  assert.equal(approved.status, "approved");
  assert.deepEqual(approved.content, r.content);
  assert.equal(r.status, "submitted");
  assert.throws(() => transition(approved, "compliance", "return", "Revise"));
  assert.equal(transition(approved, "it", "publish").status, "published");
});
test("published versions cannot be republished", () =>
  assert.throws(() => transition({ status: "published" }, "it", "publish")));
test("incomplete submissions are rejected", () => {
  assert.throws(() => validatePage({ ...EMPTY_PAGE, name: "" }));
  assert.throws(() => validatePage({ ...EMPTY_PAGE, headline: " " }));
  assert.doesNotThrow(() => validatePage(EMPTY_PAGE));
});

import { newAdvisorDraft, toTemplate, COMPANY_DESCRIPTION } from "./workflow.js";
test("new real advisors do not inherit Johnathan's claims or contact information", () => {
 const draft = newAdvisorDraft({name:"New Advisor"});
 assert.equal(draft.name,"New Advisor");
 assert.equal(draft.email,"");
 assert.equal(draft.phone,"");
 assert.equal(draft.portrait,"");
 assert.equal(draft.stats.length,4);
 assert.ok(draft.stats.every(stat => stat.value === "0"));
});
test("template company copy comes from the protected record, never an editable field", () => {
 const result=toTemplate({...EMPTY_PAGE, companyDescriptionLines:["tampered"]},COMPANY_DESCRIPTION);
 assert.deepEqual(result.companyDescriptionLines,[COMPANY_DESCRIPTION]);
});
