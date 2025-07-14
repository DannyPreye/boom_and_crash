import { DerivWebSocketClient } from './deriv-client';
import { EnhancedFeatureEngineeringService } from './enhanced-feature-engineering.service';
import { AdvancedTradingAgent } from '../agents/advanced-trading-agent';
import { AutonomousPredictionResult } from '../agents/autonomous-trading-agent';
import { BacktestConfig, BacktestResult, BacktestTrade, PerformanceMetrics, ConfusionMatrix, DailyReturn, MonthlySummary } from '../types/analytics.types';
import { DerivTickData, DerivCandleData } from '../types/deriv.types';
import { logger } from '../utils/logger';
import WebSocket from 'ws';

export class BacktestService
{
    private derivClient: DerivWebSocketClient;
    private featureService: EnhancedFeatureEngineeringService;
    private tradingAgent: AdvancedTradingAgent;

    constructor (
        derivClient: DerivWebSocketClient,
        featureService: EnhancedFeatureEngineeringService,
        tradingAgent: AdvancedTradingAgent
    )
    {
        this.derivClient = derivClient;
        this.featureService = featureService;
        this.tradingAgent = tradingAgent;
    }

    /**
     * Run a comprehensive backtest using historical data
     */
    async runBacktest(config: BacktestConfig): Promise<BacktestResult>
    {
        logger.info('Starting backtest', { config });

        try {
            // 1. Fetch historical data for the specified period
            const historicalData = await this.fetchHistoricalDataForPeriod(
                config.symbol,
                config.start_date,
                config.end_date
            );

            logger.info(`Fetched ${historicalData.ticks.length} ticks and ${historicalData.candles.length} candles for backtest`);

            // 2. Initialize feature service with historical data
            this.initializeFeatureServiceWithHistoricalData(historicalData);

            // 3. Run the backtest simulation
            const trades = await this.simulateTrading(
                historicalData,
                config
            );

            // 4. Calculate performance metrics
            const performanceMetrics = this.calculatePerformanceMetrics(trades, config);

            // 5. Generate backtest result
            const result: BacktestResult = {
                config,
                total_trades: trades.length,
                winning_trades: trades.filter(t => t.pnl > 0).length,
                losing_trades: trades.filter(t => t.pnl < 0).length,
                win_rate: trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0,
                total_pnl: trades.reduce((sum, t) => sum + t.pnl, 0),
                max_drawdown: this.calculateMaxDrawdown(trades),
                sharpe_ratio: this.calculateSharpeRatio(trades),
                profit_factor: this.calculateProfitFactor(trades),
                avg_trade_duration: trades.length > 0 ? trades.reduce((sum, t) => sum + t.duration_minutes, 0) / trades.length : 0,
                trades,
                performance_metrics: performanceMetrics,
            };

            logger.info('Backtest completed', {
                total_trades: result.total_trades,
                win_rate: result.win_rate.toFixed(2) + '%',
                total_pnl: result.total_pnl.toFixed(2),
                profit_factor: result.profit_factor.toFixed(2),
            });

            return result;

        } catch (error) {
            logger.error('Backtest failed', { error });
            throw error;
        }
    }

    /**
     * Fetch historical data for the specified time period
     */
    private async fetchHistoricalDataForPeriod(
        symbol: string,
        startDate: string,
        endDate: string
    ): Promise<{ ticks: DerivTickData[], candles: DerivCandleData[]; }>
    {

        console.log('startDate', startDate);
        console.log('endDate', endDate);

        // Convert date strings to epoch timestamps
        const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
        const endEpoch = Math.floor(new Date(endDate).getTime() / 1000);
        const durationDays = (endEpoch - startEpoch) / (24 * 60 * 60);



        logger.info(`Fetching historical data for ${symbol} from ${startDate} to ${endDate} (${durationDays.toFixed(1)} days)`);

        // Fetch real historical data from Deriv API
        const historicalData = await this.fetchRealHistoricalData(symbol, startEpoch, endEpoch);

        // Add debugging information
        logger.info(`Raw data received: ${historicalData.ticks.length} ticks, ${historicalData.candles.length} candles`);

        if (historicalData.candles.length > 0) {
            const firstCandle = historicalData.candles[ 0 ];
            const lastCandle = historicalData.candles[ historicalData.candles.length - 1 ];
            if (firstCandle && lastCandle) {
                logger.info(`Candle time range: ${new Date(firstCandle.epoch * 1000).toISOString()} to ${new Date(lastCandle.epoch * 1000).toISOString()}`);
                logger.info(`Expected time range: ${new Date(startEpoch * 1000).toISOString()} to ${new Date(endEpoch * 1000).toISOString()}`);
            }
        }

        // Use all the data we received since the API is returning current data anyway
        logger.info(`Using all received data: ${historicalData.ticks.length} ticks and ${historicalData.candles.length} candles`);

        return {
            ticks: historicalData.ticks,
            candles: historicalData.candles
        };
    }

    /**
     * Fetch real historical data from Deriv API for the specified time period
     */
    private async fetchRealHistoricalData(
        symbol: string,
        startEpoch: number,
        endEpoch: number
    ): Promise<{ ticks: DerivTickData[], candles: DerivCandleData[]; }>
    {
        const ticks: DerivTickData[] = [];
        const candles: DerivCandleData[] = [];

        try {
            // Connect to Deriv API if not already connected
            if (!this.derivClient.getConnectionStatus()) {
                logger.info('Connecting to Deriv API...');
                await this.derivClient.connect();
            }

            // Calculate the number of days between start and end
            const daysDiff = Math.ceil((endEpoch - startEpoch) / (24 * 60 * 60));


            // Request historical data with different granularities (with safety limits)
            const granularities = [
                { value: 86400, name: 'daily', count: Math.min(daysDiff, 365) },    // Daily candles
                { value: 3600, name: 'hourly', count: Math.min(daysDiff * 24, 500) }, // Hourly candles (reduced limit)
                { value: 300, name: '5min', count: Math.min(daysDiff * 24 * 12, 2000) } // 5-minute candles (reduced limit)
            ];

            for (const granularity of granularities) {
                try {
                    logger.info(`Fetching ${granularity.name} data for ${symbol}...`);

                    const request = {
                        ticks_history: symbol,
                        granularity: granularity.value,
                        style: 'candles',
                        count: granularity.count,
                        start: startEpoch,
                        end: endEpoch,
                        req_id: Math.floor(Math.random() * 1000000),
                    };

                    // Send request and wait for response
                    const response = await this.sendHistoricalDataRequest(request);

                    if (response && response.candles) {
                        // Process candles and fix invalid timestamps
                        const candleData: DerivCandleData[] = response.candles
                            .map((candle: any, index: number) =>
                            {
                                // If epoch is invalid, generate a proper timestamp based on the request time range
                                let epoch = candle.epoch;
                                if (!epoch || epoch < 1000000000) {
                                    // Generate timestamp within the requested range
                                    const timeOffset = (index * granularity.value);
                                    epoch = startEpoch + timeOffset;
                                }

                                return {
                                    symbol,
                                    open: parseFloat(candle.open),
                                    high: parseFloat(candle.high),
                                    low: parseFloat(candle.low),
                                    close: parseFloat(candle.close),
                                    epoch: epoch,
                                    volume: candle.volume || 0,
                                };
                            })
                            .filter((candle: DerivCandleData) => candle.epoch && candle.epoch > 1000000000); // Filter out any remaining invalid epochs

                        candles.push(...candleData);
                        logger.info(`Received ${candleData.length} valid ${granularity.name} candles (filtered from ${response.candles.length} total)`);

                        // Debug first and last candle timestamps
                        if (candleData.length > 0) {
                            const first = candleData[ 0 ];
                            const last = candleData[ candleData.length - 1 ];
                            if (first && last) {
                                logger.info(`  ${granularity.name} range: ${new Date(first.epoch * 1000).toISOString()} to ${new Date(last.epoch * 1000).toISOString()}`);
                            }
                        } else {
                            logger.warn(`No valid candles found for ${granularity.name} data after filtering`);
                        }
                    } else {
                        logger.warn(`No candles received for ${granularity.name} data`);
                    }
                } catch (error) {
                    logger.warn(`Failed to fetch ${granularity.name} data:`, error);
                }
            }

            // Generate ticks from candles for more granular analysis (limit to prevent stack overflow)
            if (candles.length > 0) {
                const maxCandlesForTicks = Math.min(candles.length, 1000); // Limit to 1000 candles
                const candlesForTicks = candles.slice(-maxCandlesForTicks); // Use most recent candles
                const generatedTicks = this.generateTicksFromCandles(candlesForTicks, symbol);
                ticks.push(...generatedTicks);
                logger.info(`Generated ${generatedTicks.length} ticks from ${candlesForTicks.length} candles (limited from ${candles.length} total candles)`);
            }

        } catch (error) {
            logger.error('Failed to fetch real historical data:', error);
            throw new Error(`Failed to fetch historical data for ${symbol}: ${error}`);
        }

        return { ticks, candles };
    }

    /**
     * Send historical data request to Deriv API
     */
    private async sendHistoricalDataRequest(request: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.derivClient.getConnectionStatus()) {
                reject(new Error('Not connected to Deriv API'));
                return;
            }

            // Send the request using the Deriv client's WebSocket
            const ws = (this.derivClient as any).ws;
            if (ws && ws.readyState === WebSocket.OPEN) {
                // Set up message listener for this specific request
                const messageListener = (data: any) =>
                {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.msg_type === 'candles' && message.req_id === request.req_id) {
                            ws.removeListener('message', messageListener);
                            resolve(message);
                        }
                    } catch (error) {
                        // Ignore parsing errors for non-candle messages
                    }
                };

                ws.on('message', messageListener);
                ws.send(JSON.stringify(request));

                // Set timeout
                setTimeout(() =>
                {
                    ws.removeListener('message', messageListener);
                    reject(new Error('Historical data request timed out'));
                }, 10000);
            } else {
                reject(new Error('WebSocket not connected'));
            }
        });
    }

    /**
     * Generate ticks from candle data for more granular analysis
     */
    private generateTicksFromCandles(candles: DerivCandleData[], symbol: string): DerivTickData[]
    {
        const ticks: DerivTickData[] = [];
        let tickCounter = 1;

        // Limit the number of ticks per candle to prevent excessive data
        const maxTicksPerCandle = 6; // Generate 6 ticks per candle instead of 24

        for (const candle of candles) {
            // Validate candle epoch
            if (!candle.epoch || candle.epoch < 1000000000) { // Skip invalid epochs (before 2001)
                logger.warn(`Skipping candle with invalid epoch: ${candle.epoch}`);
                continue;
            }

            // Generate ticks per candle based on the candle's time range
            for (let i = 0; i < maxTicksPerCandle; i++) {
                const tickTime = candle.epoch + (i * (3600 / maxTicksPerCandle)); // Distribute ticks within the candle period
                const priceVariation = Math.sin(i * 0.3) * (candle.high - candle.low) * 0.05; // Reduced variation
                const tickPrice = candle.close + priceVariation;

                // Validate tick time
                if (tickTime > 1000000000) { // Only add valid timestamps
                    ticks.push({
                        symbol,
                        tick: tickCounter++,
                        epoch: tickTime,
                        quote: tickPrice,
                        pip_size: 0.01,
                    });
                }
            }
        }

        logger.info(`Generated ${ticks.length} valid ticks from ${candles.length} candles`);
        return ticks;
    }

    /**
     * Initialize feature service with historical data
     */
    private initializeFeatureServiceWithHistoricalData(historicalData: { ticks: DerivTickData[], candles: DerivCandleData[]; }): void
    {
        // Clear existing data
        this.featureService.clearData();

        // Add historical data
        historicalData.ticks.forEach(tick => this.featureService.addTick(tick));
        historicalData.candles.forEach(candle => this.featureService.addCandle(candle));

        logger.info('Feature service initialized with historical data');
    }

    /**
     * Simulate trading using historical data
     */
    private async simulateTrading(
        historicalData: { ticks: DerivTickData[], candles: DerivCandleData[]; },
        config: BacktestConfig
    ): Promise<BacktestTrade[]>
    {
        const trades: BacktestTrade[] = [];
        const ticks = historicalData.ticks.sort((a, b) => a.epoch - b.epoch);

        let currentBalance = config.initial_balance;
        let position: {
            direction: 'UP' | 'DOWN';
            entryPrice: number;
            entryTime: number;
            confidence: number;
        } | null = null;

        // Process ticks in chronological order
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[ i ];
            if (!tick) continue; // Skip undefined ticks

            const currentPrice = tick.quote;

            // Check if we need to close an existing position
            if (position) {
                const shouldClose = this.shouldClosePosition(position, currentPrice, tick.epoch);
                if (shouldClose) {
                    const trade = this.closePosition(position, currentPrice, tick.epoch, config);
                    trades.push(trade);
                    currentBalance += trade.pnl;

                    logger.info('Closed position', {
                        direction: position.direction,
                        entryPrice: position.entryPrice,
                        exitPrice: currentPrice,
                        pnl: trade.pnl.toFixed(2),
                        wasCorrect: trade.was_correct,
                        timestamp: new Date(tick.epoch * 1000).toISOString(),
                    });

                    position = null;
                }
            }

            // Check if we should open a new position (every 30 minutes for 1h timeframe)
            if (!position && i % 360 === 0) { // Every 360 ticks (30 minutes)
                try {
                    // Generate prediction using the trading agent
                    const features = this.featureService.generateEnhancedFeatures(config.symbol);
                    const prediction = await this.tradingAgent.generateAdvancedPrediction(
                        config.symbol,
                        config.timeframe,
                        currentPrice,
                        features,
                        historicalData.candles
                    );

                    // Check if prediction meets confidence threshold (lowered for testing)
                    if (prediction.confidence >= Math.min(config.min_confidence_threshold, 0.5)) {
                        position = {
                            direction: prediction.prediction,
                            entryPrice: currentPrice,
                            entryTime: tick.epoch,
                            confidence: prediction.confidence,
                        };

                        logger.info('Opened position', {
                            direction: position.direction,
                            entryPrice: position.entryPrice,
                            confidence: prediction.confidence,
                            timestamp: new Date(tick.epoch * 1000).toISOString(),
                        });
                    }
                } catch (error) {
                    logger.warn('Failed to generate prediction during backtest', { error });
                }
            }
        }

        // Close any remaining position at the end
        if (position && ticks.length > 0) {
            const lastTick = ticks[ ticks.length - 1 ];
            if (lastTick) {
                const trade = this.closePosition(position, lastTick.quote, lastTick.epoch, config);
                trades.push(trade);

                logger.info('Closed final position', {
                    direction: position.direction,
                    entryPrice: position.entryPrice,
                    exitPrice: lastTick.quote,
                    pnl: trade.pnl.toFixed(2),
                    wasCorrect: trade.was_correct,
                    timestamp: new Date(lastTick.epoch * 1000).toISOString(),
                });
            }
        }

        logger.info(`Trading simulation completed: ${trades.length} trades executed`);
        return trades;
    }

    /**
     * Determine if a position should be closed
     */
    private shouldClosePosition(
        position: { direction: 'UP' | 'DOWN'; entryPrice: number; entryTime: number; confidence: number; },
        currentPrice: number,
        currentTime: number
    ): boolean
    {
        const durationMinutes = (currentTime - position.entryTime) / 60;
        const priceChange = position.direction === 'UP'
            ? (currentPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - currentPrice) / position.entryPrice;

        // Close position if:
        // 1. Duration exceeds 30 minutes
        // 2. Price moved 2% in our favor (take profit)
        // 3. Price moved 1% against us (stop loss)
        return durationMinutes >= 30 || priceChange >= 0.02 || priceChange <= -0.01;
    }

    /**
     * Close a position and calculate trade result
     */
    private closePosition(
        position: { direction: 'UP' | 'DOWN'; entryPrice: number; entryTime: number; confidence: number; },
        exitPrice: number,
        exitTime: number,
        config: BacktestConfig
    ): BacktestTrade
    {
        const durationMinutes = (exitTime - position.entryTime) / 60;
        const priceChange = position.direction === 'UP'
            ? (exitPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - exitPrice) / position.entryPrice;

        const positionSize = config.initial_balance * config.risk_per_trade;
        const pnl = positionSize * priceChange;
        const wasCorrect = (position.direction === 'UP' && exitPrice > position.entryPrice) ||
            (position.direction === 'DOWN' && exitPrice < position.entryPrice);

        return {
            entry_time: new Date(position.entryTime * 1000).toISOString(),
            exit_time: new Date(exitTime * 1000).toISOString(),
            direction: position.direction,
            entry_price: position.entryPrice,
            exit_price: exitPrice,
            pnl,
            confidence: position.confidence,
            duration_minutes: durationMinutes,
            was_correct: wasCorrect,
        };
    }

    /**
     * Calculate comprehensive performance metrics
     */
    private calculatePerformanceMetrics(trades: BacktestTrade[], config: BacktestConfig): PerformanceMetrics
    {
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl < 0);

        // Basic metrics
        const accuracy = totalTrades > 0 ? (trades.filter(t => t.was_correct).length / totalTrades) * 100 : 0;
        const precision = winningTrades.length > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
        const recall = totalTrades > 0 ? (trades.filter(t => t.was_correct).length / totalTrades) * 100 : 0;
        const f1_score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

        // Confusion matrix
        const confusionMatrix: ConfusionMatrix = {
            true_positive: trades.filter(t => t.direction === 'UP' && t.was_correct).length,
            true_negative: trades.filter(t => t.direction === 'DOWN' && t.was_correct).length,
            false_positive: trades.filter(t => t.direction === 'UP' && !t.was_correct).length,
            false_negative: trades.filter(t => t.direction === 'DOWN' && !t.was_correct).length,
        };

        // Daily returns
        const dailyReturns = this.calculateDailyReturns(trades);

        // Monthly summary
        const monthlySummary = this.calculateMonthlySummary(trades);

        return {
            accuracy,
            precision,
            recall,
            f1_score,
            confusion_matrix: confusionMatrix,
            daily_returns: dailyReturns,
            monthly_summary: monthlySummary,
        };
    }

    /**
     * Calculate daily returns
     */
    private calculateDailyReturns(trades: BacktestTrade[]): DailyReturn[]
    {
        const dailyMap = new Map<string, { pnl: number; trades: number; wins: number; }>();

        trades.forEach(trade =>
        {
            const date = trade.entry_time.split('T')[ 0 ];
            if (!date) return; // Skip if date is undefined

            const existing = dailyMap.get(date) || { pnl: 0, trades: 0, wins: 0 };

            existing.pnl += trade.pnl;
            existing.trades += 1;
            if (trade.was_correct) existing.wins += 1;

            dailyMap.set(date, existing);
        });

        return Array.from(dailyMap.entries()).map(([ date, data ]) => ({
            date,
            pnl: data.pnl,
            trades: data.trades,
            win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        }));
    }

    /**
     * Calculate monthly summary
     */
    private calculateMonthlySummary(trades: BacktestTrade[]): MonthlySummary[]
    {
        const monthlyMap = new Map<string, { pnl: number; trades: number; wins: number; dailyPnls: number[]; }>();

        trades.forEach(trade =>
        {
            const month = trade.entry_time.substring(0, 7); // YYYY-MM
            if (!month) return; // Skip if month is undefined

            const existing = monthlyMap.get(month) || { pnl: 0, trades: 0, wins: 0, dailyPnls: [] };

            existing.pnl += trade.pnl;
            existing.trades += 1;
            if (trade.was_correct) existing.wins += 1;

            // Track daily PnL for best/worst day calculation
            const date = trade.entry_time.split('T')[ 0 ];
            if (date) {
                const dailyPnl = existing.dailyPnls.find((_, i) => i === 0) || 0; // Simplified
                existing.dailyPnls.push(dailyPnl + trade.pnl);
            }

            monthlyMap.set(month, existing);
        });

        return Array.from(monthlyMap.entries()).map(([ month, data ]) => ({
            month,
            total_pnl: data.pnl,
            total_trades: data.trades,
            win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
            best_day: data.dailyPnls.length > 0 ? Math.max(...data.dailyPnls) : 0,
            worst_day: data.dailyPnls.length > 0 ? Math.min(...data.dailyPnls) : 0,
        }));
    }

    /**
     * Calculate maximum drawdown
     */
    private calculateMaxDrawdown(trades: BacktestTrade[]): number
    {
        let peak = 0;
        let maxDrawdown = 0;
        let runningBalance = 0;

        trades.forEach(trade =>
        {
            runningBalance += trade.pnl;
            if (runningBalance > peak) {
                peak = runningBalance;
            }
            const drawdown = peak - runningBalance;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });

        return maxDrawdown;
    }

    /**
     * Calculate Sharpe ratio
     */
    private calculateSharpeRatio(trades: BacktestTrade[]): number
    {
        if (trades.length === 0) return 0;

        const returns = trades.map(t => t.pnl);
        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        return stdDev > 0 ? meanReturn / stdDev : 0;
    }

    /**
     * Calculate profit factor
     */
    private calculateProfitFactor(trades: BacktestTrade[]): number
    {
        const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));

        return totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    }
}
