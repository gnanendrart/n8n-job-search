# Building an AI-Powered Job Search System From Scratch
**Stack (Phase 1):** React · Vite · Express · Claude · Apify (LinkedIn + Indeed)
**Stack (Phase 2):** n8n · Claude Haiku + Sonnet · Apify · HTML/CSS · Gotenberg · Google Drive · Gmail · Supabase
**Published:** April 2026

---

## The Two-Phase System

This project was built in two phases that serve different purposes and work together.

**Phase 1** is a manual morning tool — open it, run a search, review results, optimize your resume bullets for a specific job, then apply. You're in the loop for every decision.

**Phase 2** is a fully automated overnight pipeline — runs at 7 AM, produces pre-tailored resume PDFs in your inbox. You wake up, open the email, pick the best PDFs, apply. Under 10 minutes of daily effort.

Both phases use Claude and Apify as their core intelligence layer.

---

## Phase 1: Replit Job Hunt Agent

**Stack:** React + Vite frontend, Express backend (esbuild-bundled), Claude AI + Apify
**Hosted on:** Replit (free tier sufficient)

### What It Does

A dark SaaS-style web app where you run job searches, score results against your resume, optimize your bullets, generate cover letters, and manage your application pipeline — all in one place.

### Job Search

- **LinkedIn scraping** via Apify actor `curious_coder~linkedin-jobs-scraper` — builds search URLs across multiple role x location combinations
- **Indeed scraping** via Apify actor `misceres~indeed-scraper` — sends roles and locations as arrays with a country code
- **Source selector** — LinkedIn / Indeed / Both, with a country dropdown (US, CA, UK, AU, IN, DE, FR) that appears when Indeed is active
- **Deduplication** — when Both is selected, results are merged and deduplicated by normalized title + company name (not URL — LinkedIn and Indeed URLs differ for the same job)
- **Source badges** — every result row shows a LI (blue) or IN (red) chip
- **Date Posted filter** — Last 24h / Last Week / Any Time
- **Apify token validator** — validates your token inline and shows username + plan

### ATS Scoring

Per-job score button and a Score All bulk action. Claude returns a 0-100 ATS score, match tier (Strong / Good / Partial / Weak), and the top missing keywords. Score badges are color-coded: green ≥ 72, yellow ≥ 42, red below 42.

**ATS Scoring Prompt:**
```
You are an ATS engine performing a strict keyword and experience match analysis.
Identify the 10 most important keywords/skills in the job description.
Count how many appear in the resume (exact or close synonyms).
Base the ats_score primarily on that keyword hit rate, adjusted for experience level match and title alignment.
Do NOT default to a middle value — score low (20-45) for poor fits, high (80-95) for excellent fits.

Return only valid JSON:
{
  "ats_score": integer 0-100,
  "match_tier": "Strong" | "Good" | "Partial" | "Weak",
  "top_missing_keywords": [up to 3 crucial keywords absent from resume]
}
```

### Resume Intelligence

- **Resume Optimizer** — Claude rewrites your resume bullets to match a specific job's keywords and language
- **Cover Letter Generator** — tailored cover letter per job, with copy + download
- **Keyword Analyzer** — aggregates the most-missed keywords across all results so you can spot patterns across the market, not just one job
- **Resume Gap Analyzer** — identifies skill gaps between your resume and the full job set, with prioritized recommendations for what to learn or surface

**Resume Optimization Prompt:**
```
You are an elite career coach and resume optimizer. Analyze the resume against the job description.

Return only valid JSON:
{
  "match_score": 0-100,
  "ats_breakdown": { "skills_match": 0-100, "experience_match": 0-100, "title_match": 0-100 },
  "top_3_changes": ["specific change 1", "specific change 2", "specific change 3"],
  "keywords_to_add": ["keyword1", "keyword2", ...],
  "rewritten_headline": "string under 15 words",
  "rewritten_summary": "2-3 sentence professional summary"
}
```

### Salary Insights

Per-job Estimate link and Estimate All bulk button. Claude returns: base range, total comp range (base + bonus + annualized equity), confidence level, and an explanatory note. A tooltip on the salary badge shows the full breakdown.

### Interview Prep

Per-job panel with three tabs: Behavioral, Technical, and Role & Company. Each question is expandable to reveal a coaching tip. Includes copy-all and regenerate.

### Email Digest

Generates a styled HTML email summarizing your saved jobs with ATS scores and links. Includes a live iframe preview, HTML source view, copy, and download.

### Saved Jobs & Pipeline Management

- **Bookmark** any job from search results; persists in localStorage
- **Status tracker** — Saved / Applied / Interviewing / Offer / Rejected — per job, with a dropdown selector
- **Pipeline summary cards** — count per status, clickable to filter the list
- **List view** — sortable table with status, title, company, ATS score, missing keywords, level, and actions
- **Kanban view** — five columns by status; each job card shows source badge, title, company, location, ATS score, level, and quick-action buttons
- **Export to CSV** — all saved jobs with their current status
- **Search history** — recent searches with one-click re-run

### Setup (Replit)

1. Fork the Repl at `replit.com` or create a new React + Express Replit
2. Add these secrets in Replit's Secrets tab:
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `APIFY_API_TOKEN` — your Apify token (the app also accepts it via UI)
3. Run the app. The Express server starts on port 8080; Vite proxies API calls to it.

---

## Phase 2: n8n Automated Overnight Pipeline

**Self-hosted on a $7/month VPS. Runs at 7 AM. You wake up to PDFs.**

### What It Does

Every morning at 7 AM, this workflow:

1. Scrapes LinkedIn AND Indeed for jobs posted in the last 24 hours matching your target roles — in parallel
2. Merges both job streams, removes duplicates
3. Checks Supabase — drops any job URL already processed in a previous run
4. Scores each new job against your background using Claude Haiku (fast, cheap)
5. Filters out poor fits (score below 60 out of 100)
6. Passes good-fit jobs to Claude Sonnet, which tailors your resume to each one
7. Logs each tailored job to Supabase (so it won't appear tomorrow)
8. Renders each tailored resume as a polished PDF using Gotenberg (self-hosted headless Chrome)
9. Uploads the PDFs to your Google Drive
10. Emails you a summary with links

You open the email, review 2-5 pre-tailored PDFs, pick the best ones, and apply. Daily effort: under 10 minutes.

---

## Architecture Overview (v2)

```
Daily Trigger (7 AM)
  └─ Config Node (API keys, search query)
       └─ Fetch Resume (Google Drive)
            └─ Read Resume Google Doc
                 └─ Extract Resume Text
                      ├─ Build LinkedIn Search URL
                      │    └─ Apify: Scrape LinkedIn Jobs (waitForFinish=180)
                      │         └─ Fetch Apify Job Results
                      │              └─ Parse & Structure Jobs ──────────────────┐
                      │                                                           ↓
                      └─ Apify: Scrape Indeed Jobs (waitForFinish=180)         Merge (Append)
                           └─ Fetch Indeed Job Results                           ↓
                                └─ Parse Indeed Jobs ───────────────────────────┘
                                                                                 ↓
                                                                        Limit to 9 Jobs
                                                                                 ↓
                                                                        Filter Duplicates
                                                                                 ↓
                                                                      Check: Already Seen?
                                                                       (Supabase lookup)
                                                                                 ↓
                                                                   Score Job Fit ← Claude Haiku
                                                                                 ↓
                                                                    Score ≥ 60? (IF filter)
                                                                         ↓ true
                                                                   Prepare ATS Prompt
                                                                                 ↓
                                                            ATS Resume Tailoring ← Claude Sonnet
                                                                                 ↓
                                                                  Merge Job + Resume JSON
                                                                                 ↓
                                                                       Log Job Record
                                                                    (Supabase insert)
                                                                                 ↓
                                                                     Build HTML Code (JS)
                                                                                 ↓
                                                                  Filter: Valid HTML? (IF)
                                                                         ↓ true
                                                                 Prepare HTML for PDF
                                                                                 ↓
                                                           Render HTML to PDF (Gotenberg)
                                                                                 ↓
                                                                    Set PDF Filename
                                                                                 ↓
                                                                  Upload Resume to Drive
                                                                                 ↓
                                                                  Set Drive Permissions
                                                                                 ↓
                                                                  Format Email Summary
                                                                                 ↓
                                                                    Send Daily Email
```

**Two AI tiers running in sequence:**
- **Haiku** — lightweight scoring only, fractions of a cent per job
- **Sonnet** — full resume tailoring, only for jobs that pass the threshold

**Why `waitForFinish` instead of a polling loop:** See Key Decision #9.

---

## Prerequisites

You need accounts and API keys for:

- **Hostinger VPS** (or any Ubuntu 22/24 server) — $7-$10/month
- **n8n** — self-hosted via Docker (free)
- **Anthropic API** — Claude Haiku + Sonnet
- **Apify** — LinkedIn scraping via `curious_coder~linkedin-jobs-scraper` actor, Indeed scraping via `misceres~indeed-scraper` actor. Starter plan ($5/month credit) covers both at typical usage.
- **Google Cloud** — Drive API + Gmail API (OAuth credentials)
- **Supabase** — job deduplication storage (free tier sufficient)
- **Gotenberg** — self-hosted HTML-to-PDF via Docker (free, open source, no key needed)

Your resume should be stored as a Google Doc or Drive file so the workflow can fetch it fresh every run.

---

## VPS Setup

### 1. Provision Your Server

Any Ubuntu 22.04 or 24.04 VPS works. Hostinger's KVM 2 ($8/month) is sufficient.

SSH in as root:
```bash
ssh root@YOUR_VPS_IP
```

### 2. Install Docker and Docker Compose

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

### 3. Create the n8n Directory Structure

```bash
mkdir -p /docker/n8n
cd /docker/n8n
```

### 4. Create docker-compose.yml

```yaml
version: "3"
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: always
    ports:
      - "5678:5678"
    env_file:
      - .env
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - gotenberg

  gotenberg:
    image: gotenberg/gotenberg:8
    container_name: gotenberg
    restart: always
    ports:
      - "3000:3000"

volumes:
  n8n_data:
```

### 5. Create .env File

```bash
cat > .env << 'EOF'
GENERIC_TIMEZONE=America/Edmonton
N8N_HOST=YOUR_DOMAIN_OR_IP
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://YOUR_DOMAIN/
EOF
```

**Critical:** Set `GENERIC_TIMEZONE` to your local timezone. If this is wrong, your 7 AM trigger fires at the wrong local time. Use the IANA timezone database format (e.g., `America/Edmonton`, `America/New_York`, `Europe/London`).

**Watch out for BOM characters.** If you edit this file with certain tools, invisible characters can appear at the start of the file, causing `docker compose` to fail with a parse error. Fix with:
```bash
sed -i '1s/^[^#A-Za-z]*//' /docker/n8n/.env
```

### 6. Start n8n

```bash
cd /docker/n8n
docker compose up -d
```

Verify timezone is set correctly:
```bash
docker exec n8n-n8n-1 env | grep TIMEZONE
```

Access n8n at `http://YOUR_IP:5678`.

---

## Supabase Setup

### 1. Create a Supabase Project

Go to supabase.com, create a free project. Note your project URL and anon public key (Project Settings → API).

### 2. Create the Jobs Table

In the Supabase SQL Editor, run:
```sql
CREATE TABLE IF NOT EXISTS "Jobs" (
  job_url      TEXT PRIMARY KEY,
  job_title    TEXT,
  company      TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);
```

**Table name is case-sensitive.** The table must be named `Jobs` (capital J) to match the expressions used in the workflow.

**Do not enable Row Level Security (RLS)** on this table unless you switch to the `service_role` key. With RLS off, the anon key has full read/write access, which is what the workflow needs.

### 3. Add Credentials to Config Node

Add `supabaseUrl` and `supabaseKey` fields to your Config: Keys & Search Params node. The workflow reads them from there at runtime — you don't need to hardcode them anywhere else.

---

## n8n Workflow — Node by Node

### Node 1: Daily Trigger
**Type:** Schedule Trigger
**Settings:** Every day at 7:00 AM (your local timezone)

### Node 2: Config — Keys & Search Params
**Type:** Set (manual values)

Add these fields:

| Field | Value |
|-------|-------|
| `resumeFileId` | Your Google Drive file ID for your resume |
| `jobSearchQuery` | `Senior Data Analyst OR Analytics Engineer OR Data Operations Analyst` |
| `userEmail` | Your email address |
| `apifyToken` | Your Apify API token |
| `apifyActorId` | `curious_coder~linkedin-jobs-scraper` |
| `indeedActorId` | `misceres~indeed-scraper` |
| `supabaseUrl` | Your Supabase project URL |
| `supabaseKey` | Your Supabase anon public key |

This centralizes all config in one place so you don't have to dig into individual nodes to change search terms or rotate keys.

### Node 3: Fetch Resume (Google Drive)
**Type:** Google Drive — Download File
**File ID:** `{{ $('Config: Keys & Search Params').first().json.resumeFileId }}`

Pulls your resume as a Google Doc export (plain text). When you update your master resume, the workflow automatically uses the latest version the next morning.

### Node 4: Read Resume Google Doc
**Type:** Google Docs — Get Document
Reads the Google Doc and outputs its full text.

### Node 5: Extract Resume Text
**Type:** Set or Code
Converts the Doc output to plain text accessible as `$json.fullText`.

---

## LinkedIn Chain

### Node 6: Build LinkedIn Search URL
**Type:** Set
**Value:**
```
https://www.linkedin.com/jobs/search/?keywords={{ encodeURIComponent($('Config: Keys & Search Params').first().json.jobSearchQuery) }}&location=Canada&f_TPR=r86400&f_WT=2&f_E=4&sortBy=DD
```

**URL parameter reference:**

| Param | Meaning | Value |
|-------|---------|-------|
| `f_TPR=r86400` | Posted in last 24 hours | `r86400` = 86,400 seconds |
| `f_WT=2` | Remote only | `1` = on-site, `2` = remote, `3` = hybrid |
| `f_E=4` | Senior level | `3` = mid-senior, `4` = senior, `3,4` = both |
| `sortBy=DD` | Sort by date | `DD` = most recent first |

Adjust `location` and `f_E` to match your target market.

### Node 7: Apify: Scrape LinkedIn Jobs
**Type:** HTTP Request (POST)
**Method:** POST
**URL:**
```
https://api.apify.com/v2/acts/{{ $('Config: Keys & Search Params').first().json.apifyActorId }}/runs?token={{ $('Config: Keys & Search Params').first().json.apifyToken }}&waitForFinish=180
```
**Body (JSON):**
```json
{ "urls": ["{{ $('Build LinkedIn Search URL').first().json.linkedinUrl }}"], "scrapeCompany": false, "count": 10 }
```
**Timeout:** 300000

The `waitForFinish=180` parameter tells the Apify API to hold the HTTP response open for up to 180 seconds, returning only after the actor run reaches a terminal state. The response includes `data.defaultDatasetId` ready to use. No polling loop required. See Key Decision #9 for full explanation.

### Node 8: Fetch Apify Job Results
**Type:** HTTP Request (GET)
**URL:**
```
https://api.apify.com/v2/datasets/{{ $('Apify: Scrape LinkedIn Jobs').first().json.data.defaultDatasetId }}/items?token={{ $('Config: Keys & Search Params').first().json.apifyToken }}&clean=true
```

### Node 9: Parse & Structure Jobs
**Type:** Code (Run Once for All Items)
Normalizes LinkedIn's output fields to the pipeline's standard schema. Connects to Input 1 of the Merge node.

---

## Indeed Chain (Parallel)

Both chains branch from `Extract Resume Text` simultaneously and converge at the Merge node.

### Node A: Apify: Scrape Indeed Jobs
**Type:** HTTP Request (POST)
**Connects from:** Extract Resume Text (parallel to Build LinkedIn Search URL)
**URL:**
```
https://api.apify.com/v2/acts/{{ $('Config: Keys & Search Params').first().json.indeedActorId }}/runs?token={{ $('Config: Keys & Search Params').first().json.apifyToken }}&waitForFinish=180
```
**Body (JSON):**
```json
{
  "position": "{{ $('Config: Keys & Search Params').first().json.jobSearchQuery }}",
  "country": "CA",
  "location": "Canada",
  "maxItemsPerSearch": 10,
  "followApplyRedirects": false,
  "parseCompanyDetails": false,
  "saveOnlyUniqueItems": true
}
```
**Timeout:** 300000

**Indeed actor input field reference:**

| Field | Description |
|-------|-------------|
| `position` | Keywords / job title string |
| `country` | ISO country code (`CA` for Canada, `US` for USA, `GB` for UK) |
| `location` | Free-text location string |
| `maxItemsPerSearch` | Cap per search — keep at 10 to control Apify cost |
| `saveOnlyUniqueItems` | Actor-level dedup within a single run |

**Why `waitForFinish` is especially important for Indeed:** The `misceres~indeed-scraper` actor returns status `FAILED` at the run level even when it successfully scraped job listings. This is because the actor makes many HTTP requests internally; if some fail (rate limits, redirects), the overall run status is `FAILED` even though results were produced. A polling loop checking `status equals SUCCEEDED` will never exit. `waitForFinish` bypasses this — it returns when the run reaches any terminal state, and the results are available regardless of the run status label.

### Node B: Fetch Indeed Job Results
**Type:** HTTP Request (GET)
**URL:**
```
https://api.apify.com/v2/datasets/{{ $('Apify: Scrape Indeed Jobs').first().json.data.defaultDatasetId }}/items?token={{ $('Config: Keys & Search Params').first().json.apifyToken }}&clean=true
```

### Node C: Parse Indeed Jobs
**Type:** Code (Run Once for All Items)
**Connects from:** Fetch Indeed Job Results
**Connects to:** Merge node (Input 2)

Indeed's output field names differ from LinkedIn's. This node normalizes them to the same schema so all downstream nodes work identically regardless of source.

```javascript
const items = $input.all();
const results = [];

for (const item of items) {
  const d = item.json;
  results.push({
    json: {
      title: d.positionName ?? '',
      company: d.company ?? '',
      location: d.location ?? '',
      jobLink: d.url ?? '',
      jobDescription: d.description ?? '',
      postedAt: d.postedAt ?? '',
      employmentType: Array.isArray(d.jobType) ? d.jobType[0] : (d.jobType ?? ''),
      seniorityLevel: ''
    }
  });
}

return results;
```

**Field mapping (Indeed → pipeline standard):**

| Indeed field | Pipeline field | Notes |
|-------------|---------------|-------|
| `positionName` | `title` | |
| `company` | `company` | |
| `location` | `location` | |
| `url` | `jobLink` | |
| `description` | `jobDescription` | |
| `postedAt` | `postedAt` | |
| `jobType[0]` | `employmentType` | Array, take first element |
| (not available) | `seniorityLevel` | Set to empty string |

---

## Merge and Deduplication

### Merge Node
**Type:** Merge
**Mode:** Append
**Input 1:** Parse & Structure Jobs (LinkedIn results)
**Input 2:** Parse Indeed Jobs (Indeed results)
**Connects to:** Limit to 9 Jobs

Combines both job streams into a single pool. With 10 LinkedIn + 10 Indeed = up to 20 jobs entering, the Limit node then caps the pool before the expensive scoring step.

### Limit to 9 Jobs
**Type:** Limit
**Max Items:** 9

Caps total jobs entering the scoring phase. Raise to 15-20 after confirming the pipeline is stable and Apify costs are acceptable.

### Filter Duplicates
**Type:** Code (or Remove Duplicates node)
**Deduplicates by:** `jobLink`

Removes exact URL duplicates within a single run. Catches cases where LinkedIn and Indeed happen to return the same job URL.

---

## Check: Already Seen? (Supabase Cross-Day Deduplication)

**Type:** Code
**Mode:** Run Once for All Items
**Connects from:** Filter Duplicates
**Connects to:** Score Job Fit (Haiku)

Queries Supabase before scoring to skip jobs processed in any previous run. This is the cross-day deduplication layer.

```javascript
const items = $input.all();
const config = $('Config: Keys & Search Params').first().json;
const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

const results = [];

for (const item of items) {
  const jobData = {
    title: item.json.title,
    company: item.json.company,
    location: item.json.location,
    postedAt: item.json.postedAt,
    employmentType: item.json.employmentType,
    seniorityLevel: item.json.seniorityLevel,
    jobLink: item.json.jobLink,
    jobDescription: item.json.jobDescription
  };

  const jobUrl = jobData.jobLink ?? '';
  if (!jobUrl) {
    results.push({ json: jobData });
    continue;
  }

  let alreadySeen = false;
  try {
    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: `${supabaseUrl}/rest/v1/Jobs?job_url=eq.${encodeURIComponent(jobUrl)}&select=job_url`,
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    alreadySeen = Array.isArray(response) && response.length > 0;
  } catch (e) {
    alreadySeen = false; // fail open — better to re-show a job than miss one
  }

  if (!alreadySeen) {
    results.push({ json: jobData });
  }
}

return results;
```

**Why explicit field copy instead of spread:** `$json` in n8n Code nodes returns a Proxy object, not a plain JavaScript object. Spreading it (`{ ...$json }`) causes n8n to throw "A 'json' property isn't an object". Copying fields individually produces a guaranteed plain object.

**Why `this.helpers.httpRequest` instead of `fetch`:** The global `fetch` function is not available in n8n's sandboxed Code node environment. `this.helpers.httpRequest` is n8n's built-in HTTP helper and works reliably.

**Why fail-open on error:** If the Supabase query fails (network issue, wrong key), the job passes through instead of being dropped. Better to occasionally re-show a job than to silently miss a good match.

---

## The Two-Stage AI Filter

### Stage 1 — Score Job Fit (Claude Haiku)

**Node type:** Basic LLM Chain
**Model:** `claude-haiku-4-5-20251001` (or latest Haiku)
**Max Tokens:** 256

**System prompt:**
```
Rate how well this job matches the candidate's background on a scale of 0-100.
Return ONLY valid JSON, nothing else: {"score": <number>, "reason": "<one sentence>"}

Candidate skills: [paste your core skills here, e.g., SQL, Python, Power BI, Snowflake, AWS, etc.]
```

**User message:** `{{ $json.jobDescription }}`

This node returns a short JSON object like `{"score": 72, "reason": "Strong keyword overlap on SQL and healthcare analytics."}`.

### Stage 2 — Filter: Score ≥ 60?
**Type:** IF
**Condition:** Expression — Number — greater than or equal to — 60

The expression to extract the score from Haiku's text output:
```
{{ JSON.parse($json.text.match(/\{[\s\S]*?\}/)[0]).score }}
```

**Why this matters:** Without this filter, every job goes to Sonnet. A poorly matched job will either cost API money unnecessarily or cause Sonnet to return plain text instead of JSON when it can't match the candidate's background, crashing the workflow. The Haiku filter eliminates both problems for fractions of a cent per job.

---

## ATS Resume Tailoring (Claude Sonnet)

**Node type:** AI Agent
**Model:** `claude-sonnet-4-6` (or latest Sonnet)
**Max Tokens:** 4096
**Mode:** Run Once for Each Item

**System prompt:**
```
You are an expert ATS resume optimizer. Your job is to tailor the candidate's resume
to match a specific job description. You will receive the candidate's resume and the
job description.

OUTPUT RULES — CRITICAL:
- Return ONLY valid JSON. No markdown, no explanation, no preamble.
- You MUST always return valid JSON regardless of job fit.
- Never return plain text assessments. Even for poor matches, generate the best
  possible tailored resume using actual experience.

ACCURACY RULES — NEVER VIOLATE:
- NEVER invent skills, companies, dates, metrics, or technologies not in the resume.
- NEVER add tools the candidate has not used.
- Only surface and reframe what already exists.

FIELD RULES:
- "title": Job title ONLY. Do NOT include company name, client names, or
  "Contractor to [X]". Example correct: "Data Analyst III".
  Example wrong: "Data Analyst III, Contractor to CDC".
- "company": Legal employer only. Client names go in the lead sentence or bullets,
  NOT in title or company fields.
- "lead": One italic sentence summarizing the role's scope and impact. Client
  context goes here.

BULLET RULES:
- Write bullets as strong action statements with measurable outcomes.
- Prioritize bullets that match the job description's keywords.
- Do not duplicate the lead sentence in the bullets.

Return this exact JSON structure:
{
  "name": "Full legal name",
  "phone": "phone number",
  "email": "email address",
  "location": "City, Province",
  "linkedin": "full LinkedIn URL",
  "summary": "3-4 sentence tailored professional summary matching the job",
  "experience": [
    {
      "dates": "Mon YYYY - Mon YYYY",
      "title": "Job Title Only (no company, no contractor context)",
      "company": "Legal Employer Name Only",
      "location": "City, Country",
      "lead": "One sentence summarizing role scope and client/program context",
      "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"]
    }
  ],
  "education": [
    {
      "date": "Mon YYYY",
      "degree": "Full Degree Name",
      "school": "University Name",
      "location": "City, State/Country"
    }
  ],
  "skills": [
    {
      "category": "Category Label",
      "items": "comma-separated list of skills"
    }
  ]
}
```

**User message template:**
```
I am providing two artifacts:
My current resume:
{{ $("Extract Resume Text").first().json.fullText }}
A target job description (JD) for the role I am applying to:
{{ $('Filter Duplicates').item.json.jobDescription }}
```

**Critical:** Do not use `{{ $json.jobDescription }}` here. Score Job Fit (Haiku) strips all original job fields — `$json.jobDescription` is null at this stage. Reference `Filter Duplicates` directly by node name. The `.item` accessor matches the correct job index automatically across all batch items.

---

## Log Job Record (Supabase)

**Type:** Supabase
**Resource:** Row
**Operation:** Create
**Table:** Jobs

| Field Name | Field Value |
|------------|-------------|
| `job_url` | `{{ $('Filter Duplicates').item.json.jobLink }}` |
| `job_title` | `{{ $('Filter Duplicates').item.json.title }}` |
| `company` | `{{ $('Filter Duplicates').item.json.company }}` |
| `processed_at` | `{{ new Date().toISOString() }}` |

**Placement:** This node goes after Merge Job + Resume JSON — it logs only jobs that completed the full tailoring pipeline. Jobs that failed scoring (below 60) are never logged.

**Why reference `Filter Duplicates` here:** Haiku LLM Chain strips all input fields from its output, so `$json.jobLink`, `$json.title`, and `$json.company` are all null downstream of the scorer. Referencing `Filter Duplicates` by node name pulls the original job data from before the Haiku node.

**Why not log all scraped jobs:** Logging every job (including ones that failed scoring) would create false deduplication — a job that scored 35 today might be genuinely relevant tomorrow if you update your resume skills. Only jobs that passed tailoring get recorded.

---

## Build HTML Code (JavaScript Node)

**Node type:** Code
**Language:** JavaScript
**Mode:** Run Once for All Items (critical)

This node reads the JSON output from the Sonnet ATS Agent and builds a clean single-column HTML resume document. Outputs `{ html: '...' }` for each item.

**Why "Run Once for All Items"?** The node needs to process all jobs at once to produce one output item per job. If set to "Run Once for Each Item", it only processes the first item.

**Why named node reference?** This node reconnects after a Merge node. `$input.all()` returns empty in this case. Use `$('Merge Job + Resume JSON').all()`.

The full code is maintained in `build_html_resume.js`. Core structure:

```javascript
const allItems = $('Merge Job + Resume JSON').all();
const results = [];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

for (const item of allItems) {
  try {
    const data = JSON.parse(/* extracted JSON string */);

    const html = `<!DOCTYPE html>...<body>
      <div class="header"><h1>${name}</h1>...</div>
      <h2>Summary</h2>...
      <h2>Experience</h2>...
      <h2>Education</h2>...
      <h2>Skills</h2>...
    </body></html>`;

    results.push({ json: { html } });
  } catch(e) {
    results.push({ json: { error: e.message } });
  }
}
return results;
```

**Resume visual design:**
- Single-column layout. 10.5pt Helvetica Neue / system fonts.
- Name: navy (#1e3a5f), 17pt bold. Section headers: uppercase, navy underline.
- Lead sentence: italic gray. Bullets: standard list, 10pt.
- ATS-safe: semantic HTML, no tables, no sidebars, no images.

**Critical:** Save this code to a file on your computer and always copy from the file into n8n. Never retype it from a chat window. Markdown renderers auto-hyperlink strings like `data.name` into `[data.name](http://data.name)` — pasting that into n8n's code editor creates a JavaScript SyntaxError.

---

## Prepare HTML for PDF (Code Node)

**Node type:** Code
**Mode:** Run Once for Each Item

Converts the HTML string to a binary file so Gotenberg can receive it as a multipart upload.

```javascript
const html = $json.html;
const binaryData = await this.helpers.prepareBinaryData(
  Buffer.from(html, 'utf8'),
  'index.html',
  'text/html'
);
return [{ json: { ...($json) }, binary: { htmlFile: binaryData } }];
```

---

## Render HTML to PDF (Gotenberg)

**Node type:** HTTP Request
**URL:** `http://gotenberg:3000/forms/chromium/convert/html`
**Method:** POST
**Authentication:** None
**Body Content Type:** Multipart Form-Data
**Body field:** Type = File · Name = `files` · Input Data Field Name = `htmlFile`
**Response:** Format = Binary → Binary Property Name = `pdfData`

Gotenberg runs headless Chromium inside Docker. Because it's in the same `docker-compose.yml` as n8n, you reach it at `http://gotenberg:3000` with no extra network config.

### Filter: Valid HTML? (Before Render)

Insert an IF node before the Gotenberg step:
**Condition:** `{{ $json.html }}` — String — is not empty

This catches items where Build HTML Code produced an error object instead of an `html` field (e.g., a JSON parse failure on malformed Sonnet output). Without this filter, the render node receives nothing and throws `FETCH_METHOD_NOT_SUPPORTED`.

---

## Set PDF Filename (Code Node)

```javascript
const src = $('Build HTML Code').item.json;
const jobSrc = $('Filter Duplicates').item.json;
const company        = jobSrc.company        ?? src.company        ?? '';
const title          = jobSrc.title          ?? src.title          ?? '';
const postedAt       = jobSrc.postedAt       ?? src.postedAt       ?? new Date().toISOString().slice(0, 10);
const jobLink        = jobSrc.jobLink        ?? src.jobLink        ?? '';
const location       = jobSrc.location       ?? src.location       ?? '';
const employmentType = jobSrc.employmentType ?? src.employmentType ?? '';
const seniorityLevel = jobSrc.seniorityLevel ?? src.seniorityLevel ?? '';
const jobDescription = jobSrc.jobDescription ?? src.jobDescription ?? '';
const output         = src.output ?? '';

const safeTitle   = title.replace(/[\/\\:*?"<>|]/g, '').trim().replace(/\s+/g, '_').slice(0, 80);
const safeCompany = company.replace(/[\/\\:*?"<>|]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
const docTitle    = `${safeCompany}_${safeTitle}`;

return {
  json: { output, docTitle, company, title, roleName: safeTitle, postedAt, jobLink, location, employmentType, seniorityLevel, jobDescription },
  binary: { data: $input.item.binary.pdfData }
};
```

Format: `Company_Title` with spaces replaced by underscores. Date visible in Drive file metadata, so no timestamp needed in the filename.

---

## Google Drive Upload + Email

### Upload Resume to Drive
**Node type:** Google Drive — Upload File
**File name:** `{{ $json.docTitle }}`
**Parent folder:** Your target Google Drive folder ID

### Format Email Summary
**Type:** Set or Code
Build an HTML email body listing each job with title, company, ATS score, and a link to the Drive PDF.

### Send Daily Email
**Node type:** Gmail — Send Email
**To:** `{{ $('Config: Keys & Search Params').first().json.userEmail }}`
**Subject:** `Job Search Digest — {{ $now.format('YYYY-MM-DD') }}`

---

## Activating the Workflow (n8n v2.18.x)

In n8n v2.18.5 and later, there is no toggle switch on the workflow list view. To activate the daily trigger, open the workflow canvas and click the **Publish** button in the top-right corner. The workflow becomes active immediately and will run on the configured schedule.

---

## Key Decisions and Why

### 1. Claude Instead of Google Gemini

The original template this was adapted from used Google Gemini for resume tailoring. It was switched to Claude Sonnet because Claude's instruction-following for strict JSON output is more consistent. The downstream HTML builder has zero tolerance for malformed JSON — one bad output crashes the entire item.

### 2. Structured JSON Output Instead of Free-Text Regex Parsing

The first version had Sonnet return free-text resumes, then used JavaScript regex to parse sections by looking for labels like `NAME:`, `EXPERIENCE:`, etc. This broke constantly — Claude formats things differently run to run. The fix: instruct Sonnet to return structured JSON with explicit field names. The Build HTML node then does `data.name`, `data.experience`, etc. No regex, no fragility.

### 3. Two-Stage AI Architecture (Haiku Filter + Sonnet Tailor)

Running every job directly through Sonnet is expensive and produces failure modes. A bad-fit job sometimes causes Sonnet to return a paragraph of explanation instead of JSON, crashing the item. The Haiku pre-filter solves both problems: cheap screening eliminates irrelevant jobs, and the score threshold (60/100) ensures Sonnet only handles jobs where real tailoring makes sense.

Cost comparison for 20 jobs/day: Haiku scoring ~$0.002/day vs. sending all 20 to Sonnet at $0.30-0.50/day. The filter also reduces Sonnet calls from 20 to typically 2-5 per run.

### 4. Named Node Reference for Cross-Branch Data Access

n8n has two ways to access upstream data in a code node: `$input.all()` (only works for direct downstream nodes) and `$('NodeName').all()` (works across branches, by name). Code nodes that reconnect after a Merge or branch require the named reference. If your resumes are all identical (all the first job's content), missing named references is your bug.

### 5. Switched from LaTeX to HTML + Gotenberg

The original pipeline used `moderncv` LaTeX compiled via the ytotech public API. Switched to self-hosted HTML-to-PDF using Gotenberg because HTML + CSS gives full visual control with familiar syntax, Gotenberg runs headless Chromium in Docker (the same rendering engine as printing to PDF in Chrome), and there are no external API dependencies or rate limits.

### 6. Job Title and Company Field Accuracy

Without explicit prompt rules, Claude puts too much information in the `title` field: "Data Analyst III, Contractor to CDC". This renders as the company name appearing twice. The fix is explicit field definitions in the system prompt: `title` is job title only, `company` is legal employer only, `lead` is the sentence where client context belongs.

### 7. LLM Chain Nodes Strip Input Fields — Reference Upstream Nodes Directly

Basic LLM Chain nodes output only the model's `text` response. All incoming fields are dropped. Any expression like `{{ $json.jobDescription }}` or `{{ $json.company }}` in Prepare ATS Prompt, ATS Resume Tailoring, Log Job Record, or Set PDF Filename will return null. Reference original job data by node name: `{{ $('Filter Duplicates').item.json.jobDescription }}`.

### 8. Two-Dedup Architecture

The pipeline uses two distinct deduplication mechanisms for two distinct problems:

**Filter Duplicates** (within-run): removes exact URL duplicates in a single execution. Catches the edge case where LinkedIn and Indeed return the same job URL in the same run.

**Check: Already Seen?** (cross-run): queries Supabase before scoring. Prevents the same jobs from appearing in every daily email.

These are complementary, not redundant.

---

### 9. Replaced Polling Loops with `waitForFinish` Parameter

**The original approach** used a 4-node polling loop after each actor start call:

1. **Poll Run Status** — GET the run status every 10 seconds
2. **Run Complete? (IF)** — check if `data.status` equals `SUCCEEDED`
3. **Wait & Retry** — 10-second wait, loop back to Poll
4. **Retry Limit** — stop after N retries to prevent infinite loops

This was 4 nodes per actor chain. With two actors (LinkedIn + Indeed), that was 8 nodes dedicated purely to waiting.

**Why the polling loop failed for Indeed:** The `misceres~indeed-scraper` actor reports status `FAILED` at the run level even when it produced job listings. The actor makes ~30 HTTP requests internally; if some fail (rate limits, redirects), the run status is `FAILED` even though 10-11 valid results were returned. The IF node checking `status equals SUCCEEDED` never triggered. Changing the condition to `is not equal to RUNNING` helped but the actor sometimes needed 2-3 minutes, exceeding any practical retry limit.

**The fix — `waitForFinish=180`:** Adding `&waitForFinish=180` to the actor start URL (`POST .../runs?token=...&waitForFinish=180`) instructs the Apify API to hold the HTTP response open for up to 180 seconds. The response returns only when the run reaches any terminal state — SUCCEEDED, FAILED, TIMED-OUT, or ABORTED. The response body includes the final run data with `data.defaultDatasetId` ready to use.

**Result:**
- The start request blocks until the actor is done — no separate polling needed
- Works for both SUCCEEDED and FAILED runs — you get whatever results were produced
- 4 nodes removed from each chain, 8 nodes removed total
- LinkedIn and Indeed chains are now symmetric: Start → Fetch Results → Parse

**Nodes removed from each chain:**
- Poll Apify Run Status
- Apify Run Complete? (IF node)
- Wait & Retry (10s)
- Retry Limit

---

### 10. Added Indeed as Second Job Source

**Why Indeed:** Broader coverage than LinkedIn alone. Many employers post on Indeed only, or post earlier there. The same Apify token covers both actors.

**Why parallel chain instead of sequential:** Running LinkedIn and Indeed in parallel halves total scrape time. Both chains start from `Extract Resume Text` simultaneously and converge at the Merge node.

**Why a normalization node (Parse Indeed Jobs):** Indeed's output fields differ from LinkedIn's (`positionName` vs `title`, `url` vs `jobLink`, `description` vs `jobDescription`, `jobType` array vs `employmentType` string). The normalization node maps Indeed fields to the pipeline's standard schema so all downstream nodes work identically regardless of source.

**Cost:** Indeed Scraper costs $6.00/1,000 results. At 10 results/day = ~$0.06/day = ~$2/month.

---

### 11. Fail-Open Deduplication

The Check: Already Seen? node catches Supabase errors and passes the item through (`alreadySeen = false` in the catch block). This is intentional. If Supabase is unreachable for a day, you may see some repeated jobs — but you won't miss a good match entirely. For a job search tool, missing a strong fit is worse than seeing a repeat.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| PDF shows "Your Name" | Regex-based name parsing failed | Switch to JSON output (see system prompt above) |
| All resumes identical (first job only) | `$input.all()` used on branch node | Use `$('NodeName').all()` |
| `FETCH_METHOD_NOT_SUPPORTED` | `$json.html` undefined, error item reached Gotenberg node | Add "Filter: Valid HTML?" IF node before render |
| `SyntaxError` in Build HTML | Chat markdown corrupted JS code | Save code to file, copy from file |
| Gotenberg connection refused | Container not running or not in same compose file | `docker ps`; `docker compose up -d`; `curl http://localhost:3000/health` |
| Sonnet returns plain text instead of JSON | Poor-fit job reached Sonnet without Haiku filter | Add Haiku pre-filter; add "ALWAYS return JSON" to system prompt |
| 7 AM trigger fires at wrong local time | `GENERIC_TIMEZONE` wrong or not set | Set correct IANA timezone in Docker `.env`, restart container |
| `docker compose` parse error on `.env` | BOM characters at start of file | `sed -i '1s/^[^#A-Za-z]*//' .env` |
| `JSON parse error` in Build HTML | Sonnet output truncated mid-JSON | Increase Max Tokens to 4096 in ATS Agent |
| Same jobs every day | Check: Already Seen? or Log Job Record broken | Verify Supabase connection; check Jobs table has rows |
| `$json.jobDescription` null in Sonnet | Haiku LLM Chain strips all input fields | Use `{{ $('Filter Duplicates').item.json.jobDescription }}` |
| All PDFs same filename | `$json.title`/`$json.company` null after Haiku node | Pull from `$('Filter Duplicates').item.json` in filename code |
| `fetch is not defined` in Code node | `fetch` global not available in n8n sandbox | Use `this.helpers.httpRequest()` instead |
| "A 'json' property isn't an object" | `$json` is a Proxy, not a plain object | Copy each field individually instead of spreading `$json` |
| Indeed scraper stuck in polling loop | Actor returns `FAILED` even with valid results | Replace polling loop with `waitForFinish=180` on start URL |
| Indeed actor still running after many retries | Actor takes 2-3 minutes, retry limit too low | Use `waitForFinish=180` — eliminates the loop entirely |
| "Referenced node doesn't exist" error | Node name in expression doesn't match actual node name | Rename the node to match, or update the expression |
| Supabase query errors in Check node | Wrong key or wrong table name | Table is named `"Jobs"` (capital J); verify `supabaseKey` in Config node |

---

## What to Tune After the First Week

**Score threshold:** Start at 60. After a week of runs, check which jobs got through. If strong matches are being filtered, lower to 55. If irrelevant roles keep appearing, raise to 65-70. Note: Indeed jobs sometimes score lower (less structured descriptions) — you may want a separate threshold per source if this pattern is consistent.

**Search query:** Try role variations separately to see which produces better results. The same query runs against both LinkedIn and Indeed — adjust it until both sources are returning relevant jobs.

**Limit to 9 jobs:** Raise once you're confident in the scoring filter. With a tight Haiku threshold, you can set Apify to scrape 25 per source and still end up with 3-7 tailored PDFs.

**Max Tokens on Sonnet:** Keep at 4096. Lower values cause the JSON to be truncated mid-output, producing a parse error.

**`waitForFinish` timeout:** 180 seconds covers most runs. If your Indeed searches are large or the actor is slow, raise to 300.

---

## Repository Structure

```
n8n-job-search/
├── README.md                          # this document — full setup guide
├── n8n_job_search_workflow.json       # n8n workflow export (credentials stripped)
├── build_html_resume.js               # HTML resume builder (paste into n8n Code node)
└── .gitignore
```

Export your n8n workflow: canvas → three-dot menu → Download. Credentials are automatically stripped from the export.

---

*Built with n8n, Claude, Apify, and enough frustration to document everything properly.*
