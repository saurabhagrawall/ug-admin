// types/student.ts
export type AppStatus = 'Exploring' | 'Shortlisting' | 'Applying' | 'Submitted';

export type Student = {
  id: string;              // Firestore doc id
  name: string;
  email: string;
  phone?: string;
  grade?: string;
  country: string;
  status: AppStatus;
  lastActive: Date;        // Firestore -> JS Date
  highIntent?: boolean;
  needsEssayHelp?: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastCommunicationAt?: Date;
};
