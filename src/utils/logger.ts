import pino from 'pino';
import { config } from '@/config';

// Create logger instance
export const logger = pino({
    level: config.logging.level,
    transport: config.app.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label: string) => ({ level: label }),
    },
});

// Create specialized loggers for different components
export const derivLogger = logger.child({ component: 'deriv-api' });
export const predictionLogger = logger.child({ component: 'prediction-engine' });
export const geminiLogger = logger.child({ component: 'gemini-ai' });
export const websocketLogger = logger.child({ component: 'websocket' });
export const apiLogger = logger.child({ component: 'api' });
export const backtestLogger = logger.child({ component: 'backtest' });

// Performance timing utility
export class PerformanceTimer
{
    private startTime: number;
    private logger: pino.Logger;
    private operation: string;

    constructor (logger: pino.Logger, operation: string)
    {
        this.logger = logger;
        this.operation = operation;
        this.startTime = Date.now();
    }

    end(additionalData?: Record<string, unknown>): number
    {
        const duration = Date.now() - this.startTime;
        this.logger.info(
            {
                operation: this.operation,
                duration_ms: duration,
                ...additionalData,
            },
            `${this.operation} completed in ${duration}ms`
        );
        return duration;
    }
}

// Error logging utility
export const logError = (
    logger: pino.Logger,
    error: Error | unknown,
    context: string,
    additionalData?: Record<string, unknown>
): void =>
{
    const errorData = {
        context,
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
        ...additionalData,
    };

    logger.error(errorData, `Error in ${context}`);
};

// Request/Response logging middleware helper
export const createRequestLogger = (logger: pino.Logger) =>
{
    return (req: any, res: any, next: any) =>
    {
        const start = Date.now();

        res.on('finish', () =>
        {
            const duration = Date.now() - start;
            logger.info({
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration_ms: duration,
                user_agent: req.get('User-Agent'),
                ip: req.ip,
            }, `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
        });

        next();
    };
};
