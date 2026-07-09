# Search Queries for Job Scraper

<!-- TEMPLATE: this file is tracked and must keep its [PLACEHOLDER] tokens. -->
<!-- /setup copies it to personal/search-queries.md and fills it in there. -->

## Search Sites

**Portals with a CLI skill** (preferred — `/search` calls these directly, no WebSearch needed):
- **linkedin-search** — any location, free-text (`-l "[YOUR_CITY], [YOUR_PROVINCE], Canada"`)
- **freehire-search** — `--country CA`. Tech/data/engineering roles only.

**Portals without a CLI skill** (reached via `site:` WebSearch fallback). Run `/add-portal` to promote any of these to a proper CLI skill:
- **indeed.ca** — largest Canadian aggregator
- **jobbank.gc.ca** — Government of Canada Job Bank
- **glassdoor.ca** — listings plus company reviews
- **eluta.ca** — indexes Canadian employer career pages directly
- **jobillico.com** — Quebec-focused (French postings)

**Company career pages:** direct `site:` searches for known target employers.

## Query Categories

Queries are grouped by priority. Combine each with your location terms (e.g. "[YOUR_CITY]", "[YOUR_PROVINCE]", "Remote") where the site supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

These match your strongest and most desired career direction.

```
site:indeed.ca "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
site:jobbank.gc.ca "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
site:ca.linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_PROVINCE]
```

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

These match your domain expertise.

```
site:indeed.ca [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] OR [YOUR_PROVINCE]
site:eluta.ca [YOUR_DOMAIN_KEYWORD_2] [YOUR_CITY]
site:ca.linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY]
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
site:indeed.ca "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL] [YOUR_CITY]
site:jobbank.gc.ca "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Priority 4: Broader Technical / Consulting

Wider net for general technical roles.

```
site:indeed.ca [YOUR_KEY_SKILL] developer [YOUR_CITY]
site:ca.linkedin.com/jobs "[YOUR_KEY_SKILL] developer" [YOUR_CITY]
site:glassdoor.ca "technical consultant" [YOUR_DOMAIN] [YOUR_CITY]
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home. Define acceptable areas:
- [YOUR_CITY] and surrounding areas
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (borderline - ~X min by transit)
- [TOO_FAR_AREA] (too far)

Also decide how to treat **Remote (Canada)** and **Hybrid** postings — these are common in the Canadian market and often fall outside a pure commute filter.

## Language

Postings in Quebec are frequently in French. Include them if you can work in French. Otherwise exclude `jobillico.com` and add `-site:jobillico.com` to broad queries.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/search [focus_area]" -> relevant category queries + custom focus-specific queries
