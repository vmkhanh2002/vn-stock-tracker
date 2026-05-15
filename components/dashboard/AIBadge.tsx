import type { Recommendation } from "@/types"

const styles: Record<Recommendation, string> = {
  MUA: "from-green-700 to-green-500",
  BAN: "from-red-700 to-red-500",
  GIU: "from-amber-600 to-amber-400",
}

const labels: Record<Recommendation, string> = {
  MUA: "MUA",
  BAN: "BÁN",
  GIU: "GIỮ",
}

export function AIBadge({ rec }: { rec: Recommendation }) {
  return (
    <div
      className={`bg-gradient-to-br ${styles[rec]} text-white rounded-2xl px-8 py-4 text-3xl font-black text-center shadow-lg tracking-wider`}
    >
      {labels[rec]}
    </div>
  )
}
