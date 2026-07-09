# Job Application Assistant

## Role
This repo is a job application workspace targeting the **Canadian job market**. Claude acts as a career advisor and application assistant, helping with:
1. **Job discovery** - Search job portals, deduplicate against what has already been seen and applied to
2. **Job fit evaluation** - Assess postings against the candidate profile (skills, experience, behavioral traits)
3. **CV tailoring** - Adapt LaTeX/moderncv templates to target specific roles
4. **Cover letter writing** - Draft targeted cover letters using the `cover.cls` template
5. **Career strategy** - Advise on positioning and personal branding

The candidate applies to jobs **manually**. This repo finds and ranks openings, drafts the documents, and records what was applied to. It never submits an application.

## Candidate Profile

The profile is **not stored in this file**. It lives under `personal/`, which is gitignored so that a public fork never carries personal data.

| What | Where |
|------|-------|
| Profile, behavioral assessment, writing style, fit framework | `personal/profile/01`–`06-*.md` |
| Search strategy for `/scrape` | `personal/search-queries.md` |
| Master LaTeX CV | `personal/cv_base.tex` |
| Application ledger (dedup source of truth) | `personal/job_search_tracker.csv` |
| Jobs already surfaced by `/scrape` | `personal/seen_jobs.json` |
| Per-application archive | `personal/applications/<company>_<role>/` |

Read `personal/profile/01-candidate-profile.md` before any job-application work. If `personal/` does not exist, tell the user to run `/setup` — see `personal/README.md` for the bootstrap commands.

Pristine placeholder copies live in `.claude/skills/job-application-assistant/profile-templates/` and `.claude/skills/job-scraper/search-queries.template.md`. **Never write personal data into those**, or into `cv/main_example.tex` — they are tracked.

## Repo Structure
- `personal/` - All personal data. Gitignored except its README. Portable between machines.
- `cv/` - LaTeX CV build workspace (moderncv, banking style). `main_example.tex` is a tracked placeholder; `main_<company>.tex` drafts are gitignored.
- `cover_letters/` - LaTeX cover letter build workspace (`cover.cls` + bundled fonts). Drafts compile here because `cover.cls` resolves `OpenFonts/` relative to the compile directory.
- `.claude/commands/` - `/setup`, `/scrape`, `/rank`, `/apply`, `/outcome`, `/add-portal`, `/add-template`
- `.claude/skills/` - Skill definitions and tracked profile templates
- `.agents/skills/` - Job-portal search CLIs (`linkedin-search`, `freehire-search`). Require `bun`.
- `templates/` - User-registered LaTeX templates (via `/add-template`)

## Workflow
1. `/scrape` finds new postings and dedupes against `seen_jobs.json` + the tracker
2. `/rank` triage-scores them into a shortlist
3. `/apply <url>` evaluates fit, then drafts a tailored CV and cover letter
4. **Verify both documents** (see Verification Checklist below)
5. The user submits the application by hand
6. `/outcome <company>` records what was applied to and what happened

**Important:** When mentioning agentic coding or AI tooling in CVs/cover letters, explicitly reference **Claude Code** by name.

## Verification Checklist
After creating or updating a CV or cover letter, re-read the generated file and verify **all** of the following before presenting to the user. Report the results as a pass/fail checklist.

### Factual accuracy
- [ ] All claims match the actual profile (`personal/profile/01-candidate-profile.md`) - no fabricated skills, experience, or achievements
- [ ] Job titles, dates, company names, and locations are correct
- [ ] Contact details are correct
- [ ] All company-specific claims (partnerships, products, technology, expansions) have been independently verified via WebFetch/WebSearch - do not trust reviewer agent research without verification

### Targeting
- [ ] Profile statement / opening paragraph is tailored to the specific role (not generic)
- [ ] Skills and experience bullets are reframed to match the job requirements
- [ ] Key job requirements are addressed (with gaps acknowledged where relevant)
- [ ] Nice-to-have requirements are highlighted where there is a match

### Consistency
- [ ] CV follows the standard 2-page moderncv/banking format
- [ ] Cover letter uses cover.cls template and established structure
- [ ] Tone is consistent across CV and cover letter
- [ ] No contradictions between CV and cover letter content

### Quality
- [ ] No LaTeX syntax errors (balanced braces, correct commands)
- [ ] No spelling or grammar errors, and spelling follows Canadian convention
- [ ] Agentic coding / AI tooling references mention **Claude Code** by name
- [ ] Cover letter is addressed to the correct person (or "Dear Hiring Manager" if unknown)
- [ ] Cover letter fits approximately one page

### Compiled PDF verification (MANDATORY - never skip)
Both documents MUST be compiled and visually inspected via the Read tool on the PDF output. "Looks fine in the .tex" is not acceptable - LaTeX page-break decisions are unpredictable. Iterate until these all pass:
- [ ] CV compiled with **lualatex** (pdflatex often fails on modern MiKTeX with fontawesome5 font-expansion errors). Cover letter compiled with **xelatex** (cover.cls requires fontspec).
- [ ] **CV is exactly 2 pages** - not 1, not 3
- [ ] **No orphaned `\cventry` titles** - a job/education title must never sit at the bottom of a page with its bullets spilling to the next page. Use `\needspace{5\baselineskip}` before each `\cventry` to prevent this, and `\enlargethispage{2-3\baselineskip}` to rescue a trailing section that just barely spills
- [ ] **Cover letter is exactly 1 page** - signature block must fit with the body, never overflow
- [ ] **Cover letter bullet font matches body font** - `\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}` (the command's trailing `\\` errors on `\end{itemize}`, and moving itemize outside loses the Raleway font). Standard pattern: close `\lettercontent{}`, then wrap the list in `{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`

### ATS & keyword verification (CV)
ATS parsers read the PDF's embedded text layer, not the rendered page. Extract it with `pdftotext -layout` and verify what a parser sees. `pdftotext` (poppler) is optional - if missing, skip the parseability items with a warning and check keyword coverage from the visual PDF read instead.
- [ ] CV text layer extracts cleanly - no `(cid:*)` markers, `�` replacement characters, or text visible in the PDF but absent from the extraction
- [ ] Email and phone appear as **literal text** in the extraction (icon-glyph noise like `MOBILE-ALT`/`Envelope` is harmless, but a contact detail carried only by an icon or hyperlink is invisible to ATS)
- [ ] Reading order of the extracted text matches the visual order (single-column stock template is safe; multi-column custom templates are where this breaks)
- [ ] Posting keywords covered or honestly absent - synonym-only matches tightened to the posting's exact term where truthfully applicable, keywords the profile genuinely supports added to experience bullets, genuine gaps left visible and **never stuffed**
