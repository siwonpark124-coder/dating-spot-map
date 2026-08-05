export type ImageCheckStatus = "valid" | "broken" | "none";

export interface ImageCheckResult {
  status: ImageCheckStatus;
  detail?: string;
}

const TIMEOUT_MS = 5000;

async function requestOnce(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { method, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

// 이미지 URL이 실제로 열리는지(200 응답 + image 콘텐츠 타입) 서버에서 미리 확인한다.
// 일부 CDN은 HEAD를 막아두므로 실패하면 GET으로 한 번 더 시도한다.
export async function checkImageUrl(url: string | null | undefined): Promise<ImageCheckResult> {
  if (!url) return { status: "none" };

  let lastError: string | undefined;

  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await requestOnce(url, method);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !contentType.startsWith("image/")) {
        return { status: "broken", detail: `콘텐츠 타입이 이미지가 아님 (${contentType})` };
      }
      return { status: "valid" };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "요청 실패";
    }
  }

  return { status: "broken", detail: lastError };
}
