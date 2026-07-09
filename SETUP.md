# Setup Guide

Getting this fork running. Windows-first, since that is where it is used.

## 1. Prerequisites

### Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

Requires an Anthropic API key or a Claude subscription. See the [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code).

### Bun

The only other dependency. The portal search CLIs (`jobbank-search`, `linkedin-search`, `freehire-search`) are TypeScript and run with Bun. Without it, `/search` falls back to `WebSearch` against Job Bank alone and loses most of its coverage.

```powershell
winget install Oven-sh.Bun
```

Or: `powershell -ExecutionPolicy Bypass -c "irm https://bun.sh/install.ps1 | iex"`

On macOS/Linux: `curl -fsSL https://bun.sh/install | bash`

Verify:

```bash
bun --version
```

There is no Python, LaTeX, or `pdftotext` requirement. This workspace does not generate documents.

## 2. Install the portal CLIs

From the repo root. Both skills have zero runtime dependencies — `bun install` only pulls TypeScript dev types, so this step is optional if you don't care about typechecking.

PowerShell:

```powershell
$tools = @("jobbank-search", "linkedin-search", "freehire-search")
foreach ($tool in $tools) {
  Set-Location ".agents/skills/$tool/cli"
  bun install
  Set-Location "..\..\..\.."
}
```

Bash / Git Bash:

```bash
cd .agents/skills/jobbank-search/cli  && bun install && cd ../../../..
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
cd .agents/skills/freehire-search/cli && bun install && cd ../../../..
```

Verify all three work end to end:

```bash
bun run .agents/skills/jobbank-search/cli/src/cli.ts  search -q "data scientist" -l "Toronto" --limit 3 --format table
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "data scientist" -l "Toronto, Ontario, Canada" --limit 3 --format table
bun run .agents/skills/freehire-search/cli/src/cli.ts search -q "data scientist" --country CA --limit 3 --format table
```

## 3. Create your personal folder

`personal/` is gitignored, so a fresh clone has only its README. Either **copy the folder over from another machine**, or bootstrap it:

Bash / Git Bash:

```bash
mkdir -p personal/profile personal/applications
mkdir -p personal/documents/{cv,linkedin,diplomas,references}
cp .claude/profile-templates/*.md personal/profile/
cp .claude/skills/job-search/search-queries.template.md personal/search-queries.md
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force personal/profile, personal/applications,
  personal/documents/cv, personal/documents/linkedin,
  personal/documents/diplomas, personal/documents/references
Copy-Item .claude/profile-templates/*.md personal/profile/
Copy-Item .claude/skills/job-search/search-queries.template.md personal/search-queries.md
```

Then drop your master CV, LinkedIn PDF export, diplomas, and reference letters into the matching `personal/documents/` subfolders. See [personal/README.md](personal/README.md) for what `/setup` extracts from each.

## 4. Build your profile

```bash
claude
```

Then:

```
/setup
```

It auto-detects what is in `personal/documents/` and offers three paths: read the documents folder, import a single pasted CV, or walk through a structured interview. Documents mode is idempotent — re-run it as you add material.

`/setup` writes only into `personal/`. It will not touch `CLAUDE.md` or the tracked profile templates.

**Answer the company size and stage questions carefully.** Company Profile Fit is 20% of every future ranking. "Startups" is not a useful answer — an 8-person pre-seed and a 300-person Series C are both startups and nothing alike.

## 5. Find jobs

```
/search
```

Variants:

| Command | Effect |
|---------|--------|
| `/search` | Top 3 query categories |
| `/search data science` | Focus one category, plus custom queries for it |
| `/search broad` | All query categories |
| `/search --top 15` | Bigger shortlist (default 8) |
| `/search --all` | Re-score everything, including previously scored jobs |

Use `--all` after editing your profile or the weights table in `personal/profile/04-job-evaluation.md`.

## 6. Record every application

```
/outcome <company>
```

Run it **after every application you submit**, then again whenever the status changes.

This is the only thing that writes `personal/job_search_tracker.csv`, and the tracker is what stops `/search` resurfacing a role you already applied to when the company reposts it under a new URL. Skip it and duplicate applications become likely.

After three resolved applications, `/setup` (Path A) will fold them back into your fit framework — calibrating scores from what actually got you interviews, including which company sizes responded.

## Moving between machines

Copy `personal/`. That is the whole migration — profile, search queries, tracker, dedup state, company cache, and every archived application.

**Never commit it.** `git rm` in a later commit does not remove data from history; you would need `git filter-repo` or a fresh squashed branch.
