/**
 * Realistic property insurance QCR mock — 20 RFQ clauses × 3 insurers.
 * Simulates agreed / partial / not agreed with varied gap scores.
 */

import type { ClauseComparison, QcrSectionId, QcrWorkspace } from "./types";

export const MOCK_INSURERS = [
  "ICICI Lombard",
  "HDFC ERGO",
  "New India Assurance",
] as const;

function cmp(
  insurer: string,
  proposal: string,
  status: "agreed" | "partially_agreed" | "not_agreed" | "not_applicable",
  gap: number,
  differences: string[],
  note = ""
) {
  return {
    insurer,
    proposal_clause: proposal,
    status,
    gap_score: gap,
    differences,
    broker_note: note,
    override_status: null,
    reviewed: false,
    ai_explanation: "",
  };
}

function clause(
  section_id: QcrSectionId,
  data: Omit<
    ClauseComparison,
    "section_id" | "broker_remark" | "final_recommendation" | "review_status"
  >
): ClauseComparison {
  return {
    section_id,
    broker_remark: "",
    final_recommendation: null,
    review_status: "not_reviewed",
    ...data,
  };
}

const CLAUSES: ClauseComparison[] = [
  clause("property_damage", {
    clause_id: "c01_sum_insured_building",
    rfq_clause: "Sum Insured — Building",
    rfq_requirement:
      "Reinstatement value of building including plinth & foundation: ₹85 Cr as per valuation report dated Jan 2026.",
    comparisons: [
      cmp("ICICI Lombard", "₹85 Cr — reinstatement basis per attached valuation.", "agreed", 0, []),
      cmp("HDFC ERGO", "₹82 Cr building SI — 3.5% below RFQ valuation.", "partially_agreed", 18, [
        "SI ₹3 Cr lower than RFQ reinstatement value",
      ]),
      cmp("New India Assurance", "₹85 Cr on reinstatement; escalation 10% YoY cap.", "agreed", 4, [
        "Escalation cap not requested in RFQ",
      ]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c02_sum_insured_plant",
    rfq_clause: "Sum Insured — Plant & Machinery",
    rfq_requirement: "P&M at replacement value: ₹42 Cr (break-up per annexure).",
    comparisons: [
      cmp("ICICI Lombard", "₹42 Cr replacement value — annexure matched.", "agreed", 0, []),
      cmp("HDFC ERGO", "₹40 Cr P&M — excludes CNC line item ₹2 Cr.", "not_agreed", 42, [
        "CNC machinery excluded",
        "₹2 Cr under-insurance vs RFQ",
      ]),
      cmp("New India Assurance", "₹42 Cr incl. foundations where fixed.", "partially_agreed", 12, [
        "Foundations coverage qualified",
      ]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c03_sfsp",
    rfq_clause: "Standard Fire & Special Perils (SFSP)",
    rfq_requirement:
      "SFSP as per standard market wording — fire, lightning, explosion, riot, strike, malicious damage.",
    comparisons: [
      cmp("ICICI Lombard", "SFSP — standard IIBI wordings with RSMD.", "agreed", 0, []),
      cmp("HDFC ERGO", "SFSP — RSMD sub-limited to ₹50L per occurrence.", "partially_agreed", 22, [
        "RSMD sub-limit vs unlimited RFQ expectation",
      ]),
      cmp("New India Assurance", "SFSP — malicious damage excluded.", "not_agreed", 55, [
        "Malicious damage excluded vs RFQ requirement",
      ]),
    ],
  }),
  clause("extensions", {
    clause_id: "c04_earthquake",
    rfq_clause: "Earthquake (EQ) Extension",
    rfq_requirement: "EQ cover mandatory — Zone III, full policy SI, no sub-limit.",
    comparisons: [
      cmp("ICICI Lombard", "EQ Zone III — full SI, no sub-limit.", "agreed", 0, []),
      cmp("HDFC ERGO", "EQ Zone III — 20% of building SI sub-limit.", "not_agreed", 48, [
        "20% sub-limit on building SI",
      ]),
      cmp("New India Assurance", "EQ Zone III — 15% aggregate sub-limit.", "not_agreed", 52, [
        "Aggregate EQ sub-limit 15%",
      ]),
    ],
  }),
  clause("extensions", {
    clause_id: "c05_stfi",
    rfq_clause: "STFI (Storm, Tempest, Flood, Inundation)",
    rfq_requirement: "STFI included without sub-limit; flood prone area endorsement acceptable.",
    comparisons: [
      cmp("ICICI Lombard", "STFI — full SI, no sub-limit.", "agreed", 0, []),
      cmp("HDFC ERGO", "STFI — ₹1 Cr per event sub-limit.", "partially_agreed", 28, [
        "Per event sub-limit ₹1 Cr",
      ]),
      cmp("New India Assurance", "STFI included — 72 hrs clause applied.", "partially_agreed", 8, [
        "72 hours clause on flood events",
      ]),
    ],
  }),
  clause("extensions", {
    clause_id: "c06_terrorism",
    rfq_clause: "Terrorism Cover",
    rfq_requirement: "Terrorism cover inbuilt — no separate cap below 100% SI.",
    comparisons: [
      cmp("ICICI Lombard", "Terrorism — full policy limits.", "agreed", 0, []),
      cmp("HDFC ERGO", "Terrorism — excluded; available on buy-back.", "not_agreed", 60, [
        "Cover excluded by default",
      ]),
      cmp("New India Assurance", "Terrorism — ₹5 Cr aggregate cap.", "partially_agreed", 35, [
        "Aggregate cap below full SI",
      ]),
    ],
  }),
  clause("business_interruption", {
    clause_id: "c07_rent_alt_accommodation",
    rfq_clause: "Rent for Alternative Accommodation",
    rfq_requirement: "12 months rent @ ₹8L/month (₹96L total) following insured damage.",
    comparisons: [
      cmp("ICICI Lombard", "12 months @ ₹8L/month — total ₹96L.", "agreed", 0, []),
      cmp("HDFC ERGO", "6 months @ ₹8L/month.", "partially_agreed", 25, ["Period 6 months vs 12 months RFQ"]),
      cmp("New India Assurance", "12 months @ ₹6L/month.", "partially_agreed", 20, ["Rate ₹6L vs ₹8L RFQ"]),
    ],
  }),
  clause("extensions", {
    clause_id: "c08_debris_removal",
    rfq_clause: "Debris Removal",
    rfq_requirement: "10% of claim amount, minimum ₹50L, maximum ₹2 Cr.",
    comparisons: [
      cmp("ICICI Lombard", "10% of claim; min ₹50L / max ₹2 Cr.", "agreed", 0, []),
      cmp("HDFC ERGO", "5% of claim; max ₹1 Cr.", "not_agreed", 38, ["Percentage and cap below RFQ"]),
      cmp("New India Assurance", "10% of claim; max ₹1.5 Cr.", "partially_agreed", 15, ["Max ₹1.5 Cr vs ₹2 Cr"]),
    ],
  }),
  clause("extensions", {
    clause_id: "c09_professional_fees",
    rfq_clause: "Architects / Surveyors Fees",
    rfq_requirement: "5% of claim, max ₹75L for architects, surveyors, consulting engineers.",
    comparisons: [
      cmp("ICICI Lombard", "5% fees — max ₹75L.", "agreed", 0, []),
      cmp("HDFC ERGO", "3% fees — max ₹50L.", "partially_agreed", 22, ["Lower % and cap"]),
      cmp("New India Assurance", "5% fees — max ₹60L.", "partially_agreed", 10, ["Cap ₹60L vs ₹75L"]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c10_deductible_standard",
    rfq_clause: "Deductible — Standard (non-EQ)",
    rfq_requirement: "₹5,00,000 each & every loss for property damage (non-EQ).",
    comparisons: [
      cmp("ICICI Lombard", "₹5,00,000 each & every loss.", "agreed", 0, []),
      cmp("HDFC ERGO", "₹7,50,000 each & every loss.", "partially_agreed", 14, ["Higher deductible"]),
      cmp("New India Assurance", "₹5,00,000 — 2 claims aggregate waiver N/A.", "agreed", 2, []),
    ],
  }),
  clause("property_damage", {
    clause_id: "c11_deductible_eq",
    rfq_clause: "Deductible — Earthquake",
    rfq_requirement: "2% of building SI subject to minimum ₹10L per occurrence.",
    comparisons: [
      cmp("ICICI Lombard", "2% building SI; min ₹10L.", "agreed", 0, []),
      cmp("HDFC ERGO", "3% building SI; min ₹15L.", "not_agreed", 30, ["Higher % and minimum"]),
      cmp("New India Assurance", "2% total SI (building+P&M); min ₹10L.", "partially_agreed", 12, [
        "Base includes P&M not only building",
      ]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c12_stock_clause",
    rfq_clause: "Inventory / Stock Clause",
    rfq_requirement:
      "Stock at selling price; declaration-linked; max ₹18 Cr with floater across 3 locations.",
    comparisons: [
      cmp("ICICI Lombard", "₹18 Cr floater — 3 locations per RFQ.", "agreed", 0, []),
      cmp("HDFC ERGO", "₹16 Cr — 2 locations only.", "not_agreed", 40, ["Location count and SI shortfall"]),
      cmp("New India Assurance", "₹18 Cr — selling price; monthly declaration.", "agreed", 5, []),
    ],
  }),
  clause("property_damage", {
    clause_id: "c13_basis_valuation",
    rfq_clause: "Basis of Valuation",
    rfq_requirement: "Reinstatement value for building; replacement for P&M; selling price for stock.",
    comparisons: [
      cmp("ICICI Lombard", "Reinstatement / replacement / selling price as RFQ.", "agreed", 0, []),
      cmp("HDFC ERGO", "Indemnity basis for building unless add-on.", "not_agreed", 45, ["Indemnity vs reinstatement"]),
      cmp("New India Assurance", "Reinstatement — new for old on P&M.", "partially_agreed", 10, [
        "New for old broader than RFQ replacement",
      ]),
    ],
  }),
  clause("special_conditions", {
    clause_id: "c14_public_authorities",
    rfq_clause: "Public Authorities Clause",
    rfq_requirement: "Costs to comply with regulations after loss — limit ₹1 Cr.",
    comparisons: [
      cmp("ICICI Lombard", "Public authorities — ₹1 Cr.", "agreed", 0, []),
      cmp("HDFC ERGO", "Included in AOA — combined ₹75L.", "partially_agreed", 18, ["Lower combined limit"]),
      cmp("New India Assurance", "Not included — optional extension.", "not_agreed", 50, ["Cover not in base quote"]),
    ],
  }),
  clause("business_interruption", {
    clause_id: "c15_suppliers_customers",
    rfq_clause: "Suppliers / Customers Extension",
    rfq_requirement: "10% of stock SI for loss at key customer premises (named list).",
    comparisons: [
      cmp("ICICI Lombard", "10% stock SI — named customers attached.", "agreed", 0, []),
      cmp("HDFC ERGO", "5% stock SI — 2 customers only.", "partially_agreed", 24, ["% and named accounts"]),
      cmp("New India Assurance", "10% — suppliers only, customers excluded.", "not_agreed", 32, [
        "Customers extension missing",
      ]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c16_loss_minimization",
    rfq_clause: "Loss Minimization / Mitigation",
    rfq_requirement: "Insured entitled to reasonable costs to reduce loss — no sub-limit.",
    comparisons: [
      cmp("ICICI Lombard", "Reasonable mitigation costs — no sub-limit.", "agreed", 0, []),
      cmp("HDFC ERGO", "Mitigation — ₹25L sub-limit.", "partially_agreed", 20, ["Sub-limit introduced"]),
      cmp("New India Assurance", "Standard loss minimization wording.", "agreed", 3, []),
    ],
  }),
  clause("business_interruption", {
    clause_id: "c17_territory",
    rfq_clause: "Territory / Jurisdiction",
    rfq_requirement: "India only — including transit within India up to ₹50L per dispatch.",
    comparisons: [
      cmp("ICICI Lombard", "India + domestic transit ₹50L/dispatch.", "agreed", 0, []),
      cmp("HDFC ERGO", "India — transit excluded.", "partially_agreed", 28, ["Domestic transit excluded"]),
      cmp("New India Assurance", "India — transit ₹25L/dispatch.", "partially_agreed", 15, ["Transit limit halved"]),
    ],
  }),
  clause("special_conditions", {
    clause_id: "c18_mortgagee",
    rfq_clause: "Mortgagee Clause",
    rfq_requirement: "HDFC Bank Ltd listed as mortgagee — loss payable clause as per bank format.",
    comparisons: [
      cmp("ICICI Lombard", "HDFC Bank — standard loss payable.", "agreed", 0, []),
      cmp("HDFC ERGO", "HDFC Bank — mortgagee clause attached.", "agreed", 0, []),
      cmp("New India Assurance", "Mortgagee — bank name TBA.", "not_agreed", 40, ["Bank not named in quote"]),
    ],
  }),
  clause("property_damage", {
    clause_id: "c19_72_hours",
    rfq_clause: "72 Hours Clause (Flood)",
    rfq_requirement: "Waiver of 72-hour clause for flood/STFI where continuous period provable.",
    comparisons: [
      cmp("ICICI Lombard", "72-hour clause waived for flood/STFI.", "agreed", 0, []),
      cmp("HDFC ERGO", "72-hour clause applies — no waiver.", "not_agreed", 35, ["Waiver not granted"]),
      cmp("New India Assurance", "72-hour — 96 hours for flood.", "partially_agreed", 12, ["96h vs waiver RFQ"]),
    ],
  }),
  clause("special_conditions", {
    clause_id: "c20_premium_payment",
    rfq_clause: "Premium & Payment Terms",
    rfq_requirement:
      "Target premium ₹18.5L + GST; 30-day credit from inception; no cancellation for non-payment <15 days.",
    comparisons: [
      cmp("ICICI Lombard", "₹18.2L + GST; 30-day credit.", "agreed", 6, ["Premium ₹30k below target"]),
      cmp("HDFC ERGO", "₹19.1L + GST; 15-day credit.", "partially_agreed", 22, ["Premium above target", "Shorter credit"]),
      cmp(
        "New India Assurance",
        "₹18.6L + GST; 30-day credit; 10-day cancellation notice.",
        "partially_agreed",
        14,
        ["Cancellation notice 10 days vs 15 RFQ"]
      ),
    ],
  }),
];

export const MOCK_QCR_WORKSPACE: QcrWorkspace = {
  workspace_id: "wrk_property_mumbai_2026",
  meta: {
    project_id: "prj_demo_property",
    project_name: "Mumbai Manufacturing Hub — Property FY26",
    client_name: "Apex Industrial Pvt Ltd",
    rfq_file_name: "Apex_Property_RFQ_2026.xlsx",
    generated_at: "2026-05-19T10:30:00.000Z",
    schema_version: "1.0",
  },
  insurers: [...MOCK_INSURERS],
  clauses: CLAUSES,
};
