import { API_BASE_URL } from '../config';

export type ApiError = {
  message: string;
  status: number;
};

const buildError = async (response: Response): Promise<ApiError> => {
  let message = response.statusText;
  try {
    const data = await response.json();
    if (data?.message) {
      message = Array.isArray(data.message) ? data.message.join(', ') : String(data.message);
    }
  } catch {
    try {
      const text = await response.text();
      if (text?.trim()) {
        message = text.trim();
      }
    } catch {
      // ignore
    }
  }
  return { message, status: response.status };
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
};
