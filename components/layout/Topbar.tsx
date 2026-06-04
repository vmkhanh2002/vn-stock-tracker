"use client"
import { signOut, useSession } from "next-auth/react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { LogOut, User, ShieldCheck, Languages } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/LanguageProvider"

export function Topbar() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const { language, setLanguage, t } = useLanguage()

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div />
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title={language === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="uppercase">{language}</span>
        </button>

        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("topbar.admin")}
          </Link>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "?"}
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs">{session?.user?.name ?? session?.user?.email}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[160px] rounded-lg border border-slate-200 bg-white p-1 shadow-md text-sm"
              align="end"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href="/dashboard/settings"
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-50 outline-none"
                >
                  <User className="h-4 w-4" />
                  {t("topbar.settings")}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-red-600 hover:bg-red-50 outline-none"
                onSelect={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                {t("topbar.logout")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
