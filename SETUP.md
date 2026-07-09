# Setup Guide

Getting this fork running. Windows-first, since that is where it is used.

## 1. Prerequisites

### Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Requires an Anthropic API key or a Claude subscription. See the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code).

### Bun

The portal search CLIs (`linkedin-search`, `freehire-search`) are TypeScript and run with Bun. Without Bun, `/scrape` falls back to `WebSearch` and loses structured results.

```powershell
winget install Oven-sh.Bun
```

Or: `powershell -ExecutionPolicy Bypass -c "irm https://bun.sh/install.ps1 | iex"`

On macOS/Linux: `curl -fsSL https://bun.sh/install | bash`

### LaTeX

Needed to compile the generated CV and cover letter. `/apply` treats the compile-and-inspect step as mandatory, so without LaTeX it will draft `.tex` files and then fail.

- **Windows:** [MiKTeX](https://miktex.org/download)
- **macOS:** [MacTeX](https://tug.org/mactex/)
- **Linux:** `sudo apt install texlive-full`

Two engines are required, and they are not interchangeable:

- **`lualatex`** compiles the CV. `pdflatex` fails on modern MiKTeX with `fontawesome5` font-expansion errors.
- **`xelatex`** compiles the cover letter, because `cover.cls` requires `fontspec` for its bundled Lato/Raleway fonts.

Verify both:

```bash
lualatex --version
xelatex --version
```

#### Minimal TeX installs (TinyTeX / BasicTeX)

Full distributions work out of the box. Minimal ones need the template's packages:

```bash
tlmgr install \
  moderncv fontawesome5 fontawesome6 academicons import luatexbase pgf \
  titlesec textpos xltxtra xunicode cite realscripts needspace
```

#### Smoke test

```bash
cd cv && lualatex -interaction=nonstopmode -halt-on-error main_example.tex && cd ..
cd cover_letters && xelatex -interaction=nonstopmode -halt-on-error cover_example.tex && cd ..
```

Both must compile from **inside their own directory**. `cover.cls` resolves fonts via `Path = OpenFonts/fonts/lato/`, which is relative to the compile working directory — this is why generated drafts are written to `cv/` and `cover_letters/` rather than into `personal/`.

### Optional: pdftotext

`/apply` runs an ATS parseability check on the compiled CV, extracting the PDF text layer to verify contact details, reading order, and keyword coverage the way an applicant-tracking system sees them. This needs `pdftotext` from [poppler](https://poppler.freedesktop.org/), which is not part of any TeX distribution.

- **Windows:** `choco install poppler`
- **macOS:** `brew install poppler`
- **Debian/Ubuntu:** `sudo apt install poppler-utils`

If missing, `/apply` warns once and falls back to a visual keyword review. Everything else works.

## 2. Install the portal CLIs

From the repo root. Both skills have zero runtime dependencies — `bun install` only pulls TypeScript dev types, so this step is optional if you don't care about typechecking.

PowerShell:

```powershell
$tools = @("linkedin-search", "freehire-search")
foreach ($tool in $tools) {
  Set-Location ".agents/skills/$tool/cli"
  bun install
  Set-Location "..\..\..\.."
}
```

Bash / Git Bash:

```bash
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
cd .agents/skills/freehire-search/cli && bun install && cd ../../../..
```

Verify one works:

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "data scientist" -l "Toronto, Ontario, Canada" --limit 5 --format table
```

## 3. Create your personal folder

`personal/` is gitignored, so a fresh clone has only its README. Either **copy the folder over from another machine**, or bootstrap it:

```bash
mkdir -p personal/profile personal/applications
mkdir -p personal/documents/{cv,linkedin,diplomas,references}
cp .claude/skills/job-application-assistant/profile-templates/*.md personal/profile/
cp .claude/skills/job-scraper/search-queries.template.md personal/search-queries.md
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force personal/profile, personal/applications,
  personal/documents/cv, personal/documents/linkedin,
  personal/documents/diplomas, personal/documents/references
Copy-Item .claude/skills/job-application-assistant/profile-templates/*.md personal/profile/
Copy-Item .claude/skills/job-scraper/search-queries.template.md personal/search-queries.md
```

Then drop your master CV, LinkedIn PDF export, diplomas, and reference letters into the matching `personal/documents/` subfolders. See [personal/README.md](personal/README.md) for what `/setup` extracts from each.

## 4. Build your profile

```bash
claude
```

Then, inside Claude Code:

```
/setup
```

It auto-detects what is in `personal/documents/` and offers three paths: read the documents folder, import a single pasted CV, or walk through a structured interview. Documents mode is idempotent — re-run it as you add material.

`/setup` writes only into `personal/`. It will not touch `CLAUDE.md`, `cv/main_example.tex`, or the tracked profile templates.

## 5. Find and apply

```
/scrape          # search portals, dedupe, present new matches
/rank            # batch-score them into a shortlist
/apply <url>     # evaluate fit, draft tailored CV + cover letter
```

Submit the application yourself, then:

```
/outcome <company>
```

This records it in `personal/job_search_tracker.csv` and archives the posting and submitted drafts under `personal/applications/<company>_<role>/`. `/scrape` and `/rank` read the tracker as an exclusion set, so a recorded application never resurfaces.

## Moving between machines

Copy `personal/`. That is the whole migration — profile, search queries, master CV, tracker, dedup state, and every archived application.

**Never commit it.** `git rm` in a later commit does not remove data from history; you would need `git filter-repo` or a fresh squashed branch.
