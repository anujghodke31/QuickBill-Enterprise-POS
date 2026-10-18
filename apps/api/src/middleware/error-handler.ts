import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@quickbill/shared';
import { AppError } from '../lib/errors';
import { Prisma } from '../lib/prisma';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`));
};

function toErrorBody(err: unknown): { status: number; body: ApiErrorBody['error'] } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message, details: err.details },
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message ?? 'Some fields need attention',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return {
        status: 409,
        body: { code: 'CONFLICT', message: 'A record with these details already exists' },
      };
    }
    if (err.code === 'P2025') {
      return { status: 404, body: { code: 'NOT_FOUND', message: 'Record not found' } };
    }
    if (err.code === 'P2003') {
      return {
        status: 409,
        body: { code: 'CONFLICT', message: 'This record is referenced by other records' },
      };
    }
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large (max 10 MB)' : err.message;
    return { status: 400, body: { code: 'UPLOAD_ERROR', message } };
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed') {
    return { status: 400, body: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } };
  }
  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' },
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const { status, body } = toErrorBody(err);
  if (status >= 500) {
    req.log?.error({ err }, 'Unhandled error');
  } else {
    req.log?.debug({ code: body.code, status }, body.message);
  }
  if (res.headersSent) return;
  res.status(status).json({ error: { ...body, requestId: String(req.id ?? '') } });
};
