const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function streamAIResponse(
  endpoint: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message =
        errorData?.message || `AI request failed (${res.status})`;
      onError(message);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response stream available");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const data = JSON.parse(jsonStr);
          if (data.done) {
            onDone();
            return;
          }
          if (data.error) {
            onError(data.error);
            return;
          }
          if (data.content) {
            onChunk(data.content);
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    onDone();
  } catch (err) {
    if (signal?.aborted) return;
    onError(err instanceof Error ? err.message : "AI request failed");
  }
}
