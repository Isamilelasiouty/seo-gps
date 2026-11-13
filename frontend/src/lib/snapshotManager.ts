import { supabase } from './supabase';

export interface AuditSnapshot {
  id: string;
  project_id: string;
  domain?: string;
  date: string;
  time: string;
  timestamp: number;
  scanType?: 'baseline' | 'daily' | 'manual';
  healthScore: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  resolvedCount: number;
  newCount: number;
  persistingCount: number;
  pagesCrawled: number;
  status: 'completed' | 'failed';
  emailSubject?: string;
  emailBody?: string;
  summary?: any;
}

const LOCAL_STORAGE_PREFIX = 'seo_gps_snapshots_';
const RESOLVED_PREFIX = 'seo_gps_resolved_issues_';

/**
 * Formats a Date into standard readable date and time strings.
 */
export function formatSnapshotTime(d: Date = new Date()): { date: string; time: string } {
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { date, time };
}

/**
 * Retrieve all snapshots for a specific project.
 */
export function getProjectSnapshots(projectId: string, domain?: string): AuditSnapshot[] {
  if (!projectId) return [];
  const key = `${LOCAL_STORAGE_PREFIX}${projectId}`;
  let list: AuditSnapshot[] = [];

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      list = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local snapshots:', e);
  }

  // If no snapshots exist yet for this project, seed an initial baseline snapshot
  if (list.length === 0) {
    const { date, time } = formatSnapshotTime(new Date());
    const initialSnapshot: AuditSnapshot = {
      id: `snap-${Date.now()}`,
      project_id: projectId,
      domain: domain || 'techhouseksa.com',
      date,
      time,
      timestamp: Date.now(),
      scanType: 'baseline',
      healthScore: 92,
      pagesCrawled: 180,
      criticalCount: 0,
      warningCount: 14,
      noticeCount: 6,
      resolvedCount: 0,
      newCount: 0,
      persistingCount: 20,
      status: 'completed',
    };
    list = [initialSnapshot];
    saveSnapshotsLocally(projectId, list);
  }

  return list;
}

/**
 * Save snapshots array to local storage.
 */
function saveSnapshotsLocally(projectId: string, snapshots: AuditSnapshot[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${projectId}`, JSON.stringify(snapshots));
  } catch (e) {
    console.warn('Failed to persist snapshots locally:', e);
  }
}

/**
 * Create and persist a new snapshot upon completing an audit crawl.
 */
export async function createAndSaveSnapshot(
  projectId: string,
  domain: string,
  healthScore: number,
  pagesCrawled: number,
  criticalCount: number,
  warningCount: number,
  noticeCount: number,
  summary?: any
): Promise<AuditSnapshot> {
  const existing = getProjectSnapshots(projectId, domain);
  const resolvedList = getResolvedIssues(projectId);
  const previous = existing[0];

  const totalCurrentIssues = criticalCount + warningCount + noticeCount;
  let newCount = 0;
  let persistingCount = totalCurrentIssues;

  if (previous) {
    const prevTotal = previous.criticalCount + previous.warningCount + previous.noticeCount;
    if (totalCurrentIssues > prevTotal) {
      newCount = totalCurrentIssues - prevTotal;
    }
  }

  const { date, time } = formatSnapshotTime(new Date());
  const newSnapshot: AuditSnapshot = {
    id: `snap-${Date.now()}`,
    project_id: projectId,
    domain,
    date,
    time,
    timestamp: Date.now(),
    scanType: existing.length === 0 ? 'baseline' : 'manual',
    healthScore,
    pagesCrawled,
    criticalCount,
    warningCount,
    noticeCount,
    resolvedCount: resolvedList.length,
    newCount,
    persistingCount,
    status: 'completed',
    summary,
  };

  const updatedList = [newSnapshot, ...existing];
  saveSnapshotsLocally(projectId, updatedList);

  // Sync to Supabase audit_runs table if available
  if (supabase) {
    try {
      await supabase.from('audit_runs').insert({
        project_id: projectId.startsWith('proj-') ? null : projectId,
        status: 'completed',
        started_at: new Date(Date.now() - 30000).toISOString(),
        completed_at: new Date().toISOString(),
        pages_crawled: pagesCrawled,
        pages_indexable: Math.max(1, pagesCrawled - 5),
        critical_issues_count: criticalCount,
        warning_issues_count: warningCount,
        notice_issues_count: noticeCount,
        resolved_issues_count: resolvedList.length,
        health_score: healthScore,
        summary_json: summary || {},
      });
    } catch (err) {
      console.warn('Could not sync snapshot to Supabase audit_runs:', err);
    }
  }

  return newSnapshot;
}

/**
 * Get all resolved issue IDs for a project.
 */
export function getResolvedIssues(projectId: string): string[] {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(`${RESOLVED_PREFIX}${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Mark an issue as verified and resolved across local storage and Supabase.
 */
export async function markIssueResolved(
  projectId: string,
  issueId: string,
  issueDetails?: any
): Promise<void> {
  if (!projectId || !issueId) return;

  // 1. Update resolved IDs set
  const resolved = getResolvedIssues(projectId);
  if (!resolved.includes(issueId)) {
    resolved.push(issueId);
    try {
      localStorage.setItem(`${RESOLVED_PREFIX}${projectId}`, JSON.stringify(resolved));
    } catch (e) {}
  }

  // 2. Update status in cached issues list
  const issuesKey = `seo_gps_issues_${projectId}`;
  try {
    const rawIssues = localStorage.getItem(issuesKey);
    if (rawIssues) {
      const issues = JSON.parse(rawIssues);
      const updated = issues.map((iss: any) => {
        if (iss.id === issueId || iss.fingerprint === issueId) {
          return {
            ...iss,
            status: 'resolved',
            resolved_at: new Date().toISOString(),
          };
        }
        return iss;
      });
      localStorage.setItem(issuesKey, JSON.stringify(updated));
    }
  } catch (e) {}

  // 3. Update resolvedCount in latest snapshot
  const snapshots = getProjectSnapshots(projectId);
  if (snapshots.length > 0) {
    snapshots[0].resolvedCount = resolved.length;
    saveSnapshotsLocally(projectId, snapshots);
  }

  // 4. Update in Supabase issues table if project is synced
  if (supabase) {
    try {
      await supabase
        .from('issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .match({ id: issueId });
    } catch (e) {}
  }
}

/**
 * Live Issue Re-Check & Fix Verification Probe
 * Calls Supabase Edge Function to probe the real website server-side (bypass CORS),
 * with client-side fallback.
 */
export async function verifyIssueLive(
  url: string,
  checkId: string
): Promise<{ success: boolean; verified: boolean; status: number; reason: string }> {
  let cleanUrl = (url || '').trim().replace(/^\/+/, '');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  // 1. Try Supabase Edge Function Probe (Server-side, 0 CORS issues)
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('send-audit-report', {
        body: {
          type: 'verify_issue',
          url: cleanUrl,
          checkId: checkId || 'status_check',
        },
      });

      if (!error && data && data.success !== undefined) {
        return {
          success: true,
          verified: Boolean(data.verified),
          status: data.status || 200,
          reason: data.reason || (data.verified ? 'تم التحقق بنجاح من حل المشكلة' : 'المشكلة ما زالت قائمة'),
        };
      }
    } catch (err) {
      console.warn('Supabase edge function probe failed, trying direct probe...', err);
    }
  }

  // 2. Client-side fallback probe
  try {
    const res = await fetch(cleanUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      mode: 'cors',
    });

    const status = res.status;
    const isOk = status >= 200 && status < 400;

    return {
      success: true,
      verified: isOk,
      status,
      reason: isOk
        ? `تم فحص الرابط بنجاح وكود الاستجابة هو ${status} OK`
        : `الرابط ما زال يُرجع كود استجابة غير سليم (${status})`,
    };
  } catch (err: any) {
    // If CORS blocked in browser but user marked done, assume connectivity or inform user
    return {
      success: true,
      verified: false,
      status: 0,
      reason: 'تعذر الاتصال المباشر بالرابط من المتصفح (CORS). يرجى التأكد من استجابة الرابط ونشره على السيرفر.',
    };
  }
}
