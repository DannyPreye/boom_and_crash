import
    {
        MarketFeatures,
        TechnicalIndicators,
        TimeFeatures,
        SyntheticSymbol
    } from '@/types/prediction.types';
import { DerivTickData, DerivCandleData } from '@/types/deriv.types';
import { SUPPORTED_SYMBOLS } from '@/config';
import { predictionLogger, PerformanceTimer } from '@/utils/logger';

export interface CandleBuffer
{
    symbol: string;
    candles: DerivCandleData[];
    maxSize: number;
}

export interface TickBuffer
{
    symbol: string;
    ticks: DerivTickData[];
    maxSize: number;
    lastSpikeTickIndex?: number;
}

export class FeatureEngineeringService
{
    private candleBuffers: Map<string, CandleBuffer> = new Map();
    private tickBuffers: Map<string, TickBuffer> = new Map();
    private readonly MAX_CANDLES = 1000;
    private readonly MAX_TICKS = 2000;

    /**
     * Initialize buffers for a symbol
     */
    initializeSymbol(symbol: SyntheticSymbol): void
    {
        const candleKey = `${symbol}_candles`;
        const tickKey = `${symbol}_ticks`;

        if (!this.candleBuffers.has(candleKey)) {
            this.candleBuffers.set(candleKey, {
                symbol,
                candles: [],
                maxSize: this.MAX_CANDLES,
            });
        }

        if (!this.tickBuffers.has(tickKey)) {
            this.tickBuffers.set(tickKey, {
                symbol,
                ticks: [],
                maxSize: this.MAX_TICKS,
            });
        }

        predictionLogger.info(`Initialized feature buffers for ${symbol}`);
    }

    /**
     * Add new candle data
     */
    addCandle(candle: DerivCandleData): void
    {
        const key = `${candle.symbol}_candles`;
        const buffer = this.candleBuffers.get(key);

        if (!buffer) {
            predictionLogger.warn(`No candle buffer found for ${candle.symbol}`);
            return;
        }

        // Add new candle and maintain buffer size
        buffer.candles.push(candle);
        if (buffer.candles.length > buffer.maxSize) {
            buffer.candles = buffer.candles.slice(-buffer.maxSize);
        }
    }

    /**
     * Add new tick data
     */
    addTick(tick: DerivTickData): void
    {
        const key = `${tick.symbol}_ticks`;
        const buffer = this.tickBuffers.get(key);

        if (!buffer) {
            predictionLogger.warn(`No tick buffer found for ${tick.symbol}`);
            return;
        }

        // Detect spikes for Boom/Crash indices
        this.detectSpike(buffer, tick);

        // Add new tick and maintain buffer size
        buffer.ticks.push(tick);
        if (buffer.ticks.length > buffer.maxSize) {
            buffer.ticks = buffer.ticks.slice(-buffer.maxSize);
        }
    }

    /**
     * Extract comprehensive market features
     */
    extractFeatures(symbol: SyntheticSymbol): MarketFeatures | null
    {
        const timer = new PerformanceTimer(predictionLogger, `extract_features_${symbol}`);

        try {
            const candleKey = `${symbol}_candles`;
            const tickKey = `${symbol}_ticks`;

            const candleBuffer = this.candleBuffers.get(candleKey);
            const tickBuffer = this.tickBuffers.get(tickKey);

            if (!candleBuffer || !tickBuffer || candleBuffer.candles.length < 20) {
                predictionLogger.warn(`Insufficient data for ${symbol} feature extraction`);
                return null;
            }

            const candles = candleBuffer.candles;
            const ticks = tickBuffer.ticks;

            const features: MarketFeatures = {
                price_velocity: this.calculatePriceVelocity(candles),
                price_acceleration: this.calculatePriceAcceleration(candles),
                volatility_momentum: this.calculateVolatilityMomentum(candles),
                trend_strength: this.calculateTrendStrength(candles),
                support_resistance_proximity: this.calculateSupportResistanceProximity(candles),
                time_features: this.extractTimeFeatures(),
                technical_indicators: this.calculateTechnicalIndicators(candles),
            };

            // Add Boom/Crash specific features
            if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
                features.ticks_since_last_spike = this.calculateTicksSinceLastSpike(tickBuffer);
            }

            timer.end({ symbol, features_count: Object.keys(features).length });
            return features;

        } catch (error) {
            timer.end({ symbol, error: true });
            predictionLogger.error('Failed to extract features', { symbol, error });
            return null;
        }
    }

    /**
     * Calculate price velocity (rate of change)
     */
    private calculatePriceVelocity(candles: DerivCandleData[]): number
    {
        if (candles.length < 2) return 0;

        const recent = candles.slice(-10);
        const priceChanges = recent.slice(1).map((candle, i) =>
            (candle.close - recent[ i ].close) / recent[ i ].close
        );

        return priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    }

    /**
     * Calculate price acceleration (second derivative of price)
     */
    private calculatePriceAcceleration(candles: DerivCandleData[]): number
    {
        if (candles.length < 3) return 0;

        const recent = candles.slice(-5);
        const velocities = [];

        for (let i = 1; i < recent.length; i++) {
            const velocity = (recent[ i ].close - recent[ i - 1 ].close) / recent[ i - 1 ].close;
            velocities.push(velocity);
        }

        if (velocities.length < 2) return 0;

        const accelerations = velocities.slice(1).map((vel, i) => vel - velocities[ i ]);
        return accelerations.reduce((sum, acc) => sum + acc, 0) / accelerations.length;
    }

    /**
     * Calculate volatility momentum
     */
    private calculateVolatilityMomentum(candles: DerivCandleData[]): number
    {
        if (candles.length < 10) return 0;

        const recent = candles.slice(-20);
        const volatilities = recent.map(candle =>
            Math.abs(candle.high - candle.low) / candle.close
        );

        const recentVol = volatilities.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
        const historicalVol = volatilities.slice(0, -5).reduce((sum, vol) => sum + vol, 0) / (volatilities.length - 5);

        return historicalVol > 0 ? (recentVol - historicalVol) / historicalVol : 0;
    }

    /**
     * Calculate trend strength using ADX-like calculation
     */
    private calculateTrendStrength(candles: DerivCandleData[]): number
    {
        if (candles.length < 14) return 0;

        const recent = candles.slice(-14);
        let upMoves = 0;
        let downMoves = 0;

        for (let i = 1; i < recent.length; i++) {
            const move = recent[ i ].close - recent[ i - 1 ].close;
            if (move > 0) upMoves += move;
            else downMoves += Math.abs(move);
        }

        const totalMoves = upMoves + downMoves;
        return totalMoves > 0 ? Math.abs(upMoves - downMoves) / totalMoves : 0;
    }

    /**
     * Calculate proximity to support/resistance levels
     */
    private calculateSupportResistanceProximity(candles: DerivCandleData[]): number
    {
        if (candles.length < 50) return 0.5;

        const recent = candles.slice(-50);
        const currentPrice = recent[ recent.length - 1 ].close;

        // Find recent highs and lows
        const highs = recent.map(c => c.high).sort((a, b) => b - a);
        const lows = recent.map(c => c.low).sort((a, b) => a - b);

        const resistance = highs[ Math.floor(highs.length * 0.1) ]; // Top 10% of highs
        const support = lows[ Math.floor(lows.length * 0.1) ]; // Bottom 10% of lows

        const range = resistance - support;
        if (range === 0) return 0.5;

        return (currentPrice - support) / range;
    }

    /**
     * Extract time-based features
     */
    private extractTimeFeatures(): TimeFeatures
    {
        const now = new Date();
        const hour = now.getUTCHours();
        const dayOfWeek = now.getUTCDay();

        return {
            hour_of_day: hour,
            day_of_week: dayOfWeek,
            is_london_session: hour >= 8 && hour <= 16,
            is_new_york_session: hour >= 13 && hour <= 21,
            is_asian_session: hour >= 0 && hour <= 8,
            time_since_market_open: hour >= 8 ? hour - 8 : hour + 16,
        };
    }

    /**
     * Calculate technical indicators
     */
    private calculateTechnicalIndicators(candles: DerivCandleData[]): TechnicalIndicators
    {
        return {
            rsi: this.calculateRSI(candles),
            macd_signal: this.calculateMACDSignal(candles),
            bollinger_position: this.calculateBollingerPosition(candles),
            ema_short: this.calculateEMA(candles, 9),
            ema_long: this.calculateEMA(candles, 21),
            adx: this.calculateADX(candles),
            stochastic: this.calculateStochastic(candles),
            williams_r: this.calculateWilliamsR(candles),
        };
    }

    /**
     * Calculate RSI (Relative Strength Index)
     */
    private calculateRSI(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period + 1) return 50;

        const recent = candles.slice(-period - 1);
        let gains = 0;
        let losses = 0;

        for (let i = 1; i < recent.length; i++) {
            const change = recent[ i ].close - recent[ i - 1 ].close;
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate MACD Signal
     */
    private calculateMACDSignal(candles: DerivCandleData[]): number
    {
        if (candles.length < 26) return 0;

        const ema12 = this.calculateEMA(candles, 12);
        const ema26 = this.calculateEMA(candles, 26);
        return ema12 - ema26;
    }

    /**
     * Calculate Bollinger Bands position
     */
    private calculateBollingerPosition(candles: DerivCandleData[], period: number = 20): number
    {
        if (candles.length < period) return 0.5;

        const recent = candles.slice(-period);
        const sma = recent.reduce((sum, c) => sum + c.close, 0) / period;

        const variance = recent.reduce((sum, c) => sum + Math.pow(c.close - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        const currentPrice = recent[ recent.length - 1 ].close;
        const upperBand = sma + (2 * stdDev);
        const lowerBand = sma - (2 * stdDev);

        const bandWidth = upperBand - lowerBand;
        return bandWidth > 0 ? (currentPrice - lowerBand) / bandWidth : 0.5;
    }

    /**
     * Calculate EMA (Exponential Moving Average)
     */
    private calculateEMA(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period) {
            return candles.reduce((sum, c) => sum + c.close, 0) / candles.length;
        }

        const recent = candles.slice(-period);
        const multiplier = 2 / (period + 1);

        let ema = recent[ 0 ].close;
        for (let i = 1; i < recent.length; i++) {
            ema = (recent[ i ].close * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    /**
     * Calculate ADX (Average Directional Index)
     */
    private calculateADX(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period + 1) return 0;

        const recent = candles.slice(-(period + 1));
        let plusDI = 0;
        let minusDI = 0;
        let trSum = 0;

        for (let i = 1; i < recent.length; i++) {
            const high = recent[ i ].high;
            const low = recent[ i ].low;
            const prevHigh = recent[ i - 1 ].high;
            const prevLow = recent[ i - 1 ].low;
            const prevClose = recent[ i - 1 ].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trSum += tr;

            const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
            const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;

            plusDI += plusDM;
            minusDI += minusDM;
        }

        if (trSum === 0) return 0;

        plusDI = (plusDI / trSum) * 100;
        minusDI = (minusDI / trSum) * 100;

        const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
        return dx || 0;
    }

    /**
     * Calculate Stochastic Oscillator
     */
    private calculateStochastic(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period) return 50;

        const recent = candles.slice(-period);
        const currentClose = recent[ recent.length - 1 ].close;
        const lowestLow = Math.min(...recent.map(c => c.low));
        const highestHigh = Math.max(...recent.map(c => c.high));

        const range = highestHigh - lowestLow;
        return range > 0 ? ((currentClose - lowestLow) / range) * 100 : 50;
    }

    /**
     * Calculate Williams %R
     */
    private calculateWilliamsR(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period) return -50;

        const recent = candles.slice(-period);
        const currentClose = recent[ recent.length - 1 ].close;
        const highestHigh = Math.max(...recent.map(c => c.high));
        const lowestLow = Math.min(...recent.map(c => c.low));

        const range = highestHigh - lowestLow;
        return range > 0 ? ((highestHigh - currentClose) / range) * -100 : -50;
    }

    /**
     * Detect spikes in Boom/Crash indices
     */
    private detectSpike(buffer: TickBuffer, newTick: DerivTickData): void
    {
        if (buffer.ticks.length < 2) return;

        const symbolConfig = SUPPORTED_SYMBOLS[ newTick.symbol as keyof typeof SUPPORTED_SYMBOLS ];
        if (!symbolConfig || (symbolConfig.type !== 'boom' && symbolConfig.type !== 'crash')) {
            return;
        }

        const previousTick = buffer.ticks[ buffer.ticks.length - 1 ];
        const priceChange = (newTick.tick - previousTick.tick) / previousTick.tick;

        // Define spike thresholds
        const spikeThreshold = symbolConfig.type === 'boom' ? 0.05 : -0.05; // 5% move

        const isSpike = symbolConfig.type === 'boom'
            ? priceChange > spikeThreshold
            : priceChange < spikeThreshold;

        if (isSpike) {
            buffer.lastSpikeTickIndex = buffer.ticks.length;
            predictionLogger.info(`${symbolConfig.type.toUpperCase()} spike detected`, {
                symbol: newTick.symbol,
                price_change: priceChange,
                tick_index: buffer.ticks.length,
            });
        }
    }

    /**
     * Calculate ticks since last spike
     */
    private calculateTicksSinceLastSpike(buffer: TickBuffer): number
    {
        if (!buffer.lastSpikeTickIndex) return 999999; // Very large number if no spike detected
        return buffer.ticks.length - buffer.lastSpikeTickIndex;
    }

    /**
     * Get buffer statistics for monitoring
     */
    getBufferStats(): Record<string, any>
    {
        const stats: Record<string, any> = {};

        this.candleBuffers.forEach((buffer, key) =>
        {
            stats[ key ] = {
                count: buffer.candles.length,
                maxSize: buffer.maxSize,
                latest: buffer.candles.length > 0 ? buffer.candles[ buffer.candles.length - 1 ].epoch : null,
            };
        });

        this.tickBuffers.forEach((buffer, key) =>
        {
            stats[ key ] = {
                count: buffer.ticks.length,
                maxSize: buffer.maxSize,
                lastSpikeIndex: buffer.lastSpikeTickIndex,
                latest: buffer.ticks.length > 0 ? buffer.ticks[ buffer.ticks.length - 1 ].epoch : null,
            };
        });

        return stats;
    }
}
