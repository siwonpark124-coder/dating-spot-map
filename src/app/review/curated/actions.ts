"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { StopInput, insertCourse } from "@/lib/courseRecord";
import { isAuthenticated } from "@/app/review/actions";

const LIST_PATH = "/review/curated";

/** 버튼에 그대로 들어가는 값이라 길면 목록이 무너진다. */
const TITLE_MAX = 40;
const SUBTITLE_MAX = 60;

/**
 * 새 추천 코스를 등록한다.
 * 서버 액션은 UI를 거치지 않고 직접 호출될 수 있으므로 여기서 로그인을 다시 확인한다.
 * (호출하는 화면이 관리자 전용이라는 것만으로는 보증이 되지 않는다.)
 */
export async function registerCuratedCourse(
  stops: StopInput[],
  title: string,
  subtitle: string,
): Promise<{ id: string } | { error: string }> {
  if (!(await isAuthenticated())) return { error: "권한이 없어요." };

  const cleanTitle = title.trim().slice(0, TITLE_MAX);
  if (!cleanTitle) return { error: "코스 이름을 입력해주세요." };

  // 새 코스는 목록 맨 아래에 붙인다.
  const { data: last } = await supabaseAdmin
    .from("courses")
    .select("sort_order")
    .eq("is_curated", true)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = await insertCourse(
    {
      title: cleanTitle,
      subtitle: subtitle.trim().slice(0, SUBTITLE_MAX) || null,
      isCurated: true,
      sortOrder: (last?.sort_order ?? -1) + 1,
    },
    stops,
  );

  if (!("error" in result)) revalidatePath(LIST_PATH);
  return result;
}

// 아래 액션들은 코스 id 같은 값을 formData가 아니라 bind로 받는다.
// 제출 버튼에 name/value를 달면 React가 액션 id를 싣는 name 자리와 부딪혀
// 그 값이 서버까지 오지 않는다. bind한 인자는 Next가 서명해서 넘기므로 위변조도 안 된다.

/** 이름과 한 줄 설명만 고친다. 정거장 구성을 바꾸려면 새 코스를 짜서 교체한다. */
export async function updateCuratedCourse(id: string, formData: FormData) {
  if (!(await isAuthenticated())) return;

  const title = String(formData.get("title") ?? "").trim().slice(0, TITLE_MAX);
  const subtitle = String(formData.get("subtitle") ?? "").trim().slice(0, SUBTITLE_MAX);

  if (!id || !title) return;

  const { error } = await supabaseAdmin
    .from("courses")
    .update({ title, subtitle: subtitle || null })
    .eq("id", id)
    .eq("is_curated", true);

  if (error) console.error("updateCuratedCourse failed:", error.message);
  revalidatePath(LIST_PATH);
}

/** 목록에서만 내린다. 이미 공유된 /course/{id} 링크는 계속 열린다. */
export async function toggleCuratedHidden(id: string, hidden: boolean) {
  if (!(await isAuthenticated())) return;
  if (!id) return;

  const { error } = await supabaseAdmin
    .from("courses")
    .update({ hidden })
    .eq("id", id)
    .eq("is_curated", true);

  if (error) console.error("toggleCuratedHidden failed:", error.message);
  revalidatePath(LIST_PATH);
}

/**
 * 위아래 한 칸 이동.
 * 이웃과 값을 맞바꾸는 대신 순서대로 0,1,2…를 다시 매긴다.
 * 그래야 sort_order가 겹치거나 0으로 몰려 있어도 한 번 누르면 정리된다.
 */
export async function moveCuratedCourse(id: string, towards: "up" | "down") {
  if (!(await isAuthenticated())) return;

  const direction = towards === "up" ? -1 : 1;
  if (!id) return;

  const { data } = await supabaseAdmin
    .from("courses")
    .select("id, sort_order")
    .eq("is_curated", true)
    .order("sort_order")
    .order("created_at");

  const rows = (data ?? []) as { id: string; sort_order: number }[];
  const index = rows.findIndex((row) => row.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return;

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await Promise.all(
    reordered
      .map((row, i) => ({ row, i }))
      .filter(({ row, i }) => row.sort_order !== i)
      .map(({ row, i }) =>
        supabaseAdmin.from("courses").update({ sort_order: i }).eq("id", row.id),
      ),
  );

  revalidatePath(LIST_PATH);
}

/** 코스 자체를 지운다 (정거장은 연쇄 삭제). 링크를 살려두려면 '숨김'을 쓴다. */
export async function deleteCuratedCourse(id: string) {
  if (!(await isAuthenticated())) return;
  if (!id) return;

  const { error } = await supabaseAdmin
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("is_curated", true);

  if (error) console.error("deleteCuratedCourse failed:", error.message);
  revalidatePath(LIST_PATH);
}
