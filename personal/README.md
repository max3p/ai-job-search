# personal/

Everything in this folder is **your data**. It is gitignored — only this README is tracked.

Copy the whole `personal/` folder between machines and the framework picks up exactly where it left off: profile, search queries, application history, company cache, and dedup state.

```
personal/
├── README.md                    # this file (the only tracked file here)
├── profile/
│   ├── 01-candidate-profile.md  # education, experience, skills, publications
│   ├── 02-behavioral-profile.md # behavioral assessment, strengths, environments
│   └── 04-job-evaluation.md     # scoring framework, weights, ideal company size/stage
├── search-queries.md            # /search strategy: boards, queries, location filter
├── job_search_tracker.csv       # application ledger — the dedup source of truth
├── seen_jobs.json               # every posting /search has ever surfaced
├── companies.json               # cached company profiles (size, stage, HQ, sector)
├── postings/                    # verbatim text of every posting /search fetched
│   └── <sanitized_key>.md
├── documents/                   # source material you provide
│   ├── cv/                      # master CV (.pdf / .tex / .md)
│   ├── linkedin/                # LinkedIn profile export (.pdf)
│   ├── diplomas/                # degrees, transcripts (.pdf)
│   └── references/              # reference letters (.pdf / .txt / .md)
└── applications/                # per-application archive
    └── <company>_<role>/
        ├── job_posting.md
        ├── outcome.md
        ├── interview_prep_<stage>.md  # written by /outcome on an interview stage
        └── resume_submitted.pdf       # optional, if you want to keep what you sent
```

## Bootstrapping a fresh clone

`personal/` is gitignored, so a fresh clone has only this README. Recreate the working files from the tracked placeholders:

```bash
mkdir -p personal/profile personal/applications
mkdir -p personal/documents/{cv,linkedin,diplomas,references}
cp .claude/profile-templates/*.md personal/profile/
cp .claude/skills/job-search/search-queries.template.md personal/search-queries.md
```

Then run `/setup`. Or copy your existing `personal/` folder over from another machine and skip all of it.

---

## profile/

Written by `/setup`, read by `/search`. Three files:

- **`01-candidate-profile.md`** — the factual record: education, experience, skills, publications, awards.
- **`02-behavioral-profile.md`** — how you work: strengths, environments you thrive in, what drains you.
- **`04-job-evaluation.md`** — the scoring framework. Six dimensions, a weights table, and threshold bands. **This is the file to edit when rankings feel wrong.** Company Profile Fit is worth 20% by default, on the premise that employer size and stage predict your performance; lower it if that stops being true.

---

## documents/

Source material. `/setup` reads everything here to build `personal/profile/`. Safe to re-run as you add documents — it merges and asks before overwriting.

- **`cv/`** — your master CV, the most complete unedited version. `/setup` extracts work experience, education, skills, awards, publications, contact info. Any filename; multiple files get cross-referenced.
- **`linkedin/`** — LinkedIn profile export (profile → More → Save to PDF). `/setup` extracts experience, skills, certifications, and uses the About section to infer behavioral signal.
- **`diplomas/`** — degree certificates and transcripts. `/setup` extracts official degree names, graduation dates, institution spelling.
- **`references/`** — reference letters. `/setup` extracts referee details, quotes into `01`, and competency language into `02`.

| Format | Readable by `/setup` | Notes |
|--------|---------------------|-------|
| `.pdf` | Yes | Parsed directly with the Read tool |
| `.tex` | Yes | LaTeX source — structure and content both readable |
| `.md` / `.txt` | Yes | Plain text |
| `.docx` | No | Convert to PDF first |
| `.png` / `.jpg` | No | Scanned images are not parsed — use text PDFs |

---

## postings/

The verbatim text of every posting `/search` fetched, one file per job, saved at the moment it was scored.

This exists because **a job posting is a wasting asset.** `/search` has to download the full description to score it; listings close within weeks; interview invitations arrive later than that. Saving the text at fetch time costs nothing — the download already happened — and it is the only moment the posting is guaranteed to exist.

`/outcome` copies from here into the application archive rather than re-fetching a URL that may already be dead. `/search` never overwrites an existing file: the earliest capture is the most faithful to what the employer originally published.

Roughly 5–15 KB per posting. A few hundred postings is a couple of megabytes. A lost posting cannot be re-downloaded.

---

## applications/

One subfolder per application, named `<company>_<role>` — lowercase, underscores for spaces.

```
applications/
├── shopify_data_scientist/
├── wealthsimple_ml_engineer/
└── cohere_research_engineer/
```

`/outcome` maintains these: it records progress and results conversationally, fetches and archives the posting text, keeps `outcome.md` in the format below, and updates `job_search_tracker.csv` in the same step.

**`job_posting.md`** — the full posting text, fetched at record time. Postings expire fast; this is why the archive exists. `/setup` uses it to calibrate `04-job-evaluation.md`.

**`outcome.md`**:

```markdown
# Outcome: <Company> — <Role>

**Status:** in_progress | hired | offer_declined | rejected | no_response | interview_only

**Date resolved:** YYYY-MM-DD

## Interview stages reached
- [ ] Phone screen
- [ ] Technical interview
- [ ] Case interview
- [ ] Final round
- [ ] Offer received

## Notes
What happened? What feedback did you receive (if any)?
What would you do differently?
Any signal about what they valued or didn't?
```

`in_progress` marks an open application. `/setup`'s calibration draws conclusions only from applications with a final status.

**`interview_prep_<stage>.md`** — written by `/outcome` when you record an interview stage. One per stage, never overwritten. It maps each requirement from the archived posting against your profile, marks the honest gaps, and drafts likely questions using the company research cached at scoring time. It is *derived* — `job_posting.md` stays verbatim and is the source of truth, so a prep pack is safe to delete and regenerate.

**What `/setup` learns from the archive:** which role types and company sizes have led to interviews (a direct signal for Company Profile Fit), and which applications went nowhere.

---

## Why this folder exists

On a public fork, `/setup` would otherwise write your name, phone, and email into tracked files. Keeping every personalized file under one gitignored root means you can push the repo without redacting anything, and move machines by copying one folder.

**If you ever do commit personal data by accident:** `git rm` in a later commit does not remove it from history. You need `git filter-repo`, or a fresh squashed branch.

## Run `/outcome` after every application

`/outcome` is the only thing that writes the tracker. `/search` reads it to know what to exclude. Skip `/outcome` and a reposted listing under a fresh URL will resurface, and you may apply twice.
