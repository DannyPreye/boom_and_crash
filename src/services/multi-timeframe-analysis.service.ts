import { DerivCandleData } from '../types/deriv.types';

/**
 * Multi-Timeframe Analysis Service
 * Analyzes market trends across multiple timeframes for better prediction accuracy
 */
export class MultiTimeframeAnalysis
{

    /**
     * Analyze multiple timeframes for trend confluence
     */
    async analyzeMultipleTimeframes(historicalData: DerivCandleData[], symbol: string): Promise<any>
    {
        const timeframes = {
            m1: this.analyzeTimeframe(historicalData, 1),
            m5: this.analyzeTimeframe(historicalData, 5),
            m15: this.analyzeTimeframe(historicalData, 15),
            h1: this.analyzeTimeframe(historicalData, 60),
            h4: this.analyzeTimeframe(historicalData, 240),
            d1: this.analyzeTimeframe(historicalData, 1440)
        };

        const overallConfluence = this.calculateOverallConfluence(timeframes);
        const trendAlignment = this.calculateTrendAlignment(timeframes);
        const strengthDistribution = this.calculateStrengthDistribution(timeframes);

        return {
            timeframes,
            overallConfluence,
            trendAlignment,
            strengthDistribution,
            recommendation: this.generateTimeframeRecommendation(timeframes, overallConfluence)
        };
    }

    /**
     * Analyze a specific timeframe
     */
    private analyzeTimeframe(candles: DerivCandleData[], minutes: number): any
    {
        if (candles.length < 20) {
            return this.getDefaultTimeframeAnalysis();
        }

        // Resample data for the specific timeframe
        const resampledCandles = this.resampleCandles(candles, minutes);

        if (resampledCandles.length < 10) {
            return this.getDefaultTimeframeAnalysis();
        }

        const trend = this.determineTrend(resampledCandles);
        const strength = this.calculateTrendStrength(resampledCandles);
        const momentum = this.calculateMomentum(resampledCandles);
        const volatility = this.calculateVolatility(resampledCandles);
        const supportResistance = this.findSupportResistance(resampledCandles);

        return {
            trend,
            strength,
            momentum,
            volatility,
            supportResistance,
            confidence: this.calculateTimeframeConfidence(resampledCandles),
            lastUpdate: resampledCandles[ resampledCandles.length - 1 ]?.epoch ?? Date.now() / 1000
        };
    }

    /**
     * Resample candles to specific timeframe
     */
    private resampleCandles(candles: DerivCandleData[], minutes: number): DerivCandleData[]
    {
        const resampled: DerivCandleData[] = [];
        const intervalMs = minutes * 60 * 1000;

        let currentInterval = Math.floor((candles[ 0 ]?.epoch ?? Date.now() / 1000) * 1000 / intervalMs) * intervalMs;
        let currentCandle: any = null;

        for (const candle of candles) {
            const candleTime = Math.floor((candle.epoch ?? Date.now() / 1000) * 1000 / intervalMs) * intervalMs;

            if (candleTime > currentInterval) {
                if (currentCandle) {
                    resampled.push(currentCandle);
                }
                currentInterval = candleTime;
                currentCandle = {
                    symbol: candle.symbol,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    epoch: Math.floor(currentInterval / 1000),
                    volume: candle.volume || 0
                };
            } else {
                if (currentCandle) {
                    currentCandle.high = Math.max(currentCandle.high, candle.high);
                    currentCandle.low = Math.min(currentCandle.low, candle.low);
                    currentCandle.close = candle.close;
                    currentCandle.volume += candle.volume || 0;
                }
            }
        }

        if (currentCandle) {
            resampled.push(currentCandle);
        }

        return resampled;
    }

    /**
     * Determine trend direction
     */
    private determineTrend(candles: DerivCandleData[]): string
    {
        if (candles.length < 5) return 'NEUTRAL';

        const prices = candles.map(c => c.close ?? 0);
        const sma5 = this.calculateSMA(prices, 5);
        const sma10 = this.calculateSMA(prices, Math.min(10, prices.length));

        const currentPrice = prices[ prices.length - 1 ] ?? 0;
        const priceChange = ((currentPrice - (prices[ 0 ] ?? 1)) / (prices[ 0 ] ?? 1)) * 100;

        if (currentPrice > sma5 && sma5 > sma10 && priceChange > 1) {
            return 'STRONG_UP';
        } else if (currentPrice > sma5 && priceChange > 0.5) {
            return 'WEAK_UP';
        } else if (currentPrice < sma5 && sma5 < sma10 && priceChange < -1) {
            return 'STRONG_DOWN';
        } else if (currentPrice < sma5 && priceChange < -0.5) {
            return 'WEAK_DOWN';
        } else {
            return 'SIDEWAYS';
        }
    }

    /**
     * Calculate trend strength (0-1)
     */
    private calculateTrendStrength(candles: DerivCandleData[]): number
    {
        if (candles.length < 10) return 0.5;

        const prices = candles.map(c => c.close ?? 0);
        const returns: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            returns.push(((prices[ i ] ?? 0) - (prices[ i - 1 ] ?? 1)) / (prices[ i - 1 ] ?? 1));
        }

        const meanReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const variance = returns.length ? returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length : 0;
        const stdDev = Math.sqrt(variance);

        // Trend strength based on consistency of direction
        const positiveReturns = returns.filter(r => r > 0).length;
        const negativeReturns = returns.filter(r => r < 0).length;
        const consistency = returns.length ? Math.max(positiveReturns, negativeReturns) / returns.length : 0.5;

        // Combine consistency with volatility
        return Math.min(1, consistency * (1 - stdDev));
    }

    /**
     * Calculate momentum
     */
    private calculateMomentum(candles: DerivCandleData[]): number
    {
        if (candles.length < 5) return 0;

        const prices = candles.map(c => c.close ?? 0);
        const period = Math.min(5, prices.length);

        const currentPrice = prices[ prices.length - 1 ] ?? 0;
        const pastPrice = prices[ prices.length - 1 - period ] ?? 0;

        return pastPrice !== 0 ? ((currentPrice - pastPrice) / pastPrice) * 100 : 0;
    }

    /**
     * Calculate volatility
     */
    private calculateVolatility(candles: DerivCandleData[]): number
    {
        if (candles.length < 10) return 0;

        const prices = candles.map(c => c.close ?? 0);
        const returns: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            returns.push(((prices[ i ] ?? 0) - (prices[ i - 1 ] ?? 1)) / (prices[ i - 1 ] ?? 1));
        }

        const meanReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const variance = returns.length ? returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length : 0;

        return Math.sqrt(variance) * 100; // Annualized volatility
    }

    /**
     * Find support and resistance levels
     */
    private findSupportResistance(candles: DerivCandleData[]): any
    {
        if (candles.length < 10) {
            return { support: 0, resistance: 0, strength: 0 };
        }

        const highs = candles.map(c => c.high ?? 0);
        const lows = candles.map(c => c.low ?? 0);

        const resistance = Math.max(...highs.slice(-10));
        const support = Math.min(...lows.slice(-10));

        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const denominator = Math.abs(resistance - support) || 1;
        const strength = Math.min(1, Math.abs(currentPrice - support) / denominator);

        return {
            support,
            resistance,
            strength,
            distanceToSupport: currentPrice - support,
            distanceToResistance: resistance - currentPrice
        };
    }

    /**
     * Calculate timeframe confidence
     */
    private calculateTimeframeConfidence(candles: DerivCandleData[]): number
    {
        if (candles.length < 10) return 0.5;

        const volumeConsistency = this.calculateVolumeConsistency(candles);
        const priceConsistency = this.calculatePriceConsistency(candles);
        const dataQuality = Math.min(1, candles.length / 20);

        return (volumeConsistency + priceConsistency + dataQuality) / 3;
    }

    /**
     * Calculate volume consistency
     */
    private calculateVolumeConsistency(candles: DerivCandleData[]): number
    {
        const volumes = candles.map(c => c.volume || 1000);
        const meanVolume = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 1000;
        const variance = volumes.length ? volumes.reduce((sum, vol) => sum + Math.pow(vol - meanVolume, 2), 0) / volumes.length : 0;
        const stdDev = Math.sqrt(variance);

        return Math.max(0, 1 - (stdDev / (meanVolume || 1)));
    }

    /**
     * Calculate price consistency
     */
    private calculatePriceConsistency(candles: DerivCandleData[]): number
    {
        const prices = candles.map(c => c.close ?? 0);
        const returns: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            returns.push(Math.abs(((prices[ i ] ?? 0) - (prices[ i - 1 ] ?? 1)) / (prices[ i - 1 ] ?? 1)));
        }

        const meanReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        return Math.max(0, 1 - meanReturn * 100);
    }

    /**
     * Calculate overall confluence across timeframes
     */
    private calculateOverallConfluence(timeframes: any): number
    {
        const timeframeWeights: Record<string, number> = {
            m1: 0.1,
            m5: 0.15,
            m15: 0.2,
            h1: 0.25,
            h4: 0.2,
            d1: 0.1
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const [ timeframe, weight ] of Object.entries(timeframeWeights)) {
            if (timeframes[ timeframe ]) {
                const strength = timeframes[ timeframe ].strength || 0.5;
                weightedSum += strength * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    }

    /**
     * Calculate trend alignment across timeframes
     */
    private calculateTrendAlignment(timeframes: any): any
    {
        const trends: Record<string, number> = {
            STRONG_UP: 0,
            WEAK_UP: 0,
            SIDEWAYS: 0,
            WEAK_DOWN: 0,
            STRONG_DOWN: 0
        };

        let totalTimeframes = 0;

        for (const timeframe of Object.values(timeframes)) {
            if (timeframe && (timeframe as any).trend) {
                trends[ (timeframe as any).trend ] = (trends[ (timeframe as any).trend ] ?? 0) + 1;
                totalTimeframes++;
            }
        }

        if (totalTimeframes === 0) {
            return { dominantTrend: 'NEUTRAL', alignment: 0.5 };
        }

        const dominantTrend = Object.entries(trends).reduce((a, b) =>
            (trends[ a[ 0 ] ] ?? 0) > (trends[ b[ 0 ] ] ?? 0) ? a : b)[ 0 ];

        const alignment = (trends[ dominantTrend ] ?? 0) / totalTimeframes;

        return {
            dominantTrend,
            alignment,
            distribution: trends
        };
    }

    /**
     * Calculate strength distribution across timeframes
     */
    private calculateStrengthDistribution(timeframes: any): any
    {
        const strengths: number[] = [];
        const timeframesList: string[] = [];

        for (const [ name, timeframe ] of Object.entries(timeframes)) {
            if (timeframe && typeof (timeframe as any).strength === 'number') {
                strengths.push((timeframe as any).strength);
                timeframesList.push(name);
            }
        }

        if (strengths.length === 0) {
            return { average: 0.5, min: 0.5, max: 0.5, distribution: [] };
        }

        return {
            average: strengths.reduce((a, b) => a + b, 0) / strengths.length,
            min: Math.min(...strengths),
            max: Math.max(...strengths),
            distribution: timeframesList.map((name, i) => ({
                timeframe: name,
                strength: strengths[ i ]
            }))
        };
    }

    /**
     * Generate timeframe recommendation
     */
    private generateTimeframeRecommendation(timeframes: any, confluence: number): string
    {
        if (confluence > 0.8) {
            return 'STRONG_CONFLUENCE';
        } else if (confluence > 0.6) {
            return 'MODERATE_CONFLUENCE';
        } else if (confluence > 0.4) {
            return 'WEAK_CONFLUENCE';
        } else {
            return 'MIXED_SIGNALS';
        }
    }

    /**
     * Calculate Simple Moving Average
     */
    private calculateSMA(prices: number[], period: number): number
    {
        if (prices.length < period) return prices[ prices.length - 1 ] ?? 0;

        const recentPrices = prices.slice(-period);
        return recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    }

    /**
     * Default timeframe analysis when insufficient data
     */
    private getDefaultTimeframeAnalysis(): any
    {
        return {
            trend: 'NEUTRAL',
            strength: 0.5,
            momentum: 0,
            volatility: 0,
            supportResistance: { support: 0, resistance: 0, strength: 0 },
            confidence: 0.5,
            lastUpdate: Date.now() / 1000
        };
    }
}
