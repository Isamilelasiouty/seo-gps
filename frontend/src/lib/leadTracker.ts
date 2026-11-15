import { supabase } from './supabase';

export interface LeadSubscriber {
  id: string;
  name: string;
  email: string;
  domain?: string;
  source?: 'site_report' | 'quick_audit' | 'signup' | 'manual';
  created_at: string;
}

// Initial registered users captured from Supabase Auth & Production Activity
const INITIAL_BASELINE_SUBSCRIBERS: LeadSubscriber[] = [
  {
    id: 'lead-1',
    name: 'Mohamed ElSaeed',
    email: 'info@mohamedelsaeed.com',
    domain: 'mohamedelsaeed.com',
    source: 'signup',
    created_at: '2026-11-12T22:28:04Z',
  },
  {
    id: 'lead-2',
    name: 'اسماعيل',
    email: 'seotec3@gmail.com',
    domain: 'techhouseksa.com',
    source: 'signup',
    created_at: '2026-11-11T15:58:53Z',
  },
  {
    id: 'lead-3',
    name: 'Adam Ahmed',
    email: 'adamwetet22@gmail.com',
    domain: 'gardendesignkuwait.com',
    source: 'signup',
    created_at: '2026-11-08T12:44:23Z',
  },
  {
    id: 'lead-4',
    name: 'ISAM',
    email: 'asmaylalasywty48@gmail.com',
    domain: 'techhouseksa.com',
    source: 'signup',
    created_at: '2026-11-08T12:42:48Z',
  },
  {
    id: 'lead-5',
    name: 'seo',
    email: 'ismeaelelasiouty@gmail.com',
    domain: 'gardendesignkuwait.com',
    source: 'site_report',
    created_at: '2026-11-02T12:41:53Z',
  },
  {
    id: 'lead-6',
    name: 'Beshoy Reda',
    email: 'seobeshoy@gmail.com',
    domain: 'techhouseksa.com',
    source: 'signup',
    created_at: '2026-10-31T18:36:56Z',
  },
  {
    id: 'lead-7',
    name: 'osama',
    email: 'alrawaacompany0@gmail.com',
    domain: 'alrawaacompany.com',
    source: 'signup',
    created_at: '2026-10-27T14:48:35Z',
  },
  {
    id: 'lead-8',
    name: 'iyyuyyuiui',
    email: 'heuwjpoop@gmail.com',
    domain: 'techhouseksa.com',
    source: 'signup',
    created_at: '2026-10-26T09:11:14Z',
  },
  {
    id: 'lead-9',
    name: 'Ismail El Asiouty',
    email: 'ismailelasiouty3@gmail.com',
    domain: 'techhouseksa.com',
    source: 'signup',
    created_at: '2026-10-25T22:48:21Z',
  },
  {
    id: 'lead-10',
    name: 'abeerabdelhady200',
    email: 'abeerabdelhady200@gmail.com',
    domain: 'safaryti.com',
    source: 'site_report',
    created_at: '2026-11-15T20:32:49Z',
  },
  {
    id: 'lead-11',
    name: 'fpicoseo',
    email: 'fpicoseo@gmail.com',
    domain: 'safaryti.com',
    source: 'site_report',
    created_at: '2026-11-13T23:24:01Z',
  },
];

const STORAGE_KEY = 'seo_gps_leads_subscribers';

export function getAllLeads(): LeadSubscriber[] {
  let localLeads: LeadSubscriber[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localLeads = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local leads:', e);
  }

  // Merge with initial baseline subscribers, deduplicating by email
  const map = new Map<string, LeadSubscriber>();

  INITIAL_BASELINE_SUBSCRIBERS.forEach((sub) => {
    map.set(sub.email.toLowerCase().trim(), sub);
  });

  localLeads.forEach((sub) => {
    const key = sub.email.toLowerCase().trim();
    if (map.has(key)) {
      map.set(key, { ...map.get(key)!, ...sub });
    } else {
      map.set(key, sub);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getLeadsCount(): number {
  return getAllLeads().length;
}

export async function saveLead(params: {
  name: string;
  email: string;
  domain?: string;
  source?: 'site_report' | 'quick_audit' | 'signup' | 'manual';
}): Promise<LeadSubscriber> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim() || cleanEmail.split('@')[0];
  const domain = (params.domain || '').replace(/^https?:\/\//, '').split('/')[0] || '';
  const nowIso = new Date().toISOString();

  const newLead: LeadSubscriber = {
    id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    domain: domain || undefined,
    source: params.source || 'site_report',
    created_at: nowIso,
  };

  // 1. Save to localStorage immediately
  try {
    const existing = getAllLeads();
    const existingIndex = existing.findIndex(
      (l) => l.email.toLowerCase().trim() === cleanEmail
    );
    if (existingIndex >= 0) {
      existing[existingIndex] = {
        ...existing[existingIndex],
        name: cleanName || existing[existingIndex].name,
        domain: domain || existing[existingIndex].domain,
        source: params.source || existing[existingIndex].source,
      };
    } else {
      existing.unshift(newLead);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Could not write lead to localStorage:', e);
  }

  // 2. Persist to Supabase and auto-add project via service-role Edge Function
  if (supabase) {
    try {
      await supabase.functions.invoke('send-audit-report', {
        body: {
          type: 'lead_registration',
          userName: cleanName,
          userEmail: cleanEmail,
          domain: domain || 'General Site Monitoring',
        },
      });
    } catch (e) {
      console.warn('Could not register lead with edge function:', e);
    }
  }

  return newLead;
}

export interface CloudSyncResult {
  leads: LeadSubscriber[];
  projects: any[];
}

/**
 * Synchronize leads and registered projects directly from the Supabase Edge Function
 * (which uses service_role key to bypass RLS and return all registrations).
 */
export async function syncLeadsFromCloud(): Promise<CloudSyncResult> {
  const localLeads = getAllLeads();
  if (!supabase) {
    return { leads: localLeads, projects: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-audit-report', {
      body: { type: 'get_leads' },
    });

    if (error || !data?.success) {
      console.warn('Failed to fetch leads from edge function:', error || data?.error);
      return { leads: localLeads, projects: [] };
    }

    const cloudLeads: LeadSubscriber[] = Array.isArray(data.leads) ? data.leads : [];
    const cloudProjects: any[] = Array.isArray(data.projects) ? data.projects : [];

    // Deduplicate and merge cloud leads with local leads
    const map = new Map<string, LeadSubscriber>();
    localLeads.forEach((l) => map.set(l.email.toLowerCase().trim(), l));

    cloudLeads.forEach((cl) => {
      const emailKey = (cl.email || '').toLowerCase().trim();
      if (!emailKey) return;

      if (map.has(emailKey)) {
        const existing = map.get(emailKey)!;
        map.set(emailKey, {
          ...existing,
          name: cl.name && cl.name !== emailKey.split('@')[0] ? cl.name : existing.name,
          domain: cl.domain || existing.domain,
          created_at: cl.created_at || existing.created_at,
        });
      } else {
        map.set(emailKey, {
          id: cl.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cl.name || emailKey.split('@')[0],
          email: emailKey,
          domain: cl.domain || undefined,
          source: cl.source || 'site_report',
          created_at: cl.created_at || new Date().toISOString(),
        });
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Could not cache merged leads:', e);
    }

    return { leads: merged, projects: cloudProjects };
  } catch (err) {
    console.warn('Network error while syncing leads from cloud:', err);
    return { leads: localLeads, projects: [] };
  }
}
