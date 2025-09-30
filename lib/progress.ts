// lib/progress.ts
export type AppStatus = 'Exploring' | 'Shortlisting' | 'Applying' | 'Submitted';

export const STATUS_OPTIONS: AppStatus[] = ['Exploring','Shortlisting','Applying','Submitted'];

export function statusToProgress(status: AppStatus) {
  switch (status) {
    case 'Exploring': return 10;
    case 'Shortlisting': return 35;
    case 'Applying': return 70;
    case 'Submitted': return 100;
    default: return 0;
  }
}
