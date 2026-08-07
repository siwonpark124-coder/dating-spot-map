/**
 * 오로지 심볼. 지도 핀 두 개가 맞물려 하트를 이루는 형태.
 * 원본 이미지 대신 벡터로 다시 그렸다 — 배경이 아예 없고 어느 크기에서도 선명하다.
 * 글자("오로지")는 SVG에 넣지 않고 HTML 텍스트로 둔다 (읽기·검색·번역에 유리).
 */
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="오로지" className={className}>
      {/* 왼쪽 핀 (밝은 톤) */}
      <path d="M50 92 C18 66 4 47 4 32 A25 25 0 0 1 50 20 Z" fill="#c9b39a" />
      {/* 오른쪽 핀 (짙은 톤) */}
      <path d="M50 92 L50 20 A25 25 0 0 1 96 32 C96 47 82 66 50 92 Z" fill="#a2865f" />
      {/* 두 핀이 겹치는 가운데 이음새 */}
      <path d="M50 92 L50 20 L44 30 Z" fill="#8f7550" opacity="0.35" />
      {/* 핀 구멍 */}
      <circle cx="31" cy="33" r="11" fill="#ffffff" />
      <circle cx="69" cy="33" r="11" fill="#ffffff" />
    </svg>
  );
}
