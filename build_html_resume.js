// build_html_resume.js — Run Once for Each Item mode
// Paste the entire contents of this file into the Build HTML Code node.

function esc(s) {
  return String(s ?? '')
    .replace(/—/g, '-')   // em dash → hyphen
    .replace(/–/g, '-')   // en dash → hyphen
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const mergeJson = $('Merge Job + Resume JSON').item.json;
const logRecord = $input.item.json;
const raw = (mergeJson.output ?? '').trim();

try {
  let jsonStr = raw;
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { jsonStr = codeBlock[1].trim(); }
  else { const jsonObj = raw.match(/\{[\s\S]*\}/); jsonStr = jsonObj ? jsonObj[0] : raw; }

  const data = JSON.parse(jsonStr);

  // Contact line — line 1: location/phone/email/linkedin/github; line 2: portfolio/eligible_to_work
  const link = (url, label) => `<a href="${esc(url)}" style="color:#1a0dab;text-decoration:none;">${esc(label ?? url)}</a>`;
  const contactLine1 = [
    data.location  ? esc(data.location)                       : null,
    data.phone     ? esc(data.phone)                          : null,
    data.email     ? link(`mailto:${data.email}`, data.email) : null,
    data.linkedin  ? link(data.linkedin)                      : null,
    data.github    ? link(data.github)                        : null,
  ].filter(Boolean);
  const contactLine2 = [
    data.portfolio        ? link(data.portfolio)              : null,
    data.eligible_to_work ? esc(data.eligible_to_work)        : null,
  ].filter(Boolean);
  const contactHtml = contactLine1.join(' | ') + (contactLine2.length ? '<br>' + contactLine2.join(' | ') : '');

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: letter; margin: 0.35in 0.4in; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; margin: 0; color: #1a1a1a; line-height: 1.2; }
  h1 { font-size: 14.5pt; margin: 0 0 2px; letter-spacing: 0.02em; }
  .contact { font-size: 7.5pt; color: #444; margin-bottom: 5px; line-height: 1.35; }
  h2 { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em;
       border-bottom: 1px solid #555; margin: 5px 0 2px; padding-bottom: 1px; color: #222; }
  .job-block { margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .bold { font-weight: bold; font-size: 9pt; }
  .italic { font-style: italic; color: #333; font-size: 8.5pt; margin-bottom: 1px; }
  .dates { font-style: italic; color: #555; font-size: 8pt; white-space: nowrap; margin-left: 8px; }
  .client-note { font-size: 8pt; color: #555; margin-bottom: 1px; }
  ul { margin: 1px 0 0 14px; padding: 0; }
  li { margin-bottom: 0; font-size: 9pt; }
  .skills-grid { display: table; width: 100%; margin-bottom: 2px; }
  .skills-row { display: table-row; }
  .skills-cat { display: table-cell; font-weight: bold; font-size: 8.5pt; white-space: nowrap;
                padding: 1px 8px 1px 0; vertical-align: top; width: 115px; }
  .skills-items { display: table-cell; font-size: 8.5pt; padding: 1px 0; vertical-align: top; }
  .proj-block { margin-bottom: 3px; }
  .proj-link { font-size: 8pt; }
  .proj-desc { font-size: 9pt; margin-top: 0; }
  p { margin: 1px 0 0; }
</style>
</head><body>`;

  // ── Header ─────────────────────────────────────────────────────────────────
  html += `<h1>${esc(data.name)}</h1>`;
  html += `<div class="contact">${contactHtml}</div>`;

  // ── Summary ────────────────────────────────────────────────────────────────
  if (data.summary) {
    html += `<h2>Summary</h2><p>${esc(data.summary)}</p>`;
  }

  // ── Skills (before Experience — matches source resume order) ───────────────
  if (data.skills && data.skills.length) {
    html += `<h2>Skills</h2><div class="skills-grid">`;
    for (const s of data.skills) {
      html += `<div class="skills-row">`;
      html += `<div class="skills-cat">${esc(s.category)}:</div>`;
      html += `<div class="skills-items">${esc(s.items)}</div>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ── Experience ─────────────────────────────────────────────────────────────
  if (data.experience && data.experience.length) {
    html += `<h2>Experience</h2>`;
    for (const job of data.experience) {
      html += `<div class="job-block">`;
      html += `<div class="row">`;
      html += `<span class="bold">${esc(job.company)}${job.location ? ', ' + esc(job.location) : ''}</span>`;
      html += `<span class="dates">${esc(job.dates)}</span>`;
      html += `</div>`;
      html += `<div class="italic">${esc(job.title)}</div>`;
      if (job.client_note) {
        html += `<div class="client-note">${esc(job.client_note)}</div>`;
      }
      if (job.bullets && job.bullets.length) {
        html += `<ul>`;
        for (const b of job.bullets) {
          html += `<li>${esc(b)}</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;
    }
  }

  // ── Projects (after Experience — matches source resume order) ──────────────
  if (data.projects && data.projects.length) {
    html += `<h2>Projects</h2>`;
    for (const p of data.projects) {
      html += `<div class="proj-block">`;
      html += `<span class="bold">${esc(p.name)}</span>`;
      if (p.link) {
        html += ` | <a href="${esc(p.link)}" class="proj-link" style="color:#1a0dab;text-decoration:none;">${esc(p.link)}</a>`;
      }
      if (p.description) {
        html += `<div class="proj-desc">${esc(p.description)}</div>`;
      }
      html += `</div>`;
    }
  }

  // ── Education ──────────────────────────────────────────────────────────────
  if (data.education && data.education.length) {
    html += `<h2>Education</h2>`;
    for (const ed of data.education) {
      html += `<div class="job-block">`;
      html += `<div class="row">`;
      html += `<span class="bold">${esc(ed.degree)}, ${esc(ed.school)}</span>`;
      html += `<span class="dates">${esc(ed.date)}</span>`;
      html += `</div>`;
      if (ed.location) html += `<div class="italic">${esc(ed.location)}</div>`;
      html += `</div>`;
    }
  }

  html += `</body></html>`;

  return { json: {
    html,
    company:  logRecord.company   ?? '',
    title:    logRecord.job_title ?? '',
    jobLink:  logRecord.job_url   ?? '',
    postedAt: (logRecord.processed_at ?? '').slice(0, 10),
  }};

} catch(e) {
  return { json: {
    error:    e.message,
    debug:    raw.slice(0, 300),
    company:  logRecord.company   ?? '',
    title:    logRecord.job_title ?? '',
    jobLink:  logRecord.job_url   ?? '',
    postedAt: (logRecord.processed_at ?? '').slice(0, 10),
  }};
}
