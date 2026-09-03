import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import { env, serviceReadiness } from './config/env.ts';
import { AppError } from './errors/app-error.ts';
import { adminRouter } from './routes/admin.routes.ts';
import { authRouter } from './routes/auth.routes.ts';
import { cartRouter } from './routes/cart.routes.ts';
import { catalogRouter } from './routes/catalog.routes.ts';
import { vendorCatalogRouter } from './routes/vendor-catalog.routes.ts';

export const app = express();

app.disable('x-powered-by');
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

app.use((request, response) => {
  response.status(404).json({
    error: 'Not found',
    path: request.path,
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
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
      },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
};

app.use(errorHandler);
