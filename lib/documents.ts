export const DOCUMENT_TYPES = ["KYC", "ID Verification", "CRQ"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["valid", "expiring", "expired"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface ClientDocument {
  id: string;
  clientId: string;
  type: DocumentType;
  status: DocumentStatus;
  expiryDate: string; // ISO YYYY-MM-DD
}

// Today is 2026-04-29 in this environment.
// "expiring" = within ~30 days; "expired" = past expiry date.
export const MOCK_DOCUMENTS: readonly ClientDocument[] = [
  // Sarah Chen — one expiring (medium priority)
  {
    id: "doc-001",
    clientId: "11111111-1111-1111-1111-111111111111",
    type: "KYC",
    status: "expiring",
    expiryDate: "2026-05-15",
  },
  {
    id: "doc-002",
    clientId: "11111111-1111-1111-1111-111111111111",
    type: "ID Verification",
    status: "valid",
    expiryDate: "2027-08-10",
  },

  // James Patel — ID expired (high priority)
  {
    id: "doc-003",
    clientId: "22222222-2222-2222-2222-222222222222",
    type: "ID Verification",
    status: "expired",
    expiryDate: "2026-02-28",
  },
  {
    id: "doc-004",
    clientId: "22222222-2222-2222-2222-222222222222",
    type: "KYC",
    status: "valid",
    expiryDate: "2027-01-15",
  },

  // Maria Rodriguez — CRQ expiring (medium)
  {
    id: "doc-005",
    clientId: "33333333-3333-3333-3333-333333333333",
    type: "KYC",
    status: "valid",
    expiryDate: "2027-06-20",
  },
  {
    id: "doc-006",
    clientId: "33333333-3333-3333-3333-333333333333",
    type: "CRQ",
    status: "expiring",
    expiryDate: "2026-05-25",
  },

  // David Kim — all valid (no refresh needed)
  {
    id: "doc-007",
    clientId: "44444444-4444-4444-4444-444444444444",
    type: "KYC",
    status: "valid",
    expiryDate: "2027-11-30",
  },
  {
    id: "doc-008",
    clientId: "44444444-4444-4444-4444-444444444444",
    type: "ID Verification",
    status: "valid",
    expiryDate: "2027-09-15",
  },

  // Emma Thompson — KYC + ID both expired (high priority, multi-doc)
  {
    id: "doc-009",
    clientId: "55555555-5555-5555-5555-555555555555",
    type: "KYC",
    status: "expired",
    expiryDate: "2026-01-10",
  },
  {
    id: "doc-010",
    clientId: "55555555-5555-5555-5555-555555555555",
    type: "ID Verification",
    status: "expired",
    expiryDate: "2025-12-05",
  },
  {
    id: "doc-011",
    clientId: "55555555-5555-5555-5555-555555555555",
    type: "CRQ",
    status: "valid",
    expiryDate: "2027-02-15",
  },
];
