import { ResponseError } from './internal/transport/runtime.js';

export type JanuaryErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'transport'
  | 'unknown';

export class JanuaryError extends Error {
  readonly category: JanuaryErrorCategory;
  readonly status?: number;
  readonly requestId?: string;
  readonly code?: string;

  constructor(
    category: JanuaryErrorCategory,
    message: string,
    options: { status?: number; requestId?: string; code?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'JanuaryError';
    this.category = category;
    this.status = options.status;
    this.requestId = options.requestId;
    this.code = options.code;
  }
}

function categoryForStatus(status: number): JanuaryErrorCategory {
  if (status === 401) return 'authentication';
  if (status === 403) return 'authorization';
  if (status === 404) return 'notFound';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rateLimit';
  if (status >= 500) return 'server';
  return 'unknown';
}

export async function executeRequest<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof JanuaryError) throw error;
    if (error instanceof ResponseError) {
      const response = error.response;
      let message = `January API request failed with status ${response.status}.`;
      let code: string | undefined;
      try {
        const payload = await response.clone().json() as {
          message?: unknown;
          error?: unknown;
          code?: unknown;
        };
        if (typeof payload.message === 'string') message = payload.message;
        else if (typeof payload.error === 'string') message = payload.error;
        if (typeof payload.code === 'string') code = payload.code;
      } catch {
        // The status and category remain useful when the body is empty or non-JSON.
      }
      throw new JanuaryError(categoryForStatus(response.status), message, {
        status: response.status,
        requestId: response.headers.get('x-request-id') ?? undefined,
        code,
        cause: error,
      });
    }

    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new JanuaryError(
      'transport',
      error instanceof Error ? error.message : 'January API request failed.',
      { cause: error },
    );
  }
}
