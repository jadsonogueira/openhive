const API_URL = process.env.API_URL || 'http://72.60.148.203:3001';
const API_TOKEN = process.env.API_TOKEN || 'instapost_service_2026';

console.log(`[Bot API Client] URL=${API_URL}, TOKEN=${API_TOKEN ? API_TOKEN.slice(0, 10) + '...' : 'NOT SET'}`);

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  console.log(`[Bot API] ${options.method || 'GET'} ${url}`);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[Bot API] ${url} -> ${res.status}:`, (data as any).error);
      throw new Error((data as any).error || 'API request failed');
    }
    return (data as any).data;
  } catch (err: any) {
    console.error(`[Bot API] ${url} FAILED:`, err.message);
    throw err;
  }
}

export const api = {
  createPost: (body: Record<string, unknown>) => request('/api/posts', { method: 'POST', body: JSON.stringify(body) }),

  listPosts: (status?: string) => request<{ items: any[]; total: number }>(`/api/posts?status=${status || ''}&limit=10`),

  publishPost: (id: string) => request(`/api/posts/${id}/publish`, { method: 'POST' }),

  schedulePost: (id: string, scheduledAt: string) =>
    request(`/api/posts/${id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt }) }),

  cancelPost: (id: string) => request(`/api/posts/${id}`, { method: 'DELETE' }),

  generateImage: (prompt: string, aspectRatio = '1:1') =>
    request<{ imageUrl: string }>('/api/generate/image', {
      method: 'POST',
      body: JSON.stringify({ prompt, aspectRatio }),
    }),

  generateCaption: (topic: string, tone?: string) =>
    request<{ caption: string; hashtags: string[] }>('/api/generate/caption', {
      method: 'POST',
      body: JSON.stringify({ topic, tone }),
    }),

  instagramStatus: () => request<{ connected: boolean }>('/api/instagram/status'),
};
