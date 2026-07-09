# jobbank-cli

A zero-dependency CLI for searching [Job Bank / Guichet-Emplois](https://www.jobbank.gc.ca),
the Government of Canada's national job board. Public pages only — no authentication,
no API key. Runs on `bun` alone; `bun install` pulls dev-only type packages.

## Install

```bash
cd .agents/skills/jobbank-search/cli && bun install
```

(Only needed for `typecheck` and editor types — the CLI runs without it.)

## Usage

```bash
bun run src/cli.ts search -q "software developer" -l "Toronto, ON" --jobage 7 --format table
bun run src/cli.ts detail 49859521 --format plain
bun run src/cli.ts --help
```

See `../SKILL.md` for the full flag reference and `../url-reference.md` for the
endpoint documentation.

## Design

- **Zero runtime dependencies.** Plain `fetch` plus chunked regex parsing, matching
  the `linkedin-search` reference skill. `bun install` only adds `typescript` and
  `@types/bun`.
- **The search page, not the RSS feed.** Job Bank's Atom feed accepts a keyword and
  silently ignores it, returning unrelated newest-first postings. Only the HTML search
  page's `searchstring` parameter actually filters. See `url-reference.md`.
- **RDFa over class names.** Posting detail is read from `property="…"` microdata
  (`datePosted`, `hiringOrganization`, `baseSalary`), which is far more stable than the
  presentational markup.
- **Resilient card parsing.** Results are split per `<article>` and parsed
  independently, so one malformed card cannot break the page.
- **Honest nulls.** A field Job Bank does not supply comes back `null`. Nothing is
  inferred from a company name or a posting's tone.
- **Polite by default.** `robots.txt` asks for `Crawl-delay: 5`; the fetcher spaces
  requests accordingly and backs off exponentially on 429/5xx.

## Development

```bash
bun run typecheck     # tsc --noEmit
bun run test          # bun test --timeout 30000
```

`tests/parsing.test.ts` is offline and pins the parsers against fixtures captured from
real pages — including a regression test that the keyword goes in `searchstring` and
never in `term`. `tests/search.test.ts` and `tests/cli-flag-validation.test.ts` hit the
live site with a handful of requests; they set `JOBBANK_CRAWL_DELAY_MS=0` so the suite
finishes in seconds.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `JOBBANK_CRAWL_DELAY_MS` | `5000` | Gap between successive requests (robots.txt `Crawl-delay: 5`). |

## Errors

Written to stderr as `{"error":"...","code":"..."}` with exit code `1`.

| Code | Meaning |
|------|---------|
| `BAD_CMD` | Unknown command |
| `BAD_ARG` | Malformed flag value |
| `NO_ID` / `BAD_ID` | `detail` called without a parseable posting id |
| `LOCATION_NOT_FOUND` | `--location` matched no Canadian city or province |
| `EXPIRED` | Posting redirected to `jobpostingexpired` (gone or never existed) |
| `NOT_FOUND` | Posting returned an empty page |
| `SEARCH_FAILED` / `DETAIL_FAILED` | Network or parse failure |
