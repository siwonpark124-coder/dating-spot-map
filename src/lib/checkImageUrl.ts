export type ImageCheckStatus = "valid" | "broken" | "none";

export interface ImageCheckResult {
  status: ImageCheckStatus;
  detail?: string;
}

const TIMEOUT_MS = 3000;

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
// 일부 CDN은 HEAD 요청 자체를 거부(네트워크 에러)하므로 그 경우에만 GET으로 한 번 더 시도한다.
// HEAD가 명확한 HTTP 상태(404 등)로 응답했다면 GET을 또 기다릴 필요가 없다 — 같은 결과가 반복될 뿐이다.
export async function checkImageUrl(url: string | null | undefined): Promise<ImageCheckResult> {
  if (!url) return { status: "none" };

  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await requestOnce(url, method);
      if (!res.ok) {
        return { status: "broken", detail: `HTTP ${res.status}` };
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !contentType.startsWith("image/")) {
        return { status: "broken", detail: `콘텐츠 타입이 이미지가 아님 (${contentType})` };
      }
      return { status: "valid" };
    } catch (err) {
      if (method === "GET") {
        return { status: "broken", detail: err instanceof Error ? err.message : "요청 실패" };
      }
      // HEAD가 네트워크 레벨에서 실패함 (CORS/차단 등) — GET으로 재시도
    }
  }

  return { status: "broken", detail: "요청 실패" };
}
