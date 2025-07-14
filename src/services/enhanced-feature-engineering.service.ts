import { DerivTickData, DerivCandleData } from '../services/deriv-client';
import
{
    EnhancedMarketFeatures,
    EnhancedTechnicalIndicators,
    MarketRegime,
    SpikeAnalysis,
    SymbolConfiguration,
    SYMBOL_CONFIGS,
    SESSION_TIMES
} from '../types/enhanced-features.types';

/**
 * Enhanced Feature Engineering Service - Phase 1 Implementation
 * Implements symbol-specific technical indicators and improved calculations
 */
export class EnhancedFeatureEngineeringService
{
    private tickBuffers: Map<string, DerivTickData[]> = new Map();
    private candleBuffers: Map<string, DerivCandleData[]> = new Map();
    private spikeTracking: Map<string, { lastSpikeIndex: number; tickCount: number; spikeHistory: number[]; }> = new Map();
    private readonly MAX_BUFFER_SIZE = 1000;
    private readonly VOLATILITY_HISTORY_SIZE = 100;

    /**
     * Add tick data and update buffers
     */
    addTick(tick: DerivTickData): void
    {
        const buffer = this.tickBuffers.get(tick.symbol) || [];
        buffer.push(tick);

        if (buffer.length > this.MAX_BUFFER_SIZE) {
            buffer.shift();
        }

        this.tickBuffers.set(tick.symbol, buffer);
        this.detectEnhancedSpike(tick);
    }

    /**
     * Add candle data and update buffers
     */
    addCandle(candle: DerivCandleData): void
    {
        const buffer = this.candleBuffers.get(candle.symbol) || [];
        buffer.push(candle);

        if (buffer.length > this.MAX_BUFFER_SIZE) {
            buffer.shift();
        }

        this.candleBuffers.set(candle.symbol, buffer);
    }

    /**
     * Clear all data buffers for backtesting
     */
    clearData(): void
    {
        this.tickBuffers.clear();
        this.candleBuffers.clear();
        this.spikeTracking.clear();
    }

    /**
     * Generate enhanced market features for a symbol
     */
    generateEnhancedFeatures(symbol: string, intervalSeconds: number = 60): EnhancedMarketFeatures
    {
        const ticks = this.tickBuffers.get(symbol) || [];
        let candles = this.generateCandlesFromTicks(ticks, intervalSeconds);

        console.log(`🔍 Enhanced Features Debug - Symbol: ${symbol}`);
        console.log(`📊 Ticks available: ${ticks.length}`);
        console.log(`🕯️ Candles generated: ${candles.length}`);
        console.log(`📈 Last few tick prices:`, ticks.slice(-5).map(t => t.quote));
        console.log(`🕯️ Last few candle closes:`, candles.slice(-5).map(c => c.close));

        // If we don't have enough candles, try with a shorter interval
        if (candles.length < 20 && ticks.length >= 50) {
            console.log(`⚠️ Insufficient candles (${candles.length} < 20), trying with shorter interval...`);

            // Try different intervals: 30s, 15s, 10s, 5s
            const intervals = [ 30, 15, 10, 5 ];
            for (const interval of intervals) {
                candles = this.generateCandlesFromTicks(ticks, interval);
                console.log(`   🕯️ Tried ${interval}s interval: ${candles.length} candles`);
                if (candles.length >= 20) {
                    console.log(`   ✅ Found sufficient candles with ${interval}s interval`);
                    break;
                }
            }
        }

        if (candles.length < 20) {
            console.log(`⚠️ Insufficient candles (${candles.length} < 20), using default features`);
            return this.getDefaultEnhancedFeatures(symbol);
        }

        const config = this.getSymbolConfig(symbol);
        const technicalIndicators = this.calculateEnhancedTechnicalIndicators(candles, config);
        const marketRegime = this.analyzeMarketRegime(candles, technicalIndicators);
        const spikeAnalysis = this.generateSpikeAnalysis(symbol);
        const sessionStrength = this.calculateSessionStrength();

        console.log(`🔧 Technical Indicators calculated:`);
        console.log(`   RSI: ${technicalIndicators.rsi.toFixed(2)}`);
        console.log(`   MACD Line: ${technicalIndicators.macd_line.toFixed(4)}`);
        console.log(`   MACD Signal: ${technicalIndicators.macd_signal.toFixed(4)}`);
        console.log(`   Stochastic: ${technicalIndicators.stochastic.toFixed(2)}`);
        console.log(`   Williams %R: ${technicalIndicators.williams_r.toFixed(2)}`);
        console.log(`   ATR: ${technicalIndicators.atr.toFixed(4)}`);
        console.log(`   Bollinger Position: ${technicalIndicators.bollinger_position.toFixed(2)}`);

        return {
            // Original features for backward compatibility
            price_velocity: this.calculatePriceVelocity(candles),
            price_acceleration: this.calculatePriceAcceleration(candles),
            volatility_momentum: this.calculateVolatilityMomentum(candles),
            trend_strength: this.calculateTrendStrength(candles),
            support_resistance_proximity: this.calculateSupportResistanceProximity(candles),
            rsi: technicalIndicators.rsi,
            macd_signal: technicalIndicators.macd_line,
            bollinger_position: technicalIndicators.bollinger_position,
            ticks_since_last_spike: spikeAnalysis?.ticks_since_last,
            spike_probability: spikeAnalysis?.probability,

            // Enhanced features
            technical_indicators: technicalIndicators,
            market_regime: marketRegime,
            spike_analysis: spikeAnalysis,
            session_strength: sessionStrength,
            session_volatility_adjustment: this.calculateSessionVolatilityAdjustment(),
            symbol_momentum: this.calculateSymbolSpecificMomentum(candles, config),
            volatility_rank: this.calculateVolatilityRank(candles),
        };
    }

    /**
     * Calculate enhanced technical indicators with symbol-specific parameters
     */
    private calculateEnhancedTechnicalIndicators(candles: DerivCandleData[], config: SymbolConfiguration): EnhancedTechnicalIndicators
    {
        // RSI with Wilder's smoothing method
        const rsi = this.calculateWildersRSI(candles, config.rsi_period);
        const stochRsi = this.calculateStochasticRSI(candles, config.rsi_period);
        const rsiDivergence = this.calculateRSIDivergence(candles, config.rsi_period);

        // MACD with symbol-specific settings
        const { macdLine, macdSignal, macdHistogram } = this.calculateEnhancedMACD(candles, config.macd);
        const macdDivergence = this.calculateMACDDivergence(candles, config.macd);

        // Volatility indicators
        const atr = this.calculateATR(candles, config.atr_period);
        const atrNormalized = this.normalizeATR(atr, candles);
        const trueRange = this.calculateTrueRange(candles);

        // Momentum indicators
        const stochastic = this.calculateStochastic(candles);
        const williamsR = this.calculateWilliamsR(candles);

        // Enhanced Bollinger Bands
        const { position, width, squeeze } = this.calculateEnhancedBollinger(candles, config);

        return {
            rsi,
            stoch_rsi: stochRsi,
            rsi_divergence: rsiDivergence,
            macd_line: macdLine,
            macd_signal: macdSignal,
            macd_histogram: macdHistogram,
            macd_divergence: macdDivergence,
            atr,
            atr_normalized: atrNormalized,
            true_range: trueRange,
            stochastic,
            williams_r: williamsR,
            bollinger_position: position,
            bollinger_width: width,
            bollinger_squeeze: squeeze,
        };
    }

    /**
     * Calculate RSI using Wilder's smoothing method for more accuracy
     */
    private calculateWildersRSI(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period + 1) return 50;

        const changes: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            const current = candles[ i ];
            const previous = candles[ i - 1 ];
            if (current && previous) {
                changes.push(current.close - previous.close);
            }
        }

        if (changes.length < period) return 50;

        // Calculate initial average gain and loss
        let avgGain = 0;
        let avgLoss = 0;

        for (let i = 0; i < period; i++) {
            const change = changes[ i ];
            if (change !== undefined) {
                if (change > 0) {
                    avgGain += change;
                } else {
                    avgLoss += Math.abs(change);
                }
            }
        }

        avgGain /= period;
        avgLoss /= period;

        // Apply Wilder's smoothing to remaining data
        for (let i = period; i < changes.length; i++) {
            const change = changes[ i ];
            if (change !== undefined) {
                const gain = change > 0 ? change : 0;
                const loss = change < 0 ? Math.abs(change) : 0;

                avgGain = (avgGain * (period - 1) + gain) / period;
                avgLoss = (avgLoss * (period - 1) + loss) / period;
            }
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate Stochastic RSI for momentum confirmation
     */
    private calculateStochasticRSI(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period * 2) return 50;

        const rsiValues: number[] = [];
        for (let i = period; i < candles.length; i++) {
            const subset = candles.slice(i - period, i + 1);
            rsiValues.push(this.calculateWildersRSI(subset, period));
        }

        if (rsiValues.length < 14) return 50;

        const recent14 = rsiValues.slice(-14);
        const currentRSI = rsiValues[ rsiValues.length - 1 ];
        const minRSI = Math.min(...recent14);
        const maxRSI = Math.max(...recent14);

        const range = maxRSI - minRSI;
        return range > 0 && currentRSI !== undefined ? ((currentRSI - minRSI) / range) * 100 : 50;
    }

    /**
     * Calculate RSI divergence detection
     */
    private calculateRSIDivergence(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period * 3) return 0;

        const lookback = Math.min(50, candles.length);
        const recent = candles.slice(-lookback);
        const prices = recent.map(c => c.close);
        const rsiValues: number[] = [];

        for (let i = period; i < recent.length; i++) {
            const subset = recent.slice(i - period, i + 1);
            rsiValues.push(this.calculateWildersRSI(subset, period));
        }

        if (rsiValues.length < 10) return 0;

        // Simple divergence detection: compare price and RSI trends
        const priceSlope = this.calculateSlope(prices.slice(-10));
        const rsiSlope = this.calculateSlope(rsiValues.slice(-10));

        // Bullish divergence: price falling, RSI rising
        // Bearish divergence: price rising, RSI falling
        if (priceSlope > 0 && rsiSlope < 0) return -1; // Bearish divergence
        if (priceSlope < 0 && rsiSlope > 0) return 1;  // Bullish divergence
        return 0;
    }

    /**
     * Calculate enhanced MACD with symbol-specific settings
     */
    private calculateEnhancedMACD(candles: DerivCandleData[], config: { fast: number; slow: number; signal: number; }): { macdLine: number; macdSignal: number; macdHistogram: number; }
    {
        if (candles.length < config.slow + config.signal) {
            return { macdLine: 0, macdSignal: 0, macdHistogram: 0 };
        }

        const prices = candles.map(c => c.close);
        const emaFast = this.calculateEMA(prices, config.fast);
        const emaSlow = this.calculateEMA(prices, config.slow);
        const macdLine = emaFast - emaSlow;

        // Calculate MACD signal line
        const macdHistory: number[] = [];
        for (let i = config.slow; i < candles.length; i++) {
            const subset = candles.slice(0, i + 1);
            const subPrices = subset.map(c => c.close);
            const subFast = this.calculateEMA(subPrices, config.fast);
            const subSlow = this.calculateEMA(subPrices, config.slow);
            macdHistory.push(subFast - subSlow);
        }

        const macdSignal = this.calculateEMA(macdHistory, config.signal);
        const macdHistogram = macdLine - macdSignal;

        return { macdLine, macdSignal, macdHistogram };
    }

    /**
     * Calculate MACD divergence detection
     */
    private calculateMACDDivergence(candles: DerivCandleData[], config: { fast: number; slow: number; signal: number; }): number
    {
        if (candles.length < config.slow * 2) return 0;

        const prices = candles.map(c => c.close);
        const macdHistory: number[] = [];

        for (let i = config.slow; i < candles.length; i++) {
            const subset = candles.slice(0, i + 1);
            const subPrices = subset.map(c => c.close);
            const emaFast = this.calculateEMA(subPrices, config.fast);
            const emaSlow = this.calculateEMA(subPrices, config.slow);
            macdHistory.push(emaFast - emaSlow);
        }

        if (macdHistory.length < 10) return 0;

        const priceSlope = this.calculateSlope(prices.slice(-10));
        const macdSlope = this.calculateSlope(macdHistory.slice(-10));

        if (priceSlope > 0 && macdSlope < 0) return -1; // Bearish divergence
        if (priceSlope < 0 && macdSlope > 0) return 1;  // Bullish divergence
        return 0;
    }

    /**
     * Calculate Average True Range (ATR)
     */
    private calculateATR(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period + 1) return 0;

        const trueRanges: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            const current = candles[ i ];
            const previous = candles[ i - 1 ];
            if (current && previous) {
                const tr = Math.max(
                    current.high - current.low,
                    Math.abs(current.high - previous.close),
                    Math.abs(current.low - previous.close)
                );
                trueRanges.push(tr);
            }
        }

        if (trueRanges.length < period) return 0;

        // Use Wilder's smoothing for ATR
        let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

        for (let i = period; i < trueRanges.length; i++) {
            const tr = trueRanges[ i ];
            if (tr !== undefined) {
                atr = (atr * (period - 1) + tr) / period;
            }
        }

        return atr;
    }

    /**
     * Normalize ATR for comparison across symbols
     */
    private normalizeATR(atr: number, candles: DerivCandleData[]): number
    {
        if (candles.length === 0) return 0;
        const lastCandle = candles[ candles.length - 1 ];
        if (!lastCandle) return 0;
        const currentPrice = lastCandle.close;
        return currentPrice > 0 ? (atr / currentPrice) * 100 : 0;
    }

    /**
     * Calculate current True Range
     */
    private calculateTrueRange(candles: DerivCandleData[]): number
    {
        if (candles.length < 2) return 0;

        const current = candles[ candles.length - 1 ];
        const previous = candles[ candles.length - 2 ];

        if (!current || !previous) return 0;

        return Math.max(
            current.high - current.low,
            Math.abs(current.high - previous.close),
            Math.abs(current.low - previous.close)
        );
    }

    /**
     * Calculate Stochastic Oscillator
     */
    private calculateStochastic(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period) return 50;

        const recent = candles.slice(-period);
        const lastCandle = recent[ recent.length - 1 ];
        if (!lastCandle) return 50;

        const currentClose = lastCandle.close;
        const highestHigh = Math.max(...recent.map(c => c.high));
        const lowestLow = Math.min(...recent.map(c => c.low));

        const range = highestHigh - lowestLow;
        return range > 0 ? ((currentClose - lowestLow) / range) * 100 : 50;
    }

    /**
     * Calculate Williams %R
     */
    private calculateWilliamsR(candles: DerivCandleData[], period: number = 14): number
    {
        const stoch = this.calculateStochastic(candles, period);
        return stoch - 100; // Williams %R is inverted Stochastic
    }

    /**
     * Calculate enhanced Bollinger Bands with squeeze detection
     */
    private calculateEnhancedBollinger(candles: DerivCandleData[], config: SymbolConfiguration): { position: number; width: number; squeeze: boolean; }
    {
        if (candles.length < config.bollinger_period) {
            return { position: 0.5, width: 0, squeeze: false };
        }

        const recent = candles.slice(-config.bollinger_period);
        const prices = recent.map(c => c.close);
        const sma = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
        const stdDev = Math.sqrt(variance);

        const currentPrice = prices[ prices.length - 1 ];
        if (currentPrice === undefined) {
            return { position: 0.5, width: 0, squeeze: false };
        }

        const upperBand = sma + (config.bollinger_std * stdDev);
        const lowerBand = sma - (config.bollinger_std * stdDev);

        const bandWidth = upperBand - lowerBand;
        const position = bandWidth > 0 ? (currentPrice - lowerBand) / bandWidth : 0.5;
        const width = currentPrice > 0 ? bandWidth / currentPrice : 0;

        // Bollinger squeeze detection (compare to historical width)
        const historicalWidths: number[] = [];
        for (let i = config.bollinger_period; i < candles.length; i++) {
            const subset = candles.slice(i - config.bollinger_period, i);
            const subPrices = subset.map(c => c.close);
            const subSma = subPrices.reduce((sum, p) => sum + p, 0) / subPrices.length;
            const subVariance = subPrices.reduce((sum, p) => sum + Math.pow(p - subSma, 2), 0) / subPrices.length;
            const subStdDev = Math.sqrt(subVariance);
            const subWidth = (2 * config.bollinger_std * subStdDev) / subSma;
            historicalWidths.push(subWidth);
        }

        const avgHistoricalWidth = historicalWidths.length > 0 ?
            historicalWidths.reduce((sum, w) => sum + w, 0) / historicalWidths.length : width;

        const squeeze = width < avgHistoricalWidth * 0.8; // Squeeze when current width is 80% below average

        return { position, width, squeeze };
    }

    // Additional helper methods would continue here...
    // (calculateEMA, calculateSlope, analyzeMarketRegime, etc.)

    /**
     * Calculate Exponential Moving Average
     */
    private calculateEMA(prices: number[], period: number): number
    {
        if (prices.length < period) {
            const lastPrice = prices[ prices.length - 1 ];
            return lastPrice !== undefined ? lastPrice : 0;
        }

        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

        for (let i = period; i < prices.length; i++) {
            const price = prices[ i ];
            if (price !== undefined) {
                ema = (price * multiplier) + (ema * (1 - multiplier));
            }
        }

        return ema;
    }

    /**
     * Calculate slope for trend analysis
     */
    private calculateSlope(values: number[]): number
    {
        if (values.length < 2) return 0;

        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

        const denominator = n * sumXX - sumX * sumX;
        return denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    }

    /**
     * Get symbol-specific configuration
     */
    private getSymbolConfig(symbol: string): SymbolConfiguration
    {
        const config = SYMBOL_CONFIGS[ symbol ] || SYMBOL_CONFIGS[ 'R_25' ];
        if (!config) {
            // Fallback configuration if nothing is found
            return {
                rsi_period: 14,
                macd: { fast: 12, slow: 26, signal: 9 },
                bollinger_period: 20,
                bollinger_std: 2,
                atr_period: 14,
                spike_threshold: 0.02,
                volatility_multiplier: 1.0
            };
        }
        return config;
    }

    /**
     * Enhanced spike detection with dynamic thresholds
     */
    private detectEnhancedSpike(tick: DerivTickData): void
    {
        const ticks = this.tickBuffers.get(tick.symbol) || [];
        if (ticks.length < 2) return;

        const config = this.getSymbolConfig(tick.symbol);
        const previousTick = ticks[ ticks.length - 2 ];

        if (!previousTick || previousTick.tick <= 0) return;

        const priceChange = Math.abs((tick.tick - previousTick.tick) / previousTick.tick);

        // Use dynamic threshold based on symbol configuration
        if (priceChange > config.spike_threshold) {
            const tracking = this.spikeTracking.get(tick.symbol) || {
                lastSpikeIndex: 0,
                tickCount: 0,
                spikeHistory: []
            };

            tracking.lastSpikeIndex = ticks.length - 1;
            tracking.tickCount = 0;
            tracking.spikeHistory.push(ticks.length - 1);

            // Keep only recent spike history
            if (tracking.spikeHistory.length > 10) {
                tracking.spikeHistory.shift();
            }

            this.spikeTracking.set(tick.symbol, tracking);
        } else {
            const tracking = this.spikeTracking.get(tick.symbol);
            if (tracking) {
                tracking.tickCount++;
                this.spikeTracking.set(tick.symbol, tracking);
            }
        }
    }

    // Placeholder methods for remaining functionality
    private getDefaultEnhancedFeatures(symbol: string): EnhancedMarketFeatures
    {
        const config = this.getSymbolConfig(symbol);
        return {
            // Original features
            price_velocity: 0,
            price_acceleration: 0,
            volatility_momentum: 0.5,
            trend_strength: 0.5,
            support_resistance_proximity: 0.5,
            rsi: 50,
            macd_signal: 0,
            bollinger_position: 0.5,
            ticks_since_last_spike: undefined,
            spike_probability: undefined,

            // Enhanced features with defaults
            technical_indicators: {
                rsi: 50,
                stoch_rsi: 50,
                rsi_divergence: 0,
                macd_line: 0,
                macd_signal: 0,
                macd_histogram: 0,
                macd_divergence: 0,
                atr: 0,
                atr_normalized: 0,
                true_range: 0,
                stochastic: 50,
                williams_r: -50,
                bollinger_position: 0.5,
                bollinger_width: 0,
                bollinger_squeeze: false,
            },
            market_regime: {
                volatility_state: 'NORMAL',
                trend_state: 'SIDEWAYS',
                momentum_state: 'STEADY',
                overall_regime: 'RANGING',
                confluence_score: 0.5,
            },
            spike_analysis: symbol.includes('BOOM') || symbol.includes('CRASH') ? {
                proximity_state: 'SAFE',
                probability: 0,
                ticks_since_last: 0,
                expected_ticks: symbol.includes('1000') ? 1000 : 500,
                spike_strength_prediction: 0,
            } : undefined,
            session_strength: 0.5,
            session_volatility_adjustment: 1.0,
            symbol_momentum: 0.5,
            volatility_rank: 0.5,
        };
    }

    private analyzeMarketRegime(candles: DerivCandleData[], indicators: EnhancedTechnicalIndicators): MarketRegime
    {
        // Volatility state analysis
        const atrNormalized = indicators.atr_normalized;
        let volatilityState: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
        if (atrNormalized < 0.5) volatilityState = 'LOW';
        else if (atrNormalized < 1.0) volatilityState = 'NORMAL';
        else if (atrNormalized < 2.0) volatilityState = 'HIGH';
        else volatilityState = 'EXTREME';

        // Trend state analysis
        const rsi = indicators.rsi;
        const macdHistogram = indicators.macd_histogram;
        let trendState: 'STRONG_UP' | 'WEAK_UP' | 'SIDEWAYS' | 'WEAK_DOWN' | 'STRONG_DOWN';

        if (rsi > 70 && macdHistogram > 0) trendState = 'STRONG_UP';
        else if (rsi > 55 && macdHistogram > 0) trendState = 'WEAK_UP';
        else if (rsi < 30 && macdHistogram < 0) trendState = 'STRONG_DOWN';
        else if (rsi < 45 && macdHistogram < 0) trendState = 'WEAK_DOWN';
        else trendState = 'SIDEWAYS';

        // Momentum state analysis
        const stochRsi = indicators.stoch_rsi;
        let momentumState: 'ACCELERATING' | 'STEADY' | 'DECELERATING';
        if (stochRsi > 80 || stochRsi < 20) momentumState = 'ACCELERATING';
        else if (stochRsi > 60 || stochRsi < 40) momentumState = 'STEADY';
        else momentumState = 'DECELERATING';

        // Overall regime classification
        let overallRegime: 'TRENDING' | 'RANGING' | 'BREAKOUT' | 'REVERSAL';
        if (indicators.bollinger_squeeze) overallRegime = 'BREAKOUT';
        else if (Math.abs(indicators.rsi_divergence) > 0.5 || Math.abs(indicators.macd_divergence) > 0.5) overallRegime = 'REVERSAL';
        else if (trendState.includes('STRONG')) overallRegime = 'TRENDING';
        else overallRegime = 'RANGING';

        // Confluence score calculation
        const trendConfluence = trendState !== 'SIDEWAYS' ? 0.3 : 0.1;
        const momentumConfluence = momentumState === 'ACCELERATING' ? 0.3 : momentumState === 'STEADY' ? 0.2 : 0.1;
        const volatilityConfluence = volatilityState === 'NORMAL' ? 0.2 : 0.1;
        const divergenceConfluence = Math.abs(indicators.rsi_divergence) === 0 && Math.abs(indicators.macd_divergence) === 0 ? 0.2 : 0.1;

        const confluenceScore = trendConfluence + momentumConfluence + volatilityConfluence + divergenceConfluence;

        return {
            volatility_state: volatilityState,
            trend_state: trendState,
            momentum_state: momentumState,
            overall_regime: overallRegime,
            confluence_score: Math.min(1.0, confluenceScore),
        };
    }

    private generateSpikeAnalysis(symbol: string): SpikeAnalysis | undefined
    {
        if (!symbol.includes('BOOM') && !symbol.includes('CRASH')) {
            return undefined;
        }

        const tracking = this.spikeTracking.get(symbol);
        const expectedTicks = symbol.includes('1000') ? 1000 : 500;
        const ticksSinceSpike = tracking?.tickCount || 0;

        // Calculate proximity state
        let proximityState: 'SAFE' | 'WARNING' | 'DANGER' | 'IMMINENT';
        const proximityRatio = ticksSinceSpike / expectedTicks;

        if (proximityRatio < 0.6) proximityState = 'SAFE';
        else if (proximityRatio < 0.8) proximityState = 'WARNING';
        else if (proximityRatio < 0.95) proximityState = 'DANGER';
        else proximityState = 'IMMINENT';

        // Calculate probability using normal distribution
        const probability = Math.min(1, 1 / (1 + Math.exp(-10 * (proximityRatio - 0.8))));

        // Predict spike strength based on historical patterns
        const spikeStrengthPrediction = Math.min(1, proximityRatio * 1.2);

        return {
            proximity_state: proximityState,
            probability,
            ticks_since_last: ticksSinceSpike,
            expected_ticks: expectedTicks,
            spike_strength_prediction: spikeStrengthPrediction,
        };
    }

    private calculateSessionStrength(): number
    {
        const now = new Date();
        const utcHour = now.getUTCHours();

        let sessionStrength = 0;

        // London session
        if (utcHour >= SESSION_TIMES.LONDON.start && utcHour < SESSION_TIMES.LONDON.end) {
            sessionStrength += 0.4;
        }

        // New York session
        if (utcHour >= SESSION_TIMES.NEW_YORK.start && utcHour < SESSION_TIMES.NEW_YORK.end) {
            sessionStrength += 0.4;
        }

        // Asia session
        if (utcHour >= SESSION_TIMES.ASIA.start && utcHour < SESSION_TIMES.ASIA.end) {
            sessionStrength += 0.3;
        }

        // Overlap bonuses
        if (utcHour >= 13 && utcHour < 17) { // London-NY overlap
            sessionStrength += 0.2;
        }

        return Math.min(1.0, sessionStrength);
    }

    private calculateSessionVolatilityAdjustment(): number
    {
        const sessionStrength = this.calculateSessionStrength();
        // Higher session strength = higher expected volatility
        return 0.8 + (sessionStrength * 0.4); // Range: 0.8 to 1.2
    }

    private calculateSymbolSpecificMomentum(candles: DerivCandleData[], config: SymbolConfiguration): number
    {
        if (candles.length < 10) return 0.5;

        const recent = candles.slice(-10);
        let momentum = 0;

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous && previous.close > 0) {
                const change = (current.close - previous.close) / previous.close;
                momentum += change * config.volatility_multiplier;
            }
        }

        // Normalize momentum to 0-1 range
        return Math.max(0, Math.min(1, 0.5 + momentum * 10));
    }

    private calculateVolatilityRank(candles: DerivCandleData[]): number
    {
        if (candles.length < 50) return 0.5;

        // Calculate current volatility (last 10 periods)
        const recent = candles.slice(-10);
        let currentVol = 0;
        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous && previous.close > 0) {
                const change = Math.abs((current.close - previous.close) / previous.close);
                currentVol += change;
            }
        }
        currentVol /= (recent.length - 1);

        // Calculate historical volatilities
        const historicalVols: number[] = [];
        for (let i = 10; i < candles.length - 10; i += 10) {
            const subset = candles.slice(i, i + 10);
            let vol = 0;
            for (let j = 1; j < subset.length; j++) {
                const current = subset[ j ];
                const previous = subset[ j - 1 ];
                if (current && previous && previous.close > 0) {
                    const change = Math.abs((current.close - previous.close) / previous.close);
                    vol += change;
                }
            }
            vol /= (subset.length - 1);
            historicalVols.push(vol);
        }

        if (historicalVols.length === 0) return 0.5;

        // Calculate percentile rank
        const lowerCount = historicalVols.filter(vol => vol < currentVol).length;
        return lowerCount / historicalVols.length;
    }

    // Original methods preserved for compatibility
    private calculatePriceVelocity(candles: DerivCandleData[]): number
    {
        if (candles.length < 2) return 0;

        const recent = candles.slice(-10);
        let totalChange = 0;
        let validChanges = 0;

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous && previous.close > 0) {
                const change = (current.close - previous.close) / previous.close;
                totalChange += change;
                validChanges++;
            }
        }

        return validChanges > 0 ? totalChange / validChanges : 0;
    }

    private calculatePriceAcceleration(candles: DerivCandleData[]): number
    {
        if (candles.length < 3) return 0;

        const velocities: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            const current = candles[ i ];
            const previous = candles[ i - 1 ];
            if (current && previous && previous.close > 0) {
                velocities.push((current.close - previous.close) / previous.close);
            }
        }

        if (velocities.length < 2) return 0;

        const recent = velocities.slice(-5);
        let totalAccel = 0;
        for (let i = 1; i < recent.length; i++) {
            const currentVel = recent[ i ];
            const previousVel = recent[ i - 1 ];
            if (currentVel !== undefined && previousVel !== undefined) {
                totalAccel += currentVel - previousVel;
            }
        }

        return recent.length > 1 ? totalAccel / (recent.length - 1) : 0;
    }

    private calculateVolatilityMomentum(candles: DerivCandleData[]): number
    {
        if (candles.length < 21) return 0.5;

        const recent = candles.slice(-20);
        const changes: number[] = [];

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous && previous.close > 0) {
                const change = (current.close - previous.close) / previous.close;
                changes.push(Math.abs(change));
            }
        }

        if (changes.length === 0) return 0.5;

        const avgVolatility = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        return Math.min(1, avgVolatility * 100);
    }

    private calculateTrendStrength(candles: DerivCandleData[]): number
    {
        if (candles.length < 21) return 0.5;

        const recent = candles.slice(-20);
        let upMoves = 0;
        let totalMoves = 0;

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous) {
                const move = current.close - previous.close;
                if (move > 0) upMoves++;
                totalMoves++;
            }
        }

        return totalMoves > 0 ? upMoves / totalMoves : 0.5;
    }

    private calculateSupportResistanceProximity(candles: DerivCandleData[]): number
    {
        if (candles.length < 21) return 0.5;

        const recent = candles.slice(-20);
        const validCandles = recent.filter(c => c && typeof c.close === 'number');

        if (validCandles.length === 0) return 0.5;

        const prices = validCandles.map(c => c.close);
        const currentPrice = prices[ prices.length - 1 ];

        if (typeof currentPrice !== 'number') return 0.5;

        const support = Math.min(...prices);
        const resistance = Math.max(...prices);
        const range = resistance - support;

        return range > 0 ? (currentPrice - support) / range : 0.5;
    }

    /**
     * Generate candle data from tick data (public method)
     */
    public generateCandlesFromTicks(ticks: DerivTickData[], intervalSeconds: number): DerivCandleData[]
    {
        if (ticks.length === 0) return [];

        console.log(`🕯️ Candle Generation Debug:`);
        console.log(`   📊 Input ticks: ${ticks.length}`);
        console.log(`   ⏱️ Interval: ${intervalSeconds} seconds`);
        const firstTick = ticks[ 0 ];
        const lastTick = ticks[ ticks.length - 1 ];
        console.log(`   📅 Time range: ${firstTick?.epoch ? new Date(firstTick.epoch).toISOString() : 'N/A'} to ${lastTick?.epoch ? new Date(lastTick.epoch).toISOString() : 'N/A'}`);

        const candles: DerivCandleData[] = [];
        const intervals = new Map<number, DerivTickData[]>();

        // Group ticks by time intervals
        for (const tick of ticks) {
            const intervalKey = Math.floor(tick.epoch / (intervalSeconds * 1000)) * intervalSeconds * 1000;
            const intervalTicks = intervals.get(intervalKey) || [];
            intervalTicks.push(tick);
            intervals.set(intervalKey, intervalTicks);
        }

        console.log(`   🗂️ Unique intervals: ${intervals.size}`);
        console.log(`   📈 Interval distribution:`, Array.from(intervals.entries()).map(([ epoch, ticks ]) =>
            `${new Date(epoch).toISOString()}: ${ticks.length} ticks`
        ));

        // Convert each interval to a candle
        for (const [ epoch, intervalTicks ] of intervals) {
            if (intervalTicks.length > 0) {
                const prices = intervalTicks.map(t => t.quote).filter(p => typeof p === 'number');
                const firstTick = intervalTicks[ 0 ];

                if (prices.length > 0 && firstTick) {
                    const openPrice = prices[ 0 ];
                    const closePrice = prices[ prices.length - 1 ];

                    if (typeof openPrice === 'number' && typeof closePrice === 'number') {
                        candles.push({
                            symbol: firstTick.symbol,
                            open: openPrice,
                            high: Math.max(...prices),
                            low: Math.min(...prices),
                            close: closePrice,
                            epoch: epoch,
                        });
                    }
                }
            }
        }

        const sortedCandles = candles.sort((a, b) => a.epoch - b.epoch);

        console.log(`   🕯️ Generated ${sortedCandles.length} candles`);
        if (sortedCandles.length > 0) {
            const sampleCandle = sortedCandles[ 0 ];
            console.log(`   📊 Sample candle:`, {
                symbol: sampleCandle?.symbol || 'N/A',
                open: sampleCandle?.open || 0,
                high: sampleCandle?.high || 0,
                low: sampleCandle?.low || 0,
                close: sampleCandle?.close || 0,
                epoch: sampleCandle?.epoch ? new Date(sampleCandle.epoch).toISOString() : 'N/A'
            });
        }

        return sortedCandles;
    }
}
