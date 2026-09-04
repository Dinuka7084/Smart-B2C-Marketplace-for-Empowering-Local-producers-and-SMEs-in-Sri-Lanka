import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import { env, serviceReadiness } from './config/env.ts';
import { AppError } from './errors/app-error.ts';
import { adminRouter } from './routes/admin.routes.ts';
import { authRouter } from './routes/auth.routes.ts';
import { cartRouter } from './routes/cart.routes.ts';
import { customerCommerceRouter } from './routes/customer-commerce.routes.ts';
import { customerEngagementRouter } from './routes/customer-engagement.routes.ts';
import { catalogRouter } from './routes/catalog.routes.ts';
import { vendorCatalogRouter } from './routes/vendor-catalog.routes.ts';
import { vendorOrdersRouter } from './routes/vendor-orders.routes.ts';
import { vendorInsightsRouter } from './routes/vendor-insights.routes.ts';
import { applyApiSecurity } from './middleware/security.ts';

import path from 'node:path';

export const app = express();

const uploadsDir = path.resolve(process.cwd(), 'uploads');

app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(applyApiSecurity);
app.use(
  '/uploads',
  cors({ origin: env.FRONTEND_URL }),
  (_request, response, next) => {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsDir),
);
app.use(
  '/api',
  cors({
    origin: env.FRONTEND_URL,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'Smart Lanka API',
    environment: env.NODE_ENV,
    integrations: serviceReadiness,
  });
});

app.get('/api/v1', (_request, response) => {
  response.json({
    name: 'Smart Lanka API',
    version: 'v1',
    framework: 'Express.js',
    message: 'The API foundation is ready for the Neon-backed marketplace modules.',
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1/vendor', vendorCatalogRouter);
app.use('/api/v1/vendor', vendorOrdersRouter);
app.use('/api/v1/vendor', vendorInsightsRouter);
app.use('/api/v1', customerCommerceRouter);
app.use('/api/v1', customerEngagementRouter);

app.use((request, response) => {
  response.status(404).json({
    error: 'Not found',
    path: request.path,
    requestId: response.locals.requestId,
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const requestId = response.locals.requestId as string | undefined;
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(requestId ? { requestId } : {}),
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'Request body contains invalid JSON.',
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      ...(requestId ? { requestId } : {}),
    },
  });
};

app.use(errorHandler);
