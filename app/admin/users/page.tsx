"use client"
import { useState } from "react"
import { Loader2, ChevronLeft, ChevronRight, ShieldCheck, User } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = trpc.user.adminListUsers.useQuery({ page, limit })
  const utils = trpc.useUtils()

  const setRole = trpc.user.adminSetRole.useMutation({
    onSuccess: () => utils.user.adminListUsers.invalidate(),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
  }

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-900">Users ({total})</h1>
      <Card>
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                {["Email", "Name", "Role", "Watchlist", "AI Calls", "Created At", "Action"].map((h) => (
                  <th key={h} className="py-2 px-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 px-3 text-xs font-mono">{user.email}</td>
                  <td className="py-2 px-3 text-xs">{user.name ?? "—"}</td>
                  <td className="py-2 px-3">
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-xs">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-xs text-center">{user._count.watchlists}</td>
                  <td className="py-2 px-3 text-xs text-center">{user._count.aiUsageLogs}</td>
                  <td className="py-2 px-3 text-xs text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString("en-US")}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() =>
                        setRole.mutate({
                          userId: user.id,
                          role: user.role === "ADMIN" ? "USER" : "ADMIN",
                        })
                      }
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      disabled={setRole.isPending}
                    >
                      {user.role === "ADMIN" ? (
                        <><User className="h-3.5 w-3.5" /> → USER</>
                      ) : (
                        <><ShieldCheck className="h-3.5 w-3.5" /> → ADMIN</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-500">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
