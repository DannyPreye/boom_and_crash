import { DerivTickData, DerivCandleData } from './deriv-client';

export interface MarketFeatures
{
    price_velocity: number;
    price_acceleration: number;
    volatility_momentum: number;
    trend_strength: number;
    support_resistance_proximity: number;
    rsi: number;
    macd_signal: number;
    bollinger_position: number;
    ticks_since_last_spike?: number;
    spike_probability?: number;
}

export class FeatureEngineeringService
{
    private tickBuffers: Map<string, DerivTickData[]> = new Map();
    private candleBuffers: Map<string, DerivCandleData[]> = new Map();
    private spikeTracking: Map<string, { lastSpikeIndex: number; tickCount: number; }> = new Map();
    private readonly MAX_BUFFER_SIZE = 1000;

    addTick(tick: DerivTickData): void
    {
        const buffer = this.tickBuffers.get(tick.symbol) || [];
        buffer.push(tick);

        // Maintain buffer size
        if (buffer.length > this.MAX_BUFFER_SIZE) {
            buffer.shift();
        }

        this.tickBuffers.set(tick.symbol, buffer);
        this.detectSpike(tick);
    }

    addCandle(candle: DerivCandleData): void
    {
        const buffer = this.candleBuffers.get(candle.symbol) || [];
        buffer.push(candle);

        // Maintain buffer size
        if (buffer.length > this.MAX_BUFFER_SIZE) {
            buffer.shift();
        }

        this.candleBuffers.set(candle.symbol, buffer);
    }

    calculateFeatures(tickData: DerivTickData[], symbol: string): MarketFeatures
    {
        // Add ticks to buffer for processing
        for (const tick of tickData) {
            this.addTick(tick);
        }

        // Extract features from the symbol
        const features = this.extractFeatures(symbol);
        if (!features) {
            // Return default features if extraction fails
            return {
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
            };
        }

        return features;
    }

    extractFeatures(symbol: string): MarketFeatures | null
    {
        const candles = this.candleBuffers.get(symbol);
        const ticks = this.tickBuffers.get(symbol);

        if (!candles || candles.length < 20) {
            // Generate candles from ticks if no candles available
            if (ticks && ticks.length >= 20) {
                const generatedCandles = this.generateCandlesFromTicks(ticks, 60); // 1-minute candles
                this.candleBuffers.set(symbol, generatedCandles);
                return this.calculateFeaturesFromCandles(generatedCandles, symbol);
            }
            return null;
        }

        return this.calculateFeaturesFromCandles(candles, symbol);
    }

    private calculateFeaturesFromCandles(candles: DerivCandleData[], symbol: string): MarketFeatures
    {
        const safeCandles = candles.filter(c => c && typeof c.close === 'number' && c.close > 0);

        if (safeCandles.length < 20) {
            return this.getDefaultFeatures();
        }

        return {
            price_velocity: this.calculatePriceVelocity(safeCandles),
            price_acceleration: this.calculatePriceAcceleration(safeCandles),
            volatility_momentum: this.calculateVolatilityMomentum(safeCandles),
            trend_strength: this.calculateTrendStrength(safeCandles),
            support_resistance_proximity: this.calculateSupportResistanceProximity(safeCandles),
            rsi: this.calculateRSI(safeCandles),
            macd_signal: this.calculateMACDSignal(safeCandles),
            bollinger_position: this.calculateBollingerPosition(safeCandles),
            ticks_since_last_spike: this.getTicksSinceLastSpike(symbol),
            spike_probability: this.calculateSpikeProximity(symbol),
        };
    }

    private getDefaultFeatures(): MarketFeatures
    {
        return {
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
        };
    }

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

        const recent = candles.slice(-10);
        const velocities: number[] = [];

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous && previous.close > 0) {
                const velocity = (current.close - previous.close) / previous.close;
                velocities.push(velocity);
            }
        }

        if (velocities.length < 2) return 0;

        let totalAcceleration = 0;
        let validAccelerations = 0;

        for (let i = 1; i < velocities.length; i++) {
            const currentVel = velocities[ i ];
            const previousVel = velocities[ i - 1 ];
            if (typeof currentVel === 'number' && typeof previousVel === 'number') {
                totalAcceleration += currentVel - previousVel;
                validAccelerations++;
            }
        }

        return validAccelerations > 0 ? totalAcceleration / validAccelerations : 0;
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

    private calculateRSI(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period + 1) return 50;

        const recent = candles.slice(-(period + 1));
        let gains = 0;
        let losses = 0;
        let validPeriods = 0;

        for (let i = 1; i < recent.length; i++) {
            const current = recent[ i ];
            const previous = recent[ i - 1 ];
            if (current && previous) {
                const change = current.close - previous.close;
                if (change > 0) gains += change;
                else losses += Math.abs(change);
                validPeriods++;
            }
        }

        if (validPeriods === 0) return 50;

        const avgGain = gains / validPeriods;
        const avgLoss = losses / validPeriods;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    private calculateMACDSignal(candles: DerivCandleData[]): number
    {
        if (candles.length < 26) return 0;

        const recent = candles.slice(-26);
        const validCandles = recent.filter(c => c && typeof c.close === 'number');

        if (validCandles.length < 26) return 0;

        const prices = validCandles.map(c => c.close);
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);

        return ema12 - ema26;
    }

    private calculateBollingerPosition(candles: DerivCandleData[], period: number = 20): number
    {
        if (candles.length < period) return 0.5;

        const recent = candles.slice(-period);
        const validCandles = recent.filter(c => c && typeof c.close === 'number');

        if (validCandles.length === 0) return 0.5;

        const prices = validCandles.map(c => c.close);
        const currentPrice = prices[ prices.length - 1 ];

        if (typeof currentPrice !== 'number') return 0.5;

        const sma = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
        const std = Math.sqrt(variance);

        const upperBand = sma + (2 * std);
        const lowerBand = sma - (2 * std);
        const range = upperBand - lowerBand;

        return range > 0 ? (currentPrice - lowerBand) / range : 0.5;
    }

    private calculateEMA(prices: number[], period: number): number
    {
        if (prices.length === 0) return 0;

        const multiplier = 2 / (period + 1);
        let ema: number = prices[ 0 ] || 0;

        for (let i = 1; i < prices.length; i++) {
            const price = prices[ i ];
            if (typeof price === 'number') {
                ema = (price * multiplier) + (ema * (1 - multiplier));
            }
        }

        return ema;
    }

    private detectSpike(tick: DerivTickData): void
    {
        const ticks = this.tickBuffers.get(tick.symbol) || [];
        if (ticks.length < 2) return;

        const previousTick = ticks[ ticks.length - 2 ];
        if (!previousTick || previousTick.tick === 0) return;

        const priceChange = Math.abs((tick.tick - previousTick.tick) / previousTick.tick);

        // Consider it a spike if price change is > 5%
        if (priceChange > 0.05) {
            const tracking = this.spikeTracking.get(tick.symbol) || { lastSpikeIndex: 0, tickCount: 0 };
            tracking.lastSpikeIndex = ticks.length - 1;
            tracking.tickCount = 0;
            this.spikeTracking.set(tick.symbol, tracking);
        } else {
            const tracking = this.spikeTracking.get(tick.symbol);
            if (tracking) {
                tracking.tickCount++;
                this.spikeTracking.set(tick.symbol, tracking);
            }
        }
    }

    private getTicksSinceLastSpike(symbol: string): number | undefined
    {
        const tracking = this.spikeTracking.get(symbol);
        return tracking?.tickCount;
    }

    private calculateSpikeProximity(symbol: string): number | undefined
    {
        if (!symbol.includes('BOOM') && !symbol.includes('CRASH')) {
            return undefined;
        }

        const expectedSpikes = symbol.includes('1000') ? 1000 : 500;
        const ticksSinceSpike = this.getTicksSinceLastSpike(symbol);

        if (typeof ticksSinceSpike !== 'number') return 0;

        // Calculate proximity as a value between 0 and 1
        const proximity = Math.min(1, ticksSinceSpike / expectedSpikes);

        // Apply sigmoid function to create spike probability curve
        return 1 / (1 + Math.exp(-10 * (proximity - 0.8)));
    }

    private generateCandlesFromTicks(ticks: DerivTickData[], intervalSeconds: number): DerivCandleData[]
    {
        if (ticks.length === 0) return [];

        const candles: DerivCandleData[] = [];
        const intervals = new Map<number, DerivTickData[]>();

        // Group ticks by time intervals
        for (const tick of ticks) {
            const intervalKey = Math.floor(tick.epoch / (intervalSeconds * 1000)) * intervalSeconds * 1000;
            const intervalTicks = intervals.get(intervalKey) || [];
            intervalTicks.push(tick);
            intervals.set(intervalKey, intervalTicks);
        }

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

        return candles.sort((a, b) => a.epoch - b.epoch);
    }
}
