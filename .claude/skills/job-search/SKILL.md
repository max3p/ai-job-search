---
name: search
description: >
  Searches Canadian job sites, evaluates fit against your profile, and returns a ranked
  shortlist ready to apply to. Deduplicates against everything seen and applied to before.
  Triggers on: find jobs, search jobs, new jobs, job search, /search, what should I apply to
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(bun --version), Bash(bun run .agents/skills/*/cli/src/cli.ts *), WebFetch, WebSearch, Agent, AskUserQuestion
---

# Job Search

One command: find new postings, score them against the candidate's profile, and present a ranked shortlist. There is no separate scrape and rank step — each posting is fetched **once** and scored **once**.

## Invocation

- `/search` — the default. Run the top 3 priority query categories.
- `/search <focus area>` — e.g. `/search data science`. Prioritize that category and generate 2-3 custom queries for it.
- `/search broad` — run all query categories.
- `/search --top <N>` — shortlist size (default 8).
- `/search --all` — re-score every non-applied job, including previously scored ones. Use after editing the profile or the weights.

---

## Step 1: Load State

Read, in parallel:

1. `personal/seen_jobs.json` — every posting ever surfaced. Create as `{"seen": {}}` if missing.
2. `personal/job_search_tracker.csv` — the application ledger. If missing, treat as empty (`/outcome` creates it).
3. `personal/companies.json` — cached company profiles. Create as `{"companies": {}}` if missing.
4. `personal/search-queries.md` — the search strategy.
5. `personal/profile/01-candidate-profile.md` and `personal/profile/04-job-evaluation.md` — the rubric.

If `personal/profile/` does not exist, tell the user to run `/setup` and stop. Do **not** fall back to the placeholder templates in `.claude/profile-templates/` — scoring against `[YOUR_PRIMARY_SKILLS]` produces meaningless numbers.

Build the **exclusion set** from two sources:
- Every URL in `seen_jobs.json` (unless `--all`)
- Every `company + normalized_role` pair in the tracker, **and** in `seen_jobs.json` entries whose status is `applied`

> **Why the normalized pair matters:** companies routinely repost the same role under a fresh URL. URL-only dedup would show it to you again. Normalize by lowercasing, stripping punctuation, and collapsing whitespace on both company and title before comparing.

---

## Step 2: Search the Portals

### 2a. Check bun

```bash
bun --version
```

If this fails, skip to 2c (WebSearch fallback) for everything and note the degraded mode in the final output.

### 2b. Portal CLIs (primary)

Discover installed portals by reading every `.agents/skills/*/SKILL.md`. Each documents its own flags. **Use each portal's documented interface — never guess flags.** This picks up anything added later via `/add-portal` with no change to this file.

For each portal:
1. Read its `SKILL.md` for the correct `bun run …` invocation.
2. Translate the query terms from `personal/search-queries.md` into that portal's flag format.
3. Scope to the last 14 days using its recency flag (`--jobage`, `--since`, etc.).
4. Cap at ~20 results per call.
5. Use `--format json`.

Run portal calls in parallel via the Agent tool. If a CLI exits non-zero, log the error and continue — one dead portal must not abort the search.

### 2c. WebSearch fallback

Only if bun is unavailable or a portal's CLI failed. Every portal in use has a CLI skill, so this path is degraded, not routine.

Use `WebSearch` with `site:jobbank.gc.ca` queries — it is the one board whose `robots.txt` permits fetching a posting to score it. **Do not fall back to Indeed.ca, Glassdoor.ca, Eluta, or Talent.com**: each disallows its search or job-view paths, so Step 3 could not legitimately fetch the posting. `personal/search-queries.md` records why.

Say plainly in Step 6 that coverage was degraded and which portals were missed.

### 2d. Filter before fetching

Drop anything already in the exclusion set **now**, using the titles and companies from the search results. Do not spend a fetch on a job you will discard. Count how many were skipped as already-seen and report it in Step 6.

---

## Step 3: Fetch and Score

Dispatch parallel `general-purpose` agents via the Agent tool, ~5 jobs per agent. Pass each agent everything it needs **inline in the prompt**: the job list, a compact rubric extracted from `04-job-evaluation.md` (strong/moderate/weak skill areas, direct/adjacent experience domains, ideal company size and stage, behavioral thrive/drain factors, career goals, deal-breakers, location constraints), and the cached company profiles relevant to its jobs. Agents must **not** re-read the profile files.

Each agent, for each job:

1. **WebFetch the posting.** Score only from actually fetched content. If the URL is dead, redirects to a listing page, or the posting has expired, mark it `expired` — never score from a title alone, never fabricate posting content.

2. **Resolve the company profile.** If the company is already in the passed-in cache, use it. Otherwise run **two or three** WebSearch/WebFetch lookups to establish: headcount band, stage, HQ city, sector, and any recent funding, layoff, or acquisition news. This is a quick pass, not due diligence.
   - Anything not found quickly is `unknown`. **Never infer headcount or stage from the company's name or the posting's tone.**
   - An `unknown` headcount scores Company Profile Fit at 50 (neutral) and carries a `?` marker.

3. **Score all six dimensions** using the definitions from `04-job-evaluation.md` verbatim.

Each agent returns a JSON array, one object per job:

```json
{
  "key": "<the job's key in seen_jobs.json>",
  "status": "scored" | "expired",
  "scores": {
    "technical": 0,
    "experience": 0,
    "company_profile": 0,
    "career": 0,
    "behavioral": 0
  },
  "company": {
    "name": "...",
    "size_band": "1-20|21-100|101-500|501-5000|5000+|unknown",
    "stage": "seed|series_a_b|growth|mature_private|public|non_profit|public_sector|unknown",
    "hq": "...",
    "sector": "...",
    "notes": "recent funding / layoffs / acquisition, or null"
  },
  "location": "PASS" | "FAIL" | "FLAG",
  "deadline": "YYYY-MM-DD",
  "url": "<the posting URL — echo the input verbatim>",
  "apply_url": "<the employer's apply link, or null>",
  "strengths": ["1-3 bullets, grounded in the posting text"],
  "gaps": ["1-3 bullets, honest"],
  "language": "<posting language>"
}
```

**Capture the apply link while the posting is open.** It is the one field that cannot be reconstructed later without a second fetch.
- `jobbank-search detail` returns it as `applyUrl` (often a redirect to the board the employer posted through).
- `linkedin-search detail` returns an apply link alongside the description.
- Greenhouse, Lever, and Ashby posting URLs *are* the apply page — set `apply_url` to the posting URL itself.
- If a posting only says "email your CV to …", put that address in `apply_url` as `mailto:…`.
- If no apply route is visible in the fetched content, set `null`. Do not invent one.

The honesty rule applies: gaps are stated, never smoothed over, and a poor fit gets a low score even if the company is prestigious.

---

## Step 4: Aggregate and Rank

Back in the main context, for each scored job:

1. **Weighted overall score**, using the weights table in `04-job-evaluation.md`. Read the weights from that file — do not hardcode them here, so that editing the file re-ranks future searches.
2. **Verdict band** from the thresholds in the same file.
3. **Location veto.** `FAIL` excludes the job from the shortlist regardless of score; list it separately with the reason. `FLAG` stays ranked but carries a visible ⚠.
4. **Deadline urgency.** Within 7 days gets 🔥 and wins ties. Already passed moves the job to `expired`.

Sort by overall score descending, urgency as tiebreaker.

---

## Step 5: Update State

**`personal/seen_jobs.json`** — add every job fetched this run, new or skipped:

```json
{
  "seen": {
    "<url>": {
      "title": "...",
      "company": "...",
      "url": "...",
      "apply_url": "... or null",
      "first_seen": "YYYY-MM-DD",
      "score": 78,
      "verdict": "Strong Fit",
      "scored_date": "YYYY-MM-DD",
      "status": "scored | expired | applied"
    }
  }
}
```

**`personal/companies.json`** — add any company researched this run:

```json
{
  "companies": {
    "<normalized company name>": {
      "name": "...",
      "size_band": "...",
      "stage": "...",
      "hq": "...",
      "sector": "...",
      "notes": "...",
      "researched": "YYYY-MM-DD"
    }
  }
}
```

Re-research a cached company only if its entry is older than 180 days, or on `--all`.

**Do not write to `personal/job_search_tracker.csv`.** `/outcome` is the only writer. `/search` reads it for exclusion only.

Fields are added, never restructured. Re-running `/search` is idempotent: already-scored jobs are skipped unless `--all`.

---

## Step 6: Present the Shortlist

```
## Job Search — YYYY-MM-DD

Searched <N> postings across <portals>. <A> new, <B> already seen, <C> expired/vetoed.

### Shortlist

| # | Score | Verdict | Title | Company | Size | Stage | Location | Deadline | Apply | |
|---|-------|---------|-------|---------|------|-------|----------|----------|-------|---|
| 1 | 81 | Strong Fit | ... | ... | 21-100 | Series A | Toronto | Nov 20 | [Apply](<url>) | 🔥 |

### Why these ranked highest

**1. [<Title> at <Company>](<url>) (81 — Strong Fit)**
<size band> · <stage> · <HQ> · <sector>
- [2-3 strengths, grounded in the posting]
- Gap: [the honest one]
- [company note, if any: recent funding, layoffs, acquisition]
- Apply: <apply_url, or the posting url if that is the apply page>

[repeat for each shortlisted job]

### Below threshold
| Score | Verdict | Title | Company | One-line reason | Link |

### Excluded
- <Title> at <Company> — location FAIL: requires relocation
- <Title> at <Company> — expired <date>

### Skipped as already seen
<N> postings (<M> because you have already applied to that company + role)
```

Then:

> "Applying to any of these? Once you've submitted, run `/outcome <company>` so it stops resurfacing and feeds the fit calibration."

Do **not** offer to draft a CV or cover letter. This workspace does not generate application documents.

---

## Important Rules

1. **Never fabricate a posting.** Only present jobs found via an actual portal CLI, WebSearch, or WebFetch result.
2. **Never rank an unfetched posting.** A job whose posting cannot be retrieved is `expired`, not guessed at.
3. **Never invent company data.** Unknown is `unknown`, scored neutral, marked `?`. A confident-sounding headcount that came from nowhere is worse than a blank.
4. **Deal-breakers veto scores.** A 90-point job that fails the location constraint is excluded, not ranked first.
5. **Respect deduplication.** Check `seen_jobs.json` (by URL) *and* the tracker (by company + normalized role) before presenting anything.
6. **The tracker is read-only here.** `/outcome` owns it.
7. **One fetch per posting.** Scoring and company research happen in the same agent pass, not a second sweep.
8. **Only open positions.** Skip postings whose deadline has passed or that are marked closed.
9. **Every surfaced posting carries a clickable link.** A shortlist the user cannot act on is not a shortlist. Link the title and give the apply route. Never present a job — shortlisted, below threshold, or excluded-by-rule — without its URL. If `apply_url` is `null`, link the posting and say the apply route was not visible in the posting.
