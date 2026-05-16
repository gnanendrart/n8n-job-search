// build_html_resume.js
// Generates a clean single-column HTML resume from Sonnet JSON output.
// Replaces build_latex_resume.js — same interface, same data source, HTML output instead of LaTeX.
// PDF conversion: Gotenberg (http://gotenberg:3000/forms/chromium/convert/html)
//
// IMPORTANT: Always copy from this file into n8n. Never retype from chat.
// Markdown renderers auto-hyperlink strings like data.name → [data.name](http://data.name)
// which breaks JavaScript when pasted into n8n's code editor.

const allItems = $('Merge Job + Resume JSON').all();
const results = [];

// HTML-escape special characters to prevent broken markup
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

for (const item of allItems) {
  try {
    const raw = (item.json.output ?? '').trim();

    // Strip markdown code fences if present
    let jsonStr = raw;
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
      jsonStr = codeBlock[1].trim();
    } else {
      const jsonObj = raw.match(/\{[\s\S]*\}/);
      jsonStr = jsonObj ? jsonObj[0] : raw;
    }

    const data = JSON.parse(jsonStr);

    const name     = esc(data.name     || 'Your Full Name');
    const phone    = esc(data.phone    || '');
    const email    = esc(data.email    || '');
    const location = esc(data.location || '');
    const rawLI    = (data.linkedin || '').replace(/^https?:\/\/(?:www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    // If Sonnet outputs a word like "LinkedIn" instead of the real handle, fall back to known profile
    const liHandle = (rawLI && !/\s/.test(rawLI) && rawLI.toLowerCase() !== 'linkedin') ? rawLI : 'gnanendrart';
    const linkedin = `linkedin.com/in/${esc(liHandle)}`;

    // Contact line — pipe-separated, only non-empty values
    const contact = [location, phone, email, linkedin].filter(Boolean).join(' &nbsp;|&nbsp; ');

    // --- Experience ---
    let expHtml = '';
    for (const job of (data.experience || [])) {
      // Merge lead into bullets so every line gets a bullet marker
      const allBullets = [];
      if (job.lead) allBullets.push(job.lead);
      allBullets.push(...(job.bullets || []));
      // Bullet character embedded in text — avoids position:absolute content stream split
      const bullets = allBullets.map(b => `<p class="bullet">• ${esc(b)}</p>`).join('\n          ');
      const companyLine = [esc(job.company || ''), esc(job.location || '')].filter(Boolean).join(' &nbsp;&bull;&nbsp; ');

      expHtml += `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${esc(job.title || '')}</span>
        <span class="entry-dates">${esc(job.dates || '')}</span>
      </div>
      <div class="entry-company">${companyLine}</div>
      <div class="bullets">
          ${bullets}
      </div>
    </div>`;
    }

    // --- Education ---
    let eduHtml = '';
    for (const edu of (data.education || [])) {
      const schoolLine = [esc(edu.school || ''), esc(edu.location || '')].filter(Boolean).join(' | ');
      eduHtml += `
    <div class="edu-entry">
      <div class="edu-header">
        <span class="edu-degree">${esc(edu.degree || '')}</span>
        <span class="edu-date">${esc(edu.date || '')}</span>
      </div>
      <div class="edu-school">${schoolLine}</div>
    </div>`;
    }

    // --- Skills ---
    let skillsHtml = '';
    for (const s of (data.skills || [])) {
      skillsHtml += `<div class="skill-row"><span class="skill-cat">${esc(s.category || '')}:</span> ${esc(s.items || '')}</div>\n    `;
    }

    // --- Assemble full HTML document ---
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 0.65in; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1a1a1a;
      max-width: 7in;
      margin: 0 auto;
      padding: 0.65in;
    }
    @media print {
      body { padding: 0; max-width: none; }
      a { color: #1a1a1a; text-decoration: none; }
    }
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 10pt;
      padding-bottom: 7pt;
      border-bottom: 2pt solid #1e3a5f;
    }
    .header h1 {
      font-size: 16pt;
      font-weight: 700;
      color: #1e3a5f;
      letter-spacing: 0.3pt;
      margin-bottom: 4pt;
    }
    .header .contact { font-size: 9pt; color: #444; }
    /* Section headers */
    h2 {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8pt;
      color: #1e3a5f;
      border-bottom: 1pt solid #1e3a5f;
      padding-bottom: 2pt;
      margin-top: 9pt;
      margin-bottom: 5pt;
    }
    /* Summary */
    .summary { font-size: 9.5pt; line-height: 1.45; }
    /* Experience */
    .entry { margin-bottom: 7pt; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-title { font-weight: 700; font-size: 10pt; }
    .entry-dates { font-size: 9pt; color: #555; white-space: nowrap; }
    .entry-company { font-size: 9.5pt; color: #333; margin: 2pt 0 3pt; }
    /* Bullets — character embedded in text, hanging indent, no positioning tricks */
    .bullets { margin: 0; }
    .bullet {
      font-size: 9.5pt;
      margin-bottom: 2pt;
      line-height: 1.35;
      padding-left: 10pt;
      text-indent: -10pt;
    }
    /* Education */
    .edu-entry { margin-bottom: 4pt; }
    .edu-header { display: flex; justify-content: space-between; align-items: baseline; }
    .edu-degree { font-weight: 600; font-size: 10pt; }
    .edu-date { font-size: 9pt; color: #555; }
    .edu-school { font-size: 9.5pt; color: #333; }
    /* Skills */
    .skill-row { margin-bottom: 2pt; font-size: 9.5pt; line-height: 1.4; }
    .skill-cat { font-weight: 700; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${name}</h1>
    <div class="contact">${contact}</div>
  </div>

  <h2>Summary</h2>
  <div class="summary">${esc(data.summary || '')}</div>

  <h2>Experience</h2>
  ${expHtml}

  <h2>Education</h2>
  ${eduHtml}

  <h2>Skills</h2>
  <div class="skills-block">
    ${skillsHtml}
  </div>
</body>
</html>`;

    results.push({ json: { html } });

  } catch(e) {
    results.push({ json: { error: e.message, debug: String(item.json.output || '').slice(0, 300) } });
  }
}

return results;
