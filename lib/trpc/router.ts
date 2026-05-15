import { router } from "./trpc"
import { watchlistRouter } from "./routers/watchlist"
import { alertRouter } from "./routers/alert"
import { userRouter } from "./routers/user"
import { aiUsageRouter } from "./routers/ai-usage"

export const appRouter = router({
  watchlist: watchlistRouter,
  alert: alertRouter,
  user: userRouter,
  aiUsage: aiUsageRouter,
})

export type AppRouter = typeof appRouter
