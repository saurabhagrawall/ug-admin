'use client';

import * as React from 'react';

import { collection, getDocs, orderBy, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { getCoreRowModel, useReactTable, getFilteredRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import StatusBadge from '@/components/status-badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';


type Row = {
    id: string;
    name: string;
    email: string;
    country: string;
    status: 'Exploring' | 'Shortlisting' | 'Applying' | 'Submitted';
    lastActive: Date;
    highIntent?: boolean;
    needsEssayHelp?: boolean;
    lastCommunicationAt?: Date;
};

export default function StudentsPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [qText, setQText] = useState('');
    const [status, setStatus] = useState<'All' | Row['status']>('All');
    const [country, setCountry] = useState('All');
    const searchParams = useSearchParams();
    const quick = searchParams.get('qf'); // 'not_contacted_7d' | 'high_intent' | 'needs_essay_help' | null
    const [sorting, setSorting] = useState<any>([]);

    // 1) load data
    useEffect(() => {
        (async () => {
            setLoading(true);
            const col = collection(db, 'students');
            const snap = await getDocs(query(col, orderBy('lastActive', 'desc'), limit(200)));
            const toDate = (x: any) => x?.toDate ? x.toDate() : (x ? new Date(x) : undefined);
            const data = snap.docs.map(d => {
                const v: any = d.data();
                return {
                    id: d.id,
                    name: v.name,
                    email: v.email,
                    country: v.country,
                    status: v.status,
                    lastActive: toDate(v.lastActive) as Date,
                    highIntent: v.highIntent ?? false,
                    needsEssayHelp: v.needsEssayHelp ?? (Array.isArray(v.tags) ? v.tags.includes('Essay') : false),
                    lastCommunicationAt: toDate(v.lastCommunicationAt),
                };
            });
            setRows(data);
            setLoading(false);
        })();
    }, []);

    // 2) default sort (top-level, not nested) - Additional feature
    useEffect(() => {
        if (!loading && rows.length && sorting.length === 0) {
            setSorting([{ id: 'lastActive', desc: true }]);
        }
    }, [loading, rows.length, sorting.length]);


    const filtered = useMemo(() => {
        const now = new Date();
        const quickOk = (r: Row) => {
            if (!quick) return true;
            if (quick === 'not_contacted_7d') {
                return !r.lastCommunicationAt || (now.getTime() - r.lastCommunicationAt.getTime()) > 7 * 24 * 3600 * 1000;
            }
            if (quick === 'high_intent') {
                return !!r.highIntent;
            }
            if (quick === 'needs_essay_help') {
                return !!r.needsEssayHelp;
            }
            return true;
        };

        return rows.filter(r => {
            const textOk = qText
                ? (r.name?.toLowerCase().includes(qText.toLowerCase()) || r.email?.toLowerCase().includes(qText.toLowerCase()))
                : true;
            const statusOk = status === 'All' ? true : r.status === status;
            const countryOk = country === 'All' ? true : r.country === country;
            return textOk && statusOk && countryOk && quickOk(r);
        });
    }, [rows, qText, status, country, quick]);


    const columns = useMemo<ColumnDef<Row>[]>(() => [
        {
            header: 'Name', accessorKey: 'name',
            cell: ({ row }) => (
                <Link href={`/students/${row.original.id}`} className="font-medium hover:underline">
                    {row.original.name}
                </Link>
            )
        },
        { header: 'Email', accessorKey: 'email' },
        { header: 'Country', accessorKey: 'country' },
        {
            header: 'Status', accessorKey: 'status',
            cell: ({ row }) => <StatusBadge value={row.original.status} />
        },
        {
            header: 'Last Active', accessorKey: 'lastActive',
            cell: ({ row }) => <span className="text-gray-600 text-sm">{formatDistanceToNow(row.original.lastActive, { addSuffix: true })}</span>
        },
    ], []);

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });


    const countries = useMemo(() => ['All', ...Array.from(new Set(rows.map(r => r.country))).sort()], [rows]);

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Students</h2>

            <div className="flex flex-wrap gap-2">
                <input
                    placeholder="Search name or email…"
                    value={qText}
                    onChange={e => setQText(e.target.value)}
                    className="rounded-md border px-3 py-2 w-64"
                />
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="rounded-md border px-3 py-2">
                    {['All', 'Exploring', 'Shortlisting', 'Applying', 'Submitted'].map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={country} onChange={e => setCountry(e.target.value)} className="rounded-md border px-3 py-2">
                    {countries.map(c => <option key={c}>{c}</option>)}
                </select>
            </div>

            {quick && (
                <button
                    onClick={() => window.history.replaceState(null, '', '/students')}
                    className="text-xs underline text-blue-600"
                >
                    Clear quick filter
                </button>
            )}


            <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                                {hg.headers.map(h => (
                                    <th
                                        key={h.id}
                                        className="text-left px-3 py-2 font-medium select-none cursor-pointer"
                                        onClick={h.column.getToggleSortingHandler()}
                                    >
                                        <div className="inline-flex items-center gap-1">
                                            {flexRender(h.column.columnDef.header, h.getContext())}
                                            {{
                                                asc: '▲',
                                                desc: '▼',
                                            }[h.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">No students found</td></tr>
                        ) : (
                            table.getRowModel().rows.map(r => (
                                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                                    {r.getVisibleCells().map(c => (
                                        <td key={c.id} className="px-3 py-2">
                                            {flexRender(c.column.columnDef.cell, c.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
