import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error
{
    statusCode?: number;
    code?: string;
    details?: any;
}

export const errorHandler = (
    err: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
): void =>
{
    logger.error('API Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers,
    });

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    const errorResponse = {
        error: message,
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        ...(err.details && { details: err.details }),
    };

    res.status(statusCode).json(errorResponse);
};

export const createApiError = (
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
): ApiError =>
{
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
};
