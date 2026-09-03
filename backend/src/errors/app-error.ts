export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const isPostgresError = (
  error: unknown,
): error is { code: string; constraint?: string } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof error.code === 'string';
