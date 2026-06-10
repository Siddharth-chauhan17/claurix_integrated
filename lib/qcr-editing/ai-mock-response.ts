/**
 * Raw AI orchestration output (clause-grouped) — shape returned before UI normalization.
 * Replace this array when wiring real cofounder AI; keep normalizeAiClauses() stable.
 */

import type { ClauseSource } from "./types";

export type AiInsurerComparisonRaw = {
  insurer: string;
  proposal_clause: string;
  status: string;
  gap_score: number;
  differences?: string[];
  broker_note?: string;
};

export type AiClauseComparisonRaw = {
  rfq_clause: string;
  rfq_requirement: string;
  comparisons: AiInsurerComparisonRaw[];
  source?: ClauseSource;
  /** Insurance policy line (gap-analysis); drives sidebar sections when present. */
  policy_name?: string;
};

const MOCK_SOURCE_SHEET = "RFQ Package Policy";
const MOCK_SOURCE_BASE_ROW = 88;

/** Attach deterministic Excel source metadata for dev / mock AI responses. */
export function withMockSourceMetadata(
  clauses: AiClauseComparisonRaw[]
): AiClauseComparisonRaw[] {
  return clauses.map((clause, index) => {
    const row = MOCK_SOURCE_BASE_ROW + index;
    return {
      ...clause,
      source: {
        file_name: "RFQ_Property_Comparison.xlsx",
        sheet_name: MOCK_SOURCE_SHEET,
        excel_row: row,
        clause_cell: `B${row}`,
        requirement_cell: `C${row}`,
        uw_remark_cell: `F${row}`,
      },
    };
  });
}

export const DEFAULT_QCR_INSURERS = [
  "ICICI Lombard",
  "HDFC ERGO",
  "New India Assurance",
] as const;

/** Mock AI response — 20 clauses × 3 insurers (fully populated). */
export const AI_MOCK_CLAUSE_RESPONSE: AiClauseComparisonRaw[] = [
  {
    rfq_clause: "Escalation Clause",
    rfq_requirement: "25%",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Escalation Clause",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Escalation Clause",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested 25%", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Escalation Clause",
        status: "Agreed",
        gap_score: 0.01,
        differences: [],
      },
    ],
  },
  {
    rfq_clause: "Terrorism Cover",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Terrorism Cover",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Terrorism Cover",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Terrorism Cover",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Included", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Earthquake Cover",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Earthquake Cover",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Earthquake Cover",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested Included", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Earthquake Cover",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Included", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Flood & Inundation",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Flood & Inundation",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Flood & Inundation",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested Included", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Flood & Inundation",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Included", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Storm Damage",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Storm Damage",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Storm Damage",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Storm Damage",
        status: "Agreed",
        gap_score: 0.01,
        differences: [],
      },
    ],
  },
  {
    rfq_clause: "Debris Removal",
    rfq_requirement: "15%",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Debris Removal",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested 15%", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Debris Removal",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested 15%", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Debris Removal",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 15%", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Professional Fees",
    rfq_requirement: "10%",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Professional Fees",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Professional Fees",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested 10%", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Professional Fees",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 10%", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Architects Fees",
    rfq_requirement: "Covered",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Architects Fees",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested Covered", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Architects Fees",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Architects Fees",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Covered", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Spontaneous Combustion",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Spontaneous Combustion",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Spontaneous Combustion",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested Included", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Spontaneous Combustion",
        status: "Agreed",
        gap_score: 0.01,
        differences: [],
      },
    ],
  },
  {
    rfq_clause: "Impact Damage",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Impact Damage",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Impact Damage",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested Included", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Impact Damage",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Included", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Machinery Breakdown",
    rfq_requirement: "₹10 Cr",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Machinery Breakdown",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested ₹10 Cr", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Machinery Breakdown",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Machinery Breakdown",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested ₹10 Cr", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Business Interruption",
    rfq_requirement: "24 Months",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Business Interruption",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested 24 Months", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Business Interruption",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested 24 Months", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Business Interruption",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 24 Months", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Automatic Asset Addition",
    rfq_requirement: "10%",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Automatic Asset Addition",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Automatic Asset Addition",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested 10%", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Automatic Asset Addition",
        status: "Agreed",
        gap_score: 0.01,
        differences: [],
      },
    ],
  },
  {
    rfq_clause: "Transit Insurance",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Transit Insurance",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Transit Insurance",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Transit Insurance",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Included", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Temporary Removal",
    rfq_requirement: "60 Days",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Temporary Removal",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested 60 Days", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Temporary Removal",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested 60 Days", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Temporary Removal",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 60 Days", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Loss of Rent",
    rfq_requirement: "Covered",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Loss of Rent",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Loss of Rent",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested Covered", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Loss of Rent",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested Covered", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Burglary Coverage",
    rfq_requirement: "Included",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Burglary Coverage",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested Included", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Burglary Coverage",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Burglary Coverage",
        status: "Agreed",
        gap_score: 0.01,
        differences: [],
      },
    ],
  },
  {
    rfq_clause: "Claims Preparation Costs",
    rfq_requirement: "₹25 Lakhs",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Claims Preparation Costs",
        status: "Not Agreed",
        gap_score: 0.88,
        differences: ["Requested ₹25 Lakhs", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Claims Preparation Costs",
        status: "Partially Agreed",
        gap_score: 0.41,
        differences: ["Requested ₹25 Lakhs", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Claims Preparation Costs",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested ₹25 Lakhs", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Waiver of Underinsurance",
    rfq_requirement: "15%",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Waiver of Underinsurance",
        status: "Agreed",
        gap_score: 0.03,
        differences: [],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Waiver of Underinsurance",
        status: "Partially Agreed",
        gap_score: 0.22,
        differences: ["Requested 15%", "Minor deviation"],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Waiver of Underinsurance",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 15%", "Reduced coverage"],
      },
    ],
  },
  {
    rfq_clause: "Claim Settlement Timeline",
    rfq_requirement: "15 Working Days",
    comparisons: [
      {
        insurer: "ICICI Lombard",
        proposal_clause: "ICICI terms for Claim Settlement Timeline",
        status: "Partially Agreed",
        gap_score: 0.32,
        differences: ["Requested 15 Working Days", "Modified insurer terms"],
      },
      {
        insurer: "HDFC ERGO",
        proposal_clause: "HDFC terms for Claim Settlement Timeline",
        status: "Agreed",
        gap_score: 0.02,
        differences: [],
      },
      {
        insurer: "New India Assurance",
        proposal_clause: "New India terms for Claim Settlement Timeline",
        status: "Partially Agreed",
        gap_score: 0.27,
        differences: ["Requested 15 Working Days", "Reduced coverage"],
      },
    ],
  },
];

/** Mock clauses with Excel source metadata for Source verification UI. */
export const AI_MOCK_CLAUSE_RESPONSE_WITH_SOURCE = withMockSourceMetadata(
  AI_MOCK_CLAUSE_RESPONSE
);
