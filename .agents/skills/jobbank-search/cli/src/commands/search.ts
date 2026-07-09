import {
  buildSearchUrl,
  htmlFetch,
  parseJobCards,
  parseTotal,
  resolveLocation,
  LocationError,
  writeError,
  type JobCard,
  type Lang,
  type ResolvedLocation,
  type Sort,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage?: number
  remote?: string
  page: number
  limit?: number
  sort: Sort
  lang: Lang
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header =
    "ID".padEnd(10) +
    " " +
    "TITLE".padEnd(38) +
    " " +
    "COMPANY".padEnd(28) +
    " " +
    "LOCATION".padEnd(22) +
    " DATE"
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 38).padEnd(38)
    const company = (c.company || "-").slice(0, 28).padEnd(28)
    const loc = (c.location || "-").slice(0, 22).padEnd(22)
    return `${c.id.padEnd(10)} ${title} ${company} ${loc} ${c.date || "-"}`
  })
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

function renderPlain(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  return cards
    .map((c) => {
      const bits = [c.company || "-", c.location || "-", c.date || "-"]
      if (c.salary) bits.push(c.salary)
      if (c.remote) bits.push(c.remote)
      return `${c.title}\n  ${bits.join(" · ")}\n  id: ${c.id}\n  ${c.url}`
    })
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  let location: ResolvedLocation | null = null
  if (opts.location) {
    try {
      location = await resolveLocation(opts.location, opts.lang)
    } catch (e) {
      if (e instanceof LocationError) {
        writeError(e.message, e.code)
        return 1
      }
      writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
      return 1
    }
  }

  try {
    const url = buildSearchUrl({
      query: opts.query,
      location,
      jobage: opts.jobage,
      remote: opts.remote,
      page: opts.page,
      sort: opts.sort,
    })
    const html = await htmlFetch(url)
    const total = parseTotal(html)
    let cards = parseJobCards(html)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(cards) + "\n")
    } else {
      const meta = {
        count: cards.length,
        page: opts.page,
        total,
        query: opts.query ?? null,
        location: location
          ? { kind: location.kind, name: location.name, province: location.provinceCode }
          : null,
        sort: opts.sort,
        url,
      }
      process.stdout.write(JSON.stringify({ meta, results: cards }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
