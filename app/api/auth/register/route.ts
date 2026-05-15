import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const { name, email, password } = await req.json()
  if (!email || !password) {
    return Response.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: "Mật khẩu phải ít nhất 8 ký tự" }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: "Email đã được sử dụng" }, { status: 409 })
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const role = email === process.env.ADMIN_EMAIL ? "ADMIN" : "USER"
  await prisma.user.create({ data: { name, email, passwordHash, role } })
  return Response.json({ ok: true }, { status: 201 })
}
