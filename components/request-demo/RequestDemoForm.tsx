"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { submitDemoRequest, type DemoRequestPayload } from "@/lib/api";
import { DemoStepper } from "./DemoStepper";
import { RequestDemoSuccess } from "./RequestDemoSuccess";
import { ArrowRightIcon, ChevronDownIcon, LockIcon } from "./icons";

const jobRoles = [
  "Insurance Broker",
  "Placement Team",
  "Account Manager",
  "Operations",
  "Underwriter",
  "Leadership / Management",
  "Risk Consultant",
  "Other",
];

const qcrGenerationMethods = [
  "Fully manual in Excel",
  "Semi-manual with templates",
  "Internal software/workflow",
  "Outsourced process",
  "No standardized workflow",
];

const quoteVolumes = ["1–20", "20–50", "50–100", "100–500", "500+"];

const operationalChallenges = [
  "Comparing insurer deviations",
  "Manual data extraction",
  "Missed exclusions or clauses",
  "QCR turnaround time",
  "Standardization across teams",
  "Auditability & tracking",
  "Collaboration between teams",
  "Reducing manual effort",
];

const linesOfBusiness = [
  "Property",
  "Engineering",
  "Marine",
  "Liability",
  "Group Health",
  "Motor",
  "Misc Commercial Lines",
];

const reviewTeamSizes = ["1–5", "5–10", "10–25", "25+"];

const timeWindows = ["Morning", "Afternoon", "Evening"];

const demoTopics = [
  "Quote comparison workflow",
  "Deviation detection",
  "Human verification workflow",
  "QCR generation",
  "Workflow standardization",
  "Team collaboration",
  "Audit-ready reporting",
];

type FormData = {
  fullName: string;
  workEmail: string;
  companyName: string;
  jobRole: string;
  qcrGenerationMethod: string;
  monthlyQuoteVolume: string;
  operationalChallenges: string[];
  linesOfBusiness: string[];
  reviewTeamSize: string;
  preferredDemoDate: string;
  preferredTimeWindow: string;
  requestedDemoTopics: string[];
  additionalNotes: string;
  website: string;
};

const initialFormData: FormData = {
  fullName: "",
  workEmail: "",
  companyName: "",
  jobRole: "",
  qcrGenerationMethod: "",
  monthlyQuoteVolume: "",
  operationalChallenges: [],
  linesOfBusiness: [],
  reviewTeamSize: "",
  preferredDemoDate: "",
  preferredTimeWindow: "",
  requestedDemoTopics: [],
  additionalNotes: "",
  website: "",
};

const stepMeta = [
  {
    stepLabel: "Step 1 of 3",
    title: "Tell us about yourself",
  },
  {
    stepLabel: "Step 2 of 3",
    title: "Tell us about your workflow",
  },
  {
    stepLabel: "Step 3 of 3",
    title: "Schedule Your Workflow Assessment",
  },
];

export function RequestDemoForm() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayField(key: "operationalChallenges" | "linesOfBusiness" | "requestedDemoTopics", value: string) {
    setFormData((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (step === 1) {
      if (!e.currentTarget.checkValidity()) {
        e.currentTarget.reportValidity();
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const error = validateStepTwo(formData);
      if (error) {
        toast.error(error);
        return;
      }
      setStep(3);
      return;
    }

    const error = validateStepThree(formData);
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      await submitDemoRequest(toPayload(formData));
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  const meta = stepMeta[step - 1];

  if (submitted) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] sm:p-8 lg:p-10">
        <RequestDemoSuccess />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] sm:p-8 lg:p-10">
      <DemoStepper currentStep={step} />

      <p className="text-sm font-medium text-slate-500">{meta.stepLabel}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
        {meta.title}
      </h2>

      <form className="relative mt-8" onSubmit={handleSubmit} noValidate={step > 1}>
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={(e) => updateField("website", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        {step === 1 ? <StepOneFields formData={formData} updateField={updateField} /> : null}
        {step === 2 ? (
          <StepTwoFields
            formData={formData}
            updateField={updateField}
            toggleArrayField={toggleArrayField}
          />
        ) : null}
        {step === 3 ? (
          <StepThreeFields
            formData={formData}
            updateField={updateField}
            toggleArrayField={toggleArrayField}
          />
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {step === 3
              ? submitting
                ? "Submitting..."
                : "Request Personalized Demo"
              : "Next Step"}
            {step < 3 ? <ArrowRightIcon className="h-4 w-4" /> : null}
          </button>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:text-sm">
        <LockIcon className="h-4 w-4 shrink-0" />
        <span>Your information is secure and confidential.</span>
      </div>
    </div>
  );
}

function validateStepTwo(data: FormData): string | null {
  if (!data.qcrGenerationMethod) return "Please select how QCRs are generated today.";
  if (!data.monthlyQuoteVolume) return "Please select your approximate monthly quote volume.";
  if (data.operationalChallenges.length === 0) return "Please select at least one operational challenge.";
  if (data.linesOfBusiness.length === 0) return "Please select at least one line of business.";
  if (!data.reviewTeamSize) return "Please select your team size.";
  return null;
}

function validateStepThree(data: FormData): string | null {
  if (!data.preferredDemoDate) return "Please select a preferred demo date.";
  if (!data.preferredTimeWindow) return "Please select a preferred time window.";
  if (data.requestedDemoTopics.length === 0) return "Please select at least one demo topic.";
  return null;
}

function toPayload(data: FormData): DemoRequestPayload {
  return {
    full_name: data.fullName.trim(),
    work_email: data.workEmail.trim(),
    company_name: data.companyName.trim(),
    job_role: data.jobRole,
    qcr_generation_method: data.qcrGenerationMethod,
    monthly_quote_volume: data.monthlyQuoteVolume,
    operational_challenges: data.operationalChallenges,
    lines_of_business: data.linesOfBusiness,
    review_team_size: data.reviewTeamSize,
    preferred_demo_date: data.preferredDemoDate,
    preferred_time_window: data.preferredTimeWindow,
    requested_demo_topics: data.requestedDemoTopics,
    additional_notes: data.additionalNotes.trim() || undefined,
    website: data.website.trim() || undefined,
  };
}

function StepOneFields({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label="Full Name">
        <input
          type="text"
          required
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
          className={inputClassName}
        />
      </Field>
      <Field label="Work Email">
        <input
          type="email"
          required
          placeholder="Enter your work email"
          value={formData.workEmail}
          onChange={(e) => updateField("workEmail", e.target.value)}
          className={inputClassName}
        />
      </Field>
      <Field label="Company Name">
        <input
          type="text"
          required
          placeholder="Enter your company name"
          value={formData.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
          className={inputClassName}
        />
      </Field>
      <Field label="Job Role">
        <div className="relative">
          <select
            required
            value={formData.jobRole}
            onChange={(e) => updateField("jobRole", e.target.value)}
            className={`${inputClassName} appearance-none pr-10`}
          >
            <option value="" disabled>
              Select your role
            </option>
            {jobRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </Field>
    </div>
  );
}

function StepTwoFields({
  formData,
  updateField,
  toggleArrayField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleArrayField: (
    key: "operationalChallenges" | "linesOfBusiness" | "requestedDemoTopics",
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="How are QCRs generated today?">
        <div className="relative">
          <select
            value={formData.qcrGenerationMethod}
            onChange={(e) => updateField("qcrGenerationMethod", e.target.value)}
            className={`${inputClassName} appearance-none pr-10`}
          >
            <option value="" disabled>
              Select QCR generation method
            </option>
            {qcrGenerationMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </Field>
      <Field label="Approximate monthly quote volume?">
        <div className="relative">
          <select
            value={formData.monthlyQuoteVolume}
            onChange={(e) => updateField("monthlyQuoteVolume", e.target.value)}
            className={`${inputClassName} appearance-none pr-10`}
          >
            <option value="" disabled>
              Select quote volume
            </option>
            {quoteVolumes.map((volume) => (
              <option key={volume} value={volume}>
                {volume}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </Field>
      <Field label="Biggest operational challenges">
        <CheckboxGroup
          options={operationalChallenges}
          selected={formData.operationalChallenges}
          onToggle={(value) => toggleArrayField("operationalChallenges", value)}
        />
      </Field>
      <Field label="Primary lines of business">
        <CheckboxGroup
          options={linesOfBusiness}
          selected={formData.linesOfBusiness}
          onToggle={(value) => toggleArrayField("linesOfBusiness", value)}
        />
      </Field>
      <Field label="Team size involved in QCR/review workflows">
        <div className="relative">
          <select
            value={formData.reviewTeamSize}
            onChange={(e) => updateField("reviewTeamSize", e.target.value)}
            className={`${inputClassName} appearance-none pr-10`}
          >
            <option value="" disabled>
              Select team size
            </option>
            {reviewTeamSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </Field>
    </div>
  );
}

function StepThreeFields({
  formData,
  updateField,
  toggleArrayField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  toggleArrayField: (
    key: "operationalChallenges" | "linesOfBusiness" | "requestedDemoTopics",
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Preferred demo date">
          <input
            type="date"
            value={formData.preferredDemoDate}
            onChange={(e) => updateField("preferredDemoDate", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={inputClassName}
          />
        </Field>
        <Field label="Preferred time window">
          <div className="relative">
            <select
              value={formData.preferredTimeWindow}
              onChange={(e) => updateField("preferredTimeWindow", e.target.value)}
              className={`${inputClassName} appearance-none pr-10`}
            >
              <option value="" disabled>
                Select time window
              </option>
              {timeWindows.map((window) => (
                <option key={window} value={window}>
                  {window}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </Field>
      </div>
      <Field label="What would you like to see during the demo?">
        <CheckboxGroup
          options={demoTopics}
          selected={formData.requestedDemoTopics}
          onToggle={(value) => toggleArrayField("requestedDemoTopics", value)}
        />
      </Field>
      <Field label="Additional notes (optional)">
        <textarea
          rows={4}
          placeholder="Tell us anything else we should know before the demo"
          value={formData.additionalNotes}
          onChange={(e) => updateField("additionalNotes", e.target.value)}
          className={`${inputClassName} resize-none py-3`}
        />
      </Field>
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-start gap-2.5 rounded-md py-1 text-sm text-slate-800"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100";
