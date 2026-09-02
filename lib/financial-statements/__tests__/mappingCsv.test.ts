import { describe, expect, it } from "vitest";

import { csvToMappings, mappingsToCsv } from "../mapping/csv";
import { validateMappings } from "../mapping/validateMappings";
import { BALANCE_SHEET_MAPPINGS } from "../config/balanceSheetMappings";
import { INCOME_STATEMENT_MAPPINGS } from "../config/incomeStatementMappings";

const ALL = [...BALANCE_SHEET_MAPPINGS, ...INCOME_STATEMENT_MAPPINGS];

describe("mapping CSV", () => {
  it("shows a finance user no matching syntax", () => {
    const csv = mappingsToCsv(ALL);
    expect(csv).not.toContain("%");
    expect(csv).not.toContain("*");
  });

  /**
   * The round trip has to be lossless. An earlier version dropped the control
   * rule's `role`, so re-importing an unmodified export turned the P&L span
   * into an ordinary Balance Sheet rule that claimed every income statement
   * account. The validator caught it, but the export was still wrong.
   */
  it("round-trips the full table without losing anything", () => {
    const { rules, errors } = csvToMappings(mappingsToCsv(ALL));
    expect(errors).toEqual([]);
    expect(rules).toHaveLength(ALL.length);

    for (const original of ALL) {
      const returned = rules.find((r) => r.id === original.id);
      expect(returned, `mapping ${original.id} survived the round trip`).toBeDefined();
      expect(returned!.matchType).toBe(original.matchType);
      expect(returned!.statement).toBe(original.statement);
      expect(returned!.statementLine).toBe(original.statementLine);
      expect(returned!.section).toBe(original.section);
      expect(returned!.excluded).toBe(original.excluded);
      expect(returned!.role).toBe(original.role);
      expect(returned!.baseCode).toBe(original.baseCode);
      expect(returned!.fullCode).toBe(original.fullCode);
      expect(returned!.from).toBe(original.from);
      expect(returned!.to).toBe(original.to);
      if (original.accounts) expect(returned!.accounts).toEqual([...original.accounts]);
    }
  });

  it("re-imports its own export as a valid table", () => {
    const { rules } = csvToMappings(mappingsToCsv(ALL));
    const validation = validateMappings(rules);
    expect(validation.errors).toEqual([]);
    expect(validation.isValid).toBe(true);
  });

  it("reads a hand-written file with quoted fields", () => {
    const csv = [
      "id,statement,match_type,account,accounts,range_from,range_to,category,section,statement_line,status,excluded,exclusion_reason,role,notes",
      'my-cash,Balance Sheet,GL_CODE_SET,,1000 1001,,,Assets,Current assets,"Cash, at bank",active,no,,,',
      "my-range,Income Statement,NUMERIC_RANGE,,,5420,5559,Expenses,Operating Expense,Other Expenses,active,no,,,",
    ].join("\n");

    const { rules, errors } = csvToMappings(csv);
    expect(errors).toEqual([]);
    expect(rules[0].accounts).toEqual(["1000", "1001"]);
    expect(rules[0].statementLine).toBe("Cash, at bank");
    expect(rules[1]).toMatchObject({ matchType: "NUMERIC_RANGE", from: 5420, to: 5559 });
  });

  it("reports what is wrong instead of importing a broken file", () => {
    expect(csvToMappings("").errors[0]).toMatch(/empty/i);
    expect(csvToMappings("id,statement\nx,Balance Sheet").errors[0]).toMatch(/missing these columns/i);
    expect(csvToMappings(
      "id,statement,match_type,section,statement_line\nx,Nonsense,BASE_GL_CODE,Current assets,Cash"
    ).errors[0]).toMatch(/Balance Sheet or Income Statement/i);
  });
});
