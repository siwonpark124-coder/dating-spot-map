import Link from "next/link";
import SubmitPlaceForm from "@/components/SubmitPlaceForm";

export const metadata = {
  title: "장소 신청 · 오로지",
};

export default function SubmitPlacePage() {
  return (
    <main className="min-h-screen bg-[#f6f1e7]">
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-5">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        <div className="flex flex-col gap-3">
          <h1 className="text-lg font-bold text-stone-900">장소 신청하기</h1>
          <p className="text-sm text-stone-500">
            소개팅에 좋았던 곳인데 지도에 없나요? 알려주시면 확인하고 올릴게요.
            서울 안의 식당·카페·바를 받고 있어요.
          </p>
          <p className="text-xs text-stone-400">
            지금 지도에 있는 동네는 연남·종로·을지로·용산·성수·강남이에요. 그 밖의 서울 지역도
            신청해두시면 동네를 넓힐 때 함께 올릴게요.
          </p>
        </div>

        <SubmitPlaceForm />
      </div>
    </main>
  );
}
