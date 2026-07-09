# Job Evaluation Framework

<!-- TEMPLATE: this file is tracked and must keep its [PLACEHOLDER] tokens. -->
<!-- /setup copies it to personal/profile/ and personalizes it there. -->

## Scoring Dimensions

Evaluate each job posting against these six dimensions.

### 1. Technical Skills Match (0-100)
How well do the required/preferred skills align with the candidate's capabilities?

| Score | Meaning |
|-------|---------|
| 80-100 | Core requirements are primary skills |
| 60-79 | Most requirements match, 1-2 gaps that are learnable |
| 40-59 | Partial match, significant upskilling needed |
| 0-39 | Fundamental mismatch |

**Strong match areas:** [YOUR_PRIMARY_SKILLS]
**Moderate match areas:** [YOUR_SECONDARY_SKILLS]
**Weak match areas:** [SKILLS_YOU_LACK]

### 2. Experience Match (0-100)
Does work history align with what they're looking for?

| Score | Meaning |
|-------|---------|
| 80-100 | Direct experience in the same domain and role type |
| 60-79 | Related experience, transferable skills clear |
| 40-59 | Adjacent experience, would need to make the case |
| 0-39 | Unrelated experience |

**Strong:** [YOUR_DIRECT_EXPERIENCE_DOMAINS]
**Moderate:** [YOUR_ADJACENT_EXPERIENCE]
**Entry-level:** [ROLES_WITH_LIMITED_EXPERIENCE]

### 3. Company Profile Fit (0-100)

The *shape* of the employer, independent of the role. Two identical job descriptions at a 40-person startup and a 40,000-person bank are not the same job, and the candidate does not perform equally well in both.

| Score | Meaning |
|-------|---------|
| 80-100 | Company size, stage, and structure are where the candidate does their best work |
| 60-79 | Workable, with some friction (e.g. right stage, more process than ideal) |
| 40-59 | Notable mismatch in size or stage; the role would have to be exceptional |
| 0-39 | An environment the candidate has consistently disliked or underperformed in |

**Ideal size:** [YOUR_IDEAL_COMPANY_SIZE]
**Ideal stage:** [YOUR_IDEAL_COMPANY_STAGE]
**Poor fit:** [COMPANY_TYPES_TO_AVOID]

**Signals to gather** (cheap lookups, not exhaustive due diligence):
- Approximate headcount, as a band: `1-20`, `21-100`, `101-500`, `501-5000`, `5000+`
- Stage: pre-seed / seed / Series A-B / growth / mature private / public / non-profit / public sector
- Headquarters city, and whether the posting's location is HQ or a satellite office
- Sector and primary product
- Founded year, plus any recent funding, layoffs, or acquisition news

**Budget: two or three web searches per company.** If a signal cannot be found quickly, record it as `unknown` and say so. **Never infer headcount or funding stage from the company name or the tone of the posting.** An `unknown` size scores the dimension at 50 (neutral) and carries a visible `?` marker — it is not a guess dressed up as a score.

Company profiles are cached in `personal/companies.json` and reused across runs, so each company is researched once rather than once per posting.

### 4. Behavioral/Culture Fit (0-100)
Does the role and the team's way of working match the behavioral profile?

| Score | Meaning |
|-------|---------|
| 80-100 | Culture strongly matches behavioral preferences |
| 60-79 | Mixed signals but mostly compatible |
| 40-59 | Some friction areas |
| 0-39 | Significant culture mismatch |

**Red flags to research:** department disorganization, work dominated by maintenance over development, poor chemistry with leadership, culture mismatch. Check reviews, media coverage, and LinkedIn for insider perspective.

### 5. Location & Logistics (Pass/Fail + Notes)
- Within commute range: PASS
- Remote, or remote with occasional office: PASS
- Requires relocation: FAIL (deal-breaker)
- Frequent international travel: FLAG (surface to the user)

### 6. Career Alignment & Motivation (0-100)
Does this role advance career goals and contain tasks that energize?

| Score | Meaning |
|-------|---------|
| 80-100 | Strongly aligned with career direction, clear growth path |
| 60-79 | Good role but only partially aligned with long-term goals |
| 40-59 | Decent job but doesn't build toward career goals |
| 0-39 | Dead end or backwards step |

**Career goals:**
- [YOUR_CAREER_GOAL_1]
- [YOUR_CAREER_GOAL_2]
- [YOUR_CAREER_GOAL_3]

**Motivation filter:** Evaluate not just whether the candidate *can* do the tasks, but whether the tasks will *energize* them.
- Tasks that energize: [YOUR_ENERGIZING_TASKS]
- Tasks that drain: [YOUR_DRAINING_TASKS]

**Life situation alignment:**
- **Security**: [YOUR_FINANCIAL_SITUATION_CONTEXT]
- **Flexibility**: [YOUR_SCHEDULE_CONSTRAINTS]
- **Professional development**: [YOUR_GROWTH_PRIORITIES]

## Weighting

| Dimension | Weight |
|-----------|--------|
| Technical Skills | 25% |
| Experience Match | 25% |
| Company Profile Fit | 20% |
| Career Alignment | 20% |
| Behavioral Fit | 10% |

Location is pass/fail and unweighted. A FAIL vetoes the job regardless of score.

> **These weights are a knob.** Edit them here and every future `/search` re-ranks accordingly. Company Profile Fit is weighted heavily on the assumption that employer shape is a first-order predictor of the candidate's performance. If that stops being true, lower it.

## Thresholds
- **Strong Fit** (75+): Apply
- **Good Fit** (60-74): Apply, be ready to address the gaps
- **Moderate Fit** (45-59): Consider carefully
- **Weak Fit** (30-44): Probably skip unless there is a strategic reason
- **Poor Fit** (<30): Skip

## Output Format

```
## Job Fit Evaluation: [Role] at [Company]

**Company:** [size band] · [stage] · [HQ] · [sector]

| Dimension | Score | Notes |
|-----------|-------|-------|
| Technical Skills | XX/100 | [brief note] |
| Experience Match | XX/100 | [brief note] |
| Company Profile | XX/100 | [brief note] |
| Career Alignment | XX/100 | [brief note] |
| Behavioral Fit | XX/100 | [brief note] |
| Location | PASS/FAIL | [brief note] |

**Overall Score: XX/100**

### Verdict: [Strong Fit / Good Fit / Moderate Fit / Weak Fit / Poor Fit]

### Key Strengths for This Role
- [bullets, grounded in the posting text]

### Gaps
- [bullets, honest]

### Recommendation
[1-2 sentences: apply / skip / apply with caveats]
```

## Pre-Application: Call the Employer (Best Practice)

Before applying, consider whether to call the contact person listed in the posting. **Only call if there are substantive questions** - never call just to "be remembered."

### When to Suggest Calling
- The posting has unclear or ambiguous requirements
- It's unclear which competencies are essential vs. nice-to-have
- The role description is vague about day-to-day tasks
- There's a named contact person who invites questions

### Good Questions to Ask
- "What are the primary challenges in this role?"
- "How is time typically divided across the listed responsibilities?"
- "Which competencies are most critical for success in this position?"
- "What does success look like in the first 6-12 months?"

### Rules for the Call
- The call's purpose is **gathering information**, not delivering a pitch
- Prepare a 30-second summary of your background in case they ask
- Take notes
