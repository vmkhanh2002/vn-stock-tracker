import { z } from "zod"
import { protectedProcedure, router } from "../trpc"

export const watchlistRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.watchlist.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { addedAt: "desc" },
    })
  ),

  add: protectedProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^[A-Z0-9]{2,10}$/),
        note: z.string().max(200).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.watchlist.upsert({
        where: { userId_symbol: { userId: ctx.session.user.id, symbol: input.symbol } },
        update: { note: input.note },
        create: { userId: ctx.session.user.id, symbol: input.symbol, note: input.note },
      })
    ),

  remove: protectedProcedure
    .input(z.object({ symbol: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.watchlist.deleteMany({
        where: { userId: ctx.session.user.id, symbol: input.symbol },
      })
    ),
})
