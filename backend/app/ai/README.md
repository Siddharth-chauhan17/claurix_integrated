# Cofounder AI zone (`app.ai`)

**This is where you edit gap-analysis / LLM code.**

The `model/` folder at the repo root is a **frozen reference** from the original standalone demo. Do not treat it as the live source of truth — edit files here instead.

---

## Original → integrated file map

| Cofounder file (`model/backend/`) | Live file (`backend/app/ai/`) | Changed? |
|-----------------------------------|-------------------------------|----------|
| `extraction/policy_block_extractor.py` | `extraction/policy_block_extractor.py` | No — logic identical |
| `extraction/pdf_extractor.py` | `extraction/pdf_extractor.py` | No — still unused in pipeline |
| `extraction/excel_extractor.py` | — | Not integrated (was commented out in original) |
| `llm/policy_clause_extractor.py` | `llm/policy_clause_extractor.py` | **Yes** — Ollama call only (see below) |
| — | `llm/ollama_config.py` | **New** — platform config wrapper |
| `gap_analysis/process_policy.py` | `gap_analysis/process_policy.py` | Import path only |
| `gap_analysis/uw_remark_classifier.py` | `gap_analysis/uw_remark_classifier.py` | No |
| `gap_analysis/policy_merger.py` | `gap_analysis/policy_merger.py` | **Yes** — added `merge_policy_records()` |
| `classification/sheet_classifier.py` | — | Not integrated (was commented out in original) |
| `main.py` | `app/services/gap_analysis_service.py` | Reimplemented as platform orchestration |

---

## Code changes in your modules

### `llm/policy_clause_extractor.py`

- **Was:** `import ollama` + `ollama.chat(model="qwen2.5:7b", ...)`
- **Now:** `from app.ai.llm.ollama_config import chat` + `chat(messages=[...])`
- **Why:** Model name and Ollama host come from environment (`AI_MODEL_NAME`, `OLLAMA_BASE_URL`), especially for Docker.
- **Your prompts / JSON parsing:** unchanged — edit those in this file as before.

### `llm/ollama_config.py` (new — platform file)

Thin wrapper around the Ollama client. Reads `OLLAMA_BASE_URL` and `AI_MODEL_NAME` from claurix `Settings`. You generally do not need to edit this unless adding client options.

### `gap_analysis/policy_merger.py`

- **Added:** `merge_policy_records(policies: list[dict])` — same index-based merge, but on in-memory dicts.
- **Kept:** `merge_policy_files(paths)` — loads JSON files from disk, then calls `merge_policy_records`.
- **Why:** Claurix merges inside the API after building dicts in memory; it does not require per-insurer JSON on disk first.
- **Known issue (unchanged from your version):** merge aligns by **list index** — crashes if insurers return different clause counts (`IndexError`). Fix here before production.

### `gap_analysis/process_policy.py`

- **Only change:** import `classify_uw_remark` from `app.ai.gap_analysis.uw_remark_classifier` instead of `backend.gap_analysis...`.

### `extraction/policy_block_extractor.py`, `gap_analysis/uw_remark_classifier.py`, `extraction/pdf_extractor.py`

No algorithm changes — direct copies. Diff against `model/backend/` if you need to verify.

---

## Where `main.py` went

Your standalone `POST /upload/` pipeline is now split across platform services:

| `main.py` responsibility | Claurix equivalent |
|--------------------------|-------------------|
| Save uploaded Excel | `document_service.py` + `POST /projects/{id}/documents/quotes` |
| `policy_config` JSON from form | `policy_config_from_payload()` in `gap_analysis_service.py` |
| Loop: extract → LLM → classify | `run_gap_analysis()` in `gap_analysis_service.py` |
| Write per-insurer JSON | `_persist_artifacts()` → `uploads/.../gap_analysis/latest/policies/` |
| Merge policies | `merge_policy_records()` (imports from this folder) |
| Write merged JSON | `_persist_artifacts()` → `uploads/.../gap_analysis/latest/merged/` |
| HTTP response + status | `POST /projects/{id}/generate-qcr` + `qcr_generation_runs` table |

**Trigger:** when `AI_ENABLED=true`, `qcr_generation_service.generate_workspace()` calls `gap_analysis_service.run_gap_analysis()`, which imports your modules from `app.ai`.

### `policy_config` field mapping

| Your field | Claurix source |
|------------|----------------|
| `policy` | `selected_sections[].section_name` |
| `sheet_name` | `source_mappings[].source_reference.location.sheet_name` |
| `start_row` / `end_row` | min / max of `row_start` / `row_end` across mappings |
| `company` (filename stem) | quote `original_filename` without extension |

Company name is still derived from the Excel filename stem — same as your `main.py`.

### Storage layout change

| Original (`model/`) | Integrated (claurix) |
|---------------------|----------------------|
| `backend/storage/users/{user_id}/{case_id}/uploads/` | `backend/uploads/{org_id}/{project_id}/quote/` |
| `.../results/policies/{company}/{policy}.json` | `uploads/.../gap_analysis/latest/policies/{company}/{policy}.json` |
| `.../results/merged/{policy}.json` | `uploads/.../gap_analysis/latest/merged/{policy}.json` |
| Filesystem only | Also `qcr_generation_runs.merged_results` (JSONB in Postgres) |

---

## Pipeline

```
Excel on disk (server upload path)
  → extract_policy_block()       # extraction/policy_block_extractor.py
  → extract_policy_clauses()     # llm/policy_clause_extractor.py (Ollama / Qwen)
  → process_policy()             # gap_analysis/process_policy.py
  → merge_policy_records()       # gap_analysis/policy_merger.py
```

Orchestration lives in `app/services/gap_analysis_service.py` (platform — Siddharth).  
Do not put algorithm changes there — change modules in `app.ai` instead.

### Downstream (platform — not your edit zone)

| File | Role |
|------|------|
| `app/services/ai_response_mapper.py` | Merged JSON → QCR editing UI raw clause shape |
| `app/services/qcr_editing_service.py` | `GET /projects/{id}/qcr-workspace` |
| `lib/qcr-editing/normalize-ai-response.ts` | Frontend normalizer (do not bypass) |

Discuss any output JSON shape changes with Siddharth before merging — the UI adapter depends on your clause/insurer structure.

---

## Config (`.env` / Docker)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_ENABLED` | `false` | `true` = real pipeline; `false` = mock QCR generator |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server (Docker API: `http://host.docker.internal:11434`) |
| `AI_MODEL_NAME` | `qwen2.5:7b` | Model tag passed to `chat()` |

---

## Output JSON contract (unchanged)

**Per insurer:**

```json
{
  "company": "...",
  "policy": "...",
  "column_mapping": { "clause": "...", "requirement": "...", "uw_remark": "..." },
  "clauses": [
    {
      "clause": "...",
      "requirement": "...",
      "uw_remark": "...",
      "remark_status": "AGREED | NOT_AGREED | PARTIALLY_AGREED",
      "source": { "sheet_name": "...", "excel_row": 12, "clause_cell": "...", ... }
    }
  ]
}
```

**Merged:**

```json
{
  "policy": "...",
  "clauses": [
    {
      "excel_row": 12,
      "clause": "...",
      "requirement": "...",
      "insurers": [
        { "company": "...", "uw_remark": "...", "remark_status": "...", "source": {} }
      ]
    }
  ]
}
```

Full examples: `model/README.md`.

---

## Not integrated / deferred

| Item | Reason |
|------|--------|
| `model/backend/main.py` | Replaced by claurix routes + `gap_analysis_service.py` |
| `model/backend/storage/` | Replaced by `backend/uploads/` + Postgres |
| `excel_extractor.py` | Commented out in original repo |
| `sheet_classifier.py` | Commented out in original repo |
| `pdf_extractor.py` | Copied but not wired into `generate-qcr` yet |
| Separate API on port 8001 | Single claurix API on port 8000 |

---

## How to test your changes locally

1. `docker compose up` (or `uvicorn app.main:app --reload` with local Postgres)
2. `ollama serve` + `ollama pull qwen2.5:7b`
3. Set `AI_ENABLED=true` in root `.env` (Docker) or `backend/.env` (native API)
4. In the app: upload quote Excel in the workstation → **Generate QCR** → open QCR workspace
5. Broker edits persist via `POST /projects/{id}/qcr-workspace` (Phase 4 — platform)

Leave `AI_ENABLED=false` for day-to-day dev (mock QCR, no Ollama needed).

---

## Edit boundaries

| You edit | Siddharth / platform edits |
|----------|---------------------------|
| `backend/app/ai/**` | `app/services/`, `app/routers/`, `app/models/` |
| Prompts, classifiers, merger logic, extractors | Auth, uploads, DB, frontend, API shapes |
| Output JSON field names inside clauses | `ai_response_mapper.py`, QCR editing types |

Discuss merger index fixes and any breaking JSON shape changes before merging to `main`.

---

## Known issues

- `policy_merger.py` aligns by **list index** — different clause counts across insurers cause `IndexError` (same as standalone `model/`).
- Qwen output is non-deterministic.
- `gap_score` is not produced by the model — platform mapper derives a default from `remark_status`.
