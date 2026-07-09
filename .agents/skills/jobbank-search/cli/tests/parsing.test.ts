import { describe, expect, test } from "bun:test"
import {
  buildSearchUrl,
  normalizeId,
  parseJobCards,
  parseJobDetail,
  parseTotal,
  teleworkFlags,
  toIsoDate,
} from "../src/helpers.js"

const NBSP = String.fromCharCode(0xa0)
const NOT_SIGN = String.fromCharCode(0xac)

// Trimmed from a real results page (jobsearch?searchstring=software+developer).
const CARD_HTML = `
<article id="article-49859521" class="action-buttons"><a href="/jobsearch/jobposting/49859521;jsessionid=7CF8C2AE.jobsearch75?source=searchresults" class="resultJobItem">
  <h3 class="title">
    <span class="flag"><span class="new">New</span><span class="telework">On site</span><span class="postedonJB">Posted on Job Bank</span></span>
    <span class="noctitle"> software developer
    </span>
  </h3>
  <ul class="list-unstyled">
    <li class="date">July 07, 2026
    </li>
    <li class="business">Navitas Vehicle Systems Ltd.</li>
    <li class="location"><span class="fas fa-map-marker-alt" aria-hidden="true"></span> <span class="wb-inv">Location</span>
        Waterloo (ON)
    </li>
    <li class="salary"><span class="fa fa-dollar" aria-hidden="true"></span>
        Salary
        $48.35 hourly</li>
    <li class="source"><span class="wb-inv">Job number:</span>
      <span class="fa fa-hashtag" aria-hidden="true"></span>
      3616271</li>
  </ul></a></article>
<article id="article-BROKEN" class="action-buttons">no id digits, must be skipped</article>
<article id="article-49826051" class="action-buttons"><a href="/jobsearch/jobposting/49826051">
  <h3 class="title"><span class="noctitle">senior software developer</span></h3>
  <ul class="list-unstyled">
    <li class="date">June 09, 2026</li>
    <li class="business">Acme &amp; Co.</li>
    <li class="location"><span class="wb-inv">Location</span> Sherbrooke (QC)</li>
  </ul></a></article>
`

// Trimmed from a real posting page, preserving the RDFa attributes we anchor on.
// Note the real nesting: property="name" sits on the <h1> and wraps the
// property="title" span. A parser that closes every property on </span> would
// read the title as "cloud developer Title posted on indeed.com -".
const DETAIL_HTML = `
<h1 property="name" id="wb-cont" class="title"><span property="title">cloud developer  </span></h1>
<p class="source-title"><span class="orig-title-label">Title posted on indeed.com - </span>Python Developer</span></p>
<p class="date-business">
  <span property="datePosted" class="date"> Posted on July 08, 2026 </span>
  <span class="business"><span property="hiringOrganization" typeof="Organization">Citrine Solution</span></span>
</p>
<span property="address"><span property="addressLocality">Mississauga</span><span property="addressRegion">ON</span></span>
<span class="attribute-value" property="baseSalary" typeof="MonetaryAmount"><span property="value" typeof="QuantitativeValue"><span property="currency" content="CAD" class="hidden">$</span><span property="minValue" content="120,000">120,000</span> to <span property="currency" content="CAD" class="hidden">$</span><span property="maxValue" content="135,000">135,000</span><span property="unitText" class="hidden">YEAR</span> annually</span></span>
<span class="wb-inv">Terms of employment</span><span property="employmentType" class="attribute-value">Full time</span>
<span class="hidden" property="description">Role: Gen AI full stack Engineer

We are looking for a Senior Full Stack Engineer.</span>
<div id="applynow"><a id="externalJobLink" class="btn btn-primary" href="https://ca.indeed.com/viewjob?jk=b31ed82&amp;sid=cajb">View</a></div>
<p>Advertised until 2026-07-28</p>
`

// An hourly, Job Bank-posted job: single minValue, no external apply link.
const DETAIL_HOURLY_HTML = `
<h1 property="title">software developer</h1>
<span property="datePosted" class="date"> Posted on July 07, 2026 </span>
<span property="hiringOrganization" typeof="Organization">Navitas Vehicle Systems Ltd.</span>
<span property="addressLocality">Waterloo</span><span property="addressRegion">ON</span>
<span property="baseSalary" typeof="MonetaryAmount"><span property="value" typeof="QuantitativeValue"><span property="currency" content="CAD" class="hidden">$</span><span property="minValue" content="48.35">48.35</span><span property="unitText" class="hidden">HOUR</span> hourly</span></span>
<span class="hidden" property="description">Education: Bachelor's degree.</span>
<p>Advertised until 2026-07-28</p>
`

describe("buildSearchUrl", () => {
  // The single most important invariant in this skill. Job Bank accepts a `term`
  // parameter (its own pagination links use it) but silently IGNORES it as a
  // keyword filter, returning every job in the location instead. Only
  // `searchstring` actually filters. See url-reference.md.
  test("puts the keyword in searchstring, never in term", () => {
    const url = buildSearchUrl({ query: "software developer", page: 1, sort: "date" })
    const params = new URL(url).searchParams
    expect(params.get("searchstring")).toBe("software developer")
    expect(params.has("term")).toBe(false)
  })

  test("maps a resolved city to mid= and a province to fprov=", () => {
    const city = new URL(
      buildSearchUrl({
        query: "x",
        location: { kind: "city", cityId: "22437", name: "Toronto", provinceCode: "ON" },
        page: 1,
        sort: "date",
      }),
    ).searchParams
    expect(city.get("mid")).toBe("22437")
    expect(city.has("fprov")).toBe(false)

    const prov = new URL(
      buildSearchUrl({
        query: "x",
        location: { kind: "province", provinceCode: "ON", name: "Ontario" },
        page: 1,
        sort: "date",
      }),
    ).searchParams
    expect(prov.get("fprov")).toBe("ON")
    expect(prov.has("mid")).toBe(false)
  })

  test("omits the location filter entirely for a country-wide search", () => {
    const params = new URL(buildSearchUrl({ query: "x", page: 1, sort: "date" })).searchParams
    expect(params.has("mid")).toBe(false)
    expect(params.has("fprov")).toBe(false)
  })

  test("sort=date maps to D and sort=match maps to M", () => {
    expect(new URL(buildSearchUrl({ page: 1, sort: "date" })).searchParams.get("sort")).toBe("D")
    expect(new URL(buildSearchUrl({ page: 1, sort: "match" })).searchParams.get("sort")).toBe("M")
  })

  test("passes jobage through as fage and drops sentinel values", () => {
    expect(new URL(buildSearchUrl({ page: 1, sort: "date", jobage: 7 })).searchParams.get("fage")).toBe("7")
    expect(new URL(buildSearchUrl({ page: 1, sort: "date", jobage: 0 })).searchParams.has("fage")).toBe(false)
    expect(new URL(buildSearchUrl({ page: 1, sort: "date", jobage: 9999 })).searchParams.has("fage")).toBe(false)
  })

  test("encodes the onsite facet as negated fskl values", () => {
    const url = buildSearchUrl({ page: 1, sort: "date", remote: "onsite" })
    expect(url).toContain("fskl=%C2%AC15141")
    expect(new URL(url).searchParams.getAll("fskl")).toHaveLength(4)
  })
})

describe("teleworkFlags", () => {
  test("maps each workplace mode", () => {
    expect(teleworkFlags("remote")).toEqual(["15141"])
    expect(teleworkFlags("hybrid")).toEqual(["100000"])
    expect(teleworkFlags("onsite")[0]).toBe(`${NOT_SIGN}15141`)
    expect(teleworkFlags(undefined)).toEqual([])
    expect(teleworkFlags("nonsense")).toEqual([])
  })
})

describe("toIsoDate", () => {
  test("parses English, French, and ISO dates", () => {
    expect(toIsoDate("July 07, 2026")).toBe("2026-07-07")
    expect(toIsoDate(" Posted on July 8, 2026 ")).toBe("2026-07-08")
    expect(toIsoDate("7 juillet 2026")).toBe("2026-07-07")
    expect(toIsoDate("1er février 2026")).toBe("2026-02-01")
    expect(toIsoDate("2026-07-28")).toBe("2026-07-28")
  })

  test("returns null rather than guessing", () => {
    expect(toIsoDate("sometime soon")).toBeNull()
    expect(toIsoDate("")).toBeNull()
    expect(toIsoDate(null)).toBeNull()
  })
})

describe("parseTotal", () => {
  test("reads the reported result count, including separators", () => {
    expect(parseTotal('<span class="found" id="results-count">8,443</span>')).toBe(8443)
    expect(parseTotal(`<span id="results-count">1${NBSP}551</span>`)).toBe(1551)
    expect(parseTotal("<span>no counter here</span>")).toBeNull()
  })
})

describe("parseJobCards", () => {
  const cards = parseJobCards(CARD_HTML)

  test("skips the malformed card and keeps the good ones", () => {
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.id)).toEqual(["49859521", "49826051"])
  })

  test("extracts every card field", () => {
    const c = cards[0]
    expect(c.title).toBe("software developer")
    expect(c.company).toBe("Navitas Vehicle Systems Ltd.")
    expect(c.location).toBe("Waterloo (ON)")
    expect(c.date).toBe("2026-07-07")
    expect(c.salary).toBe("$48.35 hourly")
    expect(c.jobNumber).toBe("3616271")
    expect(c.remote).toBe("On site")
    expect(c.postedOnJobBank).toBe(true)
  })

  test("builds a clean url with no jsessionid", () => {
    expect(cards[0].url).toBe("https://www.jobbank.gc.ca/jobsearch/jobposting/49859521")
    expect(cards[0].url).not.toContain("jsessionid")
  })

  test("strips the visually-hidden Location label and decodes entities", () => {
    expect(cards[1].location).toBe("Sherbrooke (QC)")
    expect(cards[1].company).toBe("Acme & Co.")
  })

  test("leaves absent fields null rather than omitting them", () => {
    const c = cards[1]
    expect(c.salary).toBeNull()
    expect(c.jobNumber).toBeNull()
    expect(c.remote).toBeNull()
    expect(c.postedOnJobBank).toBe(false)
    expect(Object.keys(c)).toContain("salary")
  })
})

describe("parseJobDetail", () => {
  const job = parseJobDetail(DETAIL_HTML, "49866267")

  test("reads the RDFa fields", () => {
    expect(job.title).toBe("cloud developer")
    expect(job.company).toBe("Citrine Solution")
    expect(job.location).toBe("Mississauga (ON)")
    expect(job.date).toBe("2026-07-08")
    expect(job.employmentType).toBe("Full time")
    expect(job.deadline).toBe("2026-07-28")
  })

  test("keeps the employer's original title when the NOC title differs", () => {
    expect(job.originalTitle).toBe("Python Developer")
  })

  test("a property on a wrapping element does not swallow the next field", () => {
    // Regression: property="title" is nested inside <h1 property="name">.
    expect(job.title).not.toContain("Title posted on")
    // And a property on a non-span element closes on its own tag.
    expect(parseJobDetail(`<div property="title">data analyst</div><span>x</span>`, "1").title).toBe(
      "data analyst",
    )
  })

  test("builds a salary range from the structured MonetaryAmount", () => {
    expect(job.salary).toBe("$120,000 to $135,000 annually")
  })

  test("does not let the salary text run into the next field", () => {
    expect(job.salary).not.toContain("Terms of employment")
  })

  test("preserves description paragraph breaks and decodes the apply url", () => {
    expect(job.description).toContain("Role: Gen AI full stack Engineer")
    expect(job.description).toContain("\n\n")
    expect(job.applyUrl).toBe("https://ca.indeed.com/viewjob?jk=b31ed82&sid=cajb")
    expect(job.postedOnJobBank).toBe(false)
  })

  test("handles an hourly, Job Bank-posted job with no external apply link", () => {
    const hourly = parseJobDetail(DETAIL_HOURLY_HTML, "49859521")
    expect(hourly.salary).toBe("$48.35 hourly")
    expect(hourly.applyUrl).toBeNull()
    expect(hourly.postedOnJobBank).toBe(true)
    expect(hourly.originalTitle).toBeNull()
    expect(hourly.location).toBe("Waterloo (ON)")
  })
})

describe("normalizeId", () => {
  test("accepts a bare id or any posting url", () => {
    expect(normalizeId("49859521")).toBe("49859521")
    expect(normalizeId("https://www.jobbank.gc.ca/jobsearch/jobposting/49859521")).toBe("49859521")
    expect(
      normalizeId("/jobsearch/jobposting/49859521;jsessionid=ABC.jobsearch75?source=searchresults"),
    ).toBe("49859521")
  })

  test("rejects anything else", () => {
    expect(normalizeId("not-an-id")).toBeNull()
    expect(normalizeId("123")).toBeNull()
  })
})
