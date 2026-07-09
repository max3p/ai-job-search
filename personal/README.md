# personal/

Everything in this folder is **your data**. It is gitignored — only this README is tracked.

Copy the whole `personal/` folder between machines and the framework picks up exactly where it left off: profile, search queries, base CV, application history, and the dedup state.

```
personal/
├── README.md                    # this file (the only tracked file here)
├── profile/                     # your profile + fit framework
│   ├── 01-candidate-profile.md  # education, experience, skills, publications
│   ├── 02-behavioral-profile.md # behavioral assessment, strengths, environments
│   ├── 03-writing-style.md      # tone, structure, do's and don'ts
│   ├── 04-job-evaluation.md     # scoring framework + your deal-breakers
│   ├── 05-cv-templates.md       # CV structure rules + your profile statements
│   └── 06-cover-letter-templates.md
├── search-queries.md            # /scrape search strategy
├── cv_base.tex                  # your master LaTeX CV (source for /apply)
├── job_search_tracker.csv       # application ledger — the dedup source of truth
├── seen_jobs.json               # every job /scrape has surfaced
├── documents/                   # source material you provide
│   ├── cv/                      # master CV (.pdf / .tex)
│   ├── linkedin/                # LinkedIn profile export (.pdf)
│   ├── diplomas/                # degrees, transcripts (.pdf)
│   └── references/              # reference letters (.pdf / .txt / .md)
└── applications/                # per-application archive
    └── <company>_<role>/
        ├── job_posting.md
        ├── cv_draft.tex         # the CV you actually submitted
        ├── cover_letter.tex     # the letter you actually submitted
        └── outcome.md
```

## Bootstrapping a fresh clone

`personal/` is gitignored, so a fresh clone has only this README. Recreate the working files from the tracked placeholders:

```bash
mkdir -p personal/profile personal/applications
mkdir -p personal/documents/{cv,linkedin,diplomas,references}
cp .claude/skills/job-application-assistant/profile-templates/*.md personal/profile/
cp .claude/skills/job-scraper/search-queries.template.md personal/search-queries.md
```

Then run `/setup` to populate them. Or just copy your existing `personal/` folder over from another machine and skip all of it.

---

## documents/

Source material. `/setup` reads everything here to populate `personal/profile/`. Safe to re-run as you add documents — it merges and asks before overwriting.

- **`cv/`** — your master CV, the most complete unedited version. Not a tailored variant. `/setup` extracts work experience, education, skills, awards, publications, contact info. Any filename; multiple files get cross-referenced.
- **`linkedin/`** — LinkedIn profile export (profile → More → Save to PDF). `/setup` extracts experience, skills, certifications, volunteer work, and uses the About section to infer behavioral signal. Most recently modified file wins if several.
- **`diplomas/`** — degree certificates and transcripts. `/setup` extracts official degree names, graduation dates, grades, institution spelling.
- **`references/`** — reference letters. `/setup` extracts referee details, quotes into `01-candidate-profile.md`, and competency language into `02-behavioral-profile.md`.

| Format | Readable by `/setup` | Notes |
|--------|---------------------|-------|
| `.pdf` | Yes | Parsed directly with the Read tool |
| `.tex` | Yes | LaTeX source — structure and content both readable |
| `.md` / `.txt` | Yes | Plain text |
| `.docx` | No | Convert to PDF first |
| `.png` / `.jpg` | No | Scanned images are not parsed — use text PDFs |

---

## applications/

One subfolder per application, named `<company>_<role>` — lowercase, underscores for spaces.

```
applications/
├── shopify_data_scientist/
├── telus_ml_engineer/
└── rbc_quantitative_analyst/
```

Maintain these by hand, or let **`/outcome`** do it: it records progress and results conversationally, archives the submitted drafts and posting text, keeps `outcome.md` in the format below, and updates `job_search_tracker.csv` in the same step.

**`job_posting.md`** — the full posting text. `/setup` uses it to infer which role types you target and to calibrate `04-job-evaluation.md`.

**`cv_draft.tex` / `cover_letter.tex`** — what you actually submitted. These are copies; the live drafts are compiled in `cv/` and `cover_letters/` at the repo root, where `cover.cls` and the bundled fonts resolve.

**`outcome.md`** — filled in as the application progresses:

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

**What `/setup` learns from `outcome.md`:**
- Which role types and companies have led to interviews (signals strong fit areas)
- Which applications did not progress (calibrates the experience match in `04-job-evaluation.md`)

---

## Why this folder exists

On a public fork, `/setup` would otherwise write your name, phone, and email into tracked files (`CLAUDE.md`, the skill files, `cv/main_example.tex`). Keeping every personalized file under one gitignored root means you can push the repo without redacting anything, and move machines by copying one folder.

**If you ever do commit personal data by accident:** `git rm` in a later commit does not remove it from history. You need `git filter-repo`, or a fresh squashed branch.
