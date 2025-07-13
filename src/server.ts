import { config, SUPPORTED_SYMBOLS } from '@/config';
import { logger } from '@/utils/logger';
import { ExpressServer } from '@/services/express-server.service';
import { DerivWebSocketService } from '@/services/deriv-websocket.service';
import { FeatureEngineeringService } from '@/services/feature-engineering.service';
import { GeminiAIService } from '@/services/gemini-ai.service';

class PredictionBotApplication
{
    private expressServer: ExpressServer;
    private derivService: DerivWebSocketService;
    private featureService: FeatureEngineeringService;
    private geminiService: GeminiAIService;

    constructor ()
    {
        this.expressServer = new ExpressServer();
        this.derivService = new DerivWebSocketService();
        this.featureService = new FeatureEngineeringService();
        this.geminiService = new GeminiAIService();
    }

    /**
     * Initialize all services
     */
    async initialize(): Promise<void>
    {
        logger.info('Initializing Deriv Prediction Bot...');

        try {
            // Initialize feature service for all supported symbols
            logger.info('Initializing feature engineering service...');
            Object.keys(SUPPORTED_SYMBOLS).forEach(symbol =>
            {
                this.featureService.initializeSymbol(symbol as any);
            });

            // Connect to Deriv WebSocket API
            logger.info('Connecting to Deriv API...');
            await this.derivService.connect();

            // Setup event listeners for real-time data
            this.setupEventListeners();

            // Subscribe to initial symbols (Boom 1000 and Crash 1000 as mentioned)
            logger.info('Setting up initial subscriptions...');
            await this.derivService.subscribeToTicks('BOOM1000');
            await this.derivService.subscribeToCandles('BOOM1000', 60); // 1-minute candles
            await this.derivService.subscribeToTicks('CRASH1000');
            await this.derivService.subscribeToCandles('CRASH1000', 60);

            logger.info('All services initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize services:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for real-time data processing
     */
    private setupEventListeners(): void
    {
        // Handle incoming tick data
        this.derivService.on('tick', (tickData) =>
        {
            this.featureService.addTick(tickData);

            // Log tick data in development
            if (config.app.isDevelopment) {
                logger.debug('Received tick data', {
                    symbol: tickData.symbol,
                    tick: tickData.tick,
                    epoch: tickData.epoch,
                });
            }
        });

        // Handle incoming candle data
        this.derivService.on('candle', (candleData) =>
        {
            this.featureService.addCandle(candleData);

            // Log candle data in development
            if (config.app.isDevelopment) {
                logger.debug('Received candle data', {
                    symbol: candleData.symbol,
                    close: candleData.close,
                    epoch: candleData.epoch,
                });
            }
        });

        // Handle connection events
        this.derivService.on('connected', () =>
        {
            logger.info('Deriv WebSocket connected successfully');
        });

        this.derivService.on('disconnected', () =>
        {
            logger.warn('Deriv WebSocket disconnected');
        });

        this.derivService.on('error', (error) =>
        {
            logger.error('Deriv WebSocket error:', error);
        });
    }

    /**
     * Start the application
     */
    async start(): Promise<void>
    {
        try {
            // Initialize services first
            await this.initialize();

            // Start the Express server
            await this.expressServer.start();

            logger.info('🚀 Deriv Prediction Bot started successfully!');
            logger.info(`📊 API available at: http://${config.app.host}:${config.app.port}`);
            logger.info(`📚 Documentation: http://${config.app.host}:${config.app.port}/api/docs`);
            logger.info(`💗 Health check: http://${config.app.host}:${config.app.port}/health`);

        } catch (error) {
            logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    /**
     * Stop the application
     */
    async stop(): Promise<void>
    {
        logger.info('Stopping Deriv Prediction Bot...');

        try {
            // Stop Express server
            await this.expressServer.stop();

            // Disconnect from Deriv API
            this.derivService.disconnect();

            logger.info('Application stopped successfully');
        } catch (error) {
            logger.error('Error stopping application:', error);
        }
    }

    /**
     * Get service instances (for testing or external access)
     */
    getServices()
    {
        return {
            express: this.expressServer,
            deriv: this.derivService,
            features: this.featureService,
            gemini: this.geminiService,
        };
    }
}

// Create and start the application
const app = new PredictionBotApplication();

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () =>
{
    logger.info('Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});

process.on('SIGINT', async () =>
{
    logger.info('Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) =>
{
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) =>
{
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
if (require.main === module) {
    app.start().catch((error) =>
    {
        logger.error('Failed to start application:', error);
        process.exit(1);
    });
}

export default app;
