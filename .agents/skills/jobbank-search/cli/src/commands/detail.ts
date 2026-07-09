import {
  fetchPosting,
  normalizeId,
  parseJobDetail,
  postingUrl,
  writeError,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a Job Bank posting id from "${opts.id}"`, "BAD_ID")
    return 1
  }

  try {
    const { html, expired } = await fetchPosting(postingUrl(id))
    // Job Bank 302s to /jobsearch/jobpostingexpired for postings that are gone.
    // Report that as EXPIRED rather than inventing a partial record.
    if (expired) {
      writeError(`Posting ${id} has expired or does not exist`, "EXPIRED")
      return 1
    }
    if (!html) {
      writeError(`Posting ${id} returned an empty page`, "NOT_FOUND")
      return 1
    }

    const job = parseJobDetail(html, id)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        job.originalTitle && job.originalTitle !== job.title
          ? `(posted as: ${job.originalTitle})`
          : "",
        `${job.company || "-"} · ${job.location || "-"}`,
        "",
        job.date ? `Posted: ${job.date}` : "",
        job.deadline ? `Advertised until: ${job.deadline}` : "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        job.remote ? `Workplace: ${job.remote}` : "",
        job.jobNumber ? `Job number: ${job.jobNumber}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
        job.applyUrl ? `Apply: ${job.applyUrl}` : "",
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
