import { DerivCandleData } from '../types/deriv.types';

/**
 * Pattern Recognition Service
 * Identifies candlestick patterns and chart patterns for enhanced trading decisions
 */
export class PatternRecognitionService
{

    /**
     * Identify patterns in historical data
     */
    async identifyPatterns(historicalData: DerivCandleData[], symbol: string): Promise<any>
    {
        const candlestickPatterns = this.identifyCandlestickPatterns(historicalData);
        const chartPatterns = this.identifyChartPatterns(historicalData);
        const supportResistancePatterns = this.identifySupportResistancePatterns(historicalData);

        return {
            candlestick: candlestickPatterns,
            chart: chartPatterns,
            supportResistance: supportResistancePatterns,
            overallPattern: this.determineOverallPattern(candlestickPatterns, chartPatterns)
        };
    }

    /**
     * Identify candlestick patterns
     */
    private identifyCandlestickPatterns(candles: DerivCandleData[]): any
    {
        if (candles.length < 5) {
            return this.getDefaultCandlestickPatterns();
        }

        const recentCandles = candles.slice(-5);
        const patterns = [];

        // Check for doji
        const lastCandle = recentCandles[ recentCandles.length - 1 ];
        if (lastCandle && this.isDoji(lastCandle)) {
            patterns.push({
                name: 'DOJI',
                type: 'REVERSAL',
                reliability: 0.7,
                signal: this.getDojiSignal(recentCandles)
            });
        }

        // Check for hammer
        if (lastCandle && this.isHammer(lastCandle)) {
            patterns.push({
                name: 'HAMMER',
                type: 'BULLISH_REVERSAL',
                reliability: 0.8,
                signal: 'BULLISH'
            });
        }

        // Check for shooting star
        if (lastCandle && this.isShootingStar(lastCandle)) {
            patterns.push({
                name: 'SHOOTING_STAR',
                type: 'BEARISH_REVERSAL',
                reliability: 0.8,
                signal: 'BEARISH'
            });
        }

        // Check for engulfing patterns
        const engulfing = this.checkEngulfingPattern(recentCandles);
        if (engulfing) {
            patterns.push(engulfing);
        }

        // Check for three white soldiers
        if (this.isThreeWhiteSoldiers(recentCandles)) {
            patterns.push({
                name: 'THREE_WHITE_SOLDIERS',
                type: 'BULLISH_CONTINUATION',
                reliability: 0.9,
                signal: 'BULLISH'
            });
        }

        // Check for three black crows
        if (this.isThreeBlackCrows(recentCandles)) {
            patterns.push({
                name: 'THREE_BLACK_CROWS',
                type: 'BEARISH_CONTINUATION',
                reliability: 0.9,
                signal: 'BEARISH'
            });
        }

        return {
            primaryPattern: patterns.length > 0 ? patterns[ 0 ] : null,
            allPatterns: patterns,
            reliability: patterns.length > 0 ? Math.max(...patterns.map(p => p.reliability)) : 0.5,
            age: 1,
            confirmations: this.getPatternConfirmations(patterns, recentCandles)
        };
    }

    /**
     * Check if candle is a doji
     */
    private isDoji(candle: DerivCandleData): boolean
    {
        const bodySize = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        return totalRange > 0 && bodySize / totalRange < 0.1;
    }

    /**
     * Get doji signal based on context
     */
    private getDojiSignal(candles: DerivCandleData[]): string
    {
        if (candles.length < 2) return 'NEUTRAL';

        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const previousPrice = candles[ candles.length - 2 ]?.close ?? 0;

        return currentPrice > previousPrice ? 'BULLISH' : 'BEARISH';
    }

    /**
     * Check if candle is a hammer
     */
    private isHammer(candle: DerivCandleData): boolean
    {
        const bodySize = Math.abs(candle.close - candle.open);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);

        return lowerShadow > 2 * bodySize && upperShadow < bodySize;
    }

    /**
     * Check if candle is a shooting star
     */
    private isShootingStar(candle: DerivCandleData): boolean
    {
        const bodySize = Math.abs(candle.close - candle.open);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);

        return upperShadow > 2 * bodySize && lowerShadow < bodySize;
    }

    /**
     * Check for engulfing patterns
     */
    private checkEngulfingPattern(candles: DerivCandleData[]): any
    {
        if (candles.length < 2) return null;

        const current = candles[ candles.length - 1 ];
        const previous = candles[ candles.length - 2 ];

        if (!current || !previous) return null;

        const currentBody = Math.abs((current.close ?? 0) - (current.open ?? 0));
        const previousBody = Math.abs((previous.close ?? 0) - (previous.open ?? 0));

        // Bullish engulfing
        if ((current.close ?? 0) > (current.open ?? 0) && // Current is bullish
            (previous.close ?? 0) < (previous.open ?? 0) && // Previous is bearish
            (current.open ?? 0) < (previous.close ?? 0) && // Current opens below previous close
            (current.close ?? 0) > (previous.open ?? 0)) { // Current closes above previous open
            return {
                name: 'BULLISH_ENGULFING',
                type: 'BULLISH_REVERSAL',
                reliability: 0.8,
                signal: 'BULLISH'
            };
        }

        // Bearish engulfing
        if ((current.close ?? 0) < (current.open ?? 0) && // Current is bearish
            (previous.close ?? 0) > (previous.open ?? 0) && // Previous is bullish
            (current.open ?? 0) > (previous.close ?? 0) && // Current opens above previous close
            (current.close ?? 0) < (previous.open ?? 0)) { // Current closes below previous open
            return {
                name: 'BEARISH_ENGULFING',
                type: 'BEARISH_REVERSAL',
                reliability: 0.8,
                signal: 'BEARISH'
            };
        }

        return null;
    }

    /**
     * Check for three white soldiers pattern
     */
    private isThreeWhiteSoldiers(candles: DerivCandleData[]): boolean
    {
        if (candles.length < 3) return false;

        const lastThree = candles.slice(-3);

        for (const candle of lastThree) {
            if (!candle || (candle.close ?? 0) <= (candle.open ?? 0)) return false; // Must be bullish
            const bodySize = (candle.close ?? 0) - (candle.open ?? 0);
            const totalRange = (candle.high ?? 0) - (candle.low ?? 0);
            if (totalRange === 0 || bodySize / totalRange < 0.6) return false; // Must have substantial body
        }

        // Check for consecutive higher closes
        for (let i = 1; i < lastThree.length; i++) {
            if ((lastThree[ i ]?.close ?? 0) <= (lastThree[ i - 1 ]?.close ?? 0)) return false;
        }

        return true;
    }

    /**
     * Check for three black crows pattern
     */
    private isThreeBlackCrows(candles: DerivCandleData[]): boolean
    {
        if (candles.length < 3) return false;

        const lastThree = candles.slice(-3);

        for (const candle of lastThree) {
            if (!candle || (candle.close ?? 0) >= (candle.open ?? 0)) return false; // Must be bearish
            const bodySize = (candle.open ?? 0) - (candle.close ?? 0);
            const totalRange = (candle.high ?? 0) - (candle.low ?? 0);
            if (totalRange === 0 || bodySize / totalRange < 0.6) return false; // Must have substantial body
        }

        // Check for consecutive lower closes
        for (let i = 1; i < lastThree.length; i++) {
            if ((lastThree[ i ]?.close ?? 0) >= (lastThree[ i - 1 ]?.close ?? 0)) return false;
        }

        return true;
    }

    /**
     * Get pattern confirmations
     */
    private getPatternConfirmations(patterns: any[], candles: DerivCandleData[]): string[]
    {
        const confirmations: string[] = [];

        if (patterns.length === 0) return confirmations;

        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const previousPrice = candles[ candles.length - 2 ]?.close ?? 0;

        // Volume confirmation
        const currentVolume = candles[ candles.length - 1 ]?.volume || 1000;
        const avgVolume = candles.slice(-5).reduce((sum, c) => sum + (c?.volume || 1000), 0) / 5;

        if (currentVolume > avgVolume * 1.5) {
            confirmations.push('HIGH_VOLUME');
        }

        // Price confirmation
        for (const pattern of patterns) {
            if (pattern.signal === 'BULLISH' && currentPrice > previousPrice) {
                confirmations.push('PRICE_CONFIRMATION');
            } else if (pattern.signal === 'BEARISH' && currentPrice < previousPrice) {
                confirmations.push('PRICE_CONFIRMATION');
            }
        }

        return confirmations;
    }

    /**
     * Identify chart patterns
     */
    private identifyChartPatterns(candles: DerivCandleData[]): any
    {
        if (candles.length < 20) {
            return this.getDefaultChartPatterns();
        }

        const patterns = [];

        // Check for double top
        const doubleTop = this.checkDoubleTop(candles);
        if (doubleTop) patterns.push(doubleTop);

        // Check for double bottom
        const doubleBottom = this.checkDoubleBottom(candles);
        if (doubleBottom) patterns.push(doubleBottom);

        // Check for head and shoulders
        const headAndShoulders = this.checkHeadAndShoulders(candles);
        if (headAndShoulders) patterns.push(headAndShoulders);

        // Check for inverse head and shoulders
        const inverseHeadAndShoulders = this.checkInverseHeadAndShoulders(candles);
        if (inverseHeadAndShoulders) patterns.push(inverseHeadAndShoulders);

        // Check for triangle patterns
        const triangle = this.checkTrianglePattern(candles);
        if (triangle) patterns.push(triangle);

        return {
            primaryPattern: patterns.length > 0 ? patterns[ 0 ] : null,
            allPatterns: patterns,
            completion: patterns.length > 0 ? patterns[ 0 ].completion : 0.5,
            targetPrice: patterns.length > 0 ? patterns[ 0 ].targetPrice : 0,
            stopLoss: patterns.length > 0 ? patterns[ 0 ].stopLoss : 0
        };
    }

    /**
     * Check for double top pattern
     */
    private checkDoubleTop(candles: DerivCandleData[]): any
    {
        if (candles.length < 15) return null;

        const highs = candles.map(c => c.high ?? 0);
        const peaks = this.findPeaks(highs);

        if (peaks.length < 2) return null;

        const lastTwoPeaks = peaks.slice(-2);
        const peak1 = lastTwoPeaks[ 0 ];
        const peak2 = lastTwoPeaks[ 1 ];

        if (!peak1 || !peak2) return null;

        // Check if peaks are similar in height
        const heightDiff = Math.abs((peak1.value ?? 0) - (peak2.value ?? 0)) / (peak1.value ?? 1);
        if (heightDiff > 0.02) return null; // More than 2% difference

        // Check if there's a valley between peaks
        const valleyIndex = Math.floor(((peak1.index ?? 0) + (peak2.index ?? 0)) / 2);
        const valley = highs[ valleyIndex ] ?? 0;
        const valleyDepth = Math.min((peak1.value ?? 0), (peak2.value ?? 0)) - valley;

        if (valleyDepth < ((peak1.value ?? 0) - valley) * 0.3) return null; // Valley not deep enough

        const neckline = valley;
        const targetPrice = neckline - ((peak1.value ?? 0) - neckline);
        const completion = this.calculatePatternCompletion(candles, peak2.index ?? 0);

        return {
            name: 'DOUBLE_TOP',
            type: 'BEARISH_REVERSAL',
            reliability: 0.85,
            completion,
            targetPrice,
            stopLoss: (peak1.value ?? 0) * 1.01
        };
    }

    /**
     * Check for double bottom pattern
     */
    private checkDoubleBottom(candles: DerivCandleData[]): any
    {
        if (candles.length < 15) return null;

        const lows = candles.map(c => c.low ?? 0);
        const troughs = this.findTroughs(lows);

        if (troughs.length < 2) return null;

        const lastTwoTroughs = troughs.slice(-2);
        const trough1 = lastTwoTroughs[ 0 ];
        const trough2 = lastTwoTroughs[ 1 ];

        if (!trough1 || !trough2) return null;

        // Check if troughs are similar in depth
        const depthDiff = Math.abs((trough1.value ?? 0) - (trough2.value ?? 0)) / (trough1.value ?? 1);
        if (depthDiff > 0.02) return null; // More than 2% difference

        // Check if there's a peak between troughs
        const peakIndex = Math.floor(((trough1.index ?? 0) + (trough2.index ?? 0)) / 2);
        const peak = lows[ peakIndex ] ?? 0;
        const peakHeight = peak - Math.max((trough1.value ?? 0), (trough2.value ?? 0));

        if (peakHeight < (peak - (trough1.value ?? 0)) * 0.3) return null; // Peak not high enough

        const neckline = peak;
        const targetPrice = neckline + (neckline - (trough1.value ?? 0));
        const completion = this.calculatePatternCompletion(candles, trough2.index ?? 0);

        return {
            name: 'DOUBLE_BOTTOM',
            type: 'BULLISH_REVERSAL',
            reliability: 0.85,
            completion,
            targetPrice,
            stopLoss: (trough1.value ?? 0) * 0.99
        };
    }

    /**
     * Check for head and shoulders pattern
     */
    private checkHeadAndShoulders(candles: DerivCandleData[]): any
    {
        if (candles.length < 25) return null;

        const highs = candles.map(c => c.high ?? 0);
        const peaks = this.findPeaks(highs);

        if (peaks.length < 3) return null;

        const lastThreePeaks = peaks.slice(-3);
        const leftShoulder = lastThreePeaks[ 0 ];
        const head = lastThreePeaks[ 1 ];
        const rightShoulder = lastThreePeaks[ 2 ];

        if (!leftShoulder || !head || !rightShoulder) return null;

        // Check if head is higher than shoulders
        if ((head.value ?? 0) <= (leftShoulder.value ?? 0) || (head.value ?? 0) <= (rightShoulder.value ?? 0)) return null;

        // Check if shoulders are similar in height
        const shoulderDiff = Math.abs((leftShoulder.value ?? 0) - (rightShoulder.value ?? 0)) / (leftShoulder.value ?? 1);
        if (shoulderDiff > 0.03) return null; // More than 3% difference

        const neckline = ((leftShoulder.value ?? 0) + (rightShoulder.value ?? 0)) / 2;
        const targetPrice = neckline - ((head.value ?? 0) - neckline);
        const completion = this.calculatePatternCompletion(candles, rightShoulder.index ?? 0);

        return {
            name: 'HEAD_AND_SHOULDERS',
            type: 'BEARISH_REVERSAL',
            reliability: 0.9,
            completion,
            targetPrice,
            stopLoss: (head.value ?? 0) * 1.01
        };
    }

    /**
     * Check for inverse head and shoulders pattern
     */
    private checkInverseHeadAndShoulders(candles: DerivCandleData[]): any
    {
        if (candles.length < 25) return null;

        const lows = candles.map(c => c.low ?? 0);
        const troughs = this.findTroughs(lows);

        if (troughs.length < 3) return null;

        const lastThreeTroughs = troughs.slice(-3);
        const leftShoulder = lastThreeTroughs[ 0 ];
        const head = lastThreeTroughs[ 1 ];
        const rightShoulder = lastThreeTroughs[ 2 ];

        if (!leftShoulder || !head || !rightShoulder) return null;

        // Check if head is lower than shoulders
        if ((head.value ?? 0) >= (leftShoulder.value ?? 0) || (head.value ?? 0) >= (rightShoulder.value ?? 0)) return null;

        // Check if shoulders are similar in depth
        const shoulderDiff = Math.abs((leftShoulder.value ?? 0) - (rightShoulder.value ?? 0)) / (leftShoulder.value ?? 1);
        if (shoulderDiff > 0.03) return null; // More than 3% difference

        const neckline = ((leftShoulder.value ?? 0) + (rightShoulder.value ?? 0)) / 2;
        const targetPrice = neckline + (neckline - (head.value ?? 0));
        const completion = this.calculatePatternCompletion(candles, rightShoulder.index ?? 0);

        return {
            name: 'INVERSE_HEAD_AND_SHOULDERS',
            type: 'BULLISH_REVERSAL',
            reliability: 0.9,
            completion,
            targetPrice,
            stopLoss: (head.value ?? 0) * 0.99
        };
    }

    /**
     * Check for triangle patterns
     */
    private checkTrianglePattern(candles: DerivCandleData[]): any
    {
        if (candles.length < 15) return null;

        const highs = candles.map(c => c.high ?? 0);
        const lows = candles.map(c => c.low ?? 0);

        const recentHighs = highs.slice(-10);
        const recentLows = lows.slice(-10);

        const highSlope = this.calculateSlope(recentHighs);
        const lowSlope = this.calculateSlope(recentLows);

        // Symmetrical triangle
        if (Math.abs(highSlope + lowSlope) < 0.1) {
            return {
                name: 'SYMMETRICAL_TRIANGLE',
                type: 'CONTINUATION',
                reliability: 0.75,
                completion: 0.7,
                targetPrice: this.calculateTriangleTarget(candles, 'SYMMETRICAL'),
                stopLoss: this.calculateTriangleStopLoss(candles, 'SYMMETRICAL')
            };
        }

        // Ascending triangle
        if (highSlope < 0.1 && lowSlope > 0.1) {
            return {
                name: 'ASCENDING_TRIANGLE',
                type: 'BULLISH_CONTINUATION',
                reliability: 0.8,
                completion: 0.7,
                targetPrice: this.calculateTriangleTarget(candles, 'ASCENDING'),
                stopLoss: this.calculateTriangleStopLoss(candles, 'ASCENDING')
            };
        }

        // Descending triangle
        if (highSlope < -0.1 && lowSlope < 0.1) {
            return {
                name: 'DESCENDING_TRIANGLE',
                type: 'BEARISH_CONTINUATION',
                reliability: 0.8,
                completion: 0.7,
                targetPrice: this.calculateTriangleTarget(candles, 'DESCENDING'),
                stopLoss: this.calculateTriangleStopLoss(candles, 'DESCENDING')
            };
        }

        return null;
    }

    /**
     * Find peaks in price data
     */
    private findPeaks(values: number[]): Array<{ index: number, value: number; }>
    {
        const peaks: Array<{ index: number, value: number; }> = [];

        for (let i = 1; i < values.length - 1; i++) {
            if ((values[ i ] ?? 0) > (values[ i - 1 ] ?? 0) && (values[ i ] ?? 0) > (values[ i + 1 ] ?? 0)) {
                peaks.push({ index: i, value: values[ i ] ?? 0 });
            }
        }

        return peaks;
    }

    /**
     * Find troughs in price data
     */
    private findTroughs(values: number[]): Array<{ index: number, value: number; }>
    {
        const troughs: Array<{ index: number, value: number; }> = [];

        for (let i = 1; i < values.length - 1; i++) {
            if ((values[ i ] ?? 0) < (values[ i - 1 ] ?? 0) && (values[ i ] ?? 0) < (values[ i + 1 ] ?? 0)) {
                troughs.push({ index: i, value: values[ i ] ?? 0 });
            }
        }

        return troughs;
    }

    /**
     * Calculate slope of a line
     */
    private calculateSlope(values: number[]): number
    {
        if (values.length < 2) return 0;

        const x1 = 0;
        const y1 = values[ 0 ] ?? 0;
        const x2 = values.length - 1;
        const y2 = values[ values.length - 1 ] ?? 0;

        return (y2 - y1) / (x2 - x1);
    }

    /**
     * Calculate pattern completion percentage
     */
    private calculatePatternCompletion(candles: DerivCandleData[], patternEndIndex: number): number
    {
        const totalCandles = candles.length;
        const patternCandles = patternEndIndex + 1;
        return Math.min(1, patternCandles / totalCandles);
    }

    /**
     * Calculate triangle target price
     */
    private calculateTriangleTarget(candles: DerivCandleData[], type: string): number
    {
        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const height = Math.max(...candles.map(c => c.high ?? 0)) - Math.min(...candles.map(c => c.low ?? 0));

        switch (type) {
            case 'ASCENDING':
                return currentPrice + height;
            case 'DESCENDING':
                return currentPrice - height;
            default:
                return currentPrice + height * 0.5;
        }
    }

    /**
     * Calculate triangle stop loss
     */
    private calculateTriangleStopLoss(candles: DerivCandleData[], type: string): number
    {
        const currentPrice = candles[ candles.length - 1 ]?.close ?? 0;
        const height = Math.max(...candles.map(c => c.high ?? 0)) - Math.min(...candles.map(c => c.low ?? 0));

        switch (type) {
            case 'ASCENDING':
                return currentPrice - height * 0.5;
            case 'DESCENDING':
                return currentPrice + height * 0.5;
            default:
                return currentPrice - height * 0.3;
        }
    }

    /**
     * Identify support and resistance patterns
     */
    private identifySupportResistancePatterns(candles: DerivCandleData[]): any
    {
        if (candles.length < 10) {
            return this.getDefaultSupportResistancePatterns();
        }

        const highs = candles.map(c => c.high ?? 0);
        const lows = candles.map(c => c.low ?? 0);
        const closes = candles.map(c => c.close ?? 0);

        const resistanceLevels = this.findResistanceLevels(highs);
        const supportLevels = this.findSupportLevels(lows);
        const currentPrice = closes[ closes.length - 1 ] ?? 0;

        return {
            resistanceLevels,
            supportLevels,
            nearestResistance: this.findNearestLevel(currentPrice, resistanceLevels),
            nearestSupport: this.findNearestLevel(currentPrice, supportLevels),
            strength: this.calculateLevelStrength(candles, resistanceLevels, supportLevels)
        };
    }

    /**
     * Find resistance levels
     */
    private findResistanceLevels(highs: number[]): number[]
    {
        const levels: number[] = [];
        const tolerance = 0.01; // 1% tolerance

        for (let i = 0; i < highs.length; i++) {
            const level = highs[ i ] ?? 0;
            let count = 0;

            for (let j = 0; j < highs.length; j++) {
                if (Math.abs((highs[ j ] ?? 0) - level) / (level || 1) < tolerance) {
                    count++;
                }
            }

            if (count >= 2) { // At least 2 touches
                levels.push(level);
            }
        }

        return [ ...new Set(levels) ].sort((a, b) => a - b);
    }

    /**
     * Find support levels
     */
    private findSupportLevels(lows: number[]): number[]
    {
        const levels: number[] = [];
        const tolerance = 0.01; // 1% tolerance

        for (let i = 0; i < lows.length; i++) {
            const level = lows[ i ] ?? 0;
            let count = 0;

            for (let j = 0; j < lows.length; j++) {
                if (Math.abs((lows[ j ] ?? 0) - level) / (level || 1) < tolerance) {
                    count++;
                }
            }

            if (count >= 2) { // At least 2 touches
                levels.push(level);
            }
        }

        return [ ...new Set(levels) ].sort((a, b) => a - b);
    }

    /**
     * Find nearest level
     */
    private findNearestLevel(price: number, levels: number[]): number
    {
        if (levels.length === 0) return price;

        return levels.reduce((nearest, level) =>
            Math.abs(level - price) < Math.abs(nearest - price) ? level : nearest
        );
    }

    /**
     * Calculate level strength
     */
    private calculateLevelStrength(candles: DerivCandleData[], resistanceLevels: number[], supportLevels: number[]): number
    {
        const totalLevels = resistanceLevels.length + supportLevels.length;
        if (totalLevels === 0) return 0.5;

        const touches = resistanceLevels.length + supportLevels.length;
        return Math.min(1, touches / (totalLevels * 2));
    }

    /**
     * Determine overall pattern
     */
    private determineOverallPattern(candlestickPatterns: any, chartPatterns: any): any
    {
        const candlestickSignal = candlestickPatterns.primaryPattern?.signal || 'NEUTRAL';
        const chartSignal = chartPatterns.primaryPattern?.type?.includes('BULLISH') ? 'BULLISH' :
            chartPatterns.primaryPattern?.type?.includes('BEARISH') ? 'BEARISH' : 'NEUTRAL';

        let overallSignal = 'NEUTRAL';
        let confidence = 0.5;

        if (candlestickSignal === chartSignal && candlestickSignal !== 'NEUTRAL') {
            overallSignal = candlestickSignal;
            confidence = 0.8;
        } else if (candlestickSignal !== 'NEUTRAL') {
            overallSignal = candlestickSignal;
            confidence = 0.6;
        } else if (chartSignal !== 'NEUTRAL') {
            overallSignal = chartSignal;
            confidence = 0.7;
        }

        return {
            signal: overallSignal,
            confidence,
            candlestickWeight: 0.4,
            chartWeight: 0.6
        };
    }

    /**
     * Default patterns when insufficient data
     */
    private getDefaultCandlestickPatterns(): any
    {
        return {
            primaryPattern: null,
            allPatterns: [],
            reliability: 0.5,
            age: 0,
            confirmations: []
        };
    }

    private getDefaultChartPatterns(): any
    {
        return {
            primaryPattern: null,
            allPatterns: [],
            completion: 0.5,
            targetPrice: 0,
            stopLoss: 0
        };
    }

    private getDefaultSupportResistancePatterns(): any
    {
        return {
            resistanceLevels: [],
            supportLevels: [],
            nearestResistance: 0,
            nearestSupport: 0,
            strength: 0.5
        };
    }
}
