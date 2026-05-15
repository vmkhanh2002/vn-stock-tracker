import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText } from "ai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { context, question, horizon, risk, symbol, mode } = await req.json()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { geminiApiKey: true, geminiModel: true },
  })

  if (!user?.geminiApiKey) {
    return Response.json(
      { error: "Chưa có Gemini API Key. Vào Settings → thêm API Key của bạn." },
      { status: 403 }
    )
  }

  const google = createGoogleGenerativeAI({ apiKey: user.geminiApiKey })
  const model  = user.geminiModel ?? "gemini-2.5-flash-lite"

  const systemPrompt = `Bạn là chuyên gia phân tích kỹ thuật chứng khoán Việt Nam.
Phong cách: chuyên nghiệp, súc tích, dựa hoàn toàn vào dữ liệu được cung cấp.
Không đưa ra lời khuyên tài chính tuyệt đối. Luôn nhắc đây là tham khảo kỹ thuật.
Định dạng: Markdown có cấu trúc rõ ràng. Bắt đầu bằng một trong: MUA / BÁN / GIỮ.
Khung đầu tư: ${horizon ?? "ngắn hạn"}. Khẩu vị rủi ro: ${risk ?? "trung bình"}.`

  const userPrompt = `${context}\n\n---\nCâu hỏi: ${question ?? `Phân tích kỹ thuật ${symbol} và cho khuyến nghị.`}`

  const start = Date.now()
  try {
    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1500,
      temperature: 0.3,
    })

    const answer  = result.text
    const latencyMs = Date.now() - start
    const rec = /^(MUA|BÁN|BAN|GIỮ|GIU)/i.exec(answer.trim())?.[1]?.toUpperCase()
    const recNorm = rec?.replace("BÁN", "BAN").replace("GIỮ", "GIU") ?? "GIU"

    prisma.aIUsageLog.create({
      data: {
        userId: session.user.id,
        symbol,
        mode: mode ?? "single",
        model,
        promptTokens:  result.usage?.promptTokens ?? 0,
        outputTokens:  result.usage?.completionTokens ?? 0,
        latencyMs,
        recommendation: recNorm,
      },
    }).catch(() => {})

    return Response.json({ answer, recommendation: recNorm })
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Lỗi Gemini API" }, { status: 502 })
  }
}
