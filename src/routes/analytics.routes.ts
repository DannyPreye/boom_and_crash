import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import
{
    BacktestConfig,
    BacktestResult,
    AccuracyStats
} from '../types/analytics.types';
import { createApiError } from '../middleware/error-handler';
import { BacktestService } from '../services/backtest.service';
import { DerivWebSocketClient } from '../services/deriv-client';
import { EnhancedFeatureEngineeringService } from '../services/enhanced-feature-engineering.service';
import { AdvancedTradingAgent } from '../agents/advanced-trading-agent';

const router = Router();

// Validation schemas
const backtestConfigSchema = z.object({
    symbol: z.string(),
    timeframe: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    initial_balance: z.number().positive(),
    risk_per_trade: z.number().min(0).max(1),
    min_confidence_threshold: z.number().min(0).max(1),
});

/**
 * Get accuracy statistics
 */
router.get('/accuracy', async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const { symbol, timeframe, period = '24h' } = req.query;

        // Initialize services for accuracy calculation
        const derivApiUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
        const derivApiToken = process.env.DERIV_API_TOKEN || 'demo-token';
        const derivAppId = process.env.DERIV_APP_ID || '1089';
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || 'demo-key';

        const derivClient = new DerivWebSocketClient(derivApiUrl, derivApiToken, derivAppId);
        const featureService = new EnhancedFeatureEngineeringService();
        const tradingAgent = new AdvancedTradingAgent(anthropicApiKey);
        const backtestService = new BacktestService(derivClient, featureService, tradingAgent);

        // Calculate period dates
        const endDate = new Date().toISOString().split('T')[ 0 ];
        let startDate: string;

        switch (period) {
            case '24h':
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[ 0 ];
                break;
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[ 0 ];
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[ 0 ];
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[ 0 ];
        }

        // Run a quick backtest to get accuracy stats
        const config: BacktestConfig = {
            symbol: (symbol as string) || 'BOOM1000',
            timeframe: (timeframe as string) || '5m',
            start_date: startDate,
            end_date: endDate,
            initial_balance: 10000,
            risk_per_trade: 0.02,
            min_confidence_threshold: 0.6,
        };

        const backtestResult = await backtestService.runBacktest(config);

        // Calculate confidence distribution
        const confidenceRanges = [
            { min: 0.9, max: 1.0, label: '0.9-1.0' },
            { min: 0.8, max: 0.9, label: '0.8-0.9' },
            { min: 0.7, max: 0.8, label: '0.7-0.8' },
            { min: 0.6, max: 0.7, label: '0.6-0.7' },
        ];

        const confidenceDistribution = confidenceRanges.map(range =>
        {
            const tradesInRange = backtestResult.trades.filter(t =>
                t.confidence >= range.min && t.confidence < range.max
            );
            const correctTrades = tradesInRange.filter(t => t.was_correct);

            return {
                confidence_range: range.label,
                count: tradesInRange.length,
                accuracy: tradesInRange.length > 0 ? (correctTrades.length / tradesInRange.length) * 100 : 0,
            };
        });

        const accuracyStats: AccuracyStats = {
            symbol: (symbol as string) || 'ALL',
            timeframe: (timeframe as string) || 'ALL',
            period: period as any,
            total_predictions: backtestResult.total_trades,
            correct_predictions: backtestResult.trades.filter(t => t.was_correct).length,
            accuracy_percentage: backtestResult.performance_metrics.accuracy,
            confidence_distribution: confidenceDistribution,
            last_updated: new Date().toISOString(),
        };

        res.json(accuracyStats);
    } catch (error) {
        next(error);
    }
});

/**
 * Run backtest analysis
 */
router.post('/backtest', async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        // Validate request
        const config = backtestConfigSchema.parse(req.body);

        // Initialize services for backtesting
        const derivApiUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
        const derivApiToken = process.env.DERIV_API_TOKEN || 'demo-token';
        const derivAppId = process.env.DERIV_APP_ID || '1089';
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || 'demo-key';

        const derivClient = new DerivWebSocketClient(derivApiUrl, derivApiToken, derivAppId);
        const featureService = new EnhancedFeatureEngineeringService();
        const tradingAgent = new AdvancedTradingAgent(anthropicApiKey);

        // Initialize backtest service
        const backtestService = new BacktestService(derivClient, featureService, tradingAgent);

        // Run the backtest
        const result = await backtestService.runBacktest(config);

        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            next(createApiError('Invalid backtest configuration', 400, 'VALIDATION_ERROR', error.errors));
        } else {
            next(error);
        }
    }
});

/**
 * Get performance metrics
 */
router.get('/performance', async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const { symbol, timeframe, start_date, end_date } = req.query;

        // TODO: Implement actual performance calculation
        const mockPerformance = {
            period: {
                start: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: end_date || new Date().toISOString(),
            },
            filters: { symbol, timeframe },
            metrics: {
                total_predictions: 320,
                accuracy: 85.3,
                avg_confidence: 0.82,
                best_performing_symbol: 'BOOM1000',
                best_performing_timeframe: '5m',
                profitability: {
                    total_pnl: 1245.75,
                    win_rate: 85.3,
                    avg_win: 15.2,
                    avg_loss: -8.7,
                    profit_factor: 2.8,
                },
                consistency: {
                    daily_win_rate_std: 0.08,
                    max_consecutive_wins: 12,
                    max_consecutive_losses: 3,
                },
            },
            charts: {
                daily_accuracy: [], // Would contain daily accuracy data
                cumulative_pnl: [], // Would contain cumulative P&L data
                symbol_performance: [], // Would contain per-symbol performance
            },
        };

        res.json(mockPerformance);
    } catch (error) {
        next(error);
    }
});

/**
 * Export prediction data
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const { format = 'json', symbol, timeframe, start_date, end_date } = req.query;

        if (![ 'json', 'csv' ].includes(format as string)) {
            throw createApiError('Invalid export format. Supported: json, csv', 400, 'INVALID_FORMAT');
        }

        // TODO: Implement actual data export
        const exportData = {
            metadata: {
                exported_at: new Date().toISOString(),
                filters: { symbol, timeframe, start_date, end_date },
                total_records: 150,
            },
            data: [], // Would contain prediction records
        };

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=predictions.csv');
            res.send('symbol,timeframe,prediction,confidence,timestamp,actual_result\n'); // Mock CSV
        } else {
            res.json(exportData);
        }
    } catch (error) {
        next(error);
    }
});

export { router as analyticsRoutes };
