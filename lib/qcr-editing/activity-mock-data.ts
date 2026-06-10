import { createActivityEvent } from "./activity-utils";
import type { ActivityEvent, ActivityEventType } from "./activity-types";
import { WORKSPACE_USERS } from "./users";

const MOCK_INSURERS = ["ICICI Lombard", "HDFC ERGO", "New India Assurance"] as const;

const MOCK_CLAUSES = [
  "Escalation Clause",
  "Terrorism Cover",
  "Earthquake Cover",
  "Debris Removal",
  "Business Interruption",
  "Claims Preparation Costs",
  "Waiver of Underinsurance",
  "Storm Damage",
  "Machinery Breakdown",
  "Temporary Removal",
] as const;

function daysAgo(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function evt(
  projectId: string,
  userId: string,
  date: string,
  type: ActivityEventType,
  clause: string,
  insurer: string,
  field: string,
  old_value: string,
  new_value: string,
  id: string
): ActivityEvent {
  return createActivityEvent({
    id,
    project_id: projectId,
    user_id: userId,
    date,
    type,
    clause,
    insurer,
    field,
    old_value,
    new_value,
  });
}

/** Minimum 25 realistic audit events for demo (newest first when consumed). */
export function generateMockActivityEvents(projectId: string): ActivityEvent[] {
  const rahul = WORKSPACE_USERS[0].id;
  const priya = WORKSPACE_USERS[1].id;
  const anita = WORKSPACE_USERS[2].id;
  const vikram = WORKSPACE_USERS[3].id;

  const raw: ActivityEvent[] = [
    evt(projectId, rahul, daysAgo(0, 14, 22), "FIELD_UPDATED", "Escalation Clause", "ICICI Lombard", "status", "Partially Agreed", "Agreed", "evt_mock_001"),
    evt(projectId, priya, daysAgo(0, 11, 5), "FIELD_UPDATED", "Terrorism Cover", "HDFC ERGO", "proposal_clause", "Included with sub-limit", "Included", "evt_mock_002"),
    evt(projectId, anita, daysAgo(1, 16, 40), "BROKER_NOTE_ADDED", "Earthquake Cover", "New India Assurance", "broker_note", "—", "Client requires full EQ cover — push for inclusion.", "evt_mock_003"),
    evt(projectId, vikram, daysAgo(1, 10, 15), "AI_OVERRIDE_APPLIED", "Debris Removal", "ICICI Lombard", "override_status", "None", "Partially Agreed", "evt_mock_004"),
    evt(projectId, rahul, daysAgo(2, 9, 30), "FIELD_UPDATED", "Business Interruption", "HDFC ERGO", "gap_score", "41", "28", "evt_mock_005"),
    evt(projectId, priya, daysAgo(2, 15, 0), "CLAUSE_REVIEWED", "Claims Preparation Costs", "ICICI Lombard", "reviewed", "Not reviewed", "Reviewed", "evt_mock_006"),
    evt(projectId, anita, daysAgo(3, 11, 20), "FIELD_UPDATED", "Waiver of Underinsurance", "New India Assurance", "status", "Not Agreed", "Partially Agreed", "evt_mock_007"),
    evt(projectId, vikram, daysAgo(3, 14, 55), "BROKER_NOTE_UPDATED", "Storm Damage", "HDFC ERGO", "broker_note", "Check sub-limit wording.", "Aligned with RFQ — no sub-limit.", "evt_mock_008"),
    evt(projectId, rahul, daysAgo(4, 10, 10), "FIELD_UPDATED", "Machinery Breakdown", "ICICI Lombard", "proposal_clause", "₹8 Cr", "₹10 Cr", "evt_mock_009"),
    evt(projectId, priya, daysAgo(4, 16, 45), "AI_OVERRIDE_REMOVED", "Temporary Removal", "New India Assurance", "override_status", "Agreed", "None", "evt_mock_010"),
    evt(projectId, anita, daysAgo(5, 9, 0), "FIELD_UPDATED", "Escalation Clause", "HDFC ERGO", "gap_score", "22", "8", "evt_mock_011"),
    evt(projectId, vikram, daysAgo(5, 13, 30), "FIELD_UPDATED", "Terrorism Cover", "ICICI Lombard", "differences", "Requested Included\nModified insurer terms", "None", "evt_mock_012"),
    evt(projectId, rahul, daysAgo(6, 11, 50), "CLAUSE_UNREVIEWED", "Debris Removal", "HDFC ERGO", "reviewed", "Reviewed", "Not reviewed", "evt_mock_013"),
    evt(projectId, priya, daysAgo(6, 15, 20), "FIELD_UPDATED", "Earthquake Cover", "ICICI Lombard", "status", "Not Agreed", "Partially Agreed", "evt_mock_014"),
    evt(projectId, anita, daysAgo(7, 10, 5), "BROKER_NOTE_ADDED", "Business Interruption", "ICICI Lombard", "broker_note", "—", "24-month BI critical for client board approval.", "evt_mock_015"),
    evt(projectId, vikram, daysAgo(7, 14, 0), "FIELD_UPDATED", "Claims Preparation Costs", "New India Assurance", "proposal_clause", "₹15 Lakhs", "₹25 Lakhs", "evt_mock_016"),
    evt(projectId, rahul, daysAgo(8, 9, 40), "AI_OVERRIDE_APPLIED", "Waiver of Underinsurance", "HDFC ERGO", "override_status", "None", "Agreed", "evt_mock_017"),
    evt(projectId, priya, daysAgo(8, 16, 10), "FIELD_UPDATED", "Storm Damage", "New India Assurance", "status", "Partially Agreed", "Agreed", "evt_mock_018"),
    evt(projectId, anita, daysAgo(9, 11, 0), "FIELD_UPDATED", "Machinery Breakdown", "HDFC ERGO", "gap_score", "12", "2", "evt_mock_019"),
    evt(projectId, vikram, daysAgo(9, 13, 45), "BROKER_NOTE_UPDATED", "Escalation Clause", "New India Assurance", "broker_note", "Awaiting revised terms.", "15% escalation confirmed in email.", "evt_mock_020"),
    evt(projectId, rahul, daysAgo(10, 10, 30), "FIELD_UPDATED", "Temporary Removal", "ICICI Lombard", "proposal_clause", "45 Days", "60 Days", "evt_mock_021"),
    evt(projectId, priya, daysAgo(10, 15, 55), "CLAUSE_REVIEWED", "Terrorism Cover", "New India Assurance", "reviewed", "Not reviewed", "Reviewed", "evt_mock_022"),
    evt(projectId, anita, daysAgo(11, 9, 15), "FIELD_UPDATED", "Debris Removal", "ICICI Lombard", "status", "Not Agreed", "Partially Agreed", "evt_mock_023"),
    evt(projectId, vikram, daysAgo(11, 14, 20), "FIELD_UPDATED", "Business Interruption", "New India Assurance", "differences", "Requested 24 Months\nReduced coverage", "Requested 24 Months\nMinor deviation", "evt_mock_024"),
    evt(projectId, rahul, daysAgo(12, 11, 40), "FIELD_UPDATED", "Escalation Clause", "ICICI Lombard", "proposal_clause", "20%", "25%", "evt_mock_025"),
    evt(projectId, priya, daysAgo(12, 16, 0), "AI_OVERRIDE_REMOVED", "Claims Preparation Costs", "ICICI Lombard", "override_status", "Agreed", "None", "evt_mock_026"),
    evt(projectId, anita, daysAgo(13, 10, 0), "FIELD_UPDATED", "Waiver of Underinsurance", "ICICI Lombard", "gap_score", "18", "3", "evt_mock_027"),
    evt(projectId, vikram, daysAgo(13, 13, 10), "BROKER_NOTE_ADDED", "Machinery Breakdown", "HDFC ERGO", "broker_note", "—", "Recommend matching ₹10 Cr MB limit across panel.", "evt_mock_028"),
  ];

  // Spread insurers/clauses for variety in any UI slice
  void MOCK_INSURERS;
  void MOCK_CLAUSES;

  return raw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
