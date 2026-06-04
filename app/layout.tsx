import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { TRPCProvider } from "@/components/providers/TRPCProvider"
import { LanguageProvider } from "@/components/providers/LanguageProvider"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/react"

export const metadata: Metadata = {
  title: "VN Stock Tracker",
  description: "Phân tích kỹ thuật chứng khoán Việt Nam",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <TRPCProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </TRPCProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
