export type ApplicationStatus = 'applied' | 'interview' | 'offer' | 'rejected';

export const STATUS_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'rejected'];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export interface JobApplication {
  id: number;
  company: string;
  position: string;
  status: ApplicationStatus;
  applied_date: string;
  job_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type JobApplicationInput = Omit<
  JobApplication,
  'id' | 'created_at' | 'updated_at' | 'status'
> & { status?: ApplicationStatus };

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AnalyticsSummary {
  total: number;
  counts_by_status: Record<ApplicationStatus, number>;
  conversion_rates: {
    applied_to_interview: number;
    interview_to_offer: number;
  };
  applications_per_week: { week: string; count: number }[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
}
