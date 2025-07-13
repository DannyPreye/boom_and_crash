import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { DerivWebSocketClient } from './services/deriv-client';
import { FeatureEngineeringService, MarketFeatures } from './services/feature-engineering';
import { GeminiAIService, GeminiPrediction } from './services/gemini-ai';

// Load environment variables
dotenv.config();

// Simple configuration
const config = {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    isDevelopment: process.env.NODE_ENV === 'development',
};

// Types
interface PredictionRequest
{
    symbol: string;
    timeframe: string;
    includeAnalysis?: boolean;
}

interface PredictionResponse
{
    symbol: string;
    timeframe: string;
    prediction: 'UP' | 'DOWN';
    confidence: number;
    factors: {
        technical: number;
        sentiment: number;
        pattern: number;
        spike_proximity?: number;
        volatility_momentum?: number;
    };
    analysis?: string;
    timestamp: string;
    model_version: string;
    request_id: string;
    features?: MarketFeatures;
    ai_reasoning?: string;
}

// Validation schema
const predictionRequestSchema = z.object({
    symbol: z.enum([ 'BOOM1000', 'BOOM500', 'CRASH1000', 'CRASH500', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100' ]),
    timeframe: z.enum([ '1m', '5m', '15m', '30m', '1h' ]),
    includeAnalysis: z.boolean().optional().default(false),
});

// Create Express app
const app = express();

// Initialize services
let derivClient: DerivWebSocketClient;
let featureService: FeatureEngineeringService;
let geminiService: GeminiAIService;
let isInitialized = false;

async function initializeServices()
{
    try {
        console.log('Initializing services...');

        // Get environment variables for Deriv API
        const derivApiUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
        const derivApiToken = process.env.DERIV_API_TOKEN || 'demo-token';
        const derivAppId = process.env.DERIV_APP_ID || '1089';

        // Initialize services
        derivClient = new DerivWebSocketClient(derivApiUrl, derivApiToken, derivAppId);
        featureService = new FeatureEngineeringService();

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            console.warn('GEMINI_API_KEY not found in environment, AI predictions will be limited' + geminiApiKey);
        }
        geminiService = new GeminiAIService(geminiApiKey || 'demo-key');

        // Add error handler to prevent crashes
        derivClient.on('error', (error) =>
        {
            console.warn('Deriv WebSocket error (continuing in mock mode):', error);
        });

        // Connect to Deriv WebSocket (will gracefully fail to mock mode)
        await derivClient.connect();

        if (derivClient.getConnectionStatus()) {
            console.log('✅ All services initialized successfully with real data');
        } else {
            console.log('⚠️ Services initialized in mock mode (no real market data)');
        }
        isInitialized = true;
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        console.log('Continuing in mock mode...');
        isInitialized = false;
    }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) =>
{
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.get('/', (req, res) =>
{
    res.json({
        name: 'Deriv Prediction Bot API',
        version: '2.0.0',
        status: 'running',
        services_initialized: isInitialized,
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            prediction: '/api/predict',
            docs: '/api/docs',
        },
    });
});

app.get('/health', (req, res) =>
{
    res.json({
        status: 'healthy',
        services_initialized: isInitialized,
        deriv_connected: derivClient?.getConnectionStatus() || false,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});

async function generatePrediction(symbol: string, timeframe: string, includeAnalysis: boolean): Promise<PredictionResponse>
{
    const request_id = Math.random().toString(36).substring(7);

    if (!isInitialized || !derivClient?.getConnectionStatus()) {
        // Fallback to mock prediction
        return generateMockPrediction(symbol, timeframe, includeAnalysis, request_id);
    }

    try {
        // Get real market data and features
        const marketData = await derivClient.getLatestTicks(symbol, 100);
        const features = featureService.calculateFeatures(marketData, symbol);

        // Get AI prediction
        const aiPrediction = await geminiService.generatePrediction(symbol, timeframe, features);

        // Combine technical and AI analysis
        const combinedConfidence = calculateCombinedConfidence(features, aiPrediction);

        return {
            symbol,
            timeframe,
            prediction: aiPrediction.direction,
            confidence: combinedConfidence,
            factors: {
                technical: features.trend_strength,
                sentiment: aiPrediction.sentiment_score,
                pattern: features.rsi / 100,
                ...(symbol.includes('BOOM') || symbol.includes('CRASH')
                    ? { spike_proximity: features.spike_probability || 0 }
                    : { volatility_momentum: features.volatility_momentum }
                ),
            },
            analysis: includeAnalysis ? generateDetailedAnalysis(features, aiPrediction, symbol) : undefined,
            timestamp: new Date().toISOString(),
            model_version: '2.0.0',
            request_id,
            features: includeAnalysis ? features : undefined,
            ai_reasoning: includeAnalysis ? aiPrediction.reasoning : undefined,
        };
    } catch (error) {
        console.error('Prediction generation error:', error);
        // Fallback to mock prediction
        return generateMockPrediction(symbol, timeframe, includeAnalysis, request_id);
    }
}

function calculateCombinedConfidence(features: MarketFeatures, aiPrediction: GeminiPrediction): number
{
    // Combine technical and AI confidence
    const technicalConfidence = Math.abs(features.trend_strength);
    const aiConfidence = aiPrediction.confidence;

    // Weight AI prediction more heavily, but consider technical indicators
    const combined = (aiConfidence * 0.7) + (technicalConfidence * 0.3);

    // Ensure confidence is between 0.5 and 0.95
    return Math.max(0.5, Math.min(0.95, combined));
}

function generateDetailedAnalysis(features: MarketFeatures, aiPrediction: GeminiPrediction, symbol: string): string
{
    return `
DETAILED ANALYSIS for ${symbol}:

Technical Indicators:
- RSI: ${features.rsi.toFixed(2)} (${features.rsi > 70 ? 'Overbought' : features.rsi < 30 ? 'Oversold' : 'Neutral'})
- MACD Signal: ${features.macd_signal.toFixed(6)}
- Trend Strength: ${(features.trend_strength * 100).toFixed(1)}%
- Volatility Momentum: ${(features.volatility_momentum * 100).toFixed(1)}%
- Price Velocity: ${features.price_velocity.toFixed(6)}

${symbol.includes('BOOM') || symbol.includes('CRASH') ?
            `Spike Analysis:
- Ticks Since Last Spike: ${features.ticks_since_last_spike || 'N/A'}
- Spike Probability: ${((features.spike_probability || 0) * 100).toFixed(1)}%` : ''}

AI Analysis:
${aiPrediction.reasoning}

Market Sentiment: ${aiPrediction.sentiment_score > 0 ? 'Bullish' : 'Bearish'} (${aiPrediction.sentiment_score.toFixed(2)})
    `.trim();
}

function generateMockPrediction(symbol: string, timeframe: string, includeAnalysis: boolean, request_id: string): PredictionResponse
{
    return {
        symbol,
        timeframe,
        prediction: Math.random() > 0.5 ? 'UP' : 'DOWN',
        confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
        factors: {
            technical: 0.8 + Math.random() * 0.2,
            sentiment: (Math.random() - 0.5) * 2, // -1 to 1
            pattern: 0.8 + Math.random() * 0.2,
            ...(symbol.includes('BOOM') || symbol.includes('CRASH')
                ? { spike_proximity: 0.6 + Math.random() * 0.4 }
                : { volatility_momentum: 0.7 + Math.random() * 0.3 }
            ),
        },
        analysis: includeAnalysis
            ? `MOCK ANALYSIS for ${symbol} on ${timeframe}: This is a mock prediction using simulated data. Connect to real services for actual market analysis.`
            : undefined,
        timestamp: new Date().toISOString(),
        model_version: '2.0.0-mock',
        request_id,
    };
}

app.post('/api/predict', async (req, res) =>
{
    try {
        // Validate request
        const validatedData = predictionRequestSchema.parse(req.body);

        // Generate prediction using real services or mock
        const prediction = await generatePrediction(
            validatedData.symbol,
            validatedData.timeframe,
            validatedData.includeAnalysis
        );

        return res.json(prediction);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors,
                timestamp: new Date().toISOString(),
            });
        }

        console.error('Prediction error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate prediction',
            timestamp: new Date().toISOString(),
        });
    }
});

app.get('/api/predict/supported-symbols', (req, res) =>
{
    const symbols = [
        { symbol: 'BOOM1000', display_name: 'Boom 1000 Index', type: 'boom', spike_frequency: 1000 },
        { symbol: 'BOOM500', display_name: 'Boom 500 Index', type: 'boom', spike_frequency: 500 },
        { symbol: 'CRASH1000', display_name: 'Crash 1000 Index', type: 'crash', spike_frequency: 1000 },
        { symbol: 'CRASH500', display_name: 'Crash 500 Index', type: 'crash', spike_frequency: 500 },
        { symbol: 'R_10', display_name: 'Volatility 10 Index', type: 'volatility', volatility: 10 },
        { symbol: 'R_25', display_name: 'Volatility 25 Index', type: 'volatility', volatility: 25 },
        { symbol: 'R_50', display_name: 'Volatility 50 Index', type: 'volatility', volatility: 50 },
        { symbol: 'R_75', display_name: 'Volatility 75 Index', type: 'volatility', volatility: 75 },
        { symbol: 'R_100', display_name: 'Volatility 100 Index', type: 'volatility', volatility: 100 },
    ];

    res.json({
        symbols,
        timeframes: [ '1m', '5m', '15m', '30m', '1h' ],
    });
});

app.get('/api/docs', (req, res) =>
{
    res.json({
        title: 'Deriv Prediction Bot API Documentation',
        version: '1.0.0',
        baseUrl: `http://${config.host}:${config.port}`,
        endpoints: {
            'POST /api/predict': {
                description: 'Generate prediction for a symbol',
                body: {
                    symbol: 'SyntheticSymbol (required) - BOOM1000, BOOM500, CRASH1000, CRASH500, R_10, R_25, R_50, R_75, R_100',
                    timeframe: 'Timeframe (required) - 1m, 5m, 15m, 30m, 1h',
                    includeAnalysis: 'boolean (optional) - Include detailed analysis',
                },
                example: {
                    symbol: 'BOOM1000',
                    timeframe: '5m',
                    includeAnalysis: true,
                },
            },
            'GET /api/predict/supported-symbols': {
                description: 'Get list of supported symbols and timeframes',
            },
            'GET /health': {
                description: 'Health check endpoint',
            },
        },
    });
});

// 404 handler
app.use('*', (req, res) =>
{
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) =>
{
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Start server
async function startServer()
{
    try {
        // Initialize services first
        await initializeServices();

        // Start Express server
        const server = app.listen(config.port, () =>
        {
            console.log(`🚀 Deriv Prediction Bot API started!`);
            console.log(`📊 Server: http://${config.host}:${config.port}`);
            console.log(`📚 Docs: http://${config.host}:${config.port}/api/docs`);
            console.log(`💗 Health: http://${config.host}:${config.port}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`⚡ Services Status: ${isInitialized ? 'Real AI & WebSocket' : 'Mock Mode'}`);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () =>
        {
            console.log('\n🛑 Shutting down gracefully...');

            if (derivClient) {
                derivClient.disconnect();
            }

            server.close(() =>
            {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () =>
        {
            console.log('SIGTERM received, shutting down gracefully...');

            if (derivClient) {
                derivClient.disconnect();
            }

            server.close(() =>
            {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    startServer().catch(console.error);
}

export default app;
