import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CourseStop, courseLegs, formatDistance, totalWalkMinutes } from "@/lib/course";
import CourseMap from "@/components/CourseMap";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const { data: rows } = await supabase
    .from("course_stops")
    .select("position, place_id, lat, lng, label")
    .eq("course_id", id)
    .order("position");

  const stops: CourseStop[] = (rows ?? []).map((row) => ({
    placeId: row.place_id,
    label: row.label,
    lat: row.lat,
    lng: row.lng,
  }));

  if (stops.length === 0) notFound();

  const legs = courseLegs(stops);

  return (
    <main className="min-h-screen bg-[#f6f1e7]">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-stone-900">{course.title || "데이트 코스"}</h1>
          <p className="text-sm text-stone-500">
            {stops.length}곳 · 걸어서 총 {totalWalkMinutes(stops)}분
          </p>
        </div>

        <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
          <CourseMap stops={stops} />
        </div>

        <ol className="flex flex-col gap-2">
          {stops.map((stop, i) => (
            <li key={`${stop.lat}-${stop.lng}-${i}`} className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{stop.label}</span>
                {stop.placeId && (
                  <Link
                    href={`/place/${stop.placeId}`}
                    className="shrink-0 text-xs text-amber-700 underline"
                  >
                    자세히
                  </Link>
                )}
              </div>

              {legs[i] && (
                <div className="flex items-center gap-2 pl-10 text-xs text-stone-500">
                  <span>
                    도보 {legs[i].walkMinutes}분 · {formatDistance(legs[i].meters)}
                  </span>
                  {legs[i].isFar && <span className="text-amber-700">걷기엔 좀 멀어요</span>}
                  <a
                    href={legs[i].directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-stone-700"
                  >
                    길찾기
                  </a>
                </div>
              )}
            </li>
          ))}
        </ol>

        <p className="text-xs text-stone-400">
          도보 시간은 직선거리 기준 추정치예요. 지하철·버스·자차는 각 구간의 길찾기에서 확인할 수 있어요.
        </p>
      </div>
    </main>
  );
}
