export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function websocketUrl(path: string) {
  const url = new URL(path, API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.detail || "Something went wrong"
    );
  }

  return response.json();
}
