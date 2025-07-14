import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
    NODE_ENV: z.enum([ 'development', 'production', 'test' ]).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    HOST: z.string().default('localhost'),

    // Deriv API
    DERIV_API_URL: z.string().url(),
    DERIV_API_TOKEN: z.string().min(1),
    DERIV_APP_ID: z.string().min(1),

    // Google Gemini
    GEMINI_API_KEY: z.string().min(1),
    GEMINI_MODEL: z.string().default('gemini-2.5-pro'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().transform(Number).default('0'),

    // Logging
    LOG_LEVEL: z.enum([ 'error', 'warn', 'info', 'debug' ]).default('info'),
    LOG_FILE_PATH: z.string().default('./logs/app.log'),

    // Prediction Engine
    PREDICTION_CACHE_TTL: z.string().transform(Number).default('300'),
    MAX_HISTORICAL_CANDLES: z.string().transform(Number).default('1000'),
    ENSEMBLE_WEIGHTS_GEMINI: z.string().transform(Number).default('0.30'),
    ENSEMBLE_WEIGHTS_LSTM: z.string().transform(Number).default('0.25'),
    ENSEMBLE_WEIGHTS_STATISTICAL: z.string().transform(Number).default('0.20'),
    ENSEMBLE_WEIGHTS_TRANSFORMER: z.string().transform(Number).default('0.25'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

    // WebSocket
    WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default('30000'),
    WS_RECONNECT_INTERVAL: z.string().transform(Number).default('5000'),
    WS_MAX_RECONNECT_ATTEMPTS: z.string().transform(Number).default('10'),

    // Security
    JWT_SECRET: z.string().min(32),
    API_KEY_HEADER: z.string().default('X-API-Key'),

    // Performance Monitoring
    ENABLE_METRICS: z.string().transform((v: string) => v === 'true').default('true'),
    METRICS_PORT: z.string().transform(Number).default('9090'),

    // Backtesting
    BACKTEST_START_DATE: z.string().default('2024-01-01'),
    BACKTEST_END_DATE: z.string().default('2024-12-31'),
    BACKTEST_INITIAL_BALANCE: z.string().transform(Number).default('1000'),
});

// Validate and parse environment variables
const env = envSchema.parse(process.env);

export const config = {
    app: {
        env: env.NODE_ENV,
        port: env.PORT,
        host: env.HOST,
        isDevelopment: env.NODE_ENV === 'development',
        isProduction: env.NODE_ENV === 'production',
        isTest: env.NODE_ENV === 'test',
    },

    deriv: {
        apiUrl: env.DERIV_API_URL,
        apiToken: env.DERIV_API_TOKEN,
        appId: env.DERIV_APP_ID,
    },

    gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
    },

    redis: {
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
    },

    logging: {
        level: env.LOG_LEVEL,
        filePath: env.LOG_FILE_PATH,
    },

    prediction: {
        cacheTtl: env.PREDICTION_CACHE_TTL,
        maxHistoricalCandles: env.MAX_HISTORICAL_CANDLES,
        ensembleWeights: {
            gemini: env.ENSEMBLE_WEIGHTS_GEMINI,
            lstm: env.ENSEMBLE_WEIGHTS_LSTM,
            statistical: env.ENSEMBLE_WEIGHTS_STATISTICAL,
            transformer: env.ENSEMBLE_WEIGHTS_TRANSFORMER,
        },
    },

    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    websocket: {
        heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
        reconnectInterval: env.WS_RECONNECT_INTERVAL,
        maxReconnectAttempts: env.WS_MAX_RECONNECT_ATTEMPTS,
    },

    security: {
        jwtSecret: env.JWT_SECRET,
        apiKeyHeader: env.API_KEY_HEADER,
    },

    metrics: {
        enabled: env.ENABLE_METRICS,
        port: env.METRICS_PORT,
    },

    backtest: {
        startDate: env.BACKTEST_START_DATE,
        endDate: env.BACKTEST_END_DATE,
        initialBalance: env.BACKTEST_INITIAL_BALANCE,
    },
} as const;

// Supported symbols configuration
export const SUPPORTED_SYMBOLS = {
    BOOM1000: {
        symbol: 'BOOM1000',
        display_name: 'Boom 1000 Index',
        spike_frequency: 1000,
        type: 'boom',
        pip_size: 0.01,
    },
    BOOM500: {
        symbol: 'BOOM500',
        display_name: 'Boom 500 Index',
        spike_frequency: 500,
        type: 'boom',
        pip_size: 0.01,
    },
    CRASH1000: {
        symbol: 'CRASH1000',
        display_name: 'Crash 1000 Index',
        spike_frequency: 1000,
        type: 'crash',
        pip_size: 0.01,
    },
    CRASH500: {
        symbol: 'CRASH500',
        display_name: 'Crash 500 Index',
        spike_frequency: 500,
        type: 'crash',
        pip_size: 0.01,
    },
    R_10: {
        symbol: 'R_10',
        display_name: 'Volatility 10 Index',
        volatility: 10,
        type: 'volatility',
        pip_size: 0.001,
    },
    R_25: {
        symbol: 'R_25',
        display_name: 'Volatility 25 Index',
        volatility: 25,
        type: 'volatility',
        pip_size: 0.001,
    },
    R_50: {
        symbol: 'R_50',
        display_name: 'Volatility 50 Index',
        volatility: 50,
        type: 'volatility',
        pip_size: 0.001,
    },
    R_75: {
        symbol: 'R_75',
        display_name: 'Volatility 75 Index',
        volatility: 75,
        type: 'volatility',
        pip_size: 0.001,
    },
    R_100: {
        symbol: 'R_100',
        display_name: 'Volatility 100 Index',
        volatility: 100,
        type: 'volatility',
        pip_size: 0.001,
    },
} as const;

export const TIMEFRAMES = {
    '1m': { minutes: 1, seconds: 60 },
    '5m': { minutes: 5, seconds: 300 },
    '15m': { minutes: 15, seconds: 900 },
    '30m': { minutes: 30, seconds: 1800 },
    '1h': { minutes: 60, seconds: 3600 },
} as const;
