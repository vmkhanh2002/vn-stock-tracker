"use client"
import { useState } from "react"
import { Plus, Trash2, Bell, BellOff, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatVND } from "@/lib/utils"

export default function WatchlistPage() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="watchlist">
        <TabsList>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="watchlist">
          <WatchlistTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WatchlistTab() {
  const [sym,  setSym]  = useState("")
  const [note, setNote] = useState("")

  const { data: items = [], isLoading } = trpc.watchlist.list.useQuery()
  const utils = trpc.useUtils()

  const add = trpc.watchlist.add.useMutation({
    onSuccess: () => { utils.watchlist.list.invalidate(); setSym(""); setNote("") },
  })
  const remove = trpc.watchlist.remove.useMutation({
    onSuccess: () => utils.watchlist.list.invalidate(),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const clean = sym.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (clean.length >= 2) add.mutate({ symbol: clean, note: note || undefined })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <Input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Symbol (e.g., VNM)" className="w-32 uppercase" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 min-w-32" />
          <Button type="submit" size="sm" disabled={add.isPending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}

        {!isLoading && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No stocks added yet. Add your first symbol!</p>
        )}

        <div className="divide-y divide-slate-50">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div>
                <span className="font-semibold text-slate-900">{item.symbol}</span>
                {item.note && <span className="ml-2 text-xs text-slate-400">{item.note}</span>}
                <p className="text-xs text-slate-400 mt-0.5">
                  Added {new Date(item.addedAt).toLocaleDateString("en-US")}
                </p>
              </div>
              <button
                onClick={() => remove.mutate({ symbol: item.symbol })}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AlertsTab() {
  const [sym,       setSym]       = useState("")
  const [condition, setCondition] = useState<"above" | "below">("above")
  const [price,     setPrice]     = useState("")

  const { data: alerts = [], isLoading } = trpc.alert.list.useQuery()
  const utils = trpc.useUtils()

  const create = trpc.alert.create.useMutation({
    onSuccess: () => { utils.alert.list.invalidate(); setSym(""); setPrice("") },
  })
  const deactivate = trpc.alert.deactivate.useMutation({
    onSuccess: () => utils.alert.list.invalidate(),
  })
  const del = trpc.alert.delete.useMutation({
    onSuccess: () => utils.alert.list.invalidate(),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const clean = sym.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    const p     = parseFloat(price)
    if (clean.length >= 2 && !isNaN(p) && p > 0) {
      create.mutate({ symbol: clean, condition, price: p })
    }
  }

  const active   = alerts.filter((a) => a.active)
  const inactive = alerts.filter((a) => !a.active)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Price Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <Input value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Symbol" className="w-24 uppercase" />
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (VND)" type="number" className="w-32" />
          <Button type="submit" size="sm" disabled={create.isPending}>
            <Bell className="h-4 w-4" />
            Create Alert
          </Button>
        </form>

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}

        {active.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Active</h3>
            <div className="divide-y divide-slate-50">
              {active.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-slate-900">{alert.symbol}</span>
                    <Badge variant="secondary" className="text-xs">
                      {alert.condition === "above" ? "Above" : "Below"} {formatVND(alert.price)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => deactivate.mutate({ id: alert.id })} className="p-1 text-slate-400 hover:text-amber-500">
                      <BellOff className="h-4 w-4" />
                    </button>
                    <button onClick={() => del.mutate({ id: alert.id })} className="p-1 text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {inactive.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fired / Inactive</h3>
            <div className="divide-y divide-slate-50 opacity-60">
              {inactive.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <BellOff className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{alert.symbol}</span>
                    <Badge variant="outline" className="text-xs">
                      {alert.condition === "above" ? "Above" : "Below"} {formatVND(alert.price)}
                    </Badge>
                    {alert.firedAt && (
                      <span className="text-xs text-slate-400">
                        Fired: {new Date(alert.firedAt).toLocaleDateString("en-US")}
                      </span>
                    )}
                  </div>
                  <button onClick={() => del.mutate({ id: alert.id })} className="p-1 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && alerts.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No alerts set.</p>
        )}
      </CardContent>
    </Card>
  )
}
