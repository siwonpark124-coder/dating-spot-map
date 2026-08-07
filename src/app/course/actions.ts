"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MAX_STOPS } from "@/lib/course";

/** URL에 그대로 노출되는 슬러그. 헷갈리는 글자(0/O, 1/l)는 뺐다. */
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SLUG_LENGTH = 8;

function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

interface StopInput {
  placeId: string | null;
  label: string;
  lat: number;
  lng: number;
}

export async function saveCourse(
  stops: StopInput[],
  title: string,
): Promise<{ id: string } | { error: string }> {
  if (stops.length < 2) return { error: "두 곳 이상 담아야 코스가 돼요." };
  if (stops.length > MAX_STOPS) return { error: "코스는 최대 4곳까지예요." };

  const clean = stops.map((stop) => ({
    placeId: stop.placeId,
    label: String(stop.label ?? "").trim().slice(0, 120),
    lat: Number(stop.lat),
    lng: Number(stop.lng),
  }));

  if (clean.some((s) => !s.label || !Number.isFinite(s.lat) || !Number.isFinite(s.lng))) {
    return { error: "코스 정보가 올바르지 않아요." };
  }

  const id = generateSlug();

  const { error: courseError } = await supabaseAdmin
    .from("courses")
    .insert({ id, title: title.trim().slice(0, 40) || null });

  if (courseError) {
    console.error("saveCourse failed:", courseError.message);
    return { error: "저장에 실패했어요." };
  }

  const { error: stopsError } = await supabaseAdmin.from("course_stops").insert(
    clean.map((stop, i) => ({
      course_id: id,
      position: i + 1,
      place_id: stop.placeId,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.label,
    })),
  );

  if (stopsError) {
    console.error("saveCourse stops failed:", stopsError.message);
    // 정거장이 없는 빈 코스가 남지 않도록 되돌린다
    await supabaseAdmin.from("courses").delete().eq("id", id);
    return { error: "저장에 실패했어요." };
  }

  return { id };
}
