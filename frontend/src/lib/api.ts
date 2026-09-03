export type UserRole = 'customer' | 'vendor' | 'admin';
export type VendorApprovalStatus = 'pending' | 'approved' | 'rejected';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  vendorApprovalStatus: VendorApprovalStatus | null;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'
).replace(/\/$/, '');

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown;

  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | undefined;
    throw new ApiError(
      errorPayload?.error?.message ?? 'The request could not be completed.',
      response.status,
      errorPayload?.error?.code,
      errorPayload?.error?.details,
    );
  }

  return payload as T;
};
