# /outcome - Record the Result of an Application

You are recording what happened to a job application: that it was submitted, progress updates (interview invitations, stages completed, offers), and final resolutions (hired, rejected, no response). The data lands in two places the framework reads but nothing else writes:

- `personal/job_search_tracker.csv` - the application ledger. `/search` reads it as an exclusion set. **`/outcome` is its only writer.**
- `personal/applications/<company>_<role>/` - the per-application archive (posting text, `outcome.md`, and any interview prep packs) that `/setup` Path A mines to calibrate `04-job-evaluation.md`

When you report an interview stage, this command also builds a prep pack from the archived posting, your profile, and the cached company research. It never re-fetches the posting to do it — by interview time the listing is often closed.

`/outcome` writes the data; `/setup` interprets it. This command never edits the evaluation framework or profile files itself.

**Run this after every application you submit.** Nothing else records that you applied. If you skip it, a reposted listing under a fresh URL will resurface in `/search` and you may apply twice.

Follow these steps **in order**.

---

## Step 0: Parse Input

`$ARGUMENTS` may contain:

- Nothing → list open applications and ask which one to update
- A company name (optionally with a role), e.g. `/outcome acme` or `/outcome acme ml engineer` → target that application

---

## Step 1: Load State and Identify the Application

1. Read `personal/job_search_tracker.csv`. If it does not exist, create it with the standard header:
   ```
   date,company,sector,role,role_type,channel,status,contact_person,fit_score,notes,source
   ```
2. **With an argument:** match rows case-insensitively on company (and role, if given). One match → proceed. Several → list them and ask. None → the application was made outside the workflow; collect company, role, date applied, channel, and posting URL from the user and add a tracker row.
3. **Without an argument:** list all rows whose status is not final (not hired / rejected / no response / withdrawn / offer declined) as a numbered table (company, role, date applied, current status) and ask which to update. If every row is resolved, say so and stop.
4. Derive the archive folder name: `personal/applications/<company>_<role>/` - lowercase, underscores for spaces (the convention documented in `personal/README.md`). Check whether the folder and an `outcome.md` already exist - if so, you are updating, not creating.

---

## Step 2: Collect What Happened

Ask the user what happened, then classify:

**Progress updates** (application still open):
- Interview invitation / stage scheduled or completed (phone screen, technical, case, final round)
- Offer received (not yet accepted or declined)

**Resolutions** (application closed) - these map to the status enum in `personal/README.md` that `/setup` parses:
- `hired` - accepted an offer
- `offer_declined` - received an offer, turned it down
- `rejected` - explicit rejection at any stage
- `no_response` - no reply; if the user is unsure whether to call it, note how long it has been since the last contact and let them decide - do not impose a cutoff
- `interview_only` - reached interviews but the process stalled or was abandoned without an explicit rejection

Also collect, without interrogating - one or two open questions are enough:
- Dates for the stages reached
- Any feedback received, verbatim where the user remembers it
- What they'd do differently, and any signal about what the company valued (this feeds `/setup`'s calibration, so concrete beats polished)

---

## Step 3: Archive the Application Materials

Create or update `personal/applications/<company>_<role>/`. All content here is personal data - everything under `personal/` is gitignored except its README, so nothing needs redacting.

1. **`job_posting.md`** - if it already exists, leave it. Otherwise resolve it in this order, stopping at the first that succeeds:

   1. **The local capture.** Look up the job in `personal/seen_jobs.json` (match on the `source` URL, else on company + normalized role). If it has a `posting_file`, copy that file in. `/search` saved the verbatim text at the moment it scored the posting, which is the freshest copy that will ever exist.
   2. **WebFetch the `source` URL.** Only reached for applications made outside `/search`, or for jobs seen before posting capture existed.
   3. **Ask the user to paste it.** Postings expire fast — this is exactly why the archive matters.
   4. **Write a stub** noting the posting is unavailable, and say so plainly in Step 6.

   **Never reconstruct a posting from memory**, and never substitute a summary for the text. The archived copy must be verbatim: an interviewer probes the posting's exact phrasing.

2. **Whatever the user actually sent** (optional) - if they submitted a specific resume version and want it kept with the record, copy (never move) it in as `resume_submitted.<ext>`. Ask once; do not chase it. This workspace does not generate application documents, so there is usually nothing to copy.
3. **`outcome.md`** - write or update it in exactly the format documented in `personal/README.md`, so `/setup` Path A parses it without special cases:

```markdown
# Outcome: <Company> — <Role>

**Status:** in_progress | hired | offer_declined | rejected | no_response | interview_only

**Date resolved:** YYYY-MM-DD   <- only when resolved; omit while in_progress

## Interview stages reached
- [x] Phone screen (YYYY-MM-DD)
- [ ] Technical interview
- [ ] Case interview
- [ ] Final round
- [ ] Offer received

## Notes
<feedback received, what to do differently, signals about what they valued -
appended per update with a date, never overwritten>
```

Update rules: tick stage checkboxes as they are reached (add the date in parentheses), append dated entries to Notes, and only change `Status` from `in_progress` to a final value on resolution. Re-running `/outcome` on the same application is idempotent - it appends new information, never duplicates or rewrites history.

---

## Step 3b: Build the Interview Prep Pack (only when an interview stage is newly reached)

Trigger this **only** when Step 2 recorded a new interview stage — an invitation, a scheduled round, or a completed one. Skip it entirely for a plain `applied`, a rejection, or a no-response.

Everything needed is already on disk. Do **not** re-fetch the posting; it may well be dead by now, which is the whole reason it was archived.

Read:
- `personal/applications/<company>_<role>/job_posting.md` — the verbatim posting
- `personal/profile/01-candidate-profile.md` and `02-behavioral-profile.md`
- `personal/companies.json` — the employer's size, stage, HQ, sector, and any funding/layoff news captured at scoring time
- `personal/seen_jobs.json` — the fit score, strengths, and gaps recorded when you applied
- the existing `outcome.md` Notes — feedback from any earlier round

Write `personal/applications/<company>_<role>/interview_prep_<stage>.md`, one per stage, never overwriting an earlier one:

```markdown
# Interview Prep: <Role> at <Company> — <stage>

**Interview date:** YYYY-MM-DD
**Fit score at application:** NN (<verdict>)
**Company:** <size band> · <stage> · <HQ> · <sector>
<any recent funding / layoff / acquisition note>

## What they asked for
<Each requirement from the posting, quoted or closely paraphrased, in the posting's
own words. This is the checklist the interviewer is working from.>

| Requirement | Your evidence | Strength |
|---|---|---|
| <from the posting> | <specific role, project, or result from 01-candidate-profile> | strong / partial / gap |

## Gaps to prepare for
<For each `partial` or `gap` above: the honest position, and the adjacent experience
to reach for. Never invent experience. A gap you can name and frame beats one you
get caught on.>

## Likely questions
<Derived from the posting's stated responsibilities and this specific stage — a phone
screen and a final round probe different things. Include the obvious behavioral ones
that map to gaps identified above.>

## Your questions for them
<Grounded in the company research and the posting. Things you genuinely could not
answer from the posting text. Not "what's the culture like?">

## Notes from earlier rounds
<Anything recorded in outcome.md from prior stages — what they seemed to value, what
tripped you up. Omit this section for a first-round interview.>
```

Rules:
- **Ground every claim in a file.** Requirements come from `job_posting.md`; evidence comes from `01-candidate-profile.md`. If the profile does not support a claim, mark it a gap. Do not manufacture a talking point.
- **Match the candidate's register.** Check `02-behavioral-profile.md` — do not hand a reserved candidate a set of combative answers.
- **The prep pack is derived and regenerable.** `job_posting.md` is the source of truth and stays verbatim. Deleting a prep pack loses nothing.
- If `job_posting.md` is a stub because the posting could not be recovered, say so at the top of the prep pack and build what you can from the tracker row and company cache. Do not fill the gap with invention.

---

## Step 4: Update the Tracker

Update the matched row's `status` column (e.g. `applied` → `interview` → `offer` → `hired` / `rejected` / `no response` / `offer declined` / `withdrawn`) and append a short dated note to the `notes` column. Never restructure the CSV, reorder rows, or touch other rows.

---

## Step 5: Calibration Handoff

Count the `outcome.md` files under `personal/applications/` with a **final** status (not `in_progress`).

- If 3 or more are resolved (or 2+ share a pattern - same role type rejected twice, same sector going silent), suggest:
  > "You now have <N> resolved applications on record. Run `/setup` (Path A) to fold them into your evaluation framework - it calibrates fit scoring from what actually got interviews."
- Do **not** write anything into `04-job-evaluation.md` or other skill files yourself. `/setup` Path A owns that merge - it is read-before-write and idempotent, and duplicating its logic here would race it.

---

## Step 6: Confirm

Summarize what was recorded:

> **Outcome recorded for <Role> at <Company>.**
>
> - `personal/applications/<company>_<role>/outcome.md` - status: <status>, <what changed>
> - Archived: <job_posting.md came from the local capture / was fetched / was pasted / is a stub; plus any resume copied in>
> - Tracker: status → <new status>
>
> [If Step 3b ran:]
> - `interview_prep_<stage>.md` - <N> requirements mapped, <M> flagged as gaps
>
> [Calibration suggestion from Step 5, if triggered]

---

## Important Rules

1. **Write data, don't interpret it.** The archive and tracker are the outputs; calibration belongs to `/setup`. This command never edits profile or framework files.
2. **The archived version is the submitted version.** Existing files in the application folder are never overwritten by fresher drafts.
3. **Never fabricate.** A dead posting URL gets a user-pasted copy or an explicit "unavailable" stub, not a reconstruction. Feedback is recorded as the user reports it. Interview talking points are grounded in the profile or marked as gaps.
4. **Stay schema-compatible.** `outcome.md` follows the format in `personal/README.md` exactly (`in_progress` is the one addition, for open applications); the tracker keeps its columns.
5. **Idempotent updates.** Re-running on the same application appends new stages and notes; it never duplicates folders, rows, or history. One prep pack per stage, never overwritten.
6. **The posting is verbatim, the prep pack is derived.** `job_posting.md` is never summarized or replaced — it is the source of truth. Prep packs are regenerable from it and safe to delete.
