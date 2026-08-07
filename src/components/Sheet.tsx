"use client";

import { useCallback, useEffect, useRef } from "react";

type SheetVariant = "sheet" | "modal";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** "sheet" = 아래에서 올라옴(지도가 위로 보임), "modal" = 화면 가운데 네모창 */
  variant?: SheetVariant;
  /** 창 아래에 고정으로 붙는 줄 (예: "477곳 보기") */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 안드로이드 뒤로가기로 창이 닫히게 한다.
 * 이걸 안 하면 창이 열린 상태에서 뒤로가기를 눌렀을 때 사이트를 통째로 떠난다.
 *
 * 까다로운 지점: 필터는 URL을 replaceState로 고쳐 쓴다. 창을 여는 동안
 * 고른 필터는 창을 열며 쌓아둔 항목 위에 덮어쓰이므로,
 * 뒤로가기로 그 항목이 빠지면 고른 필터까지 같이 날아간다.
 * 그래서 뒤로 돌아온 직후에 최신 URL을 다시 씨운다.
 */
function useBackToClose(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const urlRef = useRef("");
  const openRef = useRef(open);
  const closeRef = useRef(onClose);

  // 렌더마다 최신 값을 붙들어 둔다 (필터가 바뀌면 부모가 다시 그린다)
  useEffect(() => {
    openRef.current = open;
    closeRef.current = onClose;
    urlRef.current = window.location.href;
  });

  useEffect(() => {
    if (!open || pushedRef.current) return;
    urlRef.current = window.location.href;
    pushedRef.current = true;
    window.history.pushState({ oroji_sheet: true }, "");
  }, [open]);

  // 리스너는 마운트 내내 살려둔다. X로 닫을 때도 back()을 거쳤 여기로 들어와,
  // 히스토리 항목이 쌓이지 않으면서 URL 복구도 한 곳에서만 일어난다.
  useEffect(() => {
    const onPop = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      window.history.replaceState(null, "", urlRef.current);
      if (openRef.current) closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // X·배경 탭도 back()을 거쳐 위 핸들러로 모인다
  return useCallback(() => {
    if (pushedRef.current) window.history.back();
    else closeRef.current();
  }, []);
}

export default function Sheet({
  open,
  onClose,
  title,
  variant = "sheet",
  footer,
  children,
}: SheetProps) {
  const close = useBackToClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const panel =
    variant === "sheet"
      ? // 지도가 위로 살짝 보여야 방금 고른 게 어디쯤인지 감이 온다
        "inset-x-0 bottom-0 max-h-[78dvh] rounded-t-2xl"
      : "inset-x-3 top-[8dvh] max-h-[84dvh] rounded-2xl";

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="닫기"
        onClick={close}
        className="absolute inset-0 bg-black/30"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute flex flex-col overflow-hidden bg-[#fbf7ef] shadow-[0_-4px_24px_rgba(0,0,0,0.18)] ${panel}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-bold text-stone-900">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="-mr-1.5 rounded-full p-1.5 text-xl leading-none text-stone-500 hover:bg-stone-200/70"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && <div className="shrink-0 border-t border-stone-200 p-3">{footer}</div>}
      </div>
    </div>
  );
}
