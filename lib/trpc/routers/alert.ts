import { z } from "zod"
import { protectedProcedure, router } from "../trpc"

export const alertRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.alert.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    })
  ),

  create: protectedProcedure
    .input(
      z.object({
        symbol: z.string().regex(/^[A-Z0-9]{2,10}$/),
        condition: z.enum(["above", "below"]),
        price: z.number().positive(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.alert.create({
        data: { userId: ctx.session.user.id, ...input },
      })
    ),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.alert.update({
        where: { id: input.id },
        data: { active: false, firedAt: new Date() },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.alert.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),
})
