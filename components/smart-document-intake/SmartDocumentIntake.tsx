"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { classifyDocumentPage } from "@/lib/document-intake/classifyDocumentPage";
import { classifyPageWithAI } from "@/lib/document-intake/classifyPageWithAI";
import {
  buildSuggestedFileName,
  findDuplicateDocuments,
  findMissingCoreDocuments,
  groupPages,
  renderFilenameTemplate,
} from "@/lib/document-intake/groupPages";
import { extractPdfPageText } from "@/lib/document-intake/extractPdfText";
import { ocrPdfPages } from "@/lib/document-intake/ocrPage";
import {
  sanitizeFileName,
  splitPdfIntoGroups,
} from "@/lib/document-intake/splitPdf";
import {
  AUDIT_ACTION_LABEL,
  createIntakeAuditEntry,
  persistIntakeAuditEntry,
} from "@/lib/document-intake/auditLog";
import {
  findCatalogItemByName,
} from "@/lib/document-intake/documentCatalog";
import {
  buildDemoGroups,
  DEMO_TOTAL_PAGES,
} from "@/lib/document-intake/demoData";
import {
  UNSURE_DOCUMENT_NAME,
  type AuditAction,
  type AuditLogEntry,
  type ClassificationSource,
  type DocumentGroup,
  type DocumentGroupStatus,
  type DocumentType,
  type PageClassification,
  type SeparatedDocumentFile,
} from "@/lib/document-intake/types";

import DocumentUploadCard, {
  type UploadFormValues,
} from "./DocumentUploadCard";
import ProcessingSteps, {
  DEFAULT_STEPS,
  type ProcessingStepKey,
  type ProcessingStepState,
} from "./ProcessingSteps";
import ReviewTable from "./ReviewTable";
import PreviewModal from "./PreviewModal";
import ApprovalPinModal from "./ApprovalPinModal";
import SplitResults from "./SplitResults";
import MissingDocumentWarnings from "./MissingDocumentWarnings";
import EmptyState from "./EmptyState";
import AuditLogPanel from "./AuditLogPanel";
import AIClassificationToggle from "./AIClassificationToggle";
import OcrToggle from "./OcrToggle";
import DocumentTypePickerModal, {
  type DocumentTypePickerSelection,
} from "./DocumentTypePickerModal";

type IntakePhase = "idle" | "processing" | "review" | "finalized";

const DEMO_FILE_NAME = "DEMO_PACKAGE.pdf";

const COARSE_FROM_CATEGORY: Record<string, DocumentType> = {
  "Keybase Client Risk Questionnaire": "CRQ",
  "Keybase Know Your Client KYC": "KYC",
  "Keybase Account Opening": "NAAF",
  "Identity Documents": "Passport",
  Banking: "Void Cheque",
  "Signature Pages": "Signature Page",
  "Government and CRA Forms": "Tax Form",
};

function deriveCoarseType(documentName: string, category: string): DocumentType {
  if (documentName === "Passport") return "Passport";
  if (documentName === "Driver's License") return "Driver's License";
  if (documentName === "Void Cheque") return "Void Cheque";
  if (documentName === "Signature Page") return "Signature Page";
  if (documentName === "Other") return "Other";
  if (documentName === "Unknown") return "Unknown";
  return COARSE_FROM_CATEGORY[category] ?? "Other";
}

function deriveStatusFromConfidence(args: {
  documentName: string;
  averageConfidence: number;
  anyPageNeedsReview: boolean;
}): DocumentGroupStatus {
  if (args.documentName === UNSURE_DOCUMENT_NAME) return "Unsure";
  if (args.documentName === "Unknown") return "Unknown";
  if (args.averageConfidence < 60) return "Low Confidence";
  if (args.averageConfidence < 85 || args.anyPageNeedsReview) return "Needs Review";
  return "Ready";
}

export default function SmartDocumentIntake() {
  const [values, setValues] = useState<UploadFormValues>({
    clientName: "",
    clientId: "",
    advisorName: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<IntakePhase>("idle");
  const [steps, setSteps] = useState<ProcessingStepState[]>(DEFAULT_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [previewGroupId, setPreviewGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [splitFiles, setSplitFiles] = useState<SeparatedDocumentFile[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [finalizeBlockedReason, setFinalizeBlockedReason] = useState<string | null>(
    null
  );
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiConfiguredMessage, setAiConfiguredMessage] = useState<string | null>(
    null
  );
  const [ocrEnabled, setOcrEnabled] = useState(true);
  /**
   * Surfaced as a banner on the review page when text extraction (and OCR
   * fallback, if enabled) yielded too little text to classify pages reliably.
   */
  const [extractionWarning, setExtractionWarning] = useState<string | null>(
    null
  );

  const sourceBytesRef = useRef<Uint8Array | null>(null);
  const isDemoRef = useRef(false);

  const isDevelopment = process.env.NODE_ENV !== "production";

  useEffect(() => {
    return () => {
      splitFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewGroup = useMemo(
    () => groups.find((g) => g.id === previewGroupId) ?? null,
    [groups, previewGroupId]
  );

  const editingGroup = useMemo(
    () => groups.find((g) => g.id === editingGroupId) ?? null,
    [groups, editingGroupId]
  );

  const missing = useMemo(() => findMissingCoreDocuments(groups), [groups]);
  const duplicates = useMemo(() => findDuplicateDocuments(groups), [groups]);

  const setStep = (
    key: ProcessingStepKey,
    status: ProcessingStepState["status"],
    detail?: string
  ) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, status, detail: detail ?? s.detail } : s
      )
    );
  };

  const resetSteps = () => setSteps(DEFAULT_STEPS.map((s) => ({ ...s })));

  const log = (
    action: AuditAction,
    details: string,
    extra?: {
      employeeName?: string;
      previousValue?: string;
      newValue?: string;
    }
  ) => {
    const entry = createIntakeAuditEntry({
      action,
      details,
      clientName: values.clientName,
      fileName: file?.name ?? (isDemoRef.current ? DEMO_FILE_NAME : ""),
      employeeName: extra?.employeeName ?? "",
      previousValue: extra?.previousValue,
      newValue: extra?.newValue,
    });
    setAuditEntries((prev) => [entry, ...prev]);
    void persistIntakeAuditEntry(entry);
  };

  const handleAiToggle = (enabled: boolean) => {
    setAiEnabled(enabled);
    log(
      enabled ? "ai_classification_enabled" : "ai_classification_disabled",
      enabled
        ? "Employee enabled AI classification for low-confidence pages."
        : "Employee disabled AI classification."
    );
  };

  const startOver = () => {
    splitFiles.forEach((f) => URL.revokeObjectURL(f.blobUrl));
    setSplitFiles([]);
    setGroups([]);
    setError(null);
    setFinalizeBlockedReason(null);
    setTotalPages(0);
    sourceBytesRef.current = null;
    isDemoRef.current = false;
    resetSteps();
    setPhase("idle");
  };

  /**
   * Apply AI classification to pages with confidence < 85 (when toggle is on).
   * If the AI is not configured, this is a no-op (and we record the message).
   */
  const applyAiToLowConfidencePages = async (
    initial: PageClassification[],
    textByPage: Map<number, string>
  ): Promise<PageClassification[]> => {
    if (!aiEnabled) return initial;
    const totalLow = initial.filter((p) => p.confidence < 85).length;
    if (totalLow === 0) return initial;

    setStep("detecting", "active", `AI second-opinion on ${totalLow} low-confidence page(s)…`);

    const updated = [...initial];
    let aiUnavailable = false;
    let aiSeen = false;
    let learnedMessage: string | null = null;
    let processed = 0;

    for (let i = 0; i < updated.length; i++) {
      const p = updated[i];
      if (p.confidence >= 85) continue;
      if (aiUnavailable) break;

      const resp = await classifyPageWithAI({
        pageNumber: p.pageNumber,
        text: textByPage.get(p.pageNumber) ?? p.extractedTextPreview,
        keywordResult: p,
      });

      if (!resp.configured) {
        aiUnavailable = true;
        learnedMessage = resp.message ?? null;
        break;
      }
      aiSeen = true;

      processed += 1;
      setStep(
        "detecting",
        "active",
        `AI second-opinion: ${processed}/${totalLow} page(s) processed`
      );

      if (resp.ok && resp.result) {
        const aiConfidence = Math.max(0, Math.min(99, resp.result.confidence));
        // Adopt the AI result when it raises confidence OR when the keyword
        // result was Unsure (no strong anchor) and AI proposes a real
        // catalog match — anything is better than leaving the page Unsure.
        const keywordWasUnsure = p.documentName === UNSURE_DOCUMENT_NAME;
        const aiPickedRealDoc =
          resp.result.documentName !== UNSURE_DOCUMENT_NAME &&
          resp.result.documentName !== "Unknown";
        if (aiConfidence > p.confidence || (keywordWasUnsure && aiPickedRealDoc)) {
          const documentType = deriveCoarseType(
            resp.result.documentName,
            resp.result.category
          );
          updated[i] = {
            ...p,
            documentType,
            documentName: resp.result.documentName,
            documentCode: resp.result.documentCode,
            category: resp.result.category,
            confidence: aiConfidence,
            reason: `AI suggestion (likely document type): ${resp.result.reason}`,
            needsReview: aiConfidence < 85,
            source: "ai",
          };
          log(
            "ai_classification_used",
            `Page ${p.pageNumber}: keyword ${p.confidence}% → AI ${aiConfidence}% (${resp.result.documentName})`,
            {
              previousValue: `${p.documentName} (${p.confidence}%)`,
              newValue: `${resp.result.documentName} (${aiConfidence}%)`,
            }
          );
        } else {
          log(
            "ai_classification_used",
            `Page ${p.pageNumber}: AI did not improve confidence (${aiConfidence}% vs keyword ${p.confidence}%) — keyword result kept`
          );
        }
      } else if (resp.message) {
        log(
          "ai_classification_used",
          `Page ${p.pageNumber}: AI request failed — ${resp.message}`
        );
      }
    }

    if (aiUnavailable) {
      setAiConfigured(false);
      setAiConfiguredMessage(learnedMessage);
    } else if (aiSeen) {
      setAiConfigured(true);
      setAiConfiguredMessage(null);
    }
    return updated;
  };

  const onAnalyze = async () => {
    if (!file) return;
    setError(null);
    setSplitFiles([]);
    setFinalizeBlockedReason(null);
    setPhase("processing");
    isDemoRef.current = false;
    resetSteps();
    log("file_uploaded", `Uploaded ${file.name} (${Math.round(file.size / 1024)} KB)`);

    setExtractionWarning(null);

    try {
      setStep("reading", "active", "Loading PDF…");
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      sourceBytesRef.current = bytes;
      setStep("reading", "done");

      setStep("extracting", "active", "Reading text per page…");
      let pages = await extractPdfPageText({
        bytes,
        onPageProgress: (pageNumber, total) => {
          setStep("extracting", "active", `Page ${pageNumber} of ${total}`);
        },
      });
      setTotalPages(pages.length);

      // OCR fallback: any page with no extractable text is almost certainly a
      // scanned image. Without OCR every such page is classified "Unknown" and
      // the splitter collapses them into one big group — which is the bug the
      // user originally reported. We rasterize those pages and run Tesseract
      // locally; the recognised text feeds into the same classifier path.
      const isPageEmpty = (text: string) =>
        text.replace(/\s+/g, "").length < 20;
      const emptyPageNumbers = pages
        .filter((p) => isPageEmpty(p.text))
        .map((p) => p.pageNumber);

      if (emptyPageNumbers.length > 0 && ocrEnabled) {
        setStep(
          "extracting",
          "active",
          `Running OCR on ${emptyPageNumbers.length} image-only page(s)…`
        );
        try {
          const ocrResults = await ocrPdfPages({
            bytes,
            pageNumbers: emptyPageNumbers,
            onPageProgress: (_pageNumber, done, total) => {
              setStep(
                "extracting",
                "active",
                `OCR ${done} of ${total} image-only page(s)…`
              );
            },
          });
          const ocrByPage = new Map(
            ocrResults.map((r) => [r.pageNumber, r.text])
          );
          pages = pages.map((p) => {
            const ocred = ocrByPage.get(p.pageNumber);
            if (typeof ocred === "string" && ocred.length > p.text.length) {
              // Tesseract output is flattened — we don't get per-region
              // positions back from it. Mirror the full OCR text into
              // header/footer so the classifier can still find a form code or
              // a printed title anywhere on the page.
              return {
                ...p,
                text: ocred,
                headerText: ocred,
                footerText: ocred,
              };
            }
            return p;
          });
          const stillEmpty = pages.filter((p) => isPageEmpty(p.text)).length;
          if (stillEmpty > 0) {
            setExtractionWarning(
              `OCR completed but ${stillEmpty} of ${pages.length} page(s) still produced no readable text. Those pages may be too low-resolution or rotated; review them manually before approving.`
            );
          }
        } catch (ocrErr) {
          setExtractionWarning(
            `OCR failed (${ocrErr instanceof Error ? ocrErr.message : String(ocrErr)}). Pages without a text layer were left as Unknown — please review or upload a digital-original PDF.`
          );
        }
      } else if (emptyPageNumbers.length > 0 && !ocrEnabled) {
        setExtractionWarning(
          `${emptyPageNumbers.length} page(s) appear to be image-only. Turn on OCR (above the upload card) to read scanned pages, or upload a digital-original PDF.`
        );
      }

      const totalTextChars = pages.reduce(
        (sum, p) => sum + p.text.replace(/\s+/g, "").length,
        0
      );
      if (totalTextChars < 20) {
        setExtractionWarning(
          "Smart Document Center could not read any text from this PDF. The file appears to be image-only and OCR did not produce usable text — please OCR it externally and re-upload, or upload a digital-original PDF."
        );
      }

      setStep(
        "extracting",
        "done",
        `${pages.length} page${pages.length === 1 ? "" : "s"}`
      );

      setStep("detecting", "active", "Running keyword classifier…");
      let classifications: PageClassification[] = pages.map((p) =>
        classifyDocumentPage({
          pageNumber: p.pageNumber,
          text: p.text,
          headerText: p.headerText,
          footerText: p.footerText,
          marginText: p.marginText,
        })
      );

      const catalogHits = classifications.filter(
        (c) => c.documentName !== "Unknown" && c.documentName !== "Other"
      ).length;
      if (catalogHits > 0) {
        log(
          "catalog_match_found",
          `Document catalog produced matches on ${catalogHits} of ${classifications.length} page(s).`
        );
      }

      const textByPage = new Map<number, string>(
        pages.map((p) => [p.pageNumber, p.text])
      );
      classifications = await applyAiToLowConfidencePages(
        classifications,
        textByPage
      );

      setStep(
        "detecting",
        "done",
        `${classifications.filter((c) => c.documentName !== "Unknown").length} of ${classifications.length} page(s) classified`
      );

      setStep("grouping", "active");
      const detectedGroups = groupPages(classifications, {
        clientName: values.clientName,
        clientId: values.clientId || undefined,
        advisorName: values.advisorName || undefined,
      });
      setGroups(detectedGroups);
      setStep("grouping", "done", `${detectedGroups.length} group(s)`);

      setStep("review", "active");
      log(
        "document_analyzed",
        `Detected ${detectedGroups.length} document group(s) across ${pages.length} page(s)`
      );
      setStep("review", "done");
      setPhase("review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let friendly = msg;
      if (/password/i.test(msg) || /encrypted/i.test(msg)) {
        friendly =
          "This PDF is encrypted or password-protected. Please decrypt it before uploading.";
      } else if (/invalid pdf/i.test(msg) || /corrupt/i.test(msg)) {
        friendly = "Could not read the PDF — it may be corrupt or invalid.";
      }
      setError(friendly);
      setPhase("idle");
      resetSteps();
    }
  };

  const onLoadDemo = () => {
    setError(null);
    setSplitFiles([]);
    setFinalizeBlockedReason(null);
    isDemoRef.current = true;
    sourceBytesRef.current = null;
    const clientName = values.clientName.trim() || "Jane Smith";
    if (!values.clientName.trim()) {
      setValues((v) => ({ ...v, clientName }));
    }
    const demoGroups = buildDemoGroups({
      clientName,
      clientId: values.clientId || undefined,
      advisorName: values.advisorName || undefined,
    });
    setGroups(demoGroups);
    setTotalPages(DEMO_TOTAL_PAGES);
    setSteps(
      DEFAULT_STEPS.map((s) => ({
        ...s,
        status: "done" as const,
        detail: "Demo data",
      }))
    );
    log(
      "document_analyzed",
      `Loaded demo result: ${demoGroups.length} group(s), ${DEMO_TOTAL_PAGES} page(s)`
    );
    setPhase("review");
  };

  const recomputeGroupAfterEdit = (
    g: DocumentGroup,
    selection: DocumentTypePickerSelection
  ): DocumentGroup => {
    const newName = selection.documentName;
    const newCategory = selection.category;
    const catalogItem = findCatalogItemByName(newName);
    const newCode = selection.isCustom
      ? undefined
      : catalogItem?.documentCode ?? selection.documentCode;
    // Manual edits boost the group to "Ready" because the employee has
    // explicitly chosen the type. The reviewer-confirmation flag is cleared
    // — they must still click Approve Split to mark this group reviewed.
    const status = deriveStatusFromConfidence({
      documentName: newName,
      averageConfidence: Math.max(g.averageConfidence, 90),
      anyPageNeedsReview: false,
    });
    const documentType = deriveCoarseType(newName, newCategory);
    const suggestedFileName = buildSuggestedFileName({
      clientName: values.clientName || "Client",
      clientId: values.clientId || undefined,
      advisorName: values.advisorName || undefined,
      documentName: newName,
      documentCode: newCode,
      category: newCategory,
      startPage: g.startPage,
      endPage: g.endPage,
    });
    return {
      ...g,
      documentName: newName,
      documentCode: newCode,
      category: newCategory,
      documentType,
      averageConfidence: Math.max(g.averageConfidence, 90),
      status,
      needsReview: false,
      approved: false,
      source: "manual" as ClassificationSource,
      suggestedFileName,
      finalFileName: suggestedFileName,
      reason: `Document type manually changed by employee (${selection.isCustom ? "custom" : "catalog"} pick).`,
    };
  };

  const onApplyEdit = (selection: DocumentTypePickerSelection) => {
    if (!editingGroupId) return;
    const target = groups.find((g) => g.id === editingGroupId);
    if (!target) return;
    const previous = `${target.documentName}${target.documentCode ? ` (${target.documentCode})` : ""}`;
    const next = `${selection.documentName}${selection.documentCode ? ` (${selection.documentCode})` : ""}`;
    setGroups((prev) =>
      prev.map((g) => (g.id === editingGroupId ? recomputeGroupAfterEdit(g, selection) : g))
    );
    log(
      "document_type_changed",
      `Group ${editingGroupId.slice(0, 6)}: ${previous} → ${next}`,
      { previousValue: previous, newValue: next }
    );
    setEditingGroupId(null);
  };

  const onMarkOther = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;
    const previous = target.documentName;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? recomputeGroupAfterEdit(g, {
              documentName: "Other",
              category: "Other",
              isCustom: false,
            })
          : g
      )
    );
    log(
      "document_type_changed",
      `Group ${groupId.slice(0, 6)}: ${previous} → Other (manually marked)`,
      { previousValue: previous, newValue: "Other" }
    );
  };

  const onApproveGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, approved: true, needsReview: false, status: "Ready" }
          : g
      )
    );
    log("split_approved", `Group ${groupId.slice(0, 6)} confirmed by employee`);
  };

  const allGroupsSettled = useMemo(() => {
    return groups.every((g) => g.approved || !g.needsReview);
  }, [groups]);

  const unsureCount = useMemo(
    () => groups.filter((g) => g.documentName === UNSURE_DOCUMENT_NAME).length,
    [groups]
  );

  const onClickFinalize = () => {
    if (groups.length === 0) {
      setFinalizeBlockedReason("No detected documents to finalize.");
      return;
    }
    if (unsureCount > 0) {
      setFinalizeBlockedReason(
        `${unsureCount} group${unsureCount === 1 ? "" : "s"} marked Unsure — pick a document type (or mark Other) for each before finalizing.`
      );
      return;
    }
    if (!allGroupsSettled) {
      setFinalizeBlockedReason(
        "Some documents require review before finalizing. Approve or correct each group above."
      );
      return;
    }
    setFinalizeBlockedReason(null);
    setPinModalOpen(true);
  };

  const onConfirmPin = async (args: { employeeName: string; pin: string }) => {
    setPinModalOpen(false);
    log(
      "employee_pin_confirmed",
      `Employee ${args.employeeName} confirmed split for client ${values.clientName}`,
      { employeeName: args.employeeName }
    );

    try {
      let separated: SeparatedDocumentFile[] = [];
      if (isDemoRef.current || !sourceBytesRef.current) {
        separated = await buildDemoSplitFiles({ groups });
      } else {
        separated = await splitPdfIntoGroups({
          sourceBytes: sourceBytesRef.current,
          groups,
        });
      }
      setSplitFiles(separated);
      log(
        "final_documents_generated",
        `Generated ${separated.length} separated PDF(s)`,
        { employeeName: args.employeeName }
      );
      setPhase("finalized");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Splitting failed: ${msg}`);
    }
  };

  const onFileNameChange = (fileId: string, newName: string) => {
    let previous = "";
    setSplitFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        previous = f.fileName;
        return { ...f, fileName: newName };
      })
    );
    setGroups((prev) =>
      prev.map((g) =>
        g.id === fileId ? { ...g, finalFileName: newName } : g
      )
    );
    if (newName !== previous) {
      log(
        "file_name_changed",
        `Renamed file ${previous} → ${newName}`,
        { previousValue: previous, newValue: newName }
      );
    }
  };

  const onResetAllFileNames = () => {
    setSplitFiles((prev) =>
      prev.map((f) => {
        const g = groups.find((x) => x.id === f.id);
        const reset = g?.suggestedFileName ?? f.fileName;
        return { ...f, fileName: reset };
      })
    );
    setGroups((prev) =>
      prev.map((g) => ({ ...g, finalFileName: g.suggestedFileName }))
    );
    log("file_name_changed", "All file names reset to suggested defaults.");
  };

  const onApplyTemplate = (template: string, autoFormat: boolean) => {
    const updates: { id: string; rendered: string }[] = [];
    for (const g of groups) {
      const rendered = renderFilenameTemplate(
        template,
        {
          clientName: values.clientName || "Client",
          clientId: values.clientId || undefined,
          advisorName: values.advisorName || undefined,
          documentName: g.documentName,
          documentCode: g.documentCode,
          category: g.category,
          startPage: g.startPage,
          endPage: g.endPage,
          date: new Date().toISOString().slice(0, 10),
        },
        { autoFormat }
      );
      updates.push({ id: g.id, rendered });
    }
    const updateMap = new Map(updates.map((u) => [u.id, u.rendered]));
    setSplitFiles((prev) =>
      prev.map((f) =>
        updateMap.has(f.id) ? { ...f, fileName: updateMap.get(f.id)! } : f
      )
    );
    setGroups((prev) =>
      prev.map((g) =>
        updateMap.has(g.id)
          ? { ...g, finalFileName: updateMap.get(g.id)! }
          : g
      )
    );
    log(
      "batch_template_applied",
      `Applied naming template to ${updates.length} file(s).`,
      { newValue: template }
    );
  };

  const onLogDownload = (kind: "all" | "selected", count: number) => {
    if (count === 0) return;
    log(
      kind === "all" ? "downloaded_all" : "downloaded_selected",
      kind === "all"
        ? `Downloaded all (${count}) separated file(s).`
        : `Downloaded ${count} selected file(s).`
    );
  };

  const showProcessing = phase === "processing";
  const showReview = phase === "review" || phase === "finalized";
  const showResults = phase === "finalized" && splitFiles.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <DocumentUploadCard
        values={values}
        onValuesChange={setValues}
        file={file}
        onFileChange={(f) => {
          setFile(f);
          setError(null);
        }}
        onAnalyze={onAnalyze}
        onLoadDemo={onLoadDemo}
        isProcessing={showProcessing}
        error={error}
        showDemoButton={isDevelopment}
      />

      <AIClassificationToggle
        enabled={aiEnabled}
        onChange={handleAiToggle}
        disabled={showProcessing}
        configuredMessage={aiConfiguredMessage}
        isConfiguredKnown={aiConfigured !== null}
        isConfigured={aiConfigured}
      />

      <OcrToggle
        enabled={ocrEnabled}
        onChange={setOcrEnabled}
        disabled={showProcessing}
      />

      {extractionWarning && (showReview || showProcessing) && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Text extraction notice</p>
            <p className="mt-0.5 text-amber-800">{extractionWarning}</p>
          </div>
        </div>
      )}

      {phase === "idle" && <EmptyState />}

      {showProcessing && <ProcessingSteps steps={steps} />}

      {showReview && (
        <>
          <MissingDocumentWarnings missing={missing} duplicates={duplicates} />

          <ReviewTable
            groups={groups}
            onEditType={(id) => setEditingGroupId(id)}
            onMarkOther={onMarkOther}
            onApprove={onApproveGroup}
            onPreview={(id) => setPreviewGroupId(id)}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  Finalize Split
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Detected {groups.length} document group{groups.length === 1 ? "" : "s"}{" "}
                  across {totalPages} page{totalPages === 1 ? "" : "s"}.{" "}
                  Confirm with your employee PIN to generate the separated
                  PDFs.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={startOver}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Start Over
                </button>
                <button
                  type="button"
                  onClick={onClickFinalize}
                  disabled={phase === "finalized"}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {phase === "finalized"
                    ? "Finalized"
                    : "Finalize & Save Separated Documents"}
                </button>
              </div>
            </div>

            {finalizeBlockedReason && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>{finalizeBlockedReason}</span>
              </div>
            )}
          </section>
        </>
      )}

      {showResults && (
        <SplitResults
          files={splitFiles}
          groups={groups}
          clientName={values.clientName}
          clientId={values.clientId || undefined}
          advisorName={values.advisorName || undefined}
          onFileNameChange={onFileNameChange}
          onResetAll={onResetAllFileNames}
          onApplyTemplate={onApplyTemplate}
          onLogDownload={onLogDownload}
        />
      )}

      <AuditLogPanel entries={auditEntries} />

      <PreviewModal
        group={previewGroup}
        onClose={() => setPreviewGroupId(null)}
        onEditType={(id) => setEditingGroupId(id)}
      />

      <DocumentTypePickerModal
        open={editingGroup !== null}
        initial={
          editingGroup
            ? {
                documentName: editingGroup.documentName,
                documentCode: editingGroup.documentCode,
                category: editingGroup.category,
              }
            : undefined
        }
        onCancel={() => setEditingGroupId(null)}
        onConfirm={onApplyEdit}
      />

      <ApprovalPinModal
        open={pinModalOpen}
        defaultEmployeeName={values.advisorName}
        onCancel={() => setPinModalOpen(false)}
        onConfirm={onConfirmPin}
      />

      {/* Keep AUDIT_ACTION_LABEL in the bundle's tree-shaking graph. */}
      <span className="hidden">{Object.keys(AUDIT_ACTION_LABEL).length}</span>
    </div>
  );
}

/**
 * Build placeholder PDFs for the demo flow so the Download buttons in
 * SplitResults still produce valid (single blank-page) PDFs.
 */
async function buildDemoSplitFiles(args: {
  groups: DocumentGroup[];
}): Promise<SeparatedDocumentFile[]> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const results: SeparatedDocumentFile[] = [];
  for (const group of args.groups) {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const pn of group.pageNumbers) {
      const page = pdf.addPage([612, 792]);
      page.drawText(`DEMO — ${group.documentName}`, {
        x: 50,
        y: 740,
        size: 16,
        font,
        color: rgb(0, 0.43, 0.43),
      });
      page.drawText(`Category: ${group.category}`, {
        x: 50,
        y: 715,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(`Page ${pn}`, {
        x: 50,
        y: 695,
        size: 11,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(
        "This is a demo placeholder PDF generated by Smart Document Intake.",
        { x: 50, y: 670, size: 11, font, color: rgb(0.3, 0.3, 0.3) }
      );
    }
    const bytes = await pdf.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    const sanitized = sanitizeFileName(
      group.finalFileName || group.suggestedFileName
    );
    results.push({
      id: group.id,
      fileName: sanitized,
      documentName: group.documentName,
      documentCode: group.documentCode,
      category: group.category,
      documentType: group.documentType,
      startPage: group.startPage,
      endPage: group.endPage,
      pageCount: group.pageNumbers.length,
      blobUrl,
      status: group.status,
    });
  }
  return results;
}
