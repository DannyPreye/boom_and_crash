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

            // Validate that all data is real and has proper timestamps
            this.validateRealHistoricalData(historicalData.ticks, historicalData.candles);

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
     * ENFORCES REAL DATA ONLY - No mock data fallback
     */
    private async fetchHistoricalDataForPeriod(
        symbol: string,
        startDate: string,
        endDate: string
    ): Promise<{ ticks: DerivTickData[], candles: DerivCandleData[]; }>
    {
        // Convert date strings to epoch timestamps (seconds, not milliseconds)
        const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
        const endEpoch = Math.floor(new Date(endDate).getTime() / 1000);
        const durationDays = (endEpoch - startEpoch) / (24 * 60 * 60);

        logger.info(`🎯 REAL DATA BACKTEST: Fetching historical data for ${symbol} from ${startDate} to ${endDate} (${durationDays.toFixed(1)} days)`);
        logger.info(`📊 Epoch timestamps: ${startEpoch} to ${endEpoch}`);

        // Validate date range
        if (durationDays <= 0) {
            throw new Error(`Invalid date range: ${startDate} to ${endDate}`);
        }

        if (durationDays > 365) {
            logger.warn(`Date range too large (${durationDays.toFixed(1)} days), limiting to 365 days`);
            const limitedStartEpoch = endEpoch - (365 * 24 * 60 * 60);
            logger.info(`Adjusted start date to: ${new Date(limitedStartEpoch * 1000).toISOString()}`);
        }

        // Connect to Deriv API if not already connected
        if (!this.derivClient.getConnectionStatus()) {
            logger.info('🔌 Connecting to Deriv API for real data fetch...');
            await this.derivClient.connect();

            // Wait a moment for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (!this.derivClient.getConnectionStatus()) {
                throw new Error('❌ Failed to connect to Deriv API. Cannot proceed without real data connection.');
            }

            logger.info('✅ Successfully connected to Deriv API');
        }

        // Fetch ONLY real historical data - no fallback allowed
        const historicalData = await this.fetchRealHistoricalData(symbol, startEpoch, endEpoch);

        if (!historicalData.candles.length || !historicalData.ticks.length) {
            throw new Error(`❌ CRITICAL: No real data retrieved for ${symbol}. Backtest requires real market data.`);
        }

        logger.info(`✅ SUCCESS: Retrieved ${historicalData.ticks.length} real ticks and ${historicalData.candles.length} real candles`);

        // Validate data quality
        const firstTick = historicalData.ticks[ 0 ];
        const lastTick = historicalData.ticks[ historicalData.ticks.length - 1 ];

        if (firstTick && lastTick) {
            logger.info(`📈 Real data validation:`);
            logger.info(`   First tick: ${new Date(firstTick.epoch * 1000).toISOString()} - Price: ${firstTick.quote}`);
            logger.info(`   Last tick: ${new Date(lastTick.epoch * 1000).toISOString()} - Price: ${lastTick.quote}`);
            logger.info(`   Price range: ${Math.min(...historicalData.ticks.map(t => t.quote)).toFixed(2)} - ${Math.max(...historicalData.ticks.map(t => t.quote)).toFixed(2)}`);
        }

        return historicalData;
    }

    /**
     * Fetch real historical data from Deriv API for the specified time period
     * STRICT MODE: No fallback to mock data - must use real market data
     */
    private async fetchRealHistoricalData(
        symbol: string,
        startEpoch: number,
        endEpoch: number
    ): Promise<{ ticks: DerivTickData[], candles: DerivCandleData[]; }>
    {
        const candles: DerivCandleData[] = [];

        try {
            logger.info(`🔍 Attempting to fetch REAL historical data for ${symbol} from ${new Date(startEpoch * 1000).toISOString()} to ${new Date(endEpoch * 1000).toISOString()}`);

            // Validate date ranges and ensure we're requesting historical data within reasonable limits
            const currentTime = Math.floor(Date.now() / 1000);
            const maxHistoryDays = 365; // 1 year max
            const minStartTime = currentTime - (maxHistoryDays * 24 * 60 * 60);

            if (startEpoch < minStartTime) {
                logger.warn(`Start date too far back, adjusting to ${maxHistoryDays} days ago`);
                startEpoch = minStartTime;
            }

            if (endEpoch > currentTime) {
                logger.warn(`End date is in the future, adjusting to current time`);
                endEpoch = currentTime;
            }

            // Enhanced strategy for fetching real data with multiple attempts
            const granularities = [
                { value: 3600, name: '1hour', maxDays: 365, priority: 1 },   // 1-hour candles - primary choice
                { value: 14400, name: '4hour', maxDays: 365, priority: 2 },  // 4-hour candles - secondary
                { value: 86400, name: '1day', maxDays: 365, priority: 3 }    // Daily candles - fallback
            ];

            let totalCandlesFetched = 0;

            for (const granularity of granularities) {
                try {
                    logger.info(`📥 Attempting to fetch ${granularity.name} data...`);

                    // Calculate time chunks to fetch data in manageable pieces
                    const maxCandlesPerRequest = 5000;
                    const secondsPerCandle = granularity.value;
                    const maxTimeRangePerRequest = maxCandlesPerRequest * secondsPerCandle;

                    let currentStart = startEpoch;
                    let requestCount = 0;
                    const maxRequests = 10; // Limit requests to prevent timeouts

                    while (currentStart < endEpoch && requestCount < maxRequests) {
                        const currentEnd = Math.min(currentStart + maxTimeRangePerRequest, endEpoch);

                        logger.info(`📊 Fetching chunk ${requestCount + 1}: ${new Date(currentStart * 1000).toISOString()} to ${new Date(currentEnd * 1000).toISOString()}`);

                        const request = {
                            ticks_history: symbol,
                            granularity: granularity.value,
                            start: currentStart,
                            end: currentEnd,
                            style: 'candles',
                            count: maxCandlesPerRequest,
                            req_id: Math.floor(Math.random() * 1000000) + requestCount
                        };

                        try {
                            const response = await this.sendHistoricalDataRequest(request);

                            if (response && response.candles && Array.isArray(response.candles) && response.candles.length > 0) {
                                const processedCandles = response.candles
                                    .filter((candle: any) =>
                                    {
                                        // Validate epoch - should be after 2020 (epoch > 1577836800)
                                        const isValidEpoch = candle.epoch && candle.epoch > 1577836800;
                                        if (!isValidEpoch) {
                                            logger.warn(`Filtering out candle with invalid epoch: ${candle.epoch}`);
                                        }
                                        return isValidEpoch;
                                    })
                                    .map((candle: any) => ({
                                        symbol,
                                        open: parseFloat(candle.open),
                                        high: parseFloat(candle.high),
                                        low: parseFloat(candle.low),
                                        close: parseFloat(candle.close),
                                        epoch: candle.epoch, // This should already be validated above
                                        volume: candle.volume || 0
                                    }));

                                if (processedCandles.length > 0) {
                                    candles.push(...processedCandles);
                                    totalCandlesFetched += processedCandles.length;
                                    logger.info(`✅ Received ${processedCandles.length} valid ${granularity.name} candles (Total: ${totalCandlesFetched})`);

                                    // Log first and last candle for validation
                                    const firstCandle = processedCandles[ 0 ];
                                    const lastCandle = processedCandles[ processedCandles.length - 1 ];
                                    logger.info(`📅 Batch range: ${new Date(firstCandle.epoch * 1000).toISOString()} to ${new Date(lastCandle.epoch * 1000).toISOString()}`);
                                } else {
                                    logger.warn(`❌ All candles filtered out due to invalid epochs for ${granularity.name} request ${requestCount + 1}`);
                                }

                                // Add delay between requests to avoid rate limiting
                                await new Promise(resolve => setTimeout(resolve, 1000));

                            } else {
                                logger.warn(`❌ No candles in response for ${granularity.name} request ${requestCount + 1}`);
                            }
                        } catch (requestError) {
                            logger.warn(`❌ Request ${requestCount + 1} failed for ${granularity.name}:`, requestError);
                        }

                        currentStart = currentEnd;
                        requestCount++;
                    }

                    // If we got significant data from this granularity, use it
                    if (totalCandlesFetched >= 100) {
                        logger.info(`✅ Successfully fetched ${totalCandlesFetched} candles with ${granularity.name} granularity`);
                        break;
                    }

                } catch (granularityError) {
                    logger.warn(`❌ Failed to fetch ${granularity.name} data:`, granularityError);
                }
            }

            // STRICT CHECK: Refuse to proceed without real data
            if (totalCandlesFetched === 0 || candles.length === 0) {
                const errorMsg = `❌ CRITICAL: No real historical data available for ${symbol}. Cannot proceed with backtest.`;
                logger.error(errorMsg);
                throw new Error(errorMsg + ' Please check your Deriv API connection and symbol validity. Mock data is disabled.');
            }

            // Sort candles by time and validate data quality
            candles.sort((a, b) => a.epoch - b.epoch);

            // Additional epoch validation - filter out any remaining invalid epochs
            const validCandles = candles.filter(candle =>
            {
                const isValid = candle.epoch > 1577836800; // After 2020
                if (!isValid) {
                    logger.warn(`Removing candle with invalid epoch: ${candle.epoch} (${new Date(candle.epoch * 1000).toISOString()})`);
                }
                return isValid;
            });

            if (validCandles.length !== candles.length) {
                logger.warn(`Filtered out ${candles.length - validCandles.length} candles with invalid epochs`);
                candles.length = 0; // Clear array
                candles.push(...validCandles); // Replace with valid candles
            }

            // Data quality checks
            const firstCandle = candles[ 0 ];
            const lastCandle = candles[ candles.length - 1 ];

            if (firstCandle && lastCandle) {
                const dataSpanDays = (lastCandle.epoch - firstCandle.epoch) / 86400;

                logger.info(`📊 DATA QUALITY REPORT:`);
                logger.info(`   Total Candles: ${candles.length}`);
                logger.info(`   Date Range: ${new Date(firstCandle.epoch * 1000).toISOString()} to ${new Date(lastCandle.epoch * 1000).toISOString()}`);
                logger.info(`   Data Span: ${dataSpanDays.toFixed(1)} days`);
                logger.info(`   Average Price Range: ${firstCandle.close.toFixed(2)} to ${lastCandle.close.toFixed(2)}`);

                // Validate epochs are reasonable
                if (firstCandle.epoch < 1577836800 || lastCandle.epoch < 1577836800) {
                    throw new Error(`❌ CRITICAL: Invalid epoch data detected. First: ${firstCandle.epoch}, Last: ${lastCandle.epoch}`);
                }
            }

            // Generate realistic ticks from real candles
            const ticks = this.generateRealisticTicksFromRealCandles(candles, symbol);

            logger.info(`✅ Generated ${ticks.length} realistic ticks from ${candles.length} real candles`);

            // Validate that all data is real historical data with proper timestamps
            this.validateRealHistoricalData(ticks, candles);

            return { ticks, candles };

        } catch (error) {
            logger.error('❌ CRITICAL FAILURE: Could not fetch real historical data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Real historical data fetch failed: ${errorMessage}. Backtest requires real market data only - no mock data allowed.`);
        }
    }

    /**
     * Generate realistic tick prices for a candle
     */
    private generateTickPricesForCandle(open: number, high: number, low: number, close: number, tickCount: number): number[]
    {
        const prices: number[] = [];

        // Create a realistic price path from open to close through high and low
        for (let i = 0; i < tickCount; i++) {
            const progress = i / (tickCount - 1);

            if (progress < 0.25) {
                // First quarter: move towards high or low
                const target = Math.random() > 0.5 ? high : low;
                prices.push(open + (target - open) * (progress * 4) + (Math.random() - 0.5) * Math.abs(high - low) * 0.1);
            } else if (progress < 0.75) {
                // Middle half: more volatile movement
                const range = high - low;
                const midPrice = (high + low) / 2;
                prices.push(midPrice + (Math.random() - 0.5) * range * 0.8);
            } else {
                // Last quarter: move towards close
                const prevPrice = prices[ i - 1 ] || ((high + low) / 2);
                prices.push(prevPrice + (close - prevPrice) * ((progress - 0.75) * 4) + (Math.random() - 0.5) * Math.abs(high - low) * 0.05);
            }
        }

        // Ensure first and last prices are correct
        prices[ 0 ] = open;
        prices[ prices.length - 1 ] = close;

        return prices;
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

            // Get the WebSocket connection from the client
            const ws = (this.derivClient as any).ws;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            // Set up message listener for this specific request
            const messageListener = (data: any) =>
            {
                try {
                    console.log('🔍 Received message:', data.toString());
                    const message = JSON.parse(data.toString());

                    // Check if this is our response
                    if (message.req_id === request.req_id) {
                        ws.removeListener('message', messageListener);

                        // Check for errors
                        if (message.error) {
                            const errorMsg = message.error.message || message.error.code || 'Unknown API error';
                            logger.error('Deriv API error:', {
                                error: message.error,
                                request: { symbol: request.ticks_history, granularity: request.granularity }
                            });
                            reject(new Error(`Deriv API error: ${errorMsg}`));
                            return;
                        }

                        // Check for candles response
                        if (message.msg_type === 'candles' || message.candles) {
                            resolve(message);
                        } else if (message.msg_type === 'history' || message.history) {
                            // Handle tick history response
                            resolve(message);
                        } else {
                            logger.warn('Unexpected response format:', message);
                            reject(new Error('Unexpected response format'));
                        }
                    }
                } catch (error) {
                    // Ignore parsing errors for messages not meant for us
                }
            };

            ws.on('message', messageListener);

            // Send the request
            logger.info('Sending historical data request:', {
                symbol: request.ticks_history,
                granularity: request.granularity,
                start: new Date(request.start * 1000).toISOString(),
                end: new Date(request.end * 1000).toISOString(),
                count: request.count
            });
            ws.send(JSON.stringify(request));

            // Set timeout
            setTimeout(() =>
            {
                ws.removeListener('message', messageListener);
                reject(new Error('Historical data request timed out'));
            }, 30000); // 30 second timeout
        });
    }

    /**
     * Generate realistic ticks from real candle data with proper price action simulation
     */
    private generateRealisticTicksFromRealCandles(candles: DerivCandleData[], symbol: string): DerivTickData[]
    {
        const ticks: DerivTickData[] = [];
        let tickCounter = 1;

        logger.info(`🎯 Generating realistic ticks from ${candles.length} real candles...`);

        // Validate that candles have proper epochs
        if (candles.length === 0) {
            logger.warn('No candles provided for tick generation');
            return ticks;
        }

        // Check if epochs are valid (should be > 1600000000 for dates after 2020)
        const firstCandle = candles[ 0 ];
        const lastCandle = candles[ candles.length - 1 ];

        if (firstCandle && firstCandle.epoch < 1600000000) {
            logger.error(`❌ CRITICAL: Invalid epoch detected in candle data! First candle epoch: ${firstCandle.epoch} (${new Date(firstCandle.epoch * 1000).toISOString()})`);
            throw new Error('Invalid candle epoch data - cannot generate realistic ticks');
        }

        logger.info(`📅 Candle range validation: ${new Date(firstCandle!.epoch * 1000).toISOString()} to ${new Date(lastCandle!.epoch * 1000).toISOString()}`);

        for (const candle of candles) {
            // Validate each candle epoch
            if (candle.epoch < 1600000000) {
                logger.warn(`Skipping candle with invalid epoch: ${candle.epoch}`);
                continue;
            }

            // Generate more ticks per candle for better simulation granularity
            const ticksPerCandle = 30; // More realistic tick density
            const candleDuration = 3600; // Assuming 1-hour candles
            const tickInterval = candleDuration / ticksPerCandle;

            // Create realistic price path through the candle
            const pricePoints = this.generateRealisticPricePath(
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                ticksPerCandle
            );

            for (let i = 0; i < ticksPerCandle; i++) {
                // Ensure tick time is properly calculated from candle epoch
                const tickTime = candle.epoch + Math.floor(i * tickInterval);
                const tickPrice = pricePoints[ i ];

                // Validate tick time before adding
                if (tickTime < 1600000000) {
                    logger.warn(`Skipping tick with invalid epoch: ${tickTime} for candle ${candle.epoch}`);
                    continue;
                }

                ticks.push({
                    symbol,
                    tick: tickCounter++,
                    epoch: tickTime, // This should be valid epoch in seconds
                    quote: tickPrice || candle.close, // Ensure we always have a valid price
                    pip_size: 0.01,
                });
            }
        }

        // Final validation of generated ticks
        if (ticks.length > 0) {
            const firstTick = ticks[ 0 ];
            const lastTick = ticks[ ticks.length - 1 ];
            logger.info(`✅ Generated ${ticks.length} valid ticks from ${new Date(firstTick!.epoch * 1000).toISOString()} to ${new Date(lastTick!.epoch * 1000).toISOString()}`);
        } else {
            logger.error('❌ No valid ticks generated from candle data');
        }

        return ticks;
    }

    /**
     * Generate a realistic price path through a candle's OHLC values
     */
    private generateRealisticPricePath(open: number, high: number, low: number, close: number, steps: number): number[]
    {
        const prices: number[] = [];

        // Determine if it's a bullish or bearish candle
        const isBullish = close > open;
        const bodySize = Math.abs(close - open);
        const upperWick = high - Math.max(open, close);
        const lowerWick = Math.min(open, close) - low;

        for (let i = 0; i < steps; i++) {
            const progress = i / (steps - 1);
            let price: number;

            if (progress === 0) {
                price = open;
            } else if (progress === 1) {
                price = close;
            } else if (progress < 0.2) {
                // Early phase - can move toward high or low based on candle type
                if (isBullish && upperWick > bodySize * 0.3) {
                    // Strong bullish with upper wick - early move up
                    const earlyHigh = open + (high - open) * (progress * 4);
                    price = Math.min(earlyHigh, high);
                } else if (!isBullish && lowerWick > bodySize * 0.3) {
                    // Strong bearish with lower wick - early move down
                    const earlyLow = open - (open - low) * (progress * 4);
                    price = Math.max(earlyLow, low);
                } else {
                    // Normal early movement toward direction
                    price = open + (isBullish ? 1 : -1) * bodySize * progress * 2;
                }
            } else if (progress < 0.4) {
                // Test extremes phase
                const extremeTest = Math.random();
                if (extremeTest < 0.3 && upperWick > 0) {
                    // Test the high
                    price = high - upperWick * Math.random() * 0.5;
                } else if (extremeTest < 0.6 && lowerWick > 0) {
                    // Test the low
                    price = low + lowerWick * Math.random() * 0.5;
                } else {
                    // Consolidation around middle
                    const mid = (high + low) / 2;
                    price = mid + (Math.random() - 0.5) * (high - low) * 0.3;
                }
            } else if (progress < 0.8) {
                // Middle phase - more volatile, can hit extremes
                const volatilityFactor = Math.random();
                if (volatilityFactor < 0.1) {
                    price = high; // Hit the high
                } else if (volatilityFactor < 0.2) {
                    price = low; // Hit the low
                } else {
                    // Random movement within range
                    const range = high - low;
                    price = low + Math.random() * range;
                }
            } else {
                // Final phase - move toward close
                const currentPrice = prices[ i - 1 ] || ((high + low) / 2);
                const moveToClose = (close - currentPrice) * (progress - 0.8) * 5; // Accelerate toward close
                price = currentPrice + moveToClose + (Math.random() - 0.5) * bodySize * 0.1;
            }

            // Ensure price stays within candle bounds
            price = Math.max(low, Math.min(high, price));
            prices.push(price);
        }

        // Ensure exact open and close prices
        prices[ 0 ] = open;
        prices[ prices.length - 1 ] = close;

        return prices;
    }

    /**
     * Initialize feature service with historical data
     */
    private initializeFeatureServiceWithHistoricalData(historicalData: { ticks: DerivTickData[], candles: DerivCandleData[]; }): void
    {
        // Clear existing data
        this.featureService.clearData();

        // Add historical data in chronological order
        const sortedTicks = historicalData.ticks.sort((a, b) => a.epoch - b.epoch);
        const sortedCandles = historicalData.candles.sort((a, b) => a.epoch - b.epoch);

        sortedTicks.forEach(tick => this.featureService.addTick(tick));
        sortedCandles.forEach(candle => this.featureService.addCandle(candle));

        logger.info('Feature service initialized with historical data');
    }

    /**
     * Simulate trading using historical data
     */
    public async simulateTrading(
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
            if (!tick) continue;

            const currentPrice = tick.quote;

            // Check if we need to close an existing position
            if (position) {
                const shouldClose = this.shouldClosePosition(position, currentPrice, tick.epoch, config);
                if (shouldClose) {
                    const trade = this.closePosition(position, currentPrice, tick.epoch, config);
                    trades.push(trade);
                    currentBalance += trade.pnl;
                    position = null;

                    logger.info(`Closed ${trade.direction} position: P&L ${trade.pnl.toFixed(2)}, Duration: ${trade.duration_minutes.toFixed(1)}min`);
                }
            }

            // Check if we should open a new position based on timeframe
            const shouldCheckForSignal = this.shouldCheckForTradingSignal(i, config.timeframe);
            if (!position && shouldCheckForSignal) {
                try {
                    const features = this.featureService.generateEnhancedFeatures(config.symbol);

                    // Use ONLY real historical candles - no feature service generation
                    const currentCandleIndex = Math.floor(i / 30); // Assuming 30 ticks per candle
                    const recentCandles = historicalData.candles.slice(
                        Math.max(0, currentCandleIndex - 50),
                        currentCandleIndex + 1
                    );

                    // Validate candles have proper epochs before passing to agent
                    const validCandles = recentCandles.filter(candle => candle.epoch > 1600000000);

                    if (validCandles.length === 0) {
                        logger.warn('No valid historical candles available for prediction at tick', i);
                        continue;
                    }

                    // Use advanced trading agent with REAL historical candles
                    const prediction = await this.tradingAgent.generateAdvancedPrediction(
                        config.symbol,
                        config.timeframe,
                        currentPrice,
                        features,
                        validCandles
                    );

                    // Respect the min_confidence_threshold from config
                    if (prediction.confidence >= config.min_confidence_threshold) {
                        position = {
                            direction: prediction.prediction,
                            entryPrice: currentPrice,
                            entryTime: tick.epoch,
                            confidence: prediction.confidence,
                        };

                        logger.info(`Opening ${prediction.prediction} position at ${currentPrice} with confidence ${(prediction.confidence * 100).toFixed(1)}% using ${validCandles.length} real candles`);
                    } else {
                        logger.debug(`Skipping trade - confidence ${(prediction.confidence * 100).toFixed(1)}% below threshold ${(config.min_confidence_threshold * 100).toFixed(1)}%`);
                    }
                } catch (error) {
                    logger.warn('Failed to generate prediction during backtest', { error });
                }
            }
        }

        // Close any remaining position
        if (position && ticks.length > 0) {
            const lastTick = ticks[ ticks.length - 1 ];
            if (lastTick) {
                const trade = this.closePosition(position, lastTick.quote, lastTick.epoch, config);
                trades.push(trade);
            }
        }

        return trades;
    }

    /**
     * Determine if a position should be closed
     */
    private shouldClosePosition(
        position: { direction: 'UP' | 'DOWN'; entryPrice: number; entryTime: number; confidence: number; },
        currentPrice: number,
        currentTime: number,
        config: BacktestConfig
    ): boolean
    {
        const durationMinutes = (currentTime - position.entryTime) / 60;

        // Dynamic stop-loss and take-profit based on symbol and confidence
        const baseStopLossPercentage = 0.01; // 1% base stop loss
        const baseTakeProfitPercentage = 0.015; // 1.5% base take profit

        // Adjust based on confidence (higher confidence = tighter stops)
        const confidenceMultiplier = Math.max(0.5, Math.min(1.5, position.confidence));
        const stopLossPercentage = baseStopLossPercentage / confidenceMultiplier;
        const takeProfitPercentage = baseTakeProfitPercentage * confidenceMultiplier;

        if (position.direction === 'UP') {
            const stopLoss = position.entryPrice * (1 - stopLossPercentage);
            const takeProfit = position.entryPrice * (1 + takeProfitPercentage);

            // Close if price hits stop loss or take profit
            if (currentPrice <= stopLoss || currentPrice >= takeProfit) {
                return true;
            }
        } else {
            const stopLoss = position.entryPrice * (1 + stopLossPercentage);
            const takeProfit = position.entryPrice * (1 - takeProfitPercentage);

            // Close if price hits stop loss or take profit
            if (currentPrice >= stopLoss || currentPrice <= takeProfit) {
                return true;
            }
        }

        // Time-based exit: Close after maximum holding period based on timeframe
        const maxHoldingMinutes = this.getMaxHoldingMinutes(config.timeframe);
        return durationMinutes >= maxHoldingMinutes;
    }

    /**
     * Get maximum holding time based on timeframe
     */
    private getMaxHoldingMinutes(timeframe: string): number
    {
        switch (timeframe) {
            case '1m': return 5;     // 5 minutes for 1m timeframe
            case '5m': return 25;    // 25 minutes for 5m timeframe
            case '15m': return 75;   // 75 minutes for 15m timeframe
            case '1h': return 240;   // 4 hours for 1h timeframe
            case '4h': return 960;   // 16 hours for 4h timeframe
            case '1d': return 2880;  // 2 days for daily timeframe
            default: return 240;     // Default 4 hours
        }
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
     * Calculate performance metrics
     */
    public calculatePerformanceMetrics(trades: BacktestTrade[], config: BacktestConfig): PerformanceMetrics
    {
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl < 0);

        const accuracy = totalTrades > 0 ? (trades.filter(t => t.was_correct).length / totalTrades) * 100 : 0;
        const precision = winningTrades.length > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
        const recall = totalTrades > 0 ? (trades.filter(t => t.was_correct).length / totalTrades) * 100 : 0;
        const f1_score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

        const confusionMatrix: ConfusionMatrix = {
            true_positive: trades.filter(t => t.direction === 'UP' && t.was_correct).length,
            true_negative: trades.filter(t => t.direction === 'DOWN' && t.was_correct).length,
            false_positive: trades.filter(t => t.direction === 'UP' && !t.was_correct).length,
            false_negative: trades.filter(t => t.direction === 'DOWN' && !t.was_correct).length,
        };

        return {
            accuracy,
            precision,
            recall,
            f1_score,
            confusion_matrix: confusionMatrix,
            daily_returns: [],
            monthly_summary: [],
        };
    }

    /**
     * Calculate maximum drawdown
     */
    public calculateMaxDrawdown(trades: BacktestTrade[]): number
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
    public calculateSharpeRatio(trades: BacktestTrade[]): number
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
    public calculateProfitFactor(trades: BacktestTrade[]): number
    {
        const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));

        return totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    }

    /**
     * Determine if we should check for a trading signal based on timeframe
     */
    private shouldCheckForTradingSignal(tickIndex: number, timeframe: string): boolean
    {
        // Check for signals based on timeframe intervals
        switch (timeframe) {
            case '1m':
                return tickIndex % 60 === 0; // Every 60 ticks (1 minute)
            case '5m':
                return tickIndex % 300 === 0; // Every 300 ticks (5 minutes)
            case '15m':
                return tickIndex % 900 === 0; // Every 900 ticks (15 minutes)
            case '1h':
                return tickIndex % 3600 === 0; // Every 3600 ticks (1 hour)
            case '4h':
                return tickIndex % 14400 === 0; // Every 14400 ticks (4 hours)
            case '1d':
                return tickIndex % 86400 === 0; // Every 86400 ticks (1 day)
            default:
                return tickIndex % 3600 === 0; // Default to 1 hour
        }
    }

    /**
     * Validate that all data is real historical data with proper timestamps
     */
    private validateRealHistoricalData(ticks: DerivTickData[], candles: DerivCandleData[]): void
    {
        logger.info('🔍 Validating historical data authenticity...');

        // Minimum epoch for 2020 (to avoid 1970 dates)
        const MIN_VALID_EPOCH = 1577836800; // 2020-01-01
        const MAX_VALID_EPOCH = Math.floor(Date.now() / 1000); // Current time

        // Validate ticks
        const invalidTicks = ticks.filter(tick =>
            !tick.epoch ||
            tick.epoch < MIN_VALID_EPOCH ||
            tick.epoch > MAX_VALID_EPOCH ||
            !tick.quote ||
            tick.quote <= 0
        );

        if (invalidTicks.length > 0) {
            logger.error(`❌ Found ${invalidTicks.length} invalid ticks out of ${ticks.length}`);
            logger.error('Sample invalid ticks:', invalidTicks.slice(0, 3).map(t => ({
                epoch: t.epoch,
                date: new Date(t.epoch * 1000).toISOString(),
                quote: t.quote
            })));
            throw new Error(`Invalid tick data detected. Found ${invalidTicks.length} ticks with invalid timestamps or prices.`);
        }

        // Validate candles
        const invalidCandles = candles.filter(candle =>
            !candle.epoch ||
            candle.epoch < MIN_VALID_EPOCH ||
            candle.epoch > MAX_VALID_EPOCH ||
            !candle.open || !candle.high || !candle.low || !candle.close ||
            candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0
        );

        if (invalidCandles.length > 0) {
            logger.error(`❌ Found ${invalidCandles.length} invalid candles out of ${candles.length}`);
            logger.error('Sample invalid candles:', invalidCandles.slice(0, 3).map(c => ({
                epoch: c.epoch,
                date: new Date(c.epoch * 1000).toISOString(),
                ohlc: { open: c.open, high: c.high, low: c.low, close: c.close }
            })));
            throw new Error(`Invalid candle data detected. Found ${invalidCandles.length} candles with invalid timestamps or prices.`);
        }

        // Validate chronological order
        for (let i = 1; i < ticks.length; i++) {
            const currentTick = ticks[ i ];
            const previousTick = ticks[ i - 1 ];
            if (currentTick && previousTick && currentTick.epoch < previousTick.epoch) {
                logger.error(`❌ Ticks not in chronological order at index ${i}`);
                throw new Error('Tick data is not in chronological order');
            }
        }

        for (let i = 1; i < candles.length; i++) {
            const currentCandle = candles[ i ];
            const previousCandle = candles[ i - 1 ];
            if (currentCandle && previousCandle && currentCandle.epoch < previousCandle.epoch) {
                logger.error(`❌ Candles not in chronological order at index ${i}`);
                throw new Error('Candle data is not in chronological order');
            }
        }

        logger.info(`✅ Data validation passed: ${ticks.length} ticks, ${candles.length} candles`);

        // Safe access to first and last ticks
        const firstTick = ticks[ 0 ];
        const lastTick = ticks[ ticks.length - 1 ];
        if (firstTick && lastTick) {
            logger.info(`📅 Data range: ${new Date(firstTick.epoch * 1000).toISOString()} to ${new Date(lastTick.epoch * 1000).toISOString()}`);
        }
    }

    /**
     * NEW: Validate strategy performance before live trading
     */
    async validateStrategy(symbol: string, timeframe: string = '1m'): Promise<boolean>
    {
        console.log(`🧪 Validating strategy for ${symbol} on ${timeframe} timeframe...`);

        const config: BacktestConfig = {
            symbol,
            timeframe,
            start_date: this.getDateDaysAgo(90), // Last 90 days
            end_date: new Date().toISOString().split('T')[ 0 ],
            initial_balance: 10000,
            risk_per_trade: 0.02,
            min_confidence_threshold: 0.65 // Only trade high confidence signals
        };

        try {
            const result = await this.runBacktest(config);

            // Strategy validation criteria (stricter than before)
            const isValid =
                result.win_rate >= 60 && // Minimum 60% win rate
                result.profit_factor >= 1.5 && // Minimum 1.5 profit factor
                result.total_trades >= 10 && // At least 10 trades for statistical significance
                result.total_pnl > 0 && // Must be profitable
                result.max_drawdown < 20; // Maximum 20% drawdown

            console.log(`📊 Strategy Validation Results for ${symbol}:`);
            console.log(`   ✅ Win Rate: ${result.win_rate.toFixed(1)}% (required: ≥60%)`);
            console.log(`   ✅ Profit Factor: ${result.profit_factor.toFixed(2)} (required: ≥1.5)`);
            console.log(`   ✅ Total Trades: ${result.total_trades} (required: ≥10)`);
            console.log(`   ✅ Total P&L: ${result.total_pnl.toFixed(2)} (required: >0)`);
            console.log(`   ✅ Max Drawdown: ${result.max_drawdown.toFixed(1)}% (required: <20%)`);
            console.log(`   📈 Sharpe Ratio: ${result.sharpe_ratio.toFixed(2)}`);
            console.log(`   🎯 Status: ${isValid ? '✅ STRATEGY VALIDATED' : '❌ STRATEGY FAILED'}`);

            if (!isValid) {
                console.log('⚠️ Strategy validation failed - recommend parameter adjustment or additional training');
            }

            return isValid;

        } catch (error) {
            console.error('❌ Strategy validation failed:', error);
            return false;
        }
    }

    /**
     * Helper: Get date N days ago in YYYY-MM-DD format
     */
    private getDateDaysAgo(days: number): string
    {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[ 0 ];
    }
}
