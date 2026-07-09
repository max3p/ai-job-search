# Job Bank — endpoint reference

Everything below was verified live against `www.jobbank.gc.ca` on 2026-07-09. This
is the file to read when Job Bank changes its markup and the parsers break.

Job Bank (Guichet-Emplois) is operated by Employment and Social Development
Canada. It aggregates postings employers submit directly plus feeds from external
boards (Indeed, Talent.com, employer ATSs).

## Access

- `https://www.jobbank.gc.ca/robots.txt` is `User-agent: * / Crawl-delay: 5` — **no
  `Disallow` rules**. Search and posting paths are permitted to automated clients.
- No authentication, no API key, no cookies required. The `jsessionid` the site
  sprinkles into its own hrefs is unnecessary; strip it.
- The fetcher honors the 5-second crawl delay between requests
  (`JOBBANK_CRAWL_DELAY_MS` overrides; tests set it to `0`).
- French mirror: `https://www.guichetemplois.gc.ca` with `/rechercheemploi/...`
  paths. Both front-ends serve the same posting database, so the CLI uses the
  English host and exposes `--lang` only for the city lookup.

---

## Search

```
GET https://www.jobbank.gc.ca/jobsearch/jobsearch
```

| Parameter | Meaning | Notes |
|-----------|---------|-------|
| `searchstring` | **The keyword filter.** | See the trap below. |
| `mid` | City id + its commuting radius | From the suggest endpoint. |
| `fprov` | Province code (`ON`, `QC`, …) | Whole-province filter. |
| `fage` | Posted within N days | UI exposes 2 and 30; arbitrary values work (7 verified). |
| `fskl` | Workplace type facet | Repeatable. See table below. |
| `sort` | `D` = date posted, `M` = best match | See the trap below. |
| `page` | 1-indexed | 25 results per page. |
| `term` | **Display-only echo. Ignored as a filter.** | See the trap below. |
| `locationstring` | **Display-only echo. Ignored as a filter.** | See the trap below. |

### ⚠ Trap 1 — `term` is not the keyword parameter

Job Bank's own pagination links look like
`?term=software+developer&page=1&sort=M&fn21=21232`. It is tempting to copy that.
Do not: `term` alone is **silently ignored**.

| Request | Result count | First titles |
|---------|--------------|--------------|
| `?term=software+developer&mid=22437` | 8,443 | home child care provider, welder, painter |
| `?searchstring=software+developer&mid=22437` | 91 | cloud developer, software developer, senior software developer |

The site's links work because they carry `fn21=<NOC code>` — a NOC-2021
occupation facet that Job Bank resolves from the keyword server-side. `term` just
re-renders the words in the search box. **Always send `searchstring`.**
`searchstring` survives pagination (`&page=2` keeps the filter and the count).

`buildSearchUrl()` sets `searchstring` and never `term`; `tests/parsing.test.ts`
pins this, and a live test asserts the returned titles stay on-topic.

### ⚠ Trap 2 — `locationstring` does not filter

`?searchstring=software+developer&locationstring=Toronto,+ON` returns postings in
Sherbrooke QC, Burnaby BC, Saskatoon SK and Halifax NS. The visible search box is
cosmetic. Real location filtering is `mid=` (city) or `fprov=` (province), whose
ids come from the suggest endpoint below.

### ⚠ Trap 3 — `sort=M` is *best match*, not *most recent*

Counter-intuitively:

- `sort=D` → **Date posted** (descending; verified: all results same-day, strictly descending timestamps)
- `sort=M` → **Best match** (relevance; dates arrive out of order)

The CLI defaults to `--sort date` (`D`).

### `fskl` workplace facet

| Value | Meaning |
|-------|---------|
| `15141` | Remote |
| `100000` | Hybrid |
| `100001` | On the road |
| `100006` | Frequent or cyclical relocation |
| `¬<value>` | Negation (`¬` is U+00AC, encoded `%C2%AC`) |

"On site" is expressed as the negation of the four off-site facets:
`fskl=¬15141&fskl=¬100000&fskl=¬100001&fskl=¬100006`.

Note: Job Bank's fully-remote inventory is small — 39 postings nationally at time
of writing. `--remote remote` returning zero results is usually the truth, not a
parsing failure.

### Response structure (search)

Server-rendered HTML. One `<article>` per posting.

| Field | Anchor |
|-------|--------|
| id | `<article id="article-49859521">` — this id is what `/jobposting/<id>` takes |
| title | `<span class="noctitle">` (the NOC-normalized title, not the employer's wording) |
| company | `<li class="business">` |
| location | `<li class="location">` (prefixed by a `wb-inv` "Location" label; **may be empty**) |
| date | `<li class="date">` — `July 07, 2026` |
| salary | `<li class="salary">` — prefixed by a "Salary" label |
| job number | `<li class="source">` → after the `fa-hashtag` icon (public-facing number, ≠ the id) |
| workplace | `<span class="telework">` — `On site` / `Hybrid` / `Remote` |
| posted on Job Bank | presence of `<span class="postedonJB">` |
| total results | `<span class="found" id="results-count">8,443` (may use U+00A0 separators) |

The href on each card carries `;jsessionid=…?source=searchresults`. Build the URL
from the id instead: `https://www.jobbank.gc.ca/jobsearch/jobposting/<id>`.

Cards are parsed by splitting on `<article id="article-` and handling each chunk
independently, so one malformed card cannot break the rest.

---

## Detail

```
GET https://www.jobbank.gc.ca/jobsearch/jobposting/<id>
```

- **200** — the posting.
- **302 → `/jobsearch/jobpostingexpired`** — the posting is gone or the id never
  existed. The CLI does not follow redirects and reports `{"code":"EXPIRED"}`,
  which is what the repo's "never rank an unfetched posting" rule requires.

Fields are exposed as **RDFa `property="…"` attributes**, a much more stable
contract than the presentational class names. Anchor on these.

| Field | Anchor |
|-------|--------|
| title | `<span property="title">`, nested inside `<h1 property="name">` |
| original title | `<span class="orig-title-label">Title posted on indeed.com - </span>` then the employer's own wording |
| company | `<span property="hiringOrganization" typeof="Organization">` |
| location | `property="addressLocality"` + `property="addressRegion"` |
| posted date | `<span property="datePosted">Posted on July 08, 2026</span>` |
| employment type | `property="employmentType"` |
| description | `<span class="hidden" property="description">` — **plain text with real newlines, no nested tags** |
| deadline | free text `Advertised until 2026-07-28` (already ISO) |
| apply link | `<a id="externalJobLink" href="…">` — present only for aggregated postings |

### Salary is structured, not text

```html
<span property="baseSalary" typeof="MonetaryAmount">
  <span property="value" typeof="QuantitativeValue">
    <span property="currency" content="CAD" class="hidden">$</span>
    <span property="minValue" content="120,000">120,000</span> to
    <span property="currency" content="CAD" class="hidden">$</span>
    <span property="maxValue" content="135,000">135,000</span>
    <span property="unitText" class="hidden">YEAR</span> annually
  </span>
</span>
```

Read the `content` attributes of `minValue`/`maxValue` and the text of
`unitText` (`YEAR`→annually, `HOUR`→hourly, …). Do **not** scrape the rendered
text: the visible block runs straight into the next field and a text window picks
up `Terms of employment`. Hourly postings carry only `minValue`.

### Parsing note: close on the matching tag

RDFa properties sit on different elements (`<h1 property="name">` wraps
`<span property="title">`). A regex that closes every property on `</span>` reads
the title as `cloud developer Title posted on indeed.com -`. `propRaw()` captures
the opening tag name and closes on that tag. All properties we read are leaves,
so no nesting-depth tracking is needed.

---

## Location suggest (Solr)

```
GET https://www.jobbank.gc.ca/core/ta-cityprovsuggest_{en|fr}/select
      ?q=<text>&fq=NOT postalcode_cnt:0&wt=json&rows=25
```

Public Solr typeahead, returns JSON. The language suffix is the page's
`<html lang>` — `en` or `fr` (not `eng`/`fra`; those 404).

```json
{"response":{"docs":[
  {"docid":"C22437","name":"Toronto","city_id":"22437","province_cd":"ON","province_name":"Ontario"},
  {"docid":"PR35","name":"Province of Ontario","city_id":"0","province_cd":"ON"}
]}}
```

- `docid` starting `PR` (or `city_id == "0"`) → a province → use `fprov=<province_cd>`
- otherwise → a city → use `mid=<city_id>`

The `fr` core returns accented names (`Montréal`); the resolver accent-folds
before comparing so `Montreal` matches. `"Toronto, ON"` is split into the city
name plus a province hint used to disambiguate.

---

## The RSS/Atom feed — do not use

```
GET /jobsearch/feed/jobSearchRSSfeed?term=…&sort=D&rows=100
```

An Atom feed (`<entry>`, not `<item>`) exists and is tempting: structured, up to
`rows=100`, no HTML parsing. **It ignores the keyword.**

| Request | Titles returned |
|---------|-----------------|
| `?term=software+developer&rows=10` | customer service agent, siding applicator, siding contractor |
| `?term=nurse&rows=5` | customer service agent, siding applicator, siding contractor |
| `?term=software+developer&fn21=21232` | cloud developer, software developer, senior software developer |

It filters only when given the `fn21=<NOC code>` facet, which the feed itself
cannot resolve from a keyword. Without a NOC code it silently returns the newest
postings site-wide — the same words back in the `<title>`, unrelated jobs in the
body. That is worse than an error, so the CLI parses the HTML search page, which
honors `searchstring` correctly.

If you ever want the feed, resolve the keyword to a NOC 2021 code first (the
search page emits `fn21=` in its facet links).
