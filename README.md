<p align="center">
  <img src="claude_animation.gif" alt="AI Job Search" width="200">
</p>

# AI Job Search — Canada

Finds openings on Canadian job boards, scores each one against your profile — including whether the employer is the size and stage you actually do well at — and hands you a ranked shortlist. You apply yourself. Then you tell it what you did, so it never shows you that job again.

**It does not write applications.** No CV tailoring, no cover letters, no LaTeX. One command to find work, one to record it.

> Forked from [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search). Independent open-source project, not affiliated with or endorsed by Anthropic.

## The loop

```
        /search                       (you)              /outcome <company>
           |                            |                        |
           v                            v                        v
  Search portals, score each      Apply on the         Record it. Archive the
  posting, rank by fit            company's site       posting. Feed the dedup.
           ^                                                     |
           └──────────── never shows you that job again ─────────┘
```

Two layers of dedup. `personal/seen_jobs.json` remembers every posting ever surfaced, by URL. `personal/job_search_tracker.csv` remembers every application, by company and role — which catches the same job reposted under a fresh URL.

## Commands

| Command | What it does |
|---------|--------------|
| `/setup` | Build your profile from documents, a pasted CV, or an interview |
| `/search` | Find, score, and rank new postings in one pass |
| `/outcome <company>` | Record an application and what came of it |
| `/add-portal` | Generate a search CLI for another job board |

## How postings get scored

Six dimensions, weighted, from [personal/profile/04-job-evaluation.md](personal/README.md):

| Dimension | Weight |
|-----------|--------|
| Technical Skills | 25% |
| Experience Match | 25% |
| **Company Profile Fit** | **20%** |
| Career Alignment | 20% |
| Behavioral Fit | 10% |

Location is pass/fail — a job requiring relocation is excluded no matter how well it scores.

**Company Profile Fit** is the unusual one. For each employer, `/search` spends two or three quick lookups establishing headcount band, funding stage, HQ, and sector, then scores how well that shape matches where you do your best work. A great role at a 40,000-person bank can rank below a good role at a 40-person startup. Results are cached in `personal/companies.json`, so each company is researched once, not once per posting.

Anything it can't establish quickly is recorded as `unknown` and scored neutral with a `?` marker. It never guesses a headcount from a company's name.

The weights are a knob. Edit them and the next `/search` re-ranks.

## Your data lives in one place

Everything personal is under `personal/`, gitignored except its README. Copy that one folder to move between machines. Push the repo without redacting anything.

See [personal/README.md](personal/README.md) for the layout.

## Job portals

Three, all with a CLI skill, so `/search` calls them directly rather than scraping Google.

| Skill | Coverage |
|-------|----------|
| `jobbank-search` | Government of Canada Job Bank. Every sector and occupation, every province. Broadest coverage. |
| `linkedin-search` | Any country, free-text location (`-l "Toronto, Ontario, Canada"`) |
| `freehire-search` | ~50 ATS platforms (Greenhouse, Lever, Ashby) — the startup channel. `--country CA`. Tech roles only. |

All three are public, unauthenticated, zero-runtime-dependency, and personal-use only.

**Deliberately excluded:** Indeed.ca (`Disallow: /viewjob?`), Glassdoor.ca (`Disallow: /search/`, `/jobview/`), Eluta.ca (`Disallow: /search/`), and Talent.com (`Disallow: /search-jobs/*`). Each disallows the paths `/search` would need to fetch a posting and score it. Job Bank aggregates feeds from several of them anyway.

Add another board with `/add-portal` — it investigates the site, checks `robots.txt`, scaffolds a CLI matching the shared contract, and refuses auth-walled portals.

## Prerequisites

- [Claude Code](https://claude.com/claude-code)
- [Bun](https://bun.sh) — the only dependency. Without it, `/search` falls back to WebSearch and loses structured portal results.

That's it. No Python, no LaTeX, no TeX distribution.

## Quick start

```bash
# Portal CLIs have zero runtime deps; this only pulls TypeScript types
cd .agents/skills/jobbank-search/cli  && bun install && cd ../../../..
cd .agents/skills/linkedin-search/cli && bun install && cd ../../../..
cd .agents/skills/freehire-search/cli && bun install && cd ../../../..
```

Drop your CV, LinkedIn export, diplomas, and reference letters into `personal/documents/`, then inside Claude Code:

```
/setup      # build your profile
/search     # find and rank jobs
```

Apply to what you like. Then `/outcome <company>`.

`/search` also takes `/search data science` (focus a category), `/search broad` (all categories), `--top N`, and `--all` (re-score everything, e.g. after changing the weights).

## Repo layout

```
personal/                  Your data. Gitignored. Portable.
.claude/commands/          /setup, /outcome, /add-portal
.claude/skills/job-search/ The /search skill + query template
.claude/profile-templates/ Tracked placeholder profile files
.agents/skills/            Portal search CLIs (bun)
```

## License

MIT — see [LICENSE](LICENSE). Upstream copyright is retained as the license requires.
