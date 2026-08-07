"use server";

import { StopInput, insertCourse } from "@/lib/courseRecord";

export async function saveCourse(
  stops: StopInput[],
  title: string,
): Promise<{ id: string } | { error: string }> {
  return insertCourse({ title: title.trim().slice(0, 40) || null }, stops);
}
