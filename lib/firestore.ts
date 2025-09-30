// lib/firestore.ts
'use client';

import {
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type {
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Student } from '@/types/student';

export const studentsCol = () =>
  collection(db, 'students').withConverter(studentConverter);

const studentConverter = {
  toFirestore(s: Omit<Student, 'id'>) {
    return {
      ...s,
      createdAt: s.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Student {
    const d = snapshot.data(options) as any;
    const toDate = (v: any) =>
      v instanceof Timestamp ? v.toDate() : (v ? new Date(v) : undefined);

    return {
      id: snapshot.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      grade: d.grade,
      country: d.country,
      status: d.status,
      lastActive: toDate(d.lastActive)!,
      highIntent: d.highIntent,
      needsEssayHelp: d.needsEssayHelp,
      tags: d.tags ?? [],
      createdAt: toDate(d.createdAt)!,
      updatedAt: toDate(d.updatedAt)!,
      lastCommunicationAt: toDate(d.lastCommunicationAt),
    };
  },
};
