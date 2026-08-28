import { Configuration } from './internal/transport/runtime.js';
import { FoodsApi } from './internal/transport/apis/FoodsApi.js';
import { FoodLogsApi } from './internal/transport/apis/FoodLogsApi.js';
import { GlucoseApi } from './internal/transport/apis/GlucoseApi.js';
import { PhotoScanningApi } from './internal/transport/apis/PhotoScanningApi.js';
import { RestaurantsApi } from './internal/transport/apis/RestaurantsApi.js';
import { FoodsResource } from './resources/foods.js';
import { FoodLogsResource } from './resources/food-logs.js';
import { GlucoseResource } from './resources/glucose.js';
import { FoodAnalysisResource } from './resources/photo-scanning.js';
import { RestaurantsResource } from './resources/restaurants.js';
import type { PartnerUserContext } from './models.js';
import {
  createJanuaryPartnerUserClient,
  type JanuaryPartnerUserClient,
} from './user-client.js';
import { JanuaryError } from './errors.js';

const SDK_VERSION = '0.1.0';
const PRODUCTION_BASE_URL = 'https://partners.january.ai';
let didWarnAboutDevelopmentAPIKey = false;
const isNodeRuntime = Boolean(
  (globalThis as typeof globalThis & { process?: { versions?: { node?: string } } })
    .process?.versions?.node,
);

interface JanuaryPartnerClientBaseOptions {
  fetch?: typeof globalThis.fetch;
}

export interface JanuaryClientToken {
  /** Opaque bearer-token value. Never log or persist it. */
  readonly token: string;
  /** Lifetime in seconds, measured from when the provider receives the token. */
  readonly expiresIn: number;
}

export type JanuaryClientTokenResponse = JanuaryClientToken | {
  readonly token: string;
  readonly expires_in: number;
};

export interface JanuaryTokenProvider {
  fetchClientToken(): Promise<JanuaryClientTokenResponse>;
}

export type JanuaryTokenProviderCallback = () => Promise<JanuaryClientTokenResponse>;

/** A token-provider failure with an explicit retry decision. */
export class JanuaryTokenProviderError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'JanuaryTokenProviderError';
    this.retryable = options.retryable ?? false;
  }
}

/** Controls bounded retries when the app's token provider fails to fetch a credential. */
export interface JanuaryTokenRetryPolicy {
  /** Total attempts including the initial provider call. Defaults to 9. */
  readonly maximumAttempts?: number;
  /** Delay before the first retry. Defaults to 1,000 milliseconds. */
  readonly initialDelayMs?: number;
  /** Exponential multiplier. Defaults to 2. */
  readonly multiplier?: number;
  /** Maximum delay between attempts. Defaults to 8,000 milliseconds. */
  readonly maximumDelayMs?: number;
  /** Random variation from zero to one. Defaults to 0.2 (plus or minus 20%). */
  readonly jitterRatio?: number;
}

/** @deprecated Use JanuaryTokenProvider. */
export type JanuaryClientTokenProvider = JanuaryTokenProvider;
/** @deprecated Use JanuaryTokenProviderCallback. */
export type JanuaryClientTokenProviderCallback = JanuaryTokenProviderCallback;

export type JanuaryPartnerClientOptions = JanuaryPartnerClientBaseOptions & (
  | {
      /** @deprecated Local testing only. Use clientTokenProvider in production. */
      apiKey: string;
      developmentApiKey?: never;
      accessToken?: never;
      clientTokenProvider?: never;
      tokenRetryPolicy?: never;
    }
  | {
      /** @deprecated Local testing only. Use clientTokenProvider in production. */
      developmentApiKey: string;
      apiKey?: never;
      accessToken?: never;
      clientTokenProvider?: never;
      tokenRetryPolicy?: never;
    }
  | { apiKey?: never; developmentApiKey?: never; accessToken: string; clientTokenProvider?: never; tokenRetryPolicy?: never }
  | {
      apiKey?: never;
      developmentApiKey?: never;
      accessToken?: never;
      clientTokenProvider: JanuaryTokenProvider | JanuaryTokenProviderCallback;
      tokenRetryPolicy?: JanuaryTokenRetryPolicy;
    }
);

interface ResolvedTokenRetryPolicy {
  maximumAttempts: number;
  initialDelayMs: number;
  multiplier: number;
  maximumDelayMs: number;
  jitterRatio: number;
}

class ClientTokenManager {
  private cachedToken?: JanuaryClientToken;
  private cachedExpiresAt?: number;
  private refresh?: Promise<JanuaryClientToken>;

  constructor(
    private readonly provider: JanuaryTokenProvider | JanuaryTokenProviderCallback,
    private readonly refreshLeewayMs = 60_000,
    private readonly retryPolicy = resolveTokenRetryPolicy(),
  ) {}

  async token(): Promise<string> {
    if (this.cachedToken && this.isUsable()) return this.cachedToken.token;
    if (this.refresh) return (await this.refresh).token;

    const refresh = this.fetchToken();
    this.refresh = refresh;
    try {
      const token = await refresh;
      this.cachedToken = token;
      this.cachedExpiresAt = Date.now() + token.expiresIn * 1_000;
      return token.token;
    } finally {
      if (this.refresh === refresh) this.refresh = undefined;
    }
  }

  invalidateIfMatching(value: string): void {
    if (this.cachedToken?.token === value) {
      this.cachedToken = undefined;
      this.cachedExpiresAt = undefined;
    }
  }

  private async fetchToken(): Promise<JanuaryClientToken> {
    let attempt = 1;
    while (true) {
      let token: JanuaryClientTokenResponse;
      try {
        token = typeof this.provider === 'function'
          ? await this.provider()
          : await this.provider.fetchClientToken();
      } catch (error) {
        if (isCancellationError(error)) throw error;
        if (!(error instanceof JanuaryTokenProviderError) || !error.retryable) throw error;
        if (attempt >= this.retryPolicy.maximumAttempts) {
          throw new JanuaryError(
            'authentication',
            `The app could not obtain a January client token after ${attempt} attempts.`,
            { cause: error },
          );
        }
        const delay = retryDelay(this.retryPolicy, attempt, Math.random());
        attempt += 1;
        if (delay > 0) await sleep(delay);
        continue;
      }

      const value = token.token.trim();
      const expiresIn = 'expiresIn' in token ? token.expiresIn : token.expires_in;
      if (!value) throw new JanuaryError('authentication', 'The client token provider returned an empty token.');
      if (!Number.isFinite(expiresIn) || expiresIn * 1_000 <= this.refreshLeewayMs) {
        throw new JanuaryError(
          'authentication',
          'The client token provider returned an expired or nearly expired token.',
        );
      }
      return { token: value, expiresIn };
    }
  }

  private isUsable(): boolean {
    return this.cachedExpiresAt !== undefined
      && this.cachedExpiresAt - Date.now() > this.refreshLeewayMs;
  }
}

export class JanuaryPartnerClient {
  readonly foods: FoodsResource;
  readonly restaurants: RestaurantsResource;
  readonly foodAnalysis: FoodAnalysisResource;
  readonly foodLogs: FoodLogsResource;
  readonly glucose: GlucoseResource;

  constructor(options: JanuaryPartnerClientOptions) {
    const credentials = ['apiKey', 'developmentApiKey', 'accessToken', 'clientTokenProvider']
      .filter((name) => options[name as keyof JanuaryPartnerClientOptions] !== undefined);
    if (credentials.length !== 1) {
      throw new TypeError('Provide exactly one authentication method.');
    }

    const apiKey = 'apiKey' in options
      ? options.apiKey?.trim()
      : 'developmentApiKey' in options
        ? options.developmentApiKey?.trim()
        : undefined;
    const accessToken = 'accessToken' in options ? options.accessToken?.trim() : undefined;
    if (apiKey !== undefined && !apiKey) throw new TypeError('A development API key is required.');
    if (accessToken !== undefined && !accessToken) throw new TypeError('A client token is required.');
    if (apiKey !== undefined) {
      if (!didWarnAboutDevelopmentAPIKey) {
        didWarnAboutDevelopmentAPIKey = true;
        console.warn(
          'January development API-key authentication is for local testing only. ' +
          'Do not ship this key; use clientTokenProvider in production.',
        );
      }
    }
    const configuredProvider = 'clientTokenProvider' in options
      ? options.clientTokenProvider
      : undefined;
    const tokenManager = configuredProvider !== undefined
      ? new ClientTokenManager(
          configuredProvider,
          60_000,
          resolveTokenRetryPolicy(
            'tokenRetryPolicy' in options ? options.tokenRetryPolicy : undefined,
          ),
        )
      : undefined;
    const underlyingFetch = options.fetch ?? globalThis.fetch;
    const usesFixedClientToken = accessToken !== undefined;
    const fetchApi = tokenManager
      ? createRefreshingFetch(underlyingFetch, tokenManager)
      : usesFixedClientToken
        ? createClientTokenFetch(underlyingFetch)
        : options.fetch;

    const configuration = new Configuration({
      basePath: PRODUCTION_BASE_URL,
      accessToken: tokenManager ? () => tokenManager.token() : (apiKey ?? accessToken),
      ...(isNodeRuntime
        ? { headers: { 'User-Agent': `JanuaryPartnerSDK-Node/${SDK_VERSION} TypeScript/7 Node` } }
        : {}),
      ...(fetchApi !== undefined ? { fetchApi } : {}),
    });

    const foodAnalysisApi = new PhotoScanningApi(configuration);
    this.foods = new FoodsResource(new FoodsApi(configuration));
    this.restaurants = new RestaurantsResource(new RestaurantsApi(configuration));
    this.foodAnalysis = new FoodAnalysisResource(foodAnalysisApi);
    this.foodLogs = new FoodLogsResource(new FoodLogsApi(configuration));
    this.glucose = new GlucoseResource(new GlucoseApi(configuration));
  }

  forUser(context: PartnerUserContext): JanuaryPartnerUserClient;
  forUser(endUserId: string, endUserTimezone?: string): JanuaryPartnerUserClient;
  forUser(contextOrId: PartnerUserContext | string, endUserTimezone?: string): JanuaryPartnerUserClient {
    const context = typeof contextOrId === 'string'
      ? { endUserId: contextOrId, ...(endUserTimezone !== undefined ? { endUserTimezone } : {}) }
      : contextOrId;
    return createJanuaryPartnerUserClient(this, context);
  }
}

function createRefreshingFetch(
  fetchApi: typeof globalThis.fetch,
  manager: ClientTokenManager,
): typeof globalThis.fetch {
  return async (input, init) => {
    const preparedInit = withoutEndUserId(input, init);
    const response = await fetchApi(input, preparedInit);
    const payload = response.status === 401
      ? await response.clone().json().catch(() => undefined) as { code?: unknown } | undefined
      : undefined;
    if (response.status !== 401 || payload?.code !== 'token_expired' || !isReplayable(init?.body)) {
      return response;
    }

    const headers = new Headers(preparedInit.headers);
    const oldAuthorization = headers.get('authorization') ?? '';
    const oldToken = oldAuthorization.replace(/^Bearer\s+/i, '');
    manager.invalidateIfMatching(oldToken);
    const refreshedToken = await manager.token();
    headers.set('authorization', `Bearer ${refreshedToken}`);
    return fetchApi(input, { ...preparedInit, headers });
  };
}

function createClientTokenFetch(fetchApi: typeof globalThis.fetch): typeof globalThis.fetch {
  return (input, init) => fetchApi(input, withoutEndUserId(input, init));
}

function withoutEndUserId(input: RequestInfo | URL, init?: RequestInit): RequestInit {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  headers.delete('x-end-user-id');
  return { ...init, headers };
}

function isReplayable(body: BodyInit | null | undefined): boolean {
  return body == null || !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);
}

export function resolveTokenRetryPolicy(
  policy: JanuaryTokenRetryPolicy = {},
): ResolvedTokenRetryPolicy {
  const resolved = {
    maximumAttempts: policy.maximumAttempts ?? 9,
    initialDelayMs: policy.initialDelayMs ?? 1_000,
    multiplier: policy.multiplier ?? 2,
    maximumDelayMs: policy.maximumDelayMs ?? 8_000,
    jitterRatio: policy.jitterRatio ?? 0.2,
  };
  if (!Number.isInteger(resolved.maximumAttempts) || resolved.maximumAttempts < 1) {
    throw new TypeError('tokenRetryPolicy.maximumAttempts must be an integer of at least 1.');
  }
  if (!Number.isFinite(resolved.initialDelayMs) || resolved.initialDelayMs < 0) {
    throw new TypeError('tokenRetryPolicy.initialDelayMs must be finite and nonnegative.');
  }
  if (!Number.isFinite(resolved.multiplier) || resolved.multiplier < 1) {
    throw new TypeError('tokenRetryPolicy.multiplier must be finite and at least 1.');
  }
  if (!Number.isFinite(resolved.maximumDelayMs) || resolved.maximumDelayMs < 0) {
    throw new TypeError('tokenRetryPolicy.maximumDelayMs must be finite and nonnegative.');
  }
  if (!Number.isFinite(resolved.jitterRatio) || resolved.jitterRatio < 0 || resolved.jitterRatio > 1) {
    throw new TypeError('tokenRetryPolicy.jitterRatio must be between 0 and 1.');
  }
  return resolved;
}

export function retryDelay(
  policy: ResolvedTokenRetryPolicy,
  failedAttempt: number,
  unitRandom: number,
): number {
  const base = Math.min(
    policy.maximumDelayMs,
    policy.initialDelayMs * policy.multiplier ** Math.max(0, failedAttempt - 1),
  );
  const variation = base * policy.jitterRatio;
  const normalizedRandom = Math.min(1, Math.max(0, unitRandom));
  return Math.min(
    policy.maximumDelayMs,
    Math.max(0, base - variation + 2 * variation * normalizedRandom),
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isCancellationError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
