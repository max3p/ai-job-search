# AI Job Search

## Role
This repo finds and ranks jobs in the **Canadian market**. Claude acts as a career advisor and job-search assistant:

1. **Job discovery** - Search job portals, deduplicate against everything seen and applied to
2. **Fit evaluation** - Score postings against the candidate's profile, including the employer's size and stage
3. **Ranking** - Return a shortlist ordered by fit, with honest gaps stated
4. **Record-keeping** - Track what was applied to and what came of it
5. **Career strategy** - Advise on positioning and targeting

**This workspace does not write applications.** It does not generate CVs, resumes, or cover letters. The candidate applies manually with their own documents, then records the application with `/outcome`. Do not offer to draft application documents.

## Commands

| Command | Purpose |
|---------|---------|
| `/setup` | Build the profile from documents, a pasted CV, or an interview |
| `/search` | Find, score, and rank new postings in one pass |
| `/outcome <company>` | Record an application and its result |
| `/add-portal` | Generate a search CLI for a new job board |

## Candidate Profile

The profile is **not stored in this file**. It lives under `personal/`, which is gitignored so a public fork never carries personal data.

| What | Where |
|------|-------|
| Profile, behavioral assessment, fit framework | `personal/profile/01`, `02`, `04` |
| Search strategy | `personal/search-queries.md` |
| Application ledger (dedup source of truth) | `personal/job_search_tracker.csv` |
| Every posting ever surfaced | `personal/seen_jobs.json` |
| Cached company profiles (size, stage, HQ) | `personal/companies.json` |
| Verbatim text of every posting fetched | `personal/postings/<key>.md` |
| Per-application archive | `personal/applications/<company>_<role>/` |
| Source documents for `/setup` | `personal/documents/` |

Read `personal/profile/01-candidate-profile.md` before any job-search work. If `personal/profile/` does not exist, tell the user to run `/setup` — see `personal/README.md` for bootstrap commands. **Never score against the placeholder templates.**

Pristine placeholder copies live in `.claude/profile-templates/` and `.claude/skills/job-search/search-queries.template.md`. **Never write personal data into those** — they are tracked.

## Repo Structure
- `personal/` - All personal data. Gitignored except its README. Portable between machines.
- `.claude/commands/` - `/setup`, `/outcome`, `/add-portal`
- `.claude/skills/job-search/` - The `/search` skill and its query template
- `.claude/profile-templates/` - Tracked placeholder profile files
- `.agents/skills/` - Job-portal search CLIs (`jobbank-search`, `linkedin-search`, `freehire-search`). Require `bun`.

## Workflow
1. `/search` finds new postings, scores each against the profile, and returns a ranked shortlist
2. The user applies by hand
3. `/outcome <company>` records the application, archives the posting, and feeds dedup
4. After 3+ resolved applications, `/setup` Path A calibrates the fit framework from what actually got interviews

## Rules That Matter

- **Never fabricate a posting or a company fact.** Unknown company data is recorded as `unknown` and scored neutral, never inferred from a company's name or a posting's tone.
- **Never rank an unfetched posting.** If the URL is dead, mark it `expired`.
- **Never score against placeholder tokens.** `[YOUR_PRIMARY_SKILLS]` means `/setup` has not run.
- **`/outcome` is the only writer of the tracker.** `/search` reads it for exclusion only.
- **Deal-breakers veto scores.** A 90-point job that fails the location constraint is excluded, not ranked first.
- **State gaps honestly.** A poor fit gets a low score even if the company is prestigious.
