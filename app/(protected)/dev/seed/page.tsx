'use client';

import { faker } from '@faker-js/faker';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SeedPage() {
  const [busy, setBusy] = useState(false);

  const seed = async () => {
    setBusy(true);
    try {
      const col = collection(db, 'students');
      const statuses = ['Exploring','Shortlisting','Applying','Submitted'] as const;

      for (let i = 0; i < 50; i++) {
        const status = faker.helpers.arrayElement(statuses);
        await addDoc(col, {
          name: faker.person.fullName(),
          email: faker.internet.email().toLowerCase(),
          phone: faker.phone.number(),
          grade: String(faker.number.int({ min: 9, max: 12 })),
          country: faker.location.country(),
          status,
          lastActive: faker.date.recent({ days: 14 }),
          highIntent: faker.datatype.boolean(),
          needsEssayHelp: faker.datatype.boolean(),
          tags: faker.helpers.arrayElements(['SAT','TOEFL','Essay','Scholarship','STEM'], { min: 0, max: 3 }),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastCommunicationAt: faker.date.recent({ days: 10 }),
        });
      }
      toast.success('Seeded 50 students');
    } catch (e:any) {
      toast.error(e?.message ?? 'Seeding failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold mb-2">Seed Demo Data</h2>
      <p className="text-sm text-gray-600 mb-4">Dev-only page to populate Firestore with fake students.</p>
      <button
        onClick={seed}
        disabled={busy}
        className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-60"
      >
        {busy ? 'Seeding…' : 'Create 50 Students'}
      </button>
    </div>
  );
}
