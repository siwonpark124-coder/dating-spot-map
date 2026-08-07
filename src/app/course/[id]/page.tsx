import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CourseStop } from "@/lib/course";
import CourseView from "@/components/CourseView";

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

  return (
    <main className="min-h-screen bg-[#f6f1e7]">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        <h1 className="text-xl font-bold text-stone-900">{course.title || "데이트 코스"}</h1>

        <CourseView stops={stops} />
      </div>
    </main>
  );
}
