import type { HealthStatus, Language, TranslationResult } from '../types';

export async function fetchLanguages(): Promise<Language[]> {
  const res = await fetch('/api/languages');
  if (!res.ok) throw new Error('Failed to load languages');
  return res.json();
}

export async function translateText(
  text: string,
  source: string,
  target: string
): Promise<TranslationResult> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Translation failed');
  return data;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Server unavailable');
  return res.json();
}
