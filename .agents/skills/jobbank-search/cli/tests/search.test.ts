import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"

// Live smoke tests. They hit jobbank.gc.ca, so they need network access and a
// handful of requests. Volume is deliberately low (crawl-delay is disabled in
// tests via tests/helpers.ts; each test makes at most two requests).

interface SearchResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
}

interface SearchResponse {
  meta: { count: number; page: number; total: number | null; sort: string }
  results: SearchResult[]
}

describe("search (live)", () => {
  test("returns real, complete results for a keyword", async () => {
    const res = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "software developer", "--limit", "5"]),
    )

    expect(res.results.length).toBeGreaterThan(0)
    expect(res.results.length).toBeLessThanOrEqual(5)
    expect(res.meta.count).toBe(res.results.length)

    for (const job of res.results) {
      expect(job.id).toMatch(/^\d+$/)
      expect(job.title.length).toBeGreaterThan(0)
      expect(job.title).not.toContain("<")
      expect(job.url).toStartWith("https://www.jobbank.gc.ca/jobsearch/jobposting/")
      expect(job.url).not.toContain("jsessionid")
      if (job.date !== null) expect(job.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  test("the keyword actually filters (guards the searchstring/term trap)", async () => {
    // `term=` is silently ignored by Job Bank and yields every job in the
    // location. If a refactor reintroduces it, these titles go generic.
    const res = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "software developer", "--limit", "10"]),
    )
    const hits = res.results.filter((j) => /develop|software|program|cloud/i.test(j.title))
    expect(hits.length).toBeGreaterThan(res.results.length / 2)
  })

  test("a city location narrows results to that province", async () => {
    const res = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "developer", "-l", "Toronto, ON", "--limit", "8"]),
    )
    expect(res.results.length).toBeGreaterThan(0)
    for (const job of res.results) {
      if (job.location) expect(job.location).toContain("(ON)")
    }
  })

  test("--limit caps results and --page advances to different postings", async () => {
    const p1 = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "developer", "--limit", "3", "--page", "1"]),
    )
    const p2 = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "developer", "--limit", "3", "--page", "2"]),
    )
    expect(p1.results).toHaveLength(3)
    expect(p2.meta.page).toBe(2)
    const overlap = p1.results.filter((a) => p2.results.some((b) => b.id === a.id))
    expect(overlap).toHaveLength(0)
  })

  test("table format renders a header and rows", async () => {
    const r = await runCLI(["search", "-q", "software developer", "--limit", "3", "--format", "table"])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain("TITLE")
    expect(r.stdout.split("\n").length).toBeGreaterThan(3)
  })
})

describe("detail (live)", () => {
  test("fetches a readable description for a posting found by search", async () => {
    const res = parseJSON<SearchResponse>(
      await runCLI(["search", "-q", "software developer", "--limit", "1"]),
    )
    const id = res.results[0].id

    const detail = parseJSON<{
      id: string
      title: string
      description: string | null
      url: string
    }>(await runCLI(["detail", id]))

    expect(detail.id).toBe(id)
    expect(detail.title.length).toBeGreaterThan(0)
    expect(detail.description).not.toBeNull()
    expect(detail.description!.length).toBeGreaterThan(40)
    // Entities decoded, tags stripped.
    expect(detail.description).not.toContain("<p>")
    expect(detail.description).not.toContain("&amp;")
  })

  test("reports a nonexistent posting as EXPIRED rather than inventing a record", async () => {
    const r = await runCLI(["detail", "99999999"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(JSON.parse(r.stderr).code).toBe("EXPIRED")
  })
})
