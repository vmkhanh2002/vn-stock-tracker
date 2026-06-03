import { z } from "zod"
import { protectedProcedure, adminProcedure, router } from "../trpc"

export const userRouter = router({
  updateSettings: protectedProcedure
    .input(
      z.object({
        openrouterApiKey: z.string().min(10).optional(),
        vnstockApiKey: z.string().min(10).optional(),
        openrouterModel: z.string().optional(),
        aiSystemPrompt: z.string().optional(),
        defaultSource: z.enum(["VCI", "KBS"]).optional(),
        defaultInterval: z.enum(["1D", "1W", "1M"]).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      })
    ),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const u = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        openrouterModel: true,
        defaultSource: true,
        defaultInterval: true,
        openrouterApiKey: true,
        vnstockApiKey: true,
        aiSystemPrompt: true,
      },
    })
    return {
      openrouterModel: u?.openrouterModel ?? "openrouter/owl-alpha",
      defaultSource: u?.defaultSource ?? "VCI",
      defaultInterval: u?.defaultInterval ?? "1D",
      hasOpenRouterKey: !!u?.openrouterApiKey,
      hasVnstockKey: !!u?.vnstockApiKey,
      vnstockApiKey: u?.vnstockApiKey ?? null,
      aiSystemPrompt: u?.aiSystemPrompt ?? null,
    }
  }),

  adminListUsers: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            _count: { select: { aiUsageLogs: true, watchlists: true } },
          },
        }),
        ctx.prisma.user.count(),
      ])
      return { users, total, page: input.page, limit: input.limit }
    }),

  adminSetRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["USER", "ADMIN"]) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.user.update({ where: { id: input.userId }, data: { role: input.role } })
    ),
})
