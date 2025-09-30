'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  doc, getDoc, updateDoc,
  collection, addDoc, getDocs, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProgressBar from '@/components/progress-bar';
import Section from '@/components/section';
import { STATUS_OPTIONS, statusToProgress, type AppStatus } from '@/lib/progress';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Student = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  grade?: string;
  country: string;
  status: AppStatus;
  lastActive?: Date;
};

type Interaction = { id: string; type: 'login' | 'ai_question' | 'doc_upload'; detail?: string; timestamp?: Date };
type Communication = { id: string; channel: 'email' | 'sms' | 'call' | 'note'; direction?: 'outbound'|'inbound'; subject?: string; body: string; timestamp?: Date; byUserId?: string; };
type Note = { id: string; text: string; authorId?: string; createdAt?: Date; updatedAt?: Date; };
type Task = { id: string; title: string; dueAt?: Date; status: 'todo'|'done'; assignedTo?: string; createdAt?: Date };

const toDate = (v: any | undefined) => (v?.toDate ? v.toDate() : (v ? new Date(v) : undefined));

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [comms, setComms] = useState<Communication[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // form state
  const [newNote, setNewNote] = useState('');
  const [commBody, setCommBody] = useState('');
  const [commChannel, setCommChannel] = useState<Communication['channel']>('email');
  const [taskTitle, setTaskTitle] = useState('');

  // load core doc + subcollections
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // student doc
        const sRef = doc(db, 'students', String(id));
        const sSnap = await getDoc(sRef);
        if (!sSnap.exists()) {
          toast.error('Student not found');
          setLoading(false);
          return;
        }
        const s = sSnap.data() as any;
        const base: Student = {
          id: sSnap.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          grade: s.grade,
          country: s.country,
          status: s.status,
          lastActive: toDate(s.lastActive),
        };
        setStudent(base);

        // interactions
        const iCol = collection(sRef, 'interactions');
        const iSnap = await getDocs(query(iCol, orderBy('timestamp', 'desc')));
        setInteractions(
          iSnap.docs.map((d) => {
            const v: any = d.data();
            return { id: d.id, type: v.type, detail: v.detail, timestamp: toDate(v.timestamp) };
          })
        );

        // communications
        const cCol = collection(sRef, 'communications');
        const cSnap = await getDocs(query(cCol, orderBy('timestamp', 'desc')));
        setComms(
          cSnap.docs.map((d) => {
            const v: any = d.data();
            return {
              id: d.id,
              channel: v.channel,
              direction: v.direction,
              subject: v.subject,
              body: v.body,
              timestamp: toDate(v.timestamp),
              byUserId: v.byUserId,
            };
          })
        );

        // notes
        const nCol = collection(sRef, 'notes');
        const nSnap = await getDocs(query(nCol, orderBy('createdAt', 'desc')));
        setNotes(
          nSnap.docs.map((d) => {
            const v: any = d.data();
            return { id: d.id, text: v.text, authorId: v.authorId, createdAt: toDate(v.createdAt), updatedAt: toDate(v.updatedAt) };
          })
        );

        // tasks
        const tCol = collection(sRef, 'tasks');
        const tSnap = await getDocs(query(tCol, orderBy('createdAt', 'desc')));
        setTasks(
          tSnap.docs.map((d) => {
            const v: any = d.data();
            return { id: d.id, title: v.title, status: v.status ?? 'todo', dueAt: toDate(v.dueAt), assignedTo: v.assignedTo, createdAt: toDate(v.createdAt) };
          })
        );
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const progress = useMemo(() => statusToProgress(student?.status ?? 'Exploring'), [student?.status]);

  const updateStatus = async (status: AppStatus) => {
    if (!student) return;
    try {
      await updateDoc(doc(db, 'students', student.id), { status, updatedAt: serverTimestamp() });
      setStudent({ ...student, status });
      toast.success('Status updated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update status');
    }
  };

  const addCommunication = async () => {
    if (!student || !commBody.trim()) return;
    try {
      await addDoc(collection(doc(db, 'students', student.id), 'communications'), {
        channel: commChannel,
        direction: 'outbound',
        subject: commChannel === 'email' ? 'Follow-up' : undefined,
        body: commBody.trim(),
        timestamp: serverTimestamp(),
        byUserId: 'admin-demo',
      });
      setCommBody('');
      toast.success('Communication logged');
      // refresh list lightweight (push optimistic)
      setComms((prev) => [
        { id: Math.random().toString(36).slice(2), channel: commChannel, direction: 'outbound', subject: commChannel === 'email' ? 'Follow-up' : undefined, body: commBody.trim(), timestamp: new Date(), byUserId: 'admin-demo' },
        ...prev,
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to log communication');
    }
  };

  const addNote = async () => {
    if (!student || !newNote.trim()) return;
    try {
      await addDoc(collection(doc(db, 'students', student.id), 'notes'), {
        text: newNote.trim(),
        authorId: 'admin-demo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewNote('');
      toast.success('Note added');
      setNotes((prev) => [
        { id: Math.random().toString(36).slice(2), text: newNote.trim(), authorId: 'admin-demo', createdAt: new Date(), updatedAt: new Date() },
        ...prev,
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add note');
    }
  };

  const addTask = async () => {
    if (!student || !taskTitle.trim()) return;
    try {
      await addDoc(collection(doc(db, 'students', student.id), 'tasks'), {
        title: taskTitle.trim(),
        status: 'todo',
        createdAt: serverTimestamp(),
      });
      setTaskTitle('');
      toast.success('Task created');
      setTasks((prev) => [
        { id: Math.random().toString(36).slice(2), title: taskTitle.trim(), status: 'todo', createdAt: new Date() },
        ...prev,
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create task');
    }
  };

  if (loading) return <div className="grid place-items-center h-[60vh]">Loading…</div>;
  if (!student) return <div className="text-red-600">Student not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{student.name}</h2>
            <p className="text-sm text-gray-600">{student.email} • {student.country} {student.grade ? `• Grade ${student.grade}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status</label>
            <select
              value={student.status}
              onChange={(e) => updateStatus(e.target.value as AppStatus)}
              className="rounded-md border px-3 py-2"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress} />
          <p className="mt-1 text-xs text-gray-500">{progress}% complete</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Interaction Timeline">
            {interactions.length === 0 ? (
              <p className="text-sm text-gray-500">No interactions yet.</p>
            ) : (
              <ul className="space-y-3">
                {interactions.map((it) => (
                  <li key={it.id} className="border rounded-md p-3">
                    <div className="text-sm font-medium capitalize">{it.type.replace('_',' ')}</div>
                    {it.detail && <div className="text-sm text-gray-700">{it.detail}</div>}
                    <div className="text-xs text-gray-500 mt-1">{it.timestamp ? format(it.timestamp, 'PPpp') : '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Communications" right={
            <div className="flex gap-2">
              <select value={commChannel} onChange={e => setCommChannel(e.target.value as any)} className="rounded-md border px-3 py-2 text-sm">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
                <option value="note">Note</option>
              </select>
              <button onClick={addCommunication} className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm">Log</button>
            </div>
          }>
            <textarea
              placeholder="e.g., Called student to discuss essays…"
              className="w-full rounded-md border px-3 py-2 mb-3"
              value={commBody}
              onChange={(e) => setCommBody(e.target.value)}
            />
            {comms.length === 0 ? (
              <p className="text-sm text-gray-500">No communications logged.</p>
            ) : (
              <ul className="space-y-3">
                {comms.map((c) => (
                  <li key={c.id} className="border rounded-md p-3">
                    <div className="text-sm font-medium">{c.channel.toUpperCase()} {c.subject ? `• ${c.subject}` : ''}</div>
                    <div className="text-sm text-gray-700">{c.body}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.timestamp ? format(c.timestamp, 'PPpp') : '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Right column: notes + tasks */}
        <div className="space-y-4">
          <Section title="Internal Notes" right={
            <button onClick={addNote} className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm">Add</button>
          }>
            <textarea
              placeholder="Add a note for the team…"
              className="w-full rounded-md border px-3 py-2 mb-3"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="border rounded-md p-3">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.text}</div>
                    <div className="text-xs text-gray-500 mt-1">{n.createdAt ? format(n.createdAt, 'PPpp') : '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Tasks / Reminders" right={
            <button onClick={addTask} className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm">Add</button>
          }>
            <input
              placeholder="Follow up about essay outline…"
              className="w-full rounded-md border px-3 py-2 mb-3"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet.</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((t) => (
                  <li key={t.id} className="border rounded-md p-3">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{t.createdAt ? format(t.createdAt, 'PPpp') : '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
