export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    const data = await res.json();
    return data.data || data; // AntBiz API convention usually wraps in data
  },
  
  async post<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    const data = await res.json();
    return data.data || data;
  },

  async patch<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text());
    }
    const data = await res.json();
    return data.data || data;
  }
};
