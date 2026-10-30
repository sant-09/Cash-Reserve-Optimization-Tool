import { Router } from 'express';
import { financeRouter } from './financeRoutes';
import { userRouter } from './userRoutes';
import { accountRouter } from './accountRoutes';
import { importRouter } from './importRoutes';
import { scenarioRouter } from './scenarioRoutes';
import { upcomingRouter } from './upcomingRoutes';
import { activityRouter } from './activityRoutes';
import { alertRouter } from './alertRoutes';
import { reportRouter } from './reportRoutes';

export const apiRouter = Router();

apiRouter.use(financeRouter);
apiRouter.use(userRouter);
apiRouter.use(accountRouter);
apiRouter.use(importRouter);
apiRouter.use(scenarioRouter);
apiRouter.use(upcomingRouter);
apiRouter.use(activityRouter);
apiRouter.use(alertRouter);
apiRouter.use(reportRouter);

export * from './financeRoutes';
export * from './userRoutes';
export * from './accountRoutes';
export * from './importRoutes';
export * from './scenarioRoutes';
export * from './upcomingRoutes';
export * from './activityRoutes';
export * from './alertRoutes';
export * from './reportRoutes';
