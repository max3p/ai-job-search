# Search Queries for /search

<!-- TEMPLATE: this file is tracked and must keep its [PLACEHOLDER] tokens. -->
<!-- /setup copies it to personal/search-queries.md and fills it in there. -->

## Portals

All three portals have a CLI skill, so `/search` calls them directly. There is no
routine WebSearch step — `/search` reads each portal's `SKILL.md` for its real flags
and must never guess them.

| Skill | Coverage | Location flag |
|-------|----------|---------------|
| `jobbank-search` | Government of Canada Job Bank. Every sector and occupation, every province. Broadest coverage, especially trades, healthcare, and regional employers. | `-l "[YOUR_CITY]"` (city search includes the surrounding commuting area) |
| `linkedin-search` | Any location, free text. Strong for corporate and tech roles. | `-l "[YOUR_CITY], [YOUR_PROVINCE], Canada"` |
| `freehire-search` | ~50 ATS platforms (Greenhouse, Lever, Ashby). **This is the startup channel** — where small companies actually post. Tech/data/engineering roles only. | `--country CA` |

Scope every query to the last 14 days with each portal's recency flag: `--jobage 14`
for `jobbank-search`, `linkedin-search`, and `freehire-search`.

### Boards deliberately not used

Their `robots.txt` disallows the search or job-view paths, so `/search` cannot fetch
a posting to score it without violating the site's crawl policy:

- `ca.indeed.com` — `Disallow: /viewjob?`
- `glassdoor.ca` — `Disallow: /search/`, `Disallow: /jobview/`
- `eluta.ca` — `Disallow: /search/`
- `ca.talent.com` — `Disallow: /search-jobs/*`

Job Bank aggregates feeds from several of these anyway, so the coverage loss is small.
Do not add `site:` queries for them.

### Fallback if `bun` is unavailable

Only `jobbank.gc.ca` permits fetching postings (its `robots.txt` has no `Disallow`
rules, only `Crawl-delay: 5`). Use `site:jobbank.gc.ca "<role>" [YOUR_CITY]` via
WebSearch and report the degraded coverage explicitly.

**Company career pages:** direct `site:` searches for specific target employers are
always fine.

---

## Query Categories

Queries are grouped by priority. Translate each into the target portal's own flags.
Combine with your location terms ("[YOUR_CITY]", "[YOUR_PROVINCE]", "Remote") where
the portal supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

Your strongest and most desired career direction.

```
jobbank-search   -q "[YOUR_PRIMARY_JOB_TITLE]"  -l "[YOUR_CITY]"        --jobage 14
linkedin-search  -q "[YOUR_PRIMARY_JOB_TITLE]"  -l "[YOUR_CITY], [YOUR_PROVINCE], Canada" --jobage 14
freehire-search  -q "[YOUR_PRIMARY_JOB_TITLE]"  --country CA           --jobage 14
```

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

Your domain expertise.

```
jobbank-search   -q "[YOUR_DOMAIN_KEYWORD_1]"   -l "[YOUR_CITY]"       --jobage 14
linkedin-search  -q "[YOUR_DOMAIN_KEYWORD_1]"   -l "[YOUR_CITY], [YOUR_PROVINCE], Canada" --jobage 14
freehire-search  -q "[YOUR_DOMAIN_KEYWORD_2]"   --country CA           --jobage 14
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
jobbank-search   -q "[YOUR_ADJACENT_TITLE_1]"   -l "[YOUR_CITY]"       --jobage 14
linkedin-search  -q "[YOUR_ADJACENT_TITLE_2]"   -l "[YOUR_CITY], [YOUR_PROVINCE], Canada" --jobage 14
```

### Priority 4: Broader net

Wider sweep for general roles in your field.

```
jobbank-search   -q "[YOUR_KEY_SKILL]"          -l "[YOUR_PROVINCE]"   --jobage 14
freehire-search  -q "[YOUR_KEY_SKILL]"          --country CA --remote remote --jobage 14
```

---

## Location Filter

Verify each job's location is within reasonable commute distance. Define your tiers:

- [YOUR_CITY] and surrounding areas
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (borderline - ~X min by transit)
- [TOO_FAR_AREA] (too far — location FAIL, vetoes the job)

Decide how to treat **Remote (Canada)** and **Hybrid** postings. Both are common here
and fall outside a pure commute filter. All three portals support a remote flag
(`--remote remote` / `--remote hybrid`).

Note that `jobbank-search -l "[YOUR_CITY]"` already includes the surrounding commuting
area, so it will surface suburbs you did not name.

## Language

Job Bank carries French postings, mostly from Quebec. `--lang fr` switches the city
lookup. Include French postings only if you can work in French.

## Date Filter

Only include jobs posted within the last 14 days, or whose application deadline has not
passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user names a focus area, select queries from the matching category and generate
2-3 custom queries for that focus:

- `/search [focus_area]` -> matching category queries + custom focus-specific queries
