import { QueryClient, QueryFunction } from "@tanstack/react-query";

let expectedUserId: string | null = null;
export function setExpectedUserId(value: string | null) {
  expectedUserId = value;
}
export function identityHeaders(url: string): Record<string, string> {
  return expectedUserId && /^\/api\/(resumes(?:\/|$)|upload(?:\/|$))/.test(url)
    ? { "X-Expected-User-Id": expectedUserId }
    : {};
}

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401 && /\/api\/(resumes|upload)(?:\/|$)/.test(res.url)) {
      window.dispatchEvent(new Event("resume-session-suspend"));
      window.dispatchEvent(new Event("resume-auth-expired"));
    }
    const text = (await res.text()) || res.statusText;
    let message = text;
    try {
      message = JSON.parse(text).message || text;
    } catch {
      /* Plain-text error response. */
    }
    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...identityHeaders(url),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const url = queryKey.join("/");
    const res = await fetch(url, {
      credentials: "include",
      headers: identityHeaders(url),
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
