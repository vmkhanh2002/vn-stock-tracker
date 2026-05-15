import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { TRPCProvider } from "@/components/providers/TRPCProvider"

export const metadata: Metadata = {
  title: "VN Stock Tracker",
  description: "Phân tích kỹ thuật chứng khoán Việt Nam",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
