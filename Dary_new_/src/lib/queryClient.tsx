import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';

// ==========================================
// 1. STALE TIMES & CACHE CONFIGURATION
// ==========================================
export const STALE_TIMES = {
  /** Semi-static data: Properties, Details, Cities, Categories (15 minutes) */
  STATIC: 15 * 60 * 1000,
  /** Dashboard statistics: Revenue, Counts, Occupancy, Statuses (5 minutes) */
  DASHBOARD: 5 * 60 * 1000,
  /** Paginated lists: Bookings, Users, Reports, Rentals (5 minutes) */
  LISTS: 5 * 60 * 1000,
  /** Live / frequent data: Notifications, Alerts (2 minutes) */
  LIVE: 2 * 60 * 1000,
  /** Default fallback: 5 minutes */
  DEFAULT: 5 * 60 * 1000,
} as const;

// ==========================================
// 2. QUERY KEY UTILITIES
// ==========================================
function serializeKeyPart(part: any): any {
  if (part === null || typeof part !== 'object') {
    return part;
  }
  if (Array.isArray(part)) {
    return part.map(serializeKeyPart);
  }
  // Sort keys for deterministic hashing of objects
  const sorted: Record<string, any> = {};
  for (const k of Object.keys(part).sort()) {
    sorted[k] = serializeKeyPart(part[k]);
  }
  return sorted;
}

export function hashQueryKey(queryKey: any[]): string {
  try {
    return JSON.stringify(queryKey.map(serializeKeyPart));
  } catch {
    return String(queryKey);
  }
}

function matchKey(needle: any[], haystack: any[], exact = false): boolean {
  if (exact) {
    return hashQueryKey(needle) === hashQueryKey(haystack);
  }
  if (needle.length > haystack.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (hashQueryKey([needle[i]]) !== hashQueryKey([haystack[i]])) {
      return false;
    }
  }
  return true;
}

// ==========================================
// 3. TYPES
// ==========================================
export interface QueryState<TData = any, TError = any> {
  data: TData | undefined;
  error: TError | null;
  status: 'idle' | 'pending' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching';
  dataUpdatedAt: number;
  errorUpdatedAt: number;
}

export interface QueryOptions<TData = any, TError = any> {
  queryKey: any[];
  queryFn: (context?: { queryKey: any[]; signal?: AbortSignal }) => Promise<TData>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
  initialData?: TData | (() => TData);
  placeholderData?: TData;
}

export interface QueryObserverResult<TData = any, TError = any> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  status: 'pending' | 'success' | 'error';
  fetchStatus: 'idle' | 'fetching';
  dataUpdatedAt: number;
  refetch: () => Promise<TData | undefined>;
}

export interface MutationOptions<TData = any, TVariables = void, TError = any> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context?: any) => void | Promise<any>;
  onError?: (error: TError, variables: TVariables, context?: any) => void | Promise<any>;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context?: any) => void | Promise<any>;
}

// ==========================================
// 4. QUERY CLIENT CORE ENGINE
// ==========================================
export class QueryClient {
  private cache = new Map<string, { key: any[]; state: QueryState; queryFn?: (ctx?: any) => Promise<any> }>();
  private inFlight = new Map<string, Promise<any>>();
  private listeners = new Map<string, Set<() => void>>();
  private activeSubscribers = new Map<string, number>();
  private gcTimers = new Map<string, any>();

  private defaultOptions = {
    staleTime: STALE_TIMES.DEFAULT,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  };

  private storageKey = 'dary_query_cache_v2';

  constructor(options?: { defaultOptions?: { queries?: Partial<typeof QueryClient.prototype.defaultOptions> } }) {
    if (options?.defaultOptions?.queries) {
      this.defaultOptions = { ...this.defaultOptions, ...options.defaultOptions.queries };
    }

    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.defaultOptions.refetchOnWindowFocus) {
          this.refetchActiveStaleQueries();
        }
      });
      window.addEventListener('online', () => {
        this.refetchActiveStaleQueries();
      });
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const raw = window.sessionStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed: Record<string, { key: any[]; state: QueryState }> = JSON.parse(raw);
      const now = Date.now();
      for (const [hash, item] of Object.entries(parsed)) {
        if (item?.state?.data !== undefined && (now - item.state.dataUpdatedAt < 2 * 60 * 60 * 1000)) {
          this.cache.set(hash, {
            key: item.key,
            state: {
              ...item.state,
              fetchStatus: 'idle',
            },
          });
        }
      }
    } catch (e) {
      console.warn('[QueryClient] Failed to load cache from sessionStorage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const toStore: Record<string, { key: any[]; state: any }> = {};
      for (const [hash, entry] of this.cache.entries()) {
        if (entry.state.data !== undefined && entry.state.status === 'success') {
          toStore[hash] = {
            key: entry.key,
            state: {
              data: entry.state.data,
              dataUpdatedAt: entry.state.dataUpdatedAt,
              status: 'success',
              fetchStatus: 'idle',
            },
          };
        }
      }
      window.sessionStorage.setItem(this.storageKey, JSON.stringify(toStore));
    } catch {
      // Storage quota exceeded or private mode
    }
  }

  private getOrCreateEntry(queryKey: any[], queryFn?: (ctx?: any) => Promise<any>) {
    const hash = hashQueryKey(queryKey);
    let entry = this.cache.get(hash);
    if (!entry) {
      entry = {
        key: queryKey,
        state: {
          data: undefined,
          error: null,
          status: 'pending',
          fetchStatus: 'idle',
          dataUpdatedAt: 0,
          errorUpdatedAt: 0,
        },
        queryFn,
      };
      this.cache.set(hash, entry);
    }
    if (queryFn) {
      entry.queryFn = queryFn;
    }
    return { hash, entry };
  }

  getQueryState<TData = any, TError = any>(queryKey: any[]): QueryState<TData, TError> | undefined {
    const hash = hashQueryKey(queryKey);
    return this.cache.get(hash)?.state as QueryState<TData, TError> | undefined;
  }

  getQueryData<TData = any>(queryKey: any[]): TData | undefined {
    return this.getQueryState<TData>(queryKey)?.data;
  }

  setQueryData<TData = any>(
    queryKey: any[],
    updater: TData | ((prev: TData | undefined) => TData)
  ): TData {
    const { hash, entry } = this.getOrCreateEntry(queryKey);
    const prev = entry.state.data;
    const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
    entry.state = {
      ...entry.state,
      data: next,
      error: null,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
    };
    this.saveToStorage();
    this.notify(hash);
    return next;
  }

  async fetchQuery<TData = any>(options: {
    queryKey: any[];
    queryFn: (ctx?: any) => Promise<TData>;
    staleTime?: number;
    force?: boolean;
  }): Promise<TData> {
    const { queryKey, queryFn, force = false } = options;
    const staleTime = options.staleTime ?? this.defaultOptions.staleTime;
    const { hash, entry } = this.getOrCreateEntry(queryKey, queryFn);

    const isFresh =
      entry.state.data !== undefined &&
      entry.state.dataUpdatedAt > 0 &&
      Date.now() - entry.state.dataUpdatedAt < staleTime;

    if (!force && isFresh) {
      return entry.state.data;
    }

    // Deduplicate in-flight requests
    const existingPromise = this.inFlight.get(hash);
    if (existingPromise) {
      return existingPromise;
    }

    entry.state = {
      ...entry.state,
      fetchStatus: 'fetching',
      status: entry.state.data !== undefined ? 'success' : 'pending',
    };
    this.notify(hash);

    const promise = (async () => {
      try {
        const data = await queryFn({ queryKey });
        entry.state = {
          ...entry.state,
          data,
          error: null,
          status: 'success',
          fetchStatus: 'idle',
          dataUpdatedAt: Date.now(),
        };
        this.saveToStorage();
        return data;
      } catch (err: any) {
        entry.state = {
          ...entry.state,
          error: err,
          status: 'error',
          fetchStatus: 'idle',
          errorUpdatedAt: Date.now(),
        };
        throw err;
      } finally {
        this.inFlight.delete(hash);
        this.notify(hash);
      }
    })();

    this.inFlight.set(hash, promise);
    return promise;
  }

  invalidateQueries(filters?: { queryKey?: any[]; exact?: boolean }) {
    for (const [hash, entry] of this.cache.entries()) {
      if (!filters?.queryKey || matchKey(filters.queryKey, entry.key, filters.exact)) {
        // Mark stale
        entry.state = {
          ...entry.state,
          dataUpdatedAt: 0,
        };
        this.notify(hash);

        // If active subscribers exist, refetch immediately
        if ((this.activeSubscribers.get(hash) || 0) > 0 && entry.queryFn) {
          this.fetchQuery({
            queryKey: entry.key,
            queryFn: entry.queryFn,
            force: true,
          }).catch((err) => {
            console.warn('[QueryClient] Background refetch error:', err);
          });
        }
      }
    }
  }

  refetchQueries(filters?: { queryKey?: any[]; exact?: boolean }) {
    this.invalidateQueries(filters);
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(this.storageKey);
    }
    this.listeners.forEach((set) => set.forEach((cb) => cb()));
  }

  subscribe(queryKey: any[], listener: () => void): () => void {
    const hash = hashQueryKey(queryKey);
    if (!this.listeners.has(hash)) {
      this.listeners.set(hash, new Set());
    }
    this.listeners.get(hash)!.add(listener);

    const activeCount = (this.activeSubscribers.get(hash) || 0) + 1;
    this.activeSubscribers.set(hash, activeCount);

    // Cancel pending GC if any
    if (this.gcTimers.has(hash)) {
      clearTimeout(this.gcTimers.get(hash));
      this.gcTimers.delete(hash);
    }

    return () => {
      this.listeners.get(hash)?.delete(listener);
      const remaining = (this.activeSubscribers.get(hash) || 1) - 1;
      if (remaining <= 0) {
        this.activeSubscribers.delete(hash);
        // Start GC timer
        const timer = setTimeout(() => {
          if (!this.activeSubscribers.has(hash)) {
            this.cache.delete(hash);
            this.listeners.delete(hash);
            this.gcTimers.delete(hash);
          }
        }, this.defaultOptions.gcTime);
        this.gcTimers.set(hash, timer);
      } else {
        this.activeSubscribers.set(hash, remaining);
      }
    };
  }

  private notify(hash: string) {
    const set = this.listeners.get(hash);
    if (set) {
      set.forEach((cb) => cb());
    }
  }

  private refetchActiveStaleQueries() {
    for (const [hash, count] of this.activeSubscribers.entries()) {
      if (count > 0) {
        const entry = this.cache.get(hash);
        if (entry && entry.queryFn) {
          const isStale = Date.now() - entry.state.dataUpdatedAt > this.defaultOptions.staleTime;
          if (isStale) {
            this.fetchQuery({
              queryKey: entry.key,
              queryFn: entry.queryFn,
              force: true,
            }).catch(() => {});
          }
        }
      }
    }
  }
}

// ==========================================
// 5. REACT CONTEXT & HOOKS
// ==========================================
export const defaultQueryClient = new QueryClient();
const QueryClientContext = createContext<QueryClient>(defaultQueryClient);

export function QueryClientProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: React.ReactNode;
}) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  );
}

export function useQueryClient(): QueryClient {
  return useContext(QueryClientContext);
}

const DEFAULT_QUERY_STATE: QueryState<any, any> = {
  data: undefined,
  error: null,
  status: 'pending',
  fetchStatus: 'idle',
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
};

export function useQuery<TData = any, TError = any>(
  options: QueryOptions<TData, TError>
): QueryObserverResult<TData, TError> {
  const client = useQueryClient();
  const {
    queryKey,
    queryFn,
    staleTime = STALE_TIMES.DEFAULT,
    enabled = true,
    refetchInterval,
    placeholderData,
  } = options;

  const hash = hashQueryKey(queryKey);

  // Sync with external store for tear-free cache subscription
  const queryState = useSyncExternalStore(
    (onStoreChange) => client.subscribe(queryKey, onStoreChange),
    () => client.getQueryState<TData, TError>(queryKey) || DEFAULT_QUERY_STATE,
    () => client.getQueryState<TData, TError>(queryKey) || DEFAULT_QUERY_STATE
  );

  // Fetch when stale, missing, or key changed
  useEffect(() => {
    if (!enabled) return;

    const isStale =
      queryState.data === undefined ||
      queryState.dataUpdatedAt === 0 ||
      Date.now() - queryState.dataUpdatedAt >= staleTime;

    if (isStale && queryState.fetchStatus !== 'fetching') {
      client.fetchQuery({
        queryKey,
        queryFn,
        staleTime,
      }).catch((err) => {
        console.error(`[useQuery] Fetch error for key ${hash}:`, err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, enabled, staleTime]);

  // Periodic polling if refetchInterval provided
  useEffect(() => {
    if (!enabled || !refetchInterval || typeof refetchInterval !== 'number') return;
    const interval = setInterval(() => {
      client.fetchQuery({
        queryKey,
        queryFn,
        force: true,
      }).catch(() => {});
    }, refetchInterval);
    return () => clearInterval(interval);
  }, [hash, enabled, refetchInterval, client, queryFn, queryKey]);

  const rawData = queryState.data !== undefined ? queryState.data : placeholderData;
  const isLoading = (queryState.data === undefined && queryState.status === 'pending') || queryState.fetchStatus === 'fetching' && queryState.data === undefined;
  const isFetching = queryState.fetchStatus === 'fetching';
  const isSuccess = queryState.data !== undefined && queryState.status === 'success';
  const isError = queryState.status === 'error';

  const refetch = useRef(async () => {
    return client.fetchQuery<TData>({
      queryKey,
      queryFn,
      force: true,
    });
  });
  refetch.current = async () => {
    return client.fetchQuery<TData>({
      queryKey,
      queryFn,
      force: true,
    });
  };

  return {
    data: rawData,
    error: queryState.error,
    isLoading,
    isFetching,
    isSuccess,
    isError,
    status: queryState.status === 'idle' ? 'pending' : (queryState.status as any),
    fetchStatus: queryState.fetchStatus,
    dataUpdatedAt: queryState.dataUpdatedAt,
    refetch: () => refetch.current(),
  };
}

export function useMutation<TData = any, TVariables = void, TError = any>(
  options: MutationOptions<TData, TVariables, TError>
) {
  const [data, setData] = React.useState<TData | undefined>(undefined);
  const [error, setError] = React.useState<TError | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    setIsPending(true);
    setIsError(false);
    setError(null);
    try {
      const res = await options.mutationFn(variables);
      setData(res);
      setIsSuccess(true);
      if (options.onSuccess) {
        await options.onSuccess(res, variables);
      }
      if (options.onSettled) {
        await options.onSettled(res, null, variables);
      }
      return res;
    } catch (err: any) {
      setError(err);
      setIsError(true);
      if (options.onError) {
        await options.onError(err, variables);
      }
      if (options.onSettled) {
        await options.onSettled(undefined, err, variables);
      }
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  const mutate = (variables: TVariables) => {
    mutateAsync(variables).catch(() => {});
  };

  const reset = () => {
    setData(undefined);
    setError(null);
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
  };

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isPending,
    isSuccess,
    isError,
    reset,
  };
}

// ==========================================
// 6. CENTRAL QUERY KEYS FACTORY
// ==========================================
export const QUERY_KEYS = {
  // Owner Dashboard Keys
  owner: {
    all: ['owner'] as const,
    propertiesStatus: ['owner', 'properties', 'status'] as const,
    bookingsStatus: ['owner', 'bookings', 'status'] as const,
    revenue: ['owner', 'bookings', 'revenue'] as const,
    calendar: (days?: number) => ['owner', 'calendar', days ?? 'all'] as const,
    myProperties: ['owner', 'properties', 'my'] as const,
    propertyBookings: (propId: string) => ['owner', 'properties', propId, 'bookings'] as const,
  },
  // Admin Dashboard Keys
  admin: {
    all: ['admin'] as const,
    usersStatus: ['admin', 'users', 'status'] as const,
    propertiesStatus: ['admin', 'properties', 'status'] as const,
    bookingsStatus: ['admin', 'bookings', 'status'] as const,
    revenue: ['admin', 'bookings', 'revenue'] as const,
    reportsStatus: ['admin', 'reports', 'status'] as const,
    analytics: (range = '7d') => ['admin', 'analytics', range] as const,
    recentReports: (limit = 5) => ['admin', 'reports', 'recent', limit] as const,
    reports: (params?: any) => ['admin', 'reports', 'list', params] as const,
    users: (params?: any) => ['admin', 'users', 'list', params] as const,
    properties: (params?: any) => ['admin', 'properties', 'list', params] as const,
    bookings: (params?: any) => ['admin', 'bookings', 'list', params] as const,
    calendar: (start?: string, end?: string) => ['admin', 'calendar', start, end] as const,
  },
  // Tenant Dashboard Keys
  tenant: {
    all: ['tenant'] as const,
    rentals: ['tenant', 'rentals'] as const,
    favorites: ['tenant', 'favorites'] as const,
    savedSearches: ['tenant', 'savedSearches'] as const,
  },
  // Shared / General Keys
  notifications: (page = 1, limit = 50) => ['notifications', { page, limit }] as const,
  properties: (params?: any) => ['properties', params] as const,
} as const;
