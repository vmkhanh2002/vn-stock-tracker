import { z } from "zod"
import { adminProcedure, protectedProcedure, router } from "../trpc"

export const aiUsageRouter = router({
  myLogs: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(({ ctx, input }) =>
      ctx.prisma.aIUsageLog.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      })
    ),

  adminLogs: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const [logs, total] = await Promise.all([
        ctx.prisma.aIUsageLog.findMany({
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true, name: true } } },
        }),
        ctx.prisma.aIUsageLog.count(),
      ])
      return { logs, total, page: input.page, limit: input.limit }
    }),

  adminStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const [totalToday, totalUsers, distribution] = await Promise.all([
      ctx.prisma.aIUsageLog.count({ where: { createdAt: { gte: todayStart } } }),
      ctx.prisma.user.count(),
      ctx.prisma.aIUsageLog.groupBy({
        by: ["recommendation"],
        _count: { recommendation: true },
      }),
    ])
    return { totalToday, totalUsers, distribution }
  }),
})
