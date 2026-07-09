#!/usr/bin/env bun
// Self-contained CLI for searching Job Bank / Guichet-Emplois, the Government of
// Canada's national job board. Public pages, no authentication, no API key, and
// zero runtime dependencies — it runs anywhere `bun` is available.
//
// robots.txt permits every path and asks for a 5-second crawl delay, which the
// fetcher honors. Keep volume low anyway.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { writeError, type Lang, type Sort } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `jobbank-cli — search jobs on Job Bank / Guichet-Emplois (Canada)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords (job title, skill, or role). Recommended.
  --location, -l <place>  City ("Toronto"), city+province ("London, ON"),
                          province ("Ontario" or "ON"), or "Canada".
                          Default: all of Canada. A city also matches its
                          surrounding commuting area.
  --jobage <days>         Posted within N days (e.g. 1, 7, 14, 30). Default: all.
  --remote <mode>         remote | hybrid | onsite. Filter by workplace type.
  --sort <mode>           date (default) | match  (relevance).
  --page <n>              1-indexed page (25 results/page). Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --lang <en|fr>          Language for city lookup. Default en.
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "software developer" -l "Toronto, ON" --jobage 7 --format table
  bun run src/cli.ts search -q "data analyst" -l "Ontario" --remote remote --format table
  bun run src/cli.ts search -q "infirmiere" -l "Montreal, QC" --lang fr --format table
  bun run src/cli.ts search -q "millwright" --jobage 30 --limit 10
  bun run src/cli.ts detail 49859521 --format plain

ENVIRONMENT
  JOBBANK_CRAWL_DELAY_MS  Gap between requests. Default 5000 (robots.txt Crawl-delay: 5).

Errors are written to stderr as {"error":"...","code":"..."} with exit code 1.
`

const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
  const val = parseInt(raw as string, 10)
  if (isNaN(val)) {
    writeError(`--${name} must be a number, got "${String(raw)}"`, "BAD_ARG")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    let jobage: number | undefined
    let page = 1
    let limit: number | undefined

    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      jobage = v
    }
    if (flags.page !== undefined) {
      const v = parseIntFlag("page", flags.page)
      if (v === null) return 1
      page = Math.max(1, v)
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit)
      if (v === null) return 1
      limit = v
    }

    const remote = typeof flags.remote === "string" ? flags.remote : undefined
    if (remote && !["remote", "hybrid", "onsite", "on-site"].includes(remote.toLowerCase())) {
      writeError(`--remote must be remote|hybrid|onsite, got "${remote}"`, "BAD_ARG")
      return 1
    }

    const sortRaw = typeof flags.sort === "string" ? flags.sort.toLowerCase() : "date"
    if (!["date", "match"].includes(sortRaw)) {
      writeError(`--sort must be date|match, got "${sortRaw}"`, "BAD_ARG")
      return 1
    }

    const langRaw = typeof flags.lang === "string" ? flags.lang.toLowerCase() : "en"
    if (!["en", "fr"].includes(langRaw)) {
      writeError(`--lang must be en|fr, got "${langRaw}"`, "BAD_ARG")
      return 1
    }

    const fmt = typeof flags.format === "string" ? flags.format : "json"

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      jobage,
      remote,
      page,
      limit,
      sort: sortRaw as Sort,
      lang: langRaw as Lang,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      writeError("detail requires an <id|url>", "NO_ID")
      return 1
    }
    const fmt = typeof flags.format === "string" ? flags.format : "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  writeError(`Unknown command "${cmd}"`, "BAD_CMD")
  return 1
}

main().then((code) => process.exit(code))
