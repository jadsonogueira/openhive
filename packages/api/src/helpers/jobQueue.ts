export type JobStatus = 'pending' | 'downloading' | 'transcribing' | 'done' | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  progress: string;
  transcript: string | null;
  source: string | null;
  segments: number;
  error: string | null;
  sermonId: string | null;
  createdAt: number;
}

const jobs = new Map<string, Job>();

setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < oneHourAgo) jobs.delete(id);
  }
}, 10 * 60 * 1000);

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: 'pending',
    progress: 'Iniciando...',
    transcript: null,
    source: null,
    segments: 0,
    error: null,
    sermonId: null,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): void {
  const job = jobs.get(id);
  if (job) Object.assign(job, updates);
}
