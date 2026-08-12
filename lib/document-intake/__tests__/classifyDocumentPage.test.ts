import { describe, expect, it } from "vitest";
import { classifyDocumentPage } from "../classifyDocumentPage";
import { isRotated } from "../extractPdfText";
import { UNSURE_DOCUMENT_NAME } from "../types";

describe("isRotated", () => {
  it("recognises horizontal text", () => {
    expect(isRotated([12, 0, 0, 12, 72, 700])).toBe(false);
  });

  it("recognises quarter turns in both directions", () => {
    // 90° — the sideways corner label on the AIO order request.
    expect(isRotated([0, 12, -12, 0, 30, 400])).toBe(true);
    // 270°
    expect(isRotated([0, -12, 12, 0, 560, 400])).toBe(true);
  });

  it("ignores slight skew on otherwise horizontal text", () => {
    expect(isRotated([12, 0.4, -0.4, 12, 72, 700])).toBe(false);
  });
});

describe("classifyDocumentPage — printed titles", () => {
  it("identifies the AIO order request from its rotated corner label", () => {
    // The label is drawn sideways in the page corner, so it arrives as margin
    // text — its baseline is nowhere near the top-of-page band.
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "Fund Code Units Amount Dollar Cost Averaging Client Signature",
      headerText: "",
      footerText: "",
      marginText:
        "Order Request - AIO Transactions are executed by mutual fund codes, only.",
    });

    expect(result.documentName).toBe("Order Request - AIO");
    expect(result.category).toBe("Keybase Trading");
    expect(result.confidence).toBe(96);
    expect(result.needsReview).toBe(false);
  });

  it("identifies the KYC update from its printed heading", () => {
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "Client information investment objectives time horizon",
      headerText:
        "Keybase Financial Group Know Your Client Update 101 - 1725 16th Ave, Richmond Hill, ON L4B 0B3 T: 905-709-7911",
      footerText: "",
    });

    expect(result.documentName).toBe("Know Your Client Update");
    expect(result.category).toBe("Keybase Know Your Client KYC");
    expect(result.documentType).toBe("KYC");
    expect(result.confidence).toBe(96);
  });

  it("tolerates punctuation and spacing differences in the printed title", () => {
    for (const label of [
      "Order Request-AIO",
      "Order  Request  -  AIO",
      "ORDER REQUEST - AIO",
    ]) {
      expect(
        classifyDocumentPage({
          pageNumber: 1,
          text: "body",
          marginText: label,
        }).documentName
      ).toBe("Order Request - AIO");
    }
  });

  it("matches on the AIO subtitle alone", () => {
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "body",
      marginText: "Transactions are executed by mutual fund codes, only.",
    });

    expect(result.documentName).toBe("Order Request - AIO");
  });

  it("prefers a form code over a printed title", () => {
    // The code names the exact page-count variant; the heading only names the
    // family, so the code has to win when both are present.
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "Know Your Client Update ... 10001 ...",
      headerText: "Know Your Client Update",
      footerText: "10001",
    });

    expect(result.documentName).toBe("KYC Update - 3 Pages - 10001");
    expect(result.documentCode).toBe("10001");
  });

  it("scores a title found only in the body lower than one in the margin", () => {
    const result = classifyDocumentPage({
      pageNumber: 2,
      text: "continued from Know Your Client Update — additional holdings",
      headerText: "",
      footerText: "",
    });

    expect(result.documentName).toBe("Know Your Client Update");
    expect(result.confidence).toBe(90);
  });

  it("does not fire on a page that merely mentions the client-know phrase", () => {
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "See Know Your Client Terms and Definitions on the reverse.",
      headerText: "",
      footerText: "",
    });

    expect(result.documentName).not.toBe("Know Your Client Update");
  });
});

describe("classifyDocumentPage — page stamps", () => {
  it("attaches the stamp read from the footer band", () => {
    const result = classifyDocumentPage({
      pageNumber: 2,
      text: "Know Your Client Update — continued. Investment objectives.",
      headerText: "",
      footerText: "10001  Page 2 of 3",
    });

    expect(result.pageIndicator).toEqual({ index: 2, total: 3 });
    expect(result.reason).toContain("page 2 of 3 stamped on page");
  });

  it("attaches the stamp even when the page could not be identified", () => {
    // This is the case that matters most: an unnamed continuation page whose
    // only usable signal is the stamp, which is what lets groupPages attach
    // it to the document it belongs to.
    const result = classifyDocumentPage({
      pageNumber: 2,
      text: "Signature ______  Date ______",
      headerText: "",
      footerText: "Page 2 of 2",
    });

    expect(result.documentName).toBe(UNSURE_DOCUMENT_NAME);
    expect(result.pageIndicator).toEqual({ index: 2, total: 2 });
  });

  it("falls back to whole-page text when no footer band was extracted", () => {
    // OCR'd pages lose band positions, so the stamp can only be found in the
    // flattened text.
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "Order Request AIO  ...body...  Page 1 of 2",
    });

    expect(result.pageIndicator).toEqual({ index: 1, total: 2 });
  });

  it("leaves the classification untouched when there is no stamp", () => {
    const result = classifyDocumentPage({
      pageNumber: 1,
      text: "Know Your Client Update investment objectives risk tolerance",
      headerText: "",
      footerText: "Keybase Financial Group",
    });

    expect(result.pageIndicator).toBeUndefined();
    expect(result.reason).not.toContain("stamped on page");
  });
});
