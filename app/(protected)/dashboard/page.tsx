'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StatCard from '@/components/stat-card';
import { useRouter } from 'next/navigation';

type StudentRow = {
  id: string;
  name: string;
  email: string;
  country: string;
  status: 'Exploring' | 'Shortlisting' | 'Applying' | 'Submitted';
  lastActive?: Date;
  highIntent?: boolean;
  needsEssayHelp?: boolean;
  lastCommunicationAt?: Date;
};

const toDate = (v:any) => (v?.toDate ? v.toDate() : v ? new Date(v) : undefined);

export default function DashboardPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const col = collection(db, 'students');
      const snap = await getDocs(query(col, orderBy('lastActive','desc'), limit(500)));
      const data = snap.docs.map(d => {
        const v:any = d.data();
        return {
          id: d.id,
          name: v.name,
          email: v.email,
          country: v.country,
          status: v.status,
          lastActive: toDate(v.lastActive),
          highIntent: v.highIntent ?? false,
          needsEssayHelp: v.needsEssayHelp ?? (Array.isArray(v.tags) ? v.tags.includes('Essay') : false),
          lastCommunicationAt: toDate(v.lastCommunicationAt),
        } as StudentRow;
      });
      setRows(data);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const stats = useMemo(() => {
    const byStatus = { Exploring:0, Shortlisting:0, Applying:0, Submitted:0 } as Record<StudentRow['status'],number>;
    let active = 0;
    let essay = 0;
    let notContacted7d = 0;
    let highIntent = 0;

    for (const s of rows) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      if (s.lastActive && (now.getTime() - s.lastActive.getTime()) <= 14*24*3600*1000) active++;
      if (s.needsEssayHelp) essay++;
      if (!s.lastCommunicationAt || (now.getTime() - s.lastCommunicationAt.getTime()) > 7*24*3600*1000) notContacted7d++;
      if (s.highIntent) highIntent++;
    }
    return { byStatus, active, essay, notContacted7d, highIntent, total: rows.length };
  }, [rows]);

  const go = (qf: string) => router.push(`/students?qf=${encodeURIComponent(qf)}`);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Students" value={stats.total} />
        <StatCard label="Active (14d)" value={stats.active} />
        <StatCard label="Exploring" value={stats.byStatus.Exploring} />
        <StatCard label="Shortlisting" value={stats.byStatus.Shortlisting} />
        <StatCard label="Applying" value={stats.byStatus.Applying} />
        <StatCard label="Submitted" value={stats.byStatus.Submitted} />
        <StatCard label="Needs essay help" value={stats.essay} onClick={() => go('needs_essay_help')} hint="Click to filter" />
        <StatCard label="Not contacted in 7d" value={stats.notContacted7d} onClick={() => go('not_contacted_7d')} hint="Click to filter" />
        <StatCard label="High intent" value={stats.highIntent} onClick={() => go('high_intent')} hint="Click to filter" />
      </div>

      {loading && <p className="text-sm text-gray-600">Loading…</p>}
    </div>
  );
}
