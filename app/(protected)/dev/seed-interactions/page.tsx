'use client';

import { useState } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { faker } from '@faker-js/faker';
import { toast } from 'sonner';

// --- helpers ---
const firstNameOf = (full?: string) => (full?.split(' ')?.[0] ?? 'there');

type AppStatus = 'Exploring' | 'Shortlisting' | 'Applying' | 'Submitted';

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function commTemplate(opts: {
    name?: string;
    channel: 'email' | 'sms' | 'call';
    status?: AppStatus;
    tags?: string[];
}) {
    const first = firstNameOf(opts.name);
    const intent = opts.status ?? 'Exploring';
    const hasEssay = (opts.tags ?? []).includes('Essay');

    const emailSubjects = [
        `Next steps on your college list`,
        `Quick check-in on your applications`,
        `Your shortlist looks solid — feedback inside`,
        `Essay pointers you can use today`,
        `Deadlines coming up — let’s align`,
    ];

    const emailBodies = [
        `Hi ${first}, I reviewed your interests and shortlisted a few programs that match your profile. Do you have 10 minutes this week to review together?`,
        `Hi ${first}, based on your activity I suggested two schools that match your GPA and goals. Want me to walk you through the trade-offs?`,
        `Hi ${first}, nice progress so far. I left comments on your shortlist about fit and deadlines. Shall we finalize 3–4 targets this week?`,
        `Hi ${first}, I added some essay prompts tied to your strengths. If you share a rough outline, I can give feedback within a day.`,
        `Hi ${first}, a few deadlines are within the next 2–3 weeks. I can help prioritize requirements so you aren’t rushing last minute.`,
    ];

    const smsBodies = [
        `${first}, quick nudge — ready to pick 3 target schools? I can help you compare deadlines and scholarships.`,
        `${first}, saw your progress. Want a 10-min call to finalize your shortlist?`,
        `${first}, I dropped essay ideas in your notes. Ping me when you’re ready to draft.`,
    ];

    const callNotes = [
        `Discussed shortlist trade-offs and agreed to narrow to 4 programs.`,
        `Walked through application timeline; clarified test score reporting.`,
        `Aligned on essay theme and next steps for a first draft.`,
    ];

    if (hasEssay) emailBodies.unshift(`Hi ${first}, I left notes on your essay outline. Let’s refine the narrative and tighten the opening paragraph.`);
    if (intent === 'Applying') emailBodies.unshift(`Hi ${first}, since you’re in the Applying stage, I recommend we lock your recommenders and finalize the activity list this week.`);
    if (intent === 'Submitted') emailBodies.unshift(`Hi ${first}, great job submitting! Next we’ll prep for potential interviews and scholarship forms.`);

    if (opts.channel === 'email') return { subject: pick(emailSubjects), body: pick(emailBodies) };
    if (opts.channel === 'sms') return { subject: 'Follow-up', body: pick(smsBodies) };
    return { subject: 'Follow-up', body: pick(callNotes) }; // call
}
// --- end helpers ---

export default function SeedInteractionsPage() {
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const studentsCol = collection(db, 'students');
            const snap = await getDocs(query(studentsCol, orderBy('lastActive', 'desc'), limit(100)));

            let totalWrites = 0;

            for (const d of snap.docs) {
                const sRef = doc(db, 'students', d.id);
                const data = d.data() as any;

                // Interactions (2–4)
                const iCol = collection(sRef, 'interactions');
                const interactionTypes = ['login', 'ai_question', 'doc_upload'] as const;
                const iCount = faker.number.int({ min: 2, max: 4 });
                for (let i = 0; i < iCount; i++) {
                    await addDoc(iCol, {
                        type: faker.helpers.arrayElement(interactionTypes),
                        detail: faker.lorem.sentence(),
                        timestamp: faker.date.recent({ days: 14 }),
                    });
                    totalWrites++;
                }

                // Communications (0–2) + update lastCommunicationAt
                const cCol = collection(sRef, 'communications');
                const cCount = faker.number.int({ min: 0, max: 2 });
                let lastCommTs: Date | undefined;

                for (let c = 0; c < cCount; c++) {
                    const when = faker.date.recent({ days: 10 });
                    const channel = faker.helpers.arrayElement(['email', 'sms', 'call'] as const);
                    const { subject, body } = commTemplate({
                        name: data?.name,
                        channel,
                        status: data?.status as AppStatus | undefined,
                        tags: data?.tags ?? [],
                    });

                    await addDoc(cCol, {
                        channel,
                        direction: 'outbound',
                        subject,
                        body,
                        timestamp: when,
                        byUserId: 'admin-demo',
                    });
                    lastCommTs = !lastCommTs || when > lastCommTs ? when : lastCommTs;
                    totalWrites++;
                }

                if (lastCommTs) {
                    await updateDoc(sRef, { lastCommunicationAt: lastCommTs, updatedAt: serverTimestamp() });
                    totalWrites++;
                }

                // Notes (0–1)
                const nCol = collection(sRef, 'notes');
                if (faker.datatype.boolean()) {
                    await addDoc(nCol, {
                        text: `Advisor note: ${faker.lorem.sentence()}`,
                        authorId: 'admin-demo',
                        createdAt: faker.date.recent({ days: 7 }),
                        updatedAt: serverTimestamp(),
                    });
                    totalWrites++;
                }

                // Tasks (0–1)
                const tCol = collection(sRef, 'tasks');
                if (faker.datatype.boolean()) {
                    await addDoc(tCol, {
                        title: `Reminder: ${faker.helpers.arrayElement([
                            'Essay outline',
                            'Shortlist review',
                            'Scholarship eligibility',
                            'SAT prep plan',
                        ])}`,
                        status: 'todo',
                        createdAt: serverTimestamp(),
                    });
                    totalWrites++;
                }
            }

            toast.success(`Seeded interactions for ${snap.docs.length} students (${totalWrites} writes).`);
        } catch (e: any) {
            toast.error(e?.message ?? 'Seeding interactions failed');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="max-w-xl">
            <h2 className="text-lg font-semibold mb-2">Seed Interactions/Comms/Notes/Tasks</h2>
            <p className="text-sm text-gray-600 mb-4">Dev-only helper to enrich existing students.</p>
            <button
                onClick={run}
                disabled={busy}
                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-60"
            >
                {busy ? 'Seeding…' : 'Seed for 100 Students'}
            </button>
        </div>
    );
}
