import { DerivCandleData } from '../types/deriv.types';

/**
 * Advanced Technical Analysis Service
 * Implements advanced technical indicators including Ichimoku, Fibonacci, Elliott Wave, and enhanced momentum indicators
 */
export class AdvancedTechnicalAnalysis
{

    /**
     * Calculate advanced technical indicators
     */
    async calculateAdvancedIndicators(historicalData: DerivCandleData[], symbol: string): Promise<any>
    {
        const ichimoku = this.calculateIchimokuCloud(historicalData);
        const fibonacci = this.calculateFibonacciRetracements(historicalData);
        const elliottWave = this.analyzeElliottWaves(historicalData);
        const momentum = this.calculateEnhancedMomentumIndicators(historicalData);

        return {
            ichimoku,
            fibonacci,
            elliottWave,
            momentum
        };
    }

    /**
     * Calculate Ichimoku Cloud components
     */
    private calculateIchimokuCloud(candles: DerivCandleData[]): any
    {
        if (candles.length < 52) {
            return this.getDefaultIchimoku();
        }

        const tenkan = this.calculateIchimokuLine(candles, 9);
        const kijun = this.calculateIchimokuLine(candles, 26);
        const senkouA = (tenkan + kijun) / 2;
        const senkouB = this.calculateIchimokuLine(candles, 52);

        const currentPrice = candles[ candles.length - 1 ]?.close || 100;
        const cloudPosition = this.determineCloudPosition(currentPrice, senkouA, senkouB);
        const cloudStrength = this.calculateCloudStrength(senkouA, senkouB, currentPrice);

        return {
            tenkan,
            kijun,
            senkouA,
            senkouB,
            cloudPosition,
            cloudStrength,
            cloudColor: senkouA > senkouB ? 'GREEN' : 'RED'
        };
    }

    /**
     * Calculate Ichimoku conversion line
     */
    private calculateIchimokuLine(candles: DerivCandleData[], period: number): number
    {
        if (candles.length < period) return candles[ candles.length - 1 ]?.close || 100;

        const recentCandles = candles.slice(-period);
        const highs = recentCandles.map(c => c.high);
        const lows = recentCandles.map(c => c.low);

        const highestHigh = Math.max(...highs);
        const lowestLow = Math.min(...lows);

        return (highestHigh + lowestLow) / 2;
    }

    /**
     * Determine position relative to Ichimoku cloud
     */
    private determineCloudPosition(price: number, senkouA: number, senkouB: number): string
    {
        const upperCloud = Math.max(senkouA, senkouB);
        const lowerCloud = Math.min(senkouA, senkouB);

        if (price > upperCloud) return 'ABOVE';
        if (price < lowerCloud) return 'BELOW';
        return 'INSIDE';
    }

    /**
     * Calculate cloud strength (0-1)
     */
    private calculateCloudStrength(senkouA: number, senkouB: number, price: number): number
    {
        const cloudThickness = Math.abs(senkouA - senkouB);
        const priceDistance = Math.min(
            Math.abs(price - senkouA),
            Math.abs(price - senkouB)
        );

        return Math.max(0, Math.min(1, 1 - (priceDistance / (cloudThickness + 0.001))));
    }

    /**
     * Calculate Fibonacci retracement levels
     */
    private calculateFibonacciRetracements(candles: DerivCandleData[]): any
    {
        if (candles.length < 20) {
            return this.getDefaultFibonacci();
        }

        // Find swing high and low
        const lookback = Math.min(50, candles.length);
        const recentCandles = candles.slice(-lookback);

        const highs = recentCandles.map(c => c.high);
        const lows = recentCandles.map(c => c.low);

        const swingHigh = Math.max(...highs);
        const swingLow = Math.min(...lows);
        const range = swingHigh - swingLow;

        const currentPrice = candles[ candles.length - 1 ]?.close || 100;
        const currentPosition = this.determineFibonacciPosition(currentPrice, swingHigh, swingLow);

        return {
            swingHigh,
            swingLow,
            range,
            level23: swingHigh - (range * 0.236),
            level38: swingHigh - (range * 0.382),
            level50: swingHigh - (range * 0.500),
            level61: swingHigh - (range * 0.618),
            currentPosition,
            nextSupport: this.findNextFibonacciSupport(currentPrice, swingHigh, swingLow),
            nextResistance: this.findNextFibonacciResistance(currentPrice, swingHigh, swingLow)
        };
    }

    /**
     * Determine position relative to Fibonacci levels
     */
    private determineFibonacciPosition(price: number, swingHigh: number, swingLow: number): string
    {
        const range = swingHigh - swingLow;
        const level23 = swingHigh - (range * 0.236);
        const level38 = swingHigh - (range * 0.382);
        const level50 = swingHigh - (range * 0.500);
        const level61 = swingHigh - (range * 0.618);

        if (price > swingHigh) return 'ABOVE_SWING_HIGH';
        if (price > level23) return 'ABOVE_23_6';
        if (price > level38) return 'ABOVE_38_2';
        if (price > level50) return 'ABOVE_50_0';
        if (price > level61) return 'ABOVE_61_8';
        return 'BELOW_61_8';
    }

    /**
     * Find next Fibonacci support level
     */
    private findNextFibonacciSupport(price: number, swingHigh: number, swingLow: number): number
    {
        const range = swingHigh - swingLow;
        const levels = [
            swingHigh - (range * 0.236),
            swingHigh - (range * 0.382),
            swingHigh - (range * 0.500),
            swingHigh - (range * 0.618),
            swingLow
        ];

        for (const level of levels) {
            if (level < price) return level;
        }
        return swingLow;
    }

    /**
     * Find next Fibonacci resistance level
     */
    private findNextFibonacciResistance(price: number, swingHigh: number, swingLow: number): number
    {
        const range = swingHigh - swingLow;
        const levels = [
            swingHigh,
            swingHigh - (range * 0.236),
            swingHigh - (range * 0.382),
            swingHigh - (range * 0.500),
            swingHigh - (range * 0.618)
        ];

        for (const level of levels.reverse()) {
            if (level > price) return level;
        }
        return swingHigh;
    }

    /**
     * Analyze Elliott Wave patterns
     */
    private analyzeElliottWaves(candles: DerivCandleData[]): any
    {
        if (candles.length < 30) {
            return this.getDefaultElliottWave();
        }

        const prices = candles.map(c => c.close);
        const waves = this.identifyElliottWaves(prices);
        const currentWave = this.determineCurrentWave(waves);
        const wavePosition = this.calculateWavePosition(waves, currentWave);
        const trendDirection = this.determineTrendDirection(waves);
        const waveStrength = this.calculateWaveStrength(waves);

        return {
            waveCount: waves.length,
            currentWave,
            wavePosition,
            trendDirection,
            waveStrength,
            waves: waves.slice(-5) // Last 5 waves
        };
    }

    /**
     * Identify Elliott Wave patterns
     */
    private identifyElliottWaves(prices: number[]): number[]
    {
        if (!prices.length) return [];
        const waves: number[] = [];
        let currentTrend = 'UP';
        let lastExtreme = prices[ 0 ] ?? 0;
        let lastExtremeIndex = 0;

        for (let i = 1; i < prices.length; i++) {
            const price = prices[ i ] ?? 0;

            if (currentTrend === 'UP' && price < lastExtreme) {
                // Potential wave completion
                if (i - lastExtremeIndex >= 3) { // Minimum wave length
                    waves.push(lastExtreme ?? 0);
                    currentTrend = 'DOWN';
                    lastExtreme = price;
                    lastExtremeIndex = i;
                }
            } else if (currentTrend === 'DOWN' && price > lastExtreme) {
                // Potential wave completion
                if (i - lastExtremeIndex >= 3) { // Minimum wave length
                    waves.push(lastExtreme ?? 0);
                    currentTrend = 'UP';
                    lastExtreme = price;
                    lastExtremeIndex = i;
                }
            } else {
                // Update extreme
                if ((currentTrend === 'UP' && price > lastExtreme) ||
                    (currentTrend === 'DOWN' && price < lastExtreme)) {
                    lastExtreme = price;
                    lastExtremeIndex = i;
                }
            }
        }

        return waves;
    }

    /**
     * Determine current Elliott Wave
     */
    private determineCurrentWave(waves: number[]): number
    {
        return Math.min(waves.length, 5); // Elliott Wave theory has 5 main waves
    }

    /**
     * Calculate position within current wave (0-1)
     */
    private calculateWavePosition(waves: number[], currentWave: number): number
    {
        if (waves.length < 2) return 0.5;

        const currentWaveStart = waves[ Math.max(0, waves.length - 2) ] ?? 0;
        const currentWaveEnd = waves[ waves.length - 1 ] ?? 0;
        const currentPrice = currentWaveEnd;
        const denominator = Math.abs(currentWaveEnd - currentWaveStart) || 1;
        return Math.abs(currentPrice - currentWaveStart) / denominator;
    }

    /**
     * Determine overall trend direction
     */
    private determineTrendDirection(waves: number[]): string
    {
        if (waves.length < 2) return 'UNKNOWN';
        const recentWaves = waves.slice(-3);
        if (recentWaves.length < 2) return 'UNKNOWN';
        const last = recentWaves[ recentWaves.length - 1 ] ?? 0;
        const first = recentWaves[ 0 ] ?? 0;
        const trend = last > first ? 'UP' : 'DOWN';
        return trend;
    }

    /**
     * Calculate wave strength (0-1)
     */
    private calculateWaveStrength(waves: number[]): number
    {
        if (waves.length < 3) return 0.5;
        const recentWaves = waves.slice(-3);
        if (recentWaves.length < 2) return 0.5;
        const waveAmplitudes = [];
        for (let i = 1; i < recentWaves.length; i++) {
            waveAmplitudes.push(Math.abs((recentWaves[ i ] ?? 0) - (recentWaves[ i - 1 ] ?? 0)));
        }
        if (!waveAmplitudes.length) return 0.5;
        const avgAmplitude = waveAmplitudes.reduce((a, b) => a + b, 0) / waveAmplitudes.length;
        const maxAmplitude = Math.max(...waveAmplitudes) || 1;
        return avgAmplitude / maxAmplitude;
    }

    /**
     * Calculate enhanced momentum indicators
     */
    private calculateEnhancedMomentumIndicators(candles: DerivCandleData[]): any
    {
        const cci = this.calculateCCI(candles);
        const roc = this.calculateROC(candles);
        const mfi = this.calculateMFI(candles);
        const adx = this.calculateADX(candles);
        const parabolicSAR = this.calculateParabolicSAR(candles);

        return {
            cci,
            roc,
            mfi,
            adx,
            parabolicSAR
        };
    }

    /**
     * Calculate Commodity Channel Index (CCI)
     */
    private calculateCCI(candles: DerivCandleData[], period: number = 20): number
    {
        if (candles.length < period) return 0;

        const recentCandles = candles.slice(-period);
        const typicalPrices = recentCandles.map(c => ((c?.high ?? 0) + (c?.low ?? 0) + (c?.close ?? 0)) / 3);
        const sma = typicalPrices.reduce((a, b) => a + b, 0) / typicalPrices.length;

        const meanDeviation = typicalPrices.reduce((sum, price) =>
            sum + Math.abs(price - sma), 0) / typicalPrices.length;

        const currentPrice = typicalPrices[ typicalPrices.length - 1 ] ?? 0;
        return meanDeviation !== 0 ? (currentPrice - sma) / (0.015 * meanDeviation) : 0;
    }

    /**
     * Calculate Rate of Change (ROC)
     */
    private calculateROC(candles: DerivCandleData[], period: number = 10): number
    {
        if (candles.length < period + 1) return 0;

        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const pastPrice = candles[ candles.length - 1 - period ]?.close ?? 0;

        return pastPrice !== 0 ? ((currentPrice - pastPrice) / pastPrice) * 100 : 0;
    }

    /**
     * Calculate Money Flow Index (MFI)
     */
    private calculateMFI(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period + 1) return 50;

        const moneyFlows: number[] = [];

        for (let i = 1; i < candles.length; i++) {
            const current = candles[ i ];
            const previous = candles[ i - 1 ];

            const typicalPrice = ((current?.high ?? 0) + (current?.low ?? 0) + (current?.close ?? 0)) / 3;
            const previousTypicalPrice = ((previous?.high ?? 0) + (previous?.low ?? 0) + (previous?.close ?? 0)) / 3;

            const rawMoneyFlow = typicalPrice * (current?.volume ?? 1000);

            if (typicalPrice > previousTypicalPrice) {
                moneyFlows.push(rawMoneyFlow);
            } else if (typicalPrice < previousTypicalPrice) {
                moneyFlows.push(-rawMoneyFlow);
            } else {
                moneyFlows.push(0);
            }
        }

        if (moneyFlows.length < period) return 50;

        const recentFlows = moneyFlows.slice(-period);
        const positiveFlow = recentFlows.filter(f => f > 0).reduce((a, b) => a + b, 0);
        const negativeFlow = Math.abs(recentFlows.filter(f => f < 0).reduce((a, b) => a + b, 0));

        const moneyRatio = positiveFlow / (negativeFlow + 0.001);
        return 100 - (100 / (1 + moneyRatio));
    }

    /**
     * Calculate Average Directional Index (ADX)
     */
    private calculateADX(candles: DerivCandleData[], period: number = 14): number
    {
        if (candles.length < period + 1) return 0;

        const directionalMovements: number[] = [];

        for (let i = 1; i < candles.length; i++) {
            const current = candles[ i ];
            const previous = candles[ i - 1 ];

            const highDiff = (current?.high ?? 0) - (previous?.high ?? 0);
            const lowDiff = (previous?.low ?? 0) - (current?.low ?? 0);

            directionalMovements.push(Math.abs(highDiff) + Math.abs(lowDiff));
        }

        if (directionalMovements.length < period) return 0;
        const adx = directionalMovements.slice(-period).reduce((a, b) => a + b, 0) / period;
        return adx;
    }

    /**
     * Calculate Parabolic SAR
     */
    private calculateParabolicSAR(candles: DerivCandleData[]): number
    {
        if (candles.length < 3) return candles[ candles.length - 1 ]?.close ?? 100;

        let sar = candles[ 0 ]?.close ?? 100;
        let ep = candles[ 0 ]?.high ?? 100;
        let af = 0.02;
        let uptrend = true;

        for (let i = 1; i < candles.length; i++) {
            const candle = candles[ i ];
            sar = sar + af * (ep - sar);

            if (uptrend) {
                if ((candle?.low ?? 0) < sar) {
                    uptrend = false;
                    sar = ep;
                    af = 0.02;
                    ep = candle?.low ?? ep;
                } else {
                    if ((candle?.high ?? 0) > ep) {
                        ep = candle?.high ?? ep;
                        af = Math.min(af + 0.02, 0.2);
                    }
                }
            } else {
                if ((candle?.high ?? 0) > sar) {
                    uptrend = true;
                    sar = ep;
                    af = 0.02;
                    ep = candle?.high ?? ep;
                } else {
                    if ((candle?.low ?? 0) < ep) {
                        ep = candle?.low ?? ep;
                        af = Math.min(af + 0.02, 0.2);
                    }
                }
            }
        }
        return sar;
    }

    /**
     * Default values for indicators when insufficient data
     */
    private getDefaultIchimoku(): any
    {
        return {
            tenkan: 0,
            kijun: 0,
            senkouA: 0,
            senkouB: 0,
            cloudPosition: 'UNKNOWN',
            cloudStrength: 0.5,
            cloudColor: 'UNKNOWN'
        };
    }

    private getDefaultFibonacci(): any
    {
        return {
            swingHigh: 0,
            swingLow: 0,
            range: 0,
            level23: 0,
            level38: 0,
            level50: 0,
            level61: 0,
            currentPosition: 'UNKNOWN',
            nextSupport: 0,
            nextResistance: 0
        };
    }

    private getDefaultElliottWave(): any
    {
        return {
            waveCount: 0,
            currentWave: 0,
            wavePosition: 0.5,
            trendDirection: 'UNKNOWN',
            waveStrength: 0.5,
            waves: []
        };
    }
}
