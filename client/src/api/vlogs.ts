import type { Vlog, VlogsByWeek } from '../types';
import { fetchWithErrorReporting } from './errorReporter';
import { API_BASE_URL } from '../config';

export async function getVlog(weekStartDate: string): Promise<Vlog | null> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/vlogs/${weekStartDate}`);
  if (!response.ok) throw new Error('Failed to fetch vlog');
  return response.json();
}

export async function getVlogsBatch(weekStartDates: string[]): Promise<VlogsByWeek> {
  if (weekStartDates.length === 0) return {};

  const response = await fetchWithErrorReporting(`${API_BASE_URL}/vlogs/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStartDates })
  });
  if (!response.ok) throw new Error('Failed to fetch vlogs batch');
  return response.json();
}

export async function saveVlog(vlog: Vlog): Promise<void> {
  const response = await fetchWithErrorReporting(`${API_BASE_URL}/vlogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vlog)
  });
  if (!response.ok) throw new Error('Failed to save vlog');
}
