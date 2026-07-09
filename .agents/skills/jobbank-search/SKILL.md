---
name: jobbank-search
version: 1.0.0
description: >
  Use this skill to search Job Bank (Guichet-Emplois), the Government of Canada's
  national job board, for openings anywhere in Canada — any province, city, or
  remote. Covers every sector and occupation (trades, healthcare, software, admin,
  transport, education, hospitality). Postings come from employers directly and
  from aggregated boards. Trigger phrases (English): Job Bank, jobbank.gc.ca,
  Canadian jobs, jobs in Canada, jobs in Toronto/Vancouver/Montreal/Calgary/Ottawa,
  find a job in Canada, government job board, NOC code jobs. Trigger phrases
  (French): Guichet-Emplois, guichetemplois.gc.ca, offres d'emploi, recherche
  d'emploi, emplois au Canada, emplois à Montréal/Québec, trouver un emploi.
context: fork
allowed-tools: Bash(bun run .agents/skills/jobbank-search/cli/src/cli.ts *)
---

# Job Bank Search Skill

Search live job listings from **Job Bank / Guichet-Emplois**, the national job board
operated by Employment and Social Development Canada. No authentication, no API key,
and **zero runtime dependencies** — it runs with just `bun`.

Job Bank carries postings employers submit directly plus feeds from external boards
(Indeed, Talent.com, employer ATSs), so coverage is broad across every occupation —
especially trades, healthcare, and regional employers that never reach LinkedIn.

## Access and courtesy

`jobbank.gc.ca/robots.txt` contains **no `Disallow` rules** — only `Crawl-delay: 5`.
Automated access to the public search and posting pages is permitted. The CLI honors
the 5-second crawl delay between requests automatically. Keep volume sensible anyway:
a search plus a few detail fetches, not a crawl.

## When to use this skill

- Find openings anywhere in Canada by keyword, city, province, or recency
- Filter by workplace type (remote / hybrid / on site)
- Pull a specific posting's full description, salary, deadline, and apply link

## Commands

### Search job listings

```bash
bun run .agents/skills/jobbank-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (job title, skill, role). Recommended.
- `--location <place>` / `-l <place>` — a city (`"Toronto"`), a city with province
  (`"London, ON"` — disambiguates the five Londons), a province (`"Ontario"` or `"ON"`),
  or `"Canada"`. **Default: all of Canada.** A city search also covers its surrounding
  commuting area, so `-l "Toronto"` returns Mississauga and Brampton too.
- `--jobage <days>` — posted within N days, e.g. `1`, `7`, `30`. Omit for all postings.
- `--remote <mode>` — `remote`, `hybrid`, or `onsite`.
- `--sort <mode>` — `date` (default) or `match` (relevance).
- `--page <n>` — page number (1-indexed, 25 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--lang <en|fr>` — language for the city lookup. Default `en`.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/jobbank-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the posting id from `search` results (e.g. `49859521`). A full
`jobbank.gc.ca/jobsearch/jobposting/...` URL works too. Returns the description,
salary, employment type, advertised-until date, and apply link.

## Usage examples

```bash
# Software developer roles in the Toronto area, posted in the last week
bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "software developer" -l "Toronto, ON" --jobage 7 --format table

# Registered nurse jobs across British Columbia
bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "registered nurse" -l "British Columbia" --format table

# Développeur roles in Montréal, using the French city index
bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "developpeur" -l "Montreal" --lang fr --format table

# Millwright jobs anywhere in Canada, last 30 days, top 10
bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "millwright" --jobage 30 --limit 10

# Hybrid data analyst roles in Ottawa
bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "data analyst" -l "Ottawa, ON" --remote hybrid --format table

# Full details for a specific posting
bun run .agents/skills/jobbank-search/cli/src/cli.ts detail 49859521 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing ids to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single posting's full detail (`detail` command) |

JSON search output is `{ "meta": {...}, "results": [...] }`. `meta` carries `count`,
`page`, `total` (all matches Job Bank reports, not just this page), the resolved
`location`, and the exact `url` fetched. Every result has `id`, `title`, `company`,
`location`, `date`, `url`; missing values are `null`, never omitted.

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the
process exits with code `1`.

## Notes

Portal quirks worth knowing — the full evidence is in `url-reference.md`:

- **Titles are NOC-normalized.** Job Bank displays a standardized occupational title
  (`cloud developer`), not always the employer's wording. `detail` returns the
  employer's original title as `originalTitle` when the two differ (`Python Developer`).
- **Expired postings 302 away.** A dead or nonexistent id redirects to
  `jobpostingexpired`; the CLI reports `{"code":"EXPIRED"}` and exits 1 rather than
  returning a partial record.
- **Remote inventory is small.** Roughly 39 fully-remote postings nationally at time of
  writing, so `--remote remote` returning nothing is usually the truth, not a bug.
  `--remote hybrid` is far more productive.
- **Some postings genuinely have no location**, on both the results card and the detail
  page. Those come back as `location: null` rather than a guess.
- **`--location` is a filter, not a hint.** A city id also matches its commuting radius;
  a province code matches the whole province. Omitting it searches all of Canada.
- **`--sort date` is the default** because Job Bank's `sort=M` means *best match*, not
  *most recent* — an easy parameter to misread.
- **The site's RSS/Atom feed silently ignores keywords** unless given a NOC code, so this
  skill parses the HTML search page instead. Do not "optimize" it to use the feed.
- Job numbers (e.g. `3616271`) are the public-facing reference and differ from the
  posting id (e.g. `49859521`) used in URLs and by `detail`.
- Set `JOBBANK_CRAWL_DELAY_MS` to override the 5-second inter-request delay.
