/**
 * SEO GPS - Standalone Report & Export Service
 * Author: Ismail El Asiouty
 *
 * Generates offline-capable standalone HTML reports, comprehensive CSV exports,
 * and handles print-to-PDF formatting.
 */

import { resolveTopFix, resolveCannibalization } from './siteCrawler';

export function exportStandaloneHTMLReport(reportData: any, domain: string, isAr: boolean) {
  if (!reportData) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const healthScore = reportData.summary?.health_score || 80;

  const html = `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isAr ? 'تقرير الموقع الشامل' : 'Comprehensive Site Report'} - ${domain}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #B8892B;
      --gold-tint: #FDF9EE;
      --gold-border: #E8D39E;
      --ink: #16140F;
      --ink-muted: #6B685F;
      --surface: #FAFAF7;
      --card-bg: #FFFFFF;
      --hairline: #EBEBE6;
      --emerald: #059669;
      --rose: #E11D48;
      --amber: #D97706;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${isAr ? "'IBM Plex Sans Arabic', " : ''}'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--surface);
      color: var(--ink);
      line-height: 1.6;
      padding: 32px 16px;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      background: var(--card-bg);
      border: 1px solid var(--hairline);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: var(--gold-tint);
      color: var(--gold);
      border: 1px solid var(--gold-border);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    h1 { font-size: 26px; font-weight: 800; color: var(--ink); margin-bottom: 4px; }
    .subtitle { color: var(--ink-muted); font-size: 14px; }
    .score-circle {
      width: 100px; height: 100px; border-radius: 50%;
      border: 6px solid ${healthScore >= 80 ? 'var(--emerald)' : healthScore >= 60 ? 'var(--amber)' : 'var(--rose)'};
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: white; font-weight: 900; font-size: 28px; color: var(--ink);
    }
    .score-label { font-size: 10px; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--hairline);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }
    .card-title {
      font-size: 18px; font-weight: 800; margin-bottom: 6px;
      display: flex; align-items: center; gap: 8px; color: var(--ink);
      border-bottom: 1px solid var(--hairline); padding-bottom: 12px;
    }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
    .stat-box { background: var(--surface); padding: 14px; border-radius: 10px; border: 1px solid var(--hairline); text-align: center; }
    .stat-val { font-size: 22px; font-weight: 900; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: ${isAr ? 'right' : 'left'}; border-bottom: 1px solid var(--hairline); }
    th { background: var(--surface); color: var(--ink-muted); font-size: 11px; text-transform: uppercase; font-weight: 700; }
    .fix-item {
      background: var(--surface); border: 1px solid var(--hairline); border-radius: 12px;
      padding: 16px; margin-bottom: 12px;
    }
    .fix-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .fix-priority { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; }
    .fix-action { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 8px 12px; border-radius: 8px; margin-top: 8px; font-size: 12px; font-weight: 600; }
    .footer { text-align: center; margin-top: 40px; color: var(--ink-muted); font-size: 12px; }
    .footer a { color: var(--gold); text-decoration: none; font-weight: 700; }
    @media print {
      body { background: white; padding: 0; }
      .card, .header { border: 1px solid #ddd; box-shadow: none; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <span class="badge">${isAr ? 'تقرير الفحص المرجعي الشامل' : 'Full Site Audit Report'}</span>
        <h1>${isAr ? 'تقرير الموقع الشامل' : 'Comprehensive Site Report'}: ${domain}</h1>
        <div class="subtitle">${isAr ? 'منصة SEO GPS بواسطة إسماعيل الأسيوطي' : 'SEO GPS by Ismail El Asiouty'} &bull; ${dateStr}</div>
      </div>
      <div class="score-circle">
        ${healthScore}
        <span class="score-label">${isAr ? 'درجة الصحة' : 'Score'}</span>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="card">
      <div class="card-title">${isAr ? 'سجل الفحص وتوزيع الحالات' : 'Crawl Stats & Status Distribution'}</div>
      <div class="grid-4">
        <div class="stat-box">
          <div style="font-size: 11px; color: var(--ink-muted); font-weight: 700;">${isAr ? 'روابط مستكشفة' : 'Discovered'}</div>
          <div class="stat-val">${reportData.summary?.total_discovered || reportData.summary?.total_crawled || 0}</div>
        </div>
        <div class="stat-box">
          <div style="font-size: 11px; color: var(--ink-muted); font-weight: 700;">${isAr ? 'صفحات مفحوصة' : 'Crawled'}</div>
          <div class="stat-val">${reportData.summary?.total_crawled || 0}</div>
        </div>
        <div class="stat-box">
          <div style="font-size: 11px; color: var(--emerald); font-weight: 700;">200 OK</div>
          <div class="stat-val" style="color: var(--emerald);">${reportData.summary?.status_distribution?.ok_200 || 0}</div>
        </div>
        <div class="stat-box">
          <div style="font-size: 11px; color: var(--rose); font-weight: 700;">404 Broken</div>
          <div class="stat-val" style="color: var(--rose);">${reportData.summary?.status_distribution?.not_found_404 || 0}</div>
        </div>
      </div>
    </div>

    <!-- Top Fixes -->
    <div class="card">
      <div class="card-title">${isAr ? 'أهم 10 إصلاحات ذات أولوية قصوى' : 'Top 10 Priority Fixes'}</div>
      ${(reportData.top_fixes || []).map((f: any, idx: number) => {
        const { title, recommendation, action_sentence } = resolveTopFix(f, isAr);
        return `
        <div class="fix-item">
          <div class="fix-header">
            <span class="fix-priority">#${idx + 1} (${f.priority_score})</span>
            <strong>${title}</strong>
          </div>
          <div style="font-family: monospace; font-size: 11px; color: var(--ink-muted); margin-bottom: 6px;">${f.url}</div>
          <div style="font-size: 12px; color: var(--ink-muted);">${recommendation}</div>
          <div class="fix-action"><strong>${isAr ? 'الإجراء المقترح: ' : 'Suggested Action: '}</strong>${action_sentence}</div>
        </div>
        `;
      }).join('')}
    </div>

    <!-- Section A: 404 Analysis -->
    <div class="card">
      <div class="card-title">${isAr ? 'أ. تحليل حالات الاستجابة وأخطاء 404' : 'A. Status & 404 Analysis'}</div>
      <p style="font-size: 12px; color: var(--ink-muted); margin-bottom: 12px;">
        ${isAr ? 'فحص دقيق لكافة أخطاء 404 وتمييز الأخطاء غير الحقيقية الناتجة عن المسافات (%20) أو الروابط المقطوعة.' : 'Detailed broken link analysis distinguishing false 404s with whitespace from true dead pages.'}
      </p>
      <table>
        <thead>
          <tr>
            <th>${isAr ? 'الرابط المفقود' : 'Broken URL'}</th>
            <th>${isAr ? 'نوع الخلل' : 'Defect Type'}</th>
            <th>${isAr ? 'الإجراء الموصى به' : 'Action'}</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData.section_status?.false_404_items || []).map((i: any) => `
            <tr>
              <td style="font-family: monospace; color: var(--rose);">${i.raw_url}</td>
              <td style="color: var(--amber); font-weight: 700;">${isAr ? (i.defect_ar || i.defect) : (i.defect_en || i.defect)}</td>
              <td>${isAr ? `تحديث الرابط ليشير إلى: ${i.sanitized_target}` : `Update source link to: ${i.sanitized_target}`}</td>
            </tr>
          `).join('')}
          ${(reportData.section_status?.true_dead_items || []).map((i: any) => `
            <tr>
              <td style="font-family: monospace; color: var(--rose);">${i.url}</td>
              <td style="color: var(--rose); font-weight: 700;">${isAr ? 'صفحة محذوفة نهائياً' : 'True Dead Page'}</td>
              <td>${isAr ? `إضافة تحويل 301 إلى: ${i.dead_match}` : `Configure 301 redirect to: ${i.dead_match}`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Cannibalization -->
    ${(reportData.section_cannibalization?.clusters?.length || 0) > 0 ? `
    <div class="card">
      <div class="card-title">${isAr ? 'د. تنافس الكلمات وازدواجية المحتوى (Cannibalization)' : 'D. Keyword Cannibalization Conflicts'}</div>
      ${reportData.section_cannibalization.clusters.map((c: any) => {
        const { recommendation, signals } = resolveCannibalization(c, isAr);
        return `
        <div class="fix-item">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="background: #FDF2F8; color: #BE185D; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">${c.similarityScore || c.similarity + '%'} ${isAr ? 'تطابق' : 'Overlap'}</span>
            <strong style="font-size: 13px;">${c.topic}</strong>
          </div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>${isAr ? 'المقال المعتمد: ' : 'Master: '}</strong>${c.masterTitle} (${c.masterUrl})</div>
          <div style="font-size: 12px; margin-bottom: 6px;"><strong>${isAr ? 'المقال المنافس: ' : 'Candidate: '}</strong>${c.candidateTitle} (${c.candidateUrl})</div>
          <div style="font-size: 11px; color: var(--ink-muted);">${signals}</div>
          <div class="fix-action"><strong>${isAr ? 'التوصية التقنية: ' : 'Recommendation: '}</strong>${recommendation}</div>
        </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    <!-- Action Plans -->
    <div class="card">
      <div class="card-title">${isAr ? 'ز. خطط العمل وتوزيع المهام' : 'G. Role-Based Action Plans'}</div>
      ${(reportData.section_action_plans || []).map((plan: any) => {
        const planTitle = isAr
          ? (plan.title_ar || (plan.role === 'engineering' ? 'خطة عمل المطورين والمهندسين' : plan.role === 'content' ? 'خطة عمل صناع المحتوى والتحرير' : 'خطة عمل السيو التقني'))
          : (plan.title_en || (plan.role === 'engineering' ? 'Engineering & Development Plan' : plan.role === 'content' ? 'Content & Editorial Plan' : 'Technical SEO Plan'));
        const items = isAr ? (plan.items_ar || plan.items) : (plan.items_en || plan.items);
        return `
        <div style="margin-bottom: 16px;">
          <h4 style="font-size: 14px; font-weight: 800; margin-bottom: 8px; color: var(--gold);">${planTitle}</h4>
          <ul style="padding-${isAr ? 'right' : 'left'}: 20px; font-size: 12px; color: var(--ink-muted); line-height: 1.8;">
            ${(items || []).map((it: string) => `<li>${it}</li>`).join('')}
          </ul>
        </div>
        `;
      }).join('')}
    </div>

    <div class="footer">
      <div>SEO GPS &bull; ${isAr ? 'منصة حماية ترتيب المواقع ومراقبة السيو اليومية' : 'Automated SEO Regression & Rank Protection Platform'}</div>
      <div style="margin-top: 4px;">${isAr ? 'بواسطة إسماعيل الأسيوطي' : 'Created by Ismail El Asiouty'} &bull; <a href="https://www.linkedin.com/in/ismailelasiouty/" target="_blank">LinkedIn</a> &bull; ismailelasiouty3@gmail.com</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SEO_GPS_Report_${domain}_${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReportCSV(reportData: any, domain: string, scanType: string = 'baseline') {
  if (!reportData) return;
  let csv = 'Section,URL,Issue,Details,Recommendation\n';

  reportData.top_fixes?.forEach((f: any) => {
    csv += `"Top Fixes","${f.url || ''}","${(f.title || '').replace(/"/g, '""')}","${(f.recommendation || '').replace(/"/g, '""')}","${(f.action_sentence || '').replace(/"/g, '""')}"\n`;
  });

  reportData.section_status?.false_404_items?.forEach((i: any) => {
    csv += `"Status & 404","${i.raw_url}","False 404 with %20","${i.defect}","Update to ${i.sanitized_target}"\n`;
  });

  reportData.section_status?.true_dead_items?.forEach((i: any) => {
    csv += `"Status & 404","${i.url}","True Dead 404","Inbound: ${i.inbound_links_count}","Redirect to ${i.dead_match}"\n`;
  });

  reportData.section_redirects?.chains?.forEach((c: any) => {
    csv += `"Redirects","${c.source}","Chain ${c.hops} Hops","Target: ${c.final_target}","${(c.nginx || '').replace(/"/g, '""')}"\n`;
  });

  reportData.section_onpage?.outdated_years?.forEach((y: any) => {
    csv += `"On-Page Freshness","${y.url}","Outdated Year ${y.detected_year}","Target: ${y.target_year}","${y.suggested_text}"\n`;
  });

  reportData.section_onpage?.thin_pages?.forEach((t: any) => {
    csv += `"On-Page Depth","${t.url}","Thin Content","${t.word_count} words","Expand content over ${t.threshold} words"\n`;
  });

  reportData.section_cannibalization?.clusters?.forEach((c: any) => {
    csv += `"Cannibalization","${c.candidateUrl}","Conflict with ${c.masterUrl}","Overlap: ${c.similarityScore}","${(c.recommendation || '').replace(/"/g, '""')}"\n`;
  });

  reportData.section_schema?.gaps?.forEach((g: any) => {
    csv += `"Schema Gaps","${g.url}","Missing Schema","Type: ${g.missing}","Embed generated JSON-LD"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SEO_GPS_Site_Report_${domain}_${scanType}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
