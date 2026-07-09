---
name: job-application-assistant
description: >
  Assists with job applications: evaluating job postings, tailoring CVs, and writing cover
  letters. Triggers on keywords like: job posting, job application, CV, cover letter, resume,
  job fit, career, application, apply
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch, Edit, Write, AskUserQuestion
---

# Job Application Assistant

---

## Workflow

When the user provides a job posting (URL or text), follow this workflow:

### Step 1: Research & Evaluate Fit
- Fetch the job posting content (use WebFetch for URLs)
- Analyze the posting for required competencies, keywords, and priorities
- Research the company (website, LinkedIn, mission, recent news)
- Score the posting against the candidate's profile using the framework in `04-job-evaluation.md`
- Present the evaluation table and verdict
- Suggest whether the candidate should call the employer before applying (see `04-job-evaluation.md` for guidance)
- Ask the user if they want to proceed with an application

### Step 2: Tailor CV
- Read the most relevant existing CV variant from `cv/` as a starting point
- Follow the guidelines in `05-cv-templates.md`
- Create `cv/main_<company>.tex` with tailored content
- Adjust: profile statement, skills section, experience bullet emphasis, section order

### Step 3: Write Cover Letter
- Follow the writing style rules in `03-writing-style.md` (critical: no em-dashes, no cliches)
- Follow the template structure in `06-cover-letter-templates.md`
- Create `cover_letters/cover_<company>_<role>.tex`
- Ensure the letter connects specific experience to the role requirements

---

## Reference Files

These live under `personal/profile/` (gitignored). If they are missing, the user has not run `/setup` — say so rather than falling back to the placeholder templates in `profile-templates/`.

| File | Purpose |
|------|---------|
| `personal/profile/01-candidate-profile.md` | Education, experience, skills, publications, awards |
| `personal/profile/02-behavioral-profile.md` | Behavioral assessment, strengths, ideal environments |
| `personal/profile/03-writing-style.md` | Tone, structure, do's and don'ts |
| `personal/profile/04-job-evaluation.md` | Scoring framework for job fit |
| `personal/profile/05-cv-templates.md` | LaTeX CV structure and tailoring rules |
| `personal/profile/06-cover-letter-templates.md` | LaTeX cover letter structure and tailoring rules |

`.claude/skills/job-application-assistant/profile-templates/` holds tracked placeholder copies. `/setup` seeds `personal/profile/` from them. **Never write personal data into the templates.**

---

## Quick Commands

The user may also ask for individual steps without the full workflow:
- "Evaluate this job posting" - Step 1 only
- "Write a CV for [company]" - Step 2 only
- "Write a cover letter for [role] at [company]" - Step 3 only
- "What jobs should I look for?" - Career strategy discussion using profile + evaluation framework
