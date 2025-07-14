import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger, apiLogger, createRequestLogger } from '../utils/logger';
import { errorHandler } from '../middleware/error-handler';
import { predictionRoutes } from '../routes/prediction.routes';
import { analyticsRoutes } from '../routes/analytics.routes';
import { healthRoutes } from '../routes/health.routes';

export class ExpressServer
{
    private app: express.Application;
    private server: any;

    constructor ()
    {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void
    {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false, // Disable for API
            crossOriginEmbedderPolicy: false,
        }));

        // CORS configuration
        this.app.use(cors({
            origin: config.app.isDevelopment ? true : /\.yourdomain\.com$/,
            credentials: true,
            methods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ],
            allowedHeaders: [ 'Content-Type', 'Authorization', config.security.apiKeyHeader ],
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.maxRequests,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use(createRequestLogger(apiLogger));

        // Health check middleware (before rate limiting)
        this.app.use('/health', (req: Request, res: Response, next: NextFunction) =>
        {
            // Skip rate limiting for health checks
            next();
        });
    }

    /**
     * Setup API routes
     */
    private setupRoutes(): void
    {
        // Health check routes
        this.app.use('/health', healthRoutes);

        // API routes
        this.app.use('/api/predict', predictionRoutes);
        this.app.use('/api/analytics', analyticsRoutes);

        // Root endpoint
        this.app.get('/', (req: Request, res: Response) =>
        {
            res.json({
                name: 'Deriv Prediction Bot API',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    prediction: '/api/predict',
                    analytics: '/api/analytics',
                    docs: '/api/docs',
                },
            });
        });

        // API documentation endpoint
        this.app.get('/api/docs', (req: Request, res: Response) =>
        {
            res.json({
                title: 'Deriv Prediction Bot API Documentation',
                version: '1.0.0',
                endpoints: {
                    'POST /api/predict': {
                        description: 'Generate prediction for a symbol',
                        body: {
                            symbol: 'SyntheticSymbol (required)',
                            timeframe: 'Timeframe (required)',
                            includeAnalysis: 'boolean (optional)',
                        },
                        response: 'PredictionResponse',
                    },
                    'GET /api/predict/history': {
                        description: 'Get prediction history',
                        query: {
                            symbol: 'string (optional)',
                            timeframe: 'string (optional)',
                            limit: 'number (optional)',
                        },
                    },
                    'GET /api/analytics/accuracy': {
                        description: 'Get accuracy statistics',
                        query: {
                            symbol: 'string (optional)',
                            timeframe: 'string (optional)',
                            period: 'string (optional)',
                        },
                    },
                    'POST /api/analytics/backtest': {
                        description: 'Run backtest analysis',
                        body: 'BacktestConfig',
                    },
                    'GET /api/predict/supported-symbols': {
                        description: 'Get list of supported symbols',
                    },
                    'GET /health': {
                        description: 'Health check endpoint',
                    },
                    'GET /health/ready': {
                        description: 'Readiness probe',
                    },
                    'GET /health/live': {
                        description: 'Liveness probe',
                    },
                },
                websocket: {
                    'WS /ws/live-predictions': {
                        description: 'Real-time predictions WebSocket',
                        messages: {
                            subscribe: {
                                type: 'subscribe',
                                symbol: 'string',
                                timeframe: 'string',
                            },
                            unsubscribe: {
                                type: 'unsubscribe',
                                symbol: 'string',
                            },
                            prediction: {
                                type: 'prediction',
                                data: 'PredictionResponse',
                            },
                        },
                    },
                },
            });
        });

        // 404 handler
        this.app.use('*', (req: Request, res: Response) =>
        {
            res.status(404).json({
                error: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString(),
            });
        });
    }

    /**
     * Setup error handling
     */
    private setupErrorHandling(): void
    {
        this.app.use(errorHandler);
    }

    /**
     * Start the server
     */
    async start(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            try {
                this.server = this.app.listen(config.app.port, config.app.host, () =>
                {
                    logger.info(`Server started on ${config.app.host}:${config.app.port}`);
                    logger.info(`Environment: ${config.app.env}`);
                    logger.info(`API Documentation: http://${config.app.host}:${config.app.port}/api/docs`);
                    resolve();
                });

                this.server.on('error', (error: Error) =>
                {
                    logger.error('Server error:', error);
                    reject(error);
                });

                // Graceful shutdown handlers
                process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
                process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

            } catch (error) {
                logger.error('Failed to start server:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop the server
     */
    async stop(): Promise<void>
    {
        return new Promise((resolve) =>
        {
            if (this.server) {
                this.server.close(() =>
                {
                    logger.info('Server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Graceful shutdown
     */
    private gracefulShutdown(signal: string): void
    {
        logger.info(`Received ${signal}, starting graceful shutdown...`);

        this.stop().then(() =>
        {
            logger.info('Graceful shutdown completed');
            process.exit(0);
        }).catch((error) =>
        {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        });
    }

    /**
     * Get Express app instance
     */
    getApp(): express.Application
    {
        return this.app;
    }
}
