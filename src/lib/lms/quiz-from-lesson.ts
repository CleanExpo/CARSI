export function extractQuizIdFromLesson(
  contentType: string,
  contentBody: string | null,
  resources: { url?: string }[]
): string | null {
  if (contentType === 'quiz' && contentBody) {
    const id = contentBody.trim();
    if (/^[0-9a-f-]{36}$/i.test(id)) return id;
  }
  for (const r of resources) {
    const url = r.url ?? '';
    if (url.startsWith('quiz:')) {
      const id = url.slice(5).trim();
      if (/^[0-9a-f-]{36}$/i.test(id)) return id;
    }
  }
  return null;
}
