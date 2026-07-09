// Data source: Job Bank (Guichet-Emplois), Employment and Social Development Canada.
// Public pages, no authentication. robots.txt allows every path but asks for a
// 5-second crawl delay, which politeGap() honors between requests.
//
// Search returns a server-rendered HTML results page of <article> job cards.
// Detail is a single posting whose fields are exposed as RDFa `property="..."`
// attributes — a far more stable contract than the presentational class names,
// so we anchor on those wherever possible.

export const BASE = "https://www.jobbank.gc.ca"
export const SEARCH_URL = `${BASE}/jobsearch/jobsearch`
export const DETAIL_URL = `${BASE}/jobsearch/jobposting`

export type Lang = "en" | "fr"

export const suggestUrl = (lang: Lang): string =>
  `${BASE}/core/ta-cityprovsuggest_${lang}/select`

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * jobbank.gc.ca/robots.txt sets `Crawl-delay: 5`. We space successive requests
 * by that much. Tests set JOBBANK_CRAWL_DELAY_MS=0 to keep the suite fast; a
 * single `search` or `detail` invocation makes at most two requests, so the
 * delay is only ever paid once by a human at the terminal.
 */
const rawDelay = Number(process.env.JOBBANK_CRAWL_DELAY_MS ?? 5000)
const CRAWL_DELAY_MS = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 5000

let lastRequestAt = 0

async function politeGap(): Promise<void> {
  if (lastRequestAt !== 0) {
    const wait = CRAWL_DELAY_MS - (Date.now() - lastRequestAt)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  }
  lastRequestAt = Date.now()
}

interface FetchResult {
  status: number
  location: string | null
  body: string
}

/** Fetch with exponential backoff on 429/5xx. Redirects are NOT followed: a
 *  missing or expired posting 302s to /jobsearch/jobpostingexpired, and callers
 *  need to see that rather than the redirect target's HTML. */
async function rawFetch(url: string, accept: string): Promise<FetchResult> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await politeGap()
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: accept,
        "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
      },
      redirect: "manual",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status >= 300 && response.status < 400) {
      return { status: response.status, location: response.headers.get("location"), body: "" }
    }
    if (response.status === 404) return { status: 404, location: null, body: "" }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return { status: response.status, location: null, body: await response.text() }
  }
  throw new Error("Request failed after max retries")
}

/** Fetch an HTML page. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const r = await rawFetch(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
  return r.body
}

/** Fetch a posting page, distinguishing "gone" (302 -> jobpostingexpired) from "here". */
export async function fetchPosting(url: string): Promise<{ html: string; expired: boolean }> {
  const r = await rawFetch(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
  if (r.status === 404) return { html: "", expired: true }
  if (r.location && /jobpostingexpired/i.test(r.location)) return { html: "", expired: true }
  if (r.status >= 300 && r.status < 400) return { html: "", expired: true }
  return { html: r.body, expired: false }
}

async function jsonFetch(url: string): Promise<unknown> {
  const r = await rawFetch(url, "application/json,text/plain,*/*")
  if (!r.body) throw new Error("Empty response from suggest endpoint")
  try {
    return JSON.parse(r.body)
  } catch {
    throw new Error("Suggest endpoint did not return JSON (the endpoint may have moved)")
  }
}

/* ------------------------------------------------------------------ text */

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** Strip tags + decode entities + collapse whitespace. */
export function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** Strip tags but keep block-level breaks as newlines. */
function cleanMultiline(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Accent- and case-insensitive compare, so "Montreal" matches "Montreal" with an accent. */
const fold = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim()

// Keys are accent-folded, so "février" and "fevrier" both resolve via fold().
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
}

const pad = (n: number): string => String(n).padStart(2, "0")

/**
 * Normalize Job Bank's human dates to ISO `YYYY-MM-DD`.
 * Handles "July 07, 2026" (en), "7 juillet 2026" (fr) and passes through ISO.
 * Returns null when nothing parses, never a guess.
 */
export function toIsoDate(text: string | null | undefined): string | null {
  if (!text) return null
  const t = text.trim()

  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const en = t.match(/(\p{L}+)\s+(\d{1,2}),?\s+(\d{4})/u)
  if (en) {
    const m = MONTHS[fold(en[1])]
    if (m) return `${en[3]}-${pad(m)}-${pad(parseInt(en[2], 10))}`
  }

  const fr = t.match(/(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})/u)
  if (fr) {
    const m = MONTHS[fold(fr[2])]
    if (m) return `${fr[3]}-${pad(m)}-${pad(parseInt(fr[1], 10))}`
  }

  return null
}

/* -------------------------------------------------------------- location */

export type ResolvedLocation =
  | { kind: "city"; cityId: string; name: string; provinceCode: string | null }
  | { kind: "province"; provinceCode: string; name: string }

const PROVINCE_CODES = new Set([
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
])

const COUNTRY_WIDE = /^(canada|all of canada|tout le canada|all)$/i

interface SuggestDoc {
  docid?: string
  name?: string
  city_id?: string
  province_cd?: string
  province_name?: string
}

export class LocationError extends Error {
  readonly code = "LOCATION_NOT_FOUND"
}

/**
 * Resolve a free-text place to Job Bank's location filter.
 *
 * Job Bank does NOT filter on the `locationstring` text you see in the search
 * box — that parameter is cosmetic. Real filtering happens via `mid=<city_id>`
 * (city + its commuting radius) or `fprov=<code>` (whole province), and the ids
 * come from the site's public Solr typeahead. Returns null for country-wide.
 */
export async function resolveLocation(
  text: string,
  lang: Lang,
): Promise<ResolvedLocation | null> {
  const trimmed = text.trim()
  if (!trimmed || COUNTRY_WIDE.test(trimmed)) return null

  const upper = trimmed.toUpperCase()
  if (PROVINCE_CODES.has(upper)) {
    return { kind: "province", provinceCode: upper, name: upper }
  }

  // "Toronto, ON" -> query "Toronto", prefer a hit in ON.
  const withProv = trimmed.match(/^(.*?),\s*([A-Za-z]{2})$/)
  const queryText = withProv ? withProv[1].trim() : trimmed
  const hintProv = withProv && PROVINCE_CODES.has(withProv[2].toUpperCase())
    ? withProv[2].toUpperCase()
    : null

  const url = new URL(suggestUrl(lang))
  url.searchParams.set("q", queryText)
  url.searchParams.set("fq", "NOT postalcode_cnt:0")
  url.searchParams.set("wt", "json")
  url.searchParams.set("rows", "25")

  const data = (await jsonFetch(url.toString())) as { response?: { docs?: SuggestDoc[] } }
  const docs = data?.response?.docs ?? []
  if (docs.length === 0) {
    throw new LocationError(
      `No Canadian city or province matched "${text}". Try a city name ("Toronto"), ` +
        `a city with province ("London, ON"), a province ("Ontario" or "ON"), or "Canada".`,
    )
  }

  const inProv = hintProv
    ? docs.filter((d) => (d.province_cd ?? "").toUpperCase() === hintProv)
    : docs
  const pool = inProv.length > 0 ? inProv : docs
  const exact = pool.find((d) => fold(d.name ?? "") === fold(queryText))
  const doc = exact ?? pool[0]

  const isProvince = String(doc.docid ?? "").startsWith("PR") || String(doc.city_id) === "0"
  if (isProvince) {
    const code = (doc.province_cd ?? "").toUpperCase()
    if (!code) throw new LocationError(`Ambiguous province result for "${text}"`)
    return { kind: "province", provinceCode: code, name: doc.name ?? code }
  }

  const cityId = String(doc.city_id ?? "")
  if (!cityId || cityId === "0") throw new LocationError(`Ambiguous city result for "${text}"`)
  return {
    kind: "city",
    cityId,
    name: doc.name ?? queryText,
    provinceCode: (doc.province_cd ?? "").toUpperCase() || null,
  }
}

/* ------------------------------------------------------------------- url */

export type Sort = "date" | "match"

export interface SearchParams {
  query?: string
  location?: ResolvedLocation | null
  jobage?: number
  remote?: string
  page: number
  sort: Sort
}

/** U+00AC NOT SIGN, the facet-negation prefix. Built from its code point so this
 *  source file stays pure ASCII and cannot be corrupted by a re-encode. */
const NOT_SIGN = String.fromCharCode(0xac)

/**
 * Workplace-type facet (`fskl`). "onsite" is expressed as the negation of the
 * three off-site facets, matching what the site's own filter emits. The NOT SIGN
 * is percent-encoded to %C2%AC by URLSearchParams.
 */
export function teleworkFlags(mode: string | undefined): string[] {
  switch ((mode || "").toLowerCase()) {
    case "remote":
      return ["15141"]
    case "hybrid":
      return ["100000"]
    case "onsite":
    case "on-site":
      return [
        `${NOT_SIGN}15141`,
        `${NOT_SIGN}100000`,
        `${NOT_SIGN}100001`,
        `${NOT_SIGN}100006`,
      ]
    default:
      return []
  }
}

/**
 * Build a search URL.
 *
 * The keyword MUST go in `searchstring`. Job Bank also accepts a `term`
 * parameter — its own pagination links use it — but `term` alone is silently
 * ignored and yields every job in the location. See url-reference.md.
 */
export function buildSearchUrl(p: SearchParams): string {
  const params = new URLSearchParams()
  if (p.query) params.set("searchstring", p.query)
  if (p.location?.kind === "city") params.set("mid", p.location.cityId)
  if (p.location?.kind === "province") params.set("fprov", p.location.provinceCode)
  if (p.jobage !== undefined && p.jobage > 0 && p.jobage < 9999) {
    params.set("fage", String(p.jobage))
  }
  for (const flag of teleworkFlags(p.remote)) params.append("fskl", flag)
  params.set("sort", p.sort === "match" ? "M" : "D")
  params.set("page", String(Math.max(1, p.page)))
  return `${SEARCH_URL}?${params.toString()}`
}

/** Public URL for a posting, free of the session id the site sprinkles into hrefs. */
export const postingUrl = (id: string): string => `${DETAIL_URL}/${id}`

/* --------------------------------------------------------------- parsing */

export interface JobCard {
  id: string
  jobNumber: string | null
  title: string
  company: string | null
  location: string | null
  date: string | null
  salary: string | null
  remote: string | null
  postedOnJobBank: boolean
  url: string
}

export interface JobDetail extends JobCard {
  originalTitle: string | null
  description: string | null
  employmentType: string | null
  deadline: string | null
  applyUrl: string | null
}

const field = (chunk: string, cls: string): string | null => {
  const m = chunk.match(new RegExp(`<li class="${cls}"[^>]*>([\\s\\S]*?)</li>`, "i"))
  return m ? clean(m[1]) || null : null
}

/** Drop the visually-hidden label Job Bank prefixes to each list item. */
const unlabel = (text: string | null, ...labels: string[]): string | null => {
  if (!text) return null
  const re = new RegExp(`^(?:${labels.join("|")})\\s*[:]?\\s*`, "i")
  return text.replace(re, "").trim() || null
}

/** Total number of matches the site reports, e.g. `<span id="results-count">8,443`. */
export function parseTotal(html: string): number | null {
  // JS \s already covers the U+00A0 Job Bank uses as a thousands separator.
  const m = html.match(/id="results-count"[^>]*>\s*([\d,\s]+)/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/[^\d]/g, ""), 10)
  return isNaN(n) ? null : n
}

/**
 * Parse the results page. We split on the per-posting <article> anchor and parse
 * each chunk independently, so one malformed card cannot break the rest.
 */
export function parseJobCards(html: string): JobCard[] {
  const results: JobCard[] = []
  const chunks = html.split(/<article id="article-/).slice(1)

  for (const chunk of chunks) {
    const idMatch = chunk.match(/^(\d+)/)
    if (!idMatch) continue
    const id = idMatch[1]

    const titleMatch = chunk.match(/<span class="noctitle"[^>]*>([\s\S]*?)<\/span>/i)
    const title = titleMatch ? clean(titleMatch[1]) : ""
    if (!title) continue

    const jobNumMatch = chunk.match(
      /<li class="source"[^>]*>[\s\S]*?fa-hashtag[^>]*><\/span>\s*(\d+)/i,
    )
    const teleworkMatch = chunk.match(/<span class="telework"[^>]*>([\s\S]*?)<\/span>/i)

    results.push({
      id,
      jobNumber: jobNumMatch ? jobNumMatch[1] : null,
      title,
      company: field(chunk, "business"),
      location: unlabel(field(chunk, "location"), "Location", "Lieu"),
      date: toIsoDate(field(chunk, "date")),
      salary: unlabel(field(chunk, "salary"), "Salary", "Salaire"),
      remote: teleworkMatch ? clean(teleworkMatch[1]) || null : null,
      postedOnJobBank: /class="postedonJB"/i.test(chunk),
      url: postingUrl(id),
    })
  }

  return results
}

/**
 * Inner HTML of the first element carrying RDFa `property="<name>"`, closing on
 * that element's own tag. Anchoring to the captured tag rather than a hardcoded
 * </span> keeps a property on an <h1> or <div> from running past its element
 * and swallowing the next field.
 *
 * The properties we read are all leaves, so no nesting-depth tracking is needed.
 */
const propRaw = (html: string, name: string): string | null => {
  const m = html.match(
    new RegExp(`<([a-z][a-z0-9]*)[^>]*property="${name}"[^>]*>([\\s\\S]*?)</\\1>`, "i"),
  )
  return m ? m[2] : null
}

/** Pull an RDFa `property="x"` element's text, whitespace-collapsed. */
const prop = (html: string, name: string): string | null => {
  const raw = propRaw(html, name)
  return raw !== null ? clean(raw) || null : null
}

/** Read an RDFa `content="..."` attribute, e.g. `property="minValue" content="120,000"`. */
const propContent = (html: string, name: string): string | null => {
  const m = html.match(new RegExp(`<[^>]*property="${name}"[^>]*content="([^"]*)"`, "i"))
  return m ? m[1].trim() || null : null
}

const UNIT_WORD: Record<string, string> = {
  YEAR: "annually",
  MONTH: "monthly",
  WEEK: "weekly",
  DAY: "daily",
  HOUR: "hourly",
}

/**
 * Build the salary line from the structured MonetaryAmount, not from the
 * rendered text: the visible block runs on into the next field, so a text
 * window would swallow "Terms of employment".
 */
function parseSalary(html: string): string | null {
  const min = propContent(html, "minValue")
  const max = propContent(html, "maxValue")
  if (!min && !max) return null

  const money = (s: string): string => (s.startsWith("$") ? s : `$${s}`)
  const core = min && max ? `${money(min)} to ${money(max)}` : money((min ?? max) as string)

  const unit = prop(html, "unitText")
  const word = unit ? (UNIT_WORD[unit.toUpperCase()] ?? unit.toLowerCase()) : null
  return word ? `${core} ${word}` : core
}

/** Parse a single posting page. */
export function parseJobDetail(html: string, id: string): JobDetail {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const title = prop(html, "title") ?? (h1 ? clean(h1[1]) : "") ?? ""

  // Aggregated postings show the NOC-normalized title in <h1> and keep the
  // employer's own wording behind an "orig-title-label" prefix.
  const orig = html.match(/class="orig-title-label"[^>]*>[\s\S]*?<\/span>([\s\S]*?)<\/span>/i)
  const originalTitle = orig ? clean(orig[1]) || null : null

  const locality = prop(html, "addressLocality")
  const region = prop(html, "addressRegion")
  const location = locality
    ? region
      ? `${locality} (${region})`
      : locality
    : (prop(html, "address") ?? null)

  const descRaw = propRaw(html, "description")
  const description = descRaw !== null ? cleanMultiline(descRaw) || null : null

  const applyMatch = html.match(/<a[^>]*id="externalJobLink"[^>]*href="([^"]+)"/i)
  const applyUrl = applyMatch ? decodeHtmlEntities(applyMatch[1]) : null

  const deadlineMatch = html.match(
    /(?:Advertised until|Affich[^<]{0,24}jusqu[^<]{0,12})[\s\S]{0,120}?(\d{4}-\d{2}-\d{2})/i,
  )

  const jobNumMatch = html.match(/Job number|Num[ée]ro de l'offre/i)
    ? html.match(/(?:Job number|Num[ée]ro de l'offre)[\s\S]{0,140}?(\d{5,})/i)
    : null

  const teleworkMatch = html.match(/<span class="telework"[^>]*>([\s\S]*?)<\/span>/i)

  return {
    id,
    jobNumber: jobNumMatch ? jobNumMatch[1] : null,
    title: title || "(untitled)",
    originalTitle,
    company: prop(html, "hiringOrganization"),
    location,
    date: toIsoDate(prop(html, "datePosted")),
    salary: parseSalary(html),
    remote: teleworkMatch ? clean(teleworkMatch[1]) || null : null,
    postedOnJobBank: !applyUrl,
    url: postingUrl(id),
    description,
    employmentType: prop(html, "employmentType"),
    deadline: deadlineMatch ? deadlineMatch[1] : null,
    applyUrl,
  }
}

/** Accept a bare id or any jobposting URL (session ids and query strings included). */
export function normalizeId(input: string): string | null {
  const bare = input.match(/^\d{5,}$/)
  if (bare) return input
  const url = input.match(/jobposting\/(\d{5,})/)
  if (url) return url[1]
  return null
}
