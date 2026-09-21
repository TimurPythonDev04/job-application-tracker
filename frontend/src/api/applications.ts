import { apiClient } from './client';
import type {
  AnalyticsSummary,
  ApplicationStatus,
  JobApplication,
  JobApplicationInput,
  PaginatedResponse,
} from '../types';

export async function listApplications(): Promise<JobApplication[]> {
  const response = await apiClient.get<PaginatedResponse<JobApplication>>('/api/applications/', {
    params: { page_size: 200 },
  });
  return response.data.results;
}

export async function createApplication(input: JobApplicationInput): Promise<JobApplication> {
  const response = await apiClient.post<JobApplication>('/api/applications/', input);
  return response.data;
}

export async function updateApplication(
  id: number,
  patch: Partial<JobApplicationInput>,
): Promise<JobApplication> {
  const response = await apiClient.patch<JobApplication>(`/api/applications/${id}/`, patch);
  return response.data;
}

export async function updateApplicationStatus(
  id: number,
  status: ApplicationStatus,
): Promise<JobApplication> {
  return updateApplication(id, { status });
}

export async function deleteApplication(id: number): Promise<void> {
  await apiClient.delete(`/api/applications/${id}/`);
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>('/api/applications/analytics/');
  return response.data;
}
