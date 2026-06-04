import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readFile } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { context, question, horizon, risk, symbol, mode, lang } = await req.json()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { openrouterApiKey: true, openrouterModel: true, aiSystemPrompt: true },
  })

  if (!user?.openrouterApiKey) {
    return Response.json(
      { error: "Chưa có OpenRouter API Key. Vào Settings → thêm API Key của bạn." },
      { status: 403 }
    )
  }

  // Load system prompt: user custom > default file
  let rawPrompt: string
  if (user.aiSystemPrompt?.trim()) {
    rawPrompt = user.aiSystemPrompt.trim()
  } else {
    const isVi = lang === "vi"
    const filename = isVi ? "default-system-prompt.vi.txt" : "default-system-prompt.txt"
    const defaultPromptPath = path.join(process.cwd(), "lib", filename)
    rawPrompt = await readFile(defaultPromptPath, "utf-8")
  }

  // Inject dynamic variables into prompt
  const isVietnamese = lang === "vi"
  const systemPrompt = rawPrompt
    .replace(/\{horizon\}/g, horizon ?? (isVietnamese ? "ngắn hạn" : "short-term"))
    .replace(/\{risk\}/g, risk ?? (isVietnamese ? "trung bình" : "medium"))

  const userPrompt = `${context}\n\n---\nCâu hỏi: ${question ?? `Phân tích kỹ thuật ${symbol} và cho khuyến nghị.`}`

  const start = Date.now()
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vn-stock-tracker-swart.vercel.app",
        "X-Title": "VN Stock Tracker"
      },
      body: JSON.stringify({
        model: user.openrouterModel || "openrouter/owl-alpha",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      let parsedErr = errText
      try {
        const errJson = JSON.parse(errText)
        parsedErr = errJson.error?.message || errText
      } catch {}
      return Response.json({ error: `Lỗi OpenRouter: ${parsedErr}` }, { status: response.status })
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content
    if (!answer) {
      return Response.json({ error: "Không nhận được phản hồi từ OpenRouter" }, { status: 502 })
    }

    const latencyMs = Date.now() - start
    const rec = /^(MUA|BÁN|BAN|GIỮ|GIU)/i.exec(answer.trim())?.[1]?.toUpperCase()
    const recNorm = rec?.replace("BÁN", "BAN").replace("GIỮ", "GIU") ?? "GIU"

    const promptTokens = data.usage?.prompt_tokens ?? 0
    const outputTokens = data.usage?.completion_tokens ?? 0

    prisma.aIUsageLog.create({
      data: {
        userId: session.user.id,
        symbol,
        mode: mode ?? "single",
        model: user.openrouterModel || "openrouter/owl-alpha",
        promptTokens,
        outputTokens,
        latencyMs,
        recommendation: recNorm,
      },
    }).catch(() => {})

    return Response.json({ answer, recommendation: recNorm })
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Lỗi gọi API OpenRouter" }, { status: 502 })
  }
}
