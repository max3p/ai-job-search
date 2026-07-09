<p align="center">
  <img src="claude_animation.gif" alt="AI Job Search Assistant" width="200">
</p>

# AI Job Search — Canada

A personal job application framework built on [Claude Code](https://claude.com/claude-code). It finds openings on Canadian job boards, ranks them against your profile, drafts a tailored CV and cover letter, and keeps a record of everything you applied to so you never apply twice.

**It never submits an application.** You apply by hand, then tell it what you did.

> Forked from [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search). Independent open-source project, not affiliated with or endorsed by Anthropic.

## The loop

```
/scrape            /rank              /apply <url>          (you)         /outcome
   |                 |                    |                   |               |
   v                 v                    v                   v               v
Search portals   Triage-score      Evaluate fit,        Submit the     Record it in the
Dedupe against   into a ranked     draft tailored CV    application    tracker + archive
seen + tracker   shortlist         + cover letter       yourself       -> feeds dedup
```

Dedup is the point. `personal/seen_jobs.json` remembers every posting ever surfaced; `personal/job_search_tracker.csv` remembers every application. `/scrape` and `/rank` both exclude anything in either.

## Commands

| Command | What it does |
|---------|--------------|
| `/setup` | Build your profile from documents, a pasted CV, or an interview |
| `/scrape` | Search the portals, dedupe, present new matches |
| `/rank` | Batch-score new postings into a shortlist |
| `/apply <url>` | Evaluate fit, then draft CV + cover letter with a reviewer agent |
| `/outcome <company>` | Record what you applied to and what happened |
| `/add-portal` | Generate a search skill for a new job board |
| `/add-template` | Register your own LaTeX CV / cover letter template |

## Your data lives in one place

Everything personal is under `personal/`, which is gitignored except its README. Copy that one folder to move between machines. Push the repo without redacting anything.

See [personal/README.md](personal/README.md) for the layout and bootstrap commands.

## Job portals

| Skill | Coverage |
|-------|----------|
| `linkedin-search` | Any country, free-text location (`-l "Toronto, Ontario, Canada"`) |
| `freehire-search` | ~50 ATS platforms, `--country CA`. Tech roles only. |

Both are public, unauthenticated, zero-runtime-dependency, and personal-use only. Add more with `/add-portal` — it investigates the board, scaffolds a CLI matching the shared contract, and refuses auth-walled portals.

## Prerequisites

- [Claude Code](https://claude.com/claude-code)
- [Bun](https://bun.sh) — required by the portal search CLIs. Without it, `/scrape` falls back to WebSearch.
- A LaTeX distribution providing **`lualatex`** and **`xelatex`** — [MiKTeX](https://miktex.org/) or [TeX Live](https://tug.org/texlive/). The CV compiles with `lualatex` (pdflatex fails on modern MiKTeX with `fontawesome5` font-expansion errors); the cover letter needs `xelatex` because `cover.cls` requires `fontspec`.
- Optional: `pdftotext` from [poppler](https://poppler.freedesktop.org/) (`choco install poppler`) — powers `/apply`'s ATS parseability check. Degrades gracefully if absent.

See [SETUP.md](SETUP.md) for install steps.

## Quick start

```bash
# 1. Install portal CLI dev types (zero runtime deps; only pulls TypeScript types)
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
cd .agents/skills/freehire-search/cli && bun install && cd ../../../..
```

Then drop your CV, LinkedIn export, diplomas, and reference letters into `personal/documents/`, and inside Claude Code run:

```
/setup
/scrape
/rank
```

`/setup` offers three paths: read your `personal/documents/` folder, import a single CV pasted in chat, or walk through an interview. It auto-detects what you have. Documents mode is idempotent and safe to re-run.

If a posting URL can't be fetched (some boards block automated access), paste the description directly: `/apply <paste the full job description>`.

## Repo layout

```
personal/          Your data. Gitignored. Portable.
cv/                LaTeX CV build workspace (moderncv, banking style)
cover_letters/     LaTeX cover letter build workspace (cover.cls + fonts)
templates/         Custom LaTeX templates registered via /add-template
.claude/commands/  The slash commands
.claude/skills/    Skill definitions + tracked profile placeholders
.agents/skills/    Portal search CLIs (bun)
```

Drafts compile in `cv/` and `cover_letters/` because `cover.cls` resolves `OpenFonts/` relative to the compile directory. `/outcome` archives the submitted copies into `personal/applications/<company>_<role>/`.

## License

MIT. See [LICENSE](LICENSE).
