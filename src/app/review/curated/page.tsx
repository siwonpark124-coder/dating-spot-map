import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import { fetchCuratedCoursesForAdmin } from "@/lib/curatedCourses";
import { totalWalkMinutes } from "@/lib/course";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import {
  deleteCuratedCourse,
  moveCuratedCourse,
  toggleCuratedHidden,
  updateCuratedCourse,
} from "./actions";

export const dynamic = "force-dynamic";

const ICON_BUTTON =
  "rounded border border-stone-300 px-2 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30";

export default async function CuratedCoursesPage() {
  if (!(await isAuthenticated())) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f6f1e7]">
        <p className="text-stone-600">
          <Link href="/review" className="text-amber-700 underline">
            /review
          </Link>
          에서 먼저 로그인해주세요.
        </p>
      </main>
    );
  }

  const courses = await fetchCuratedCoursesForAdmin(supabaseAdmin);

  return (
    <main className="min-h-screen bg-[#f6f1e7] p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 장소 검수로
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">추천 코스</h1>
            <p className="text-xs text-stone-500">
              첫 화면의 &lsquo;추천 코스&rsquo; 버튼에 위에서부터 순서대로 뜹니다.
            </p>
          </div>
          <Link
            href="/review/curated/new"
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900"
          >
            새 추천 코스 짜기
          </Link>
        </div>

        {courses.length === 0 ? (
          <p className="text-sm text-stone-500">
            등록된 추천 코스가 없어요. 하나도 없으면 첫 화면의 버튼도 뜨지 않습니다.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {courses.map((course, index) => (
              <li
                key={course.id}
                className={`flex flex-col gap-2.5 rounded-xl border border-stone-200 p-3 ${
                  course.hidden ? "bg-stone-100" : "bg-white"
                }`}
              >
                {/*
                  조작마다 폼을 따로 둔다. 한 폼에 버튼별 formAction을 걸고 name/value로
                  값을 넘기면, React가 액션 id를 싣는 name 자리와 겹쳐 값이 서버까지 오지 않는다.
                  코스 id 같은 값은 bind로 넘긴다.
                */}
                <div className="flex items-start gap-2">
                  <form
                    action={updateCuratedCourse.bind(null, course.id)}
                    className="flex flex-1 items-start gap-2"
                  >
                    <div className="flex flex-1 flex-col gap-1.5">
                      <input
                        name="title"
                        defaultValue={course.title}
                        maxLength={40}
                        placeholder="코스 이름"
                        className="rounded border border-stone-300 px-2.5 py-1.5 text-sm font-medium text-stone-900 focus:border-stone-500 focus:outline-none"
                      />
                      <input
                        name="subtitle"
                        defaultValue={course.subtitle ?? ""}
                        maxLength={60}
                        placeholder="한 줄 설명 (선택)"
                        className="rounded border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 focus:border-stone-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="shrink-0 rounded bg-stone-800 px-2.5 py-1.5 text-xs text-white hover:bg-stone-900"
                    >
                      이름 저장
                    </button>
                  </form>

                  <div className="flex shrink-0 gap-1 text-xs">
                    <form action={moveCuratedCourse.bind(null, course.id, "up")}>
                      <button
                        type="submit"
                        disabled={index === 0}
                        aria-label="위로"
                        className={ICON_BUTTON}
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveCuratedCourse.bind(null, course.id, "down")}>
                      <button
                        type="submit"
                        disabled={index === courses.length - 1}
                        aria-label="아래로"
                        className={ICON_BUTTON}
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                </div>

                <p className="text-xs text-stone-500">
                  {course.stops.map((stop, i) => (
                    <span key={`${stop.lat}-${stop.lng}-${i}`}>
                      {i > 0 && " → "}
                      {stop.label}
                    </span>
                  ))}
                  {course.stops.length > 1 && (
                    <span className="text-stone-400">
                      {" "}
                      · 걸어서 {totalWalkMinutes(course.stops)}분
                    </span>
                  )}
                </p>

                {course.unpublishedLabels.length > 0 && (
                  <p className="rounded bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                    제외됐거나 아직 발행되지 않은 장소가 있어요 (
                    {course.unpublishedLabels.join(", ")}). 지도에는 그대로 뜨지만 &lsquo;자세히&rsquo;를
                    누르면 열리지 않습니다.
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs">
                  <Link
                    href={`/course/${course.id}`}
                    target="_blank"
                    className="text-amber-700 underline hover:text-amber-900"
                  >
                    코스 보기
                  </Link>
                  <form action={toggleCuratedHidden.bind(null, course.id, !course.hidden)}>
                    <button type="submit" className="text-stone-600 underline hover:text-stone-800">
                      {course.hidden ? "다시 보이기" : "목록에서 숨기기"}
                    </button>
                  </form>
                  {course.hidden && (
                    <span className="text-stone-500">숨김 — 첫 화면에 뜨지 않아요</span>
                  )}
                  <form action={deleteCuratedCourse.bind(null, course.id)} className="ml-auto">
                    <ConfirmSubmitButton
                      message="이 코스를 완전히 삭제할까요? 이 코스 링크를 받은 사람도 더 이상 볼 수 없어요. 목록에서만 내리려면 '숨기기'를 쓰세요."
                      className="text-red-600 underline hover:text-red-700"
                    >
                      삭제
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
