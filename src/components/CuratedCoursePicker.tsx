"use client";

import { useEffect, useRef, useState } from "react";
import { CuratedCourse } from "@/lib/curatedCourses";
import { totalWalkMinutes } from "@/lib/course";

interface CuratedCoursePickerProps {
  courses: CuratedCourse[];
  onPick: (course: CuratedCourse) => void;
}

/** 코스 목록 자체. 데스크탑 팝오버와 모바일 창이 같은 걸 쓴다. */
export function CuratedCourseList({ courses, onPick }: CuratedCoursePickerProps) {
  return (
    <>
      {courses.map((course) => (
        <button
          key={course.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(course)}
          className="flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-amber-50"
        >
          <span className="text-sm font-medium text-stone-900">{course.title}</span>
          {course.subtitle && <span className="text-xs text-stone-500">{course.subtitle}</span>}
          <span className="text-xs text-stone-400">
            {course.stops.length}곳 · 걸어서 {totalWalkMinutes(course.stops)}분
          </span>
        </button>
      ))}
    </>
  );
}

/**
 * 운영자가 미리 짜둔 코스를 고르는 버튼.
 * 옆의 '첫 만남'은 목록을 좁히는 필터지만 이건 화면을 여는 동작이라,
 * 같은 pill 모양을 쓰지 않고 눌러서 펼치는 버튼으로 구분한다.
 */
export default function CuratedCoursePicker({ courses, onPick }: CuratedCoursePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 목록 밖을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // 등록된 코스가 없으면 버튼 자체를 내보내지 않는다.
  if (courses.length === 0) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        title="미리 짜둔 코스를 지도에 바로 띄웁니다"
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm transition-colors ${
          open ? "bg-amber-900 text-white" : "bg-amber-800 text-white hover:bg-amber-900"
        }`}
      >
        <span aria-hidden>✦</span>
        추천 코스
        <span aria-hidden className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 flex max-h-[60vh] w-72 flex-col overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"
        >
          <p className="px-2.5 py-1.5 text-xs text-stone-500">
            고르면 지도에 코스가 그려져요. 담은 뒤 바꿔도 돼요.
          </p>
          <CuratedCourseList
            courses={courses}
            onPick={(course) => {
              onPick(course);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
