import { DerivCandleData } from '../types/deriv.types';

/**
 * Volume Analysis Service
 * Analyzes volume patterns and indicators for enhanced trading decisions
 */
export class VolumeAnalysisService
{

    /**
     * Analyze volume patterns
     */
    async analyzeVolume(historicalData: DerivCandleData[], symbol: string): Promise<any>
    {
        const volumeIndicators = this.calculateVolumeIndicators(historicalData);
        const volumePatterns = this.identifyVolumePatterns(historicalData);
        const priceVolumeRelationship = this.analyzePriceVolumeRelationship(historicalData);
        const volumeProfile = this.createVolumeProfile(historicalData);

        return {
            volumeSMA: volumeIndicators.volumeSMA,
            currentVolume: volumeIndicators.currentVolume,
            volumeRatio: volumeIndicators.volumeRatio,
            obv: volumeIndicators.obv,
            vwap: volumeIndicators.vwap,
            priceVsVwap: volumeIndicators.priceVsVwap,
            volumePatterns,
            priceVolumeRelationship,
            volumeProfile,
            volumeSignal: this.generateVolumeSignal(volumeIndicators, volumePatterns, priceVolumeRelationship)
        };
    }

    /**
     * Calculate volume indicators
     */
    private calculateVolumeIndicators(candles: DerivCandleData[]): any
    {
        if (candles.length < 10) {
            return this.getDefaultVolumeIndicators();
        }

        const volumes = candles.map(c => c.volume || 1000);
        const prices = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);

        const volumeSMA = this.calculateVolumeSMA(volumes, 20);
        const currentVolume = volumes[ volumes.length - 1 ] || 1000;
        const volumeRatio = currentVolume / volumeSMA;
        const obv = this.calculateOBV(prices, volumes);
        const vwap = this.calculateVWAP(candles);
        const currentPrice = prices[ prices.length - 1 ] || 0;
        const priceVsVwap = vwap !== 0 ? (currentPrice - vwap) / vwap : 0;

        return {
            volumeSMA,
            currentVolume,
            volumeRatio,
            obv,
            vwap,
            priceVsVwap,
            volumeChange: this.calculateVolumeChange(volumes),
            volumeMomentum: this.calculateVolumeMomentum(volumes)
        };
    }

    /**
     * Calculate Volume Simple Moving Average
     */
    private calculateVolumeSMA(volumes: number[], period: number): number
    {
        if (volumes.length < period) {
            return volumes.reduce((a, b) => a + b, 0) / volumes.length;
        }

        const recentVolumes = volumes.slice(-period);
        return recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    }

    /**
     * Calculate On-Balance Volume (OBV)
     */
    private calculateOBV(prices: number[], volumes: number[]): number
    {
        let obv = 0;

        for (let i = 1; i < prices.length; i++) {
            const currentPrice = prices[ i ];
            const previousPrice = prices[ i - 1 ];
            const currentVolume = volumes[ i ];

            if (currentPrice && previousPrice && currentVolume) {
                if (currentPrice > previousPrice) {
                    obv += currentVolume;
                } else if (currentPrice < previousPrice) {
                    obv -= currentVolume;
                }
                // If price is unchanged, OBV remains the same
            }
        }

        return obv;
    }

    /**
     * Calculate Volume Weighted Average Price (VWAP)
     */
    private calculateVWAP(candles: DerivCandleData[]): number
    {
        let cumulativeTPV = 0; // Total Price * Volume
        let cumulativeVolume = 0;

        for (const candle of candles) {
            const typicalPrice = (candle.high + candle.low + candle.close) / 3;
            const volume = candle.volume || 1000;

            cumulativeTPV += typicalPrice * volume;
            cumulativeVolume += volume;
        }

        return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
    }

    /**
     * Calculate volume change
     */
    private calculateVolumeChange(volumes: number[]): number
    {
        if (volumes.length < 2) return 0;

        const currentVolume = volumes[ volumes.length - 1 ];
        const previousVolume = volumes[ volumes.length - 2 ];

        if (currentVolume !== undefined && previousVolume !== undefined && previousVolume !== 0) {
            return ((currentVolume - previousVolume) / previousVolume) * 100;
        }

        return 0;
    }

    /**
     * Calculate volume momentum
     */
    private calculateVolumeMomentum(volumes: number[]): number
    {
        if (volumes.length < 5) return 0;

        const recentVolumes = volumes.slice(-5);
        const currentVolume = recentVolumes[ recentVolumes.length - 1 ];
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

        if (currentVolume !== undefined && avgVolume !== 0) {
            return ((currentVolume - avgVolume) / avgVolume) * 100;
        }

        return 0;
    }

    /**
     * Identify volume patterns
     */
    private identifyVolumePatterns(candles: DerivCandleData[]): any
    {
        if (candles.length < 10) {
            return this.getDefaultVolumePatterns();
        }

        const volumes = candles.map(c => c.volume || 1000);
        const prices = candles.map(c => c.close);

        const patterns = [];

        // Volume spike pattern
        const volumeSpike = this.detectVolumeSpike(volumes);
        if (volumeSpike) patterns.push(volumeSpike);

        // Volume trend pattern
        const volumeTrend = this.detectVolumeTrend(volumes);
        if (volumeTrend) patterns.push(volumeTrend);

        // Volume divergence pattern
        const volumeDivergence = this.detectVolumeDivergence(prices, volumes);
        if (volumeDivergence) patterns.push(volumeDivergence);

        // Volume climax pattern
        const volumeClimax = this.detectVolumeClimax(volumes, prices);
        if (volumeClimax) patterns.push(volumeClimax);

        return {
            primaryPattern: patterns.length > 0 ? patterns[ 0 ] : null,
            allPatterns: patterns,
            patternStrength: patterns.length > 0 ? Math.max(...patterns.map(p => p.strength)) : 0.5
        };
    }

    /**
     * Detect volume spike
     */
    private detectVolumeSpike(volumes: number[]): any
    {
        if (volumes.length < 5) return null;

        const currentVolume = volumes[ volumes.length - 1 ];
        const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;

        if (currentVolume !== undefined && currentVolume > avgVolume * 2) {
            return {
                name: 'VOLUME_SPIKE',
                type: 'HIGH_VOLUME',
                strength: Math.min(1, currentVolume / (avgVolume * 3)),
                signal: 'ATTENTION_REQUIRED'
            };
        }

        return null;
    }

    /**
     * Detect volume trend
     */
    private detectVolumeTrend(volumes: number[]): any
    {
        if (volumes.length < 10) return null;

        const recentVolumes = volumes.slice(-10);
        const trend = this.calculateTrend(recentVolumes);

        if (Math.abs(trend) > 0.1) {
            return {
                name: 'VOLUME_TREND',
                type: trend > 0 ? 'INCREASING' : 'DECREASING',
                strength: Math.min(1, Math.abs(trend)),
                signal: trend > 0 ? 'BULLISH_VOLUME' : 'BEARISH_VOLUME'
            };
        }

        return null;
    }

    /**
     * Detect volume divergence
     */
    private detectVolumeDivergence(prices: number[], volumes: number[]): any
    {
        if (prices.length < 10 || volumes.length < 10) return null;

        const recentPrices = prices.slice(-10);
        const recentVolumes = volumes.slice(-10);

        const priceTrend = this.calculateTrend(recentPrices);
        const volumeTrend = this.calculateTrend(recentVolumes);

        // Bullish divergence: price falling, volume increasing
        if (priceTrend < -0.05 && volumeTrend > 0.1) {
            return {
                name: 'BULLISH_VOLUME_DIVERGENCE',
                type: 'BULLISH_REVERSAL',
                strength: Math.min(1, Math.abs(volumeTrend)),
                signal: 'BULLISH'
            };
        }

        // Bearish divergence: price rising, volume decreasing
        if (priceTrend > 0.05 && volumeTrend < -0.1) {
            return {
                name: 'BEARISH_VOLUME_DIVERGENCE',
                type: 'BEARISH_REVERSAL',
                strength: Math.min(1, Math.abs(volumeTrend)),
                signal: 'BEARISH'
            };
        }

        return null;
    }

    /**
     * Detect volume climax
     */
    private detectVolumeClimax(volumes: number[], prices: number[]): any
    {
        if (volumes.length < 5 || prices.length < 5) return null;

        const currentVolume = volumes[ volumes.length - 1 ];
        const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const currentPrice = prices[ prices.length - 1 ];
        const previousPrice = prices[ prices.length - 2 ];

        if (currentVolume !== undefined && currentPrice !== undefined && previousPrice !== undefined) {
            // Selling climax: high volume with price decline
            if (currentVolume > avgVolume * 1.5 && currentPrice < previousPrice) {
                return {
                    name: 'SELLING_CLIMAX',
                    type: 'BULLISH_REVERSAL',
                    strength: Math.min(1, currentVolume / (avgVolume * 2)),
                    signal: 'BULLISH'
                };
            }

            // Buying climax: high volume with price increase
            if (currentVolume > avgVolume * 1.5 && currentPrice > previousPrice) {
                return {
                    name: 'BUYING_CLIMAX',
                    type: 'BEARISH_REVERSAL',
                    strength: Math.min(1, currentVolume / (avgVolume * 2)),
                    signal: 'BEARISH'
                };
            }
        }

        return null;
    }

    /**
     * Calculate trend of values
     */
    private calculateTrend(values: number[]): number
    {
        if (values.length < 2) return 0;

        const x1 = 0;
        const y1 = values[ 0 ];
        const x2 = values.length - 1;
        const y2 = values[ values.length - 1 ];

        if (y1 !== undefined && y2 !== undefined) {
            return (y2 - y1) / (x2 - x1);
        }

        return 0;
    }

    /**
     * Analyze price-volume relationship
     */
    private analyzePriceVolumeRelationship(candles: DerivCandleData[]): any
    {
        if (candles.length < 10) {
            return this.getDefaultPriceVolumeRelationship();
        }

        const prices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume || 1000);

        const correlation = this.calculateCorrelation(prices, volumes);
        const priceVolumeTrend = this.calculatePriceVolumeTrend(prices, volumes);
        const volumeConfirmation = this.checkVolumeConfirmation(prices, volumes);

        return {
            correlation,
            priceVolumeTrend,
            volumeConfirmation,
            strength: Math.abs(correlation)
        };
    }

    /**
     * Calculate correlation between price and volume
     */
    private calculateCorrelation(prices: number[], volumes: number[]): number
    {
        if (prices.length !== volumes.length || prices.length < 2) return 0;

        const n = prices.length;
        const sumX = prices.reduce((a, b) => a + b, 0);
        const sumY = volumes.reduce((a, b) => a + b, 0);
        const sumXY = prices.reduce((sum, price, i) =>
        {
            const volume = volumes[ i ];
            return sum + (price * (volume || 0));
        }, 0);
        const sumX2 = prices.reduce((sum, price) => sum + price * price, 0);
        const sumY2 = volumes.reduce((sum, volume) => sum + volume * volume, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator !== 0 ? numerator / denominator : 0;
    }

    /**
     * Calculate price-volume trend
     */
    private calculatePriceVolumeTrend(prices: number[], volumes: number[]): string
    {
        if (prices.length < 5 || volumes.length < 5) return 'NEUTRAL';

        const recentPrices = prices.slice(-5);
        const recentVolumes = volumes.slice(-5);

        const priceTrend = this.calculateTrend(recentPrices);
        const volumeTrend = this.calculateTrend(recentVolumes);

        if (priceTrend > 0.01 && volumeTrend > 0.1) {
            return 'STRONG_BULLISH';
        } else if (priceTrend > 0.01 && volumeTrend > -0.1) {
            return 'WEAK_BULLISH';
        } else if (priceTrend < -0.01 && volumeTrend > 0.1) {
            return 'STRONG_BEARISH';
        } else if (priceTrend < -0.01 && volumeTrend > -0.1) {
            return 'WEAK_BEARISH';
        } else {
            return 'NEUTRAL';
        }
    }

    /**
     * Check volume confirmation
     */
    private checkVolumeConfirmation(prices: number[], volumes: number[]): boolean
    {
        if (prices.length < 3 || volumes.length < 3) return false;

        const currentPrice = prices[ prices.length - 1 ];
        const previousPrice = prices[ prices.length - 2 ];
        const currentVolume = volumes[ volumes.length - 1 ];
        const avgVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;

        if (currentPrice !== undefined && previousPrice !== undefined && currentVolume !== undefined) {
            // Volume confirms price movement
            if (currentPrice > previousPrice && currentVolume > avgVolume) {
                return true;
            } else if (currentPrice < previousPrice && currentVolume > avgVolume) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create volume profile
     */
    private createVolumeProfile(candles: DerivCandleData[]): any
    {
        if (candles.length < 20) {
            return this.getDefaultVolumeProfile();
        }

        const prices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume || 1000);

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const numBins = 10;
        const binSize = priceRange / numBins;

        const volumeProfile: Record<string, number> = {};

        for (let i = 0; i < prices.length; i++) {
            const price = prices[ i ];
            const volume = volumes[ i ];
            if (price !== undefined && volume !== undefined) {
                const bin = Math.floor((price - minPrice) / binSize);
                const binKey = `bin_${bin}`;
                volumeProfile[ binKey ] = (volumeProfile[ binKey ] || 0) + volume;
            }
        }

        const poc = this.findPointOfControl(volumeProfile, minPrice, binSize);
        const valueArea = this.calculateValueArea(volumeProfile, poc);

        return {
            volumeProfile,
            pointOfControl: poc,
            valueArea,
            volumeNodes: this.findVolumeNodes(volumeProfile)
        };
    }

    /**
     * Find Point of Control (POC)
     */
    private findPointOfControl(volumeProfile: Record<string, number>, minPrice: number, binSize: number): number
    {
        let maxVolume = 0;
        let pocBin = 0;

        for (const [ binKey, volume ] of Object.entries(volumeProfile)) {
            if (volume > maxVolume) {
                maxVolume = volume;
                const binParts = binKey.split('_');
                if (binParts.length > 1 && binParts[ 1 ]) {
                    pocBin = parseInt(binParts[ 1 ]) || 0;
                }
            }
        }

        return minPrice + (pocBin + 0.5) * binSize;
    }

    /**
     * Calculate Value Area
     */
    private calculateValueArea(volumeProfile: Record<string, number>, poc: number): { upper: number; lower: number; }
    {
        const totalVolume = Object.values(volumeProfile).reduce((a, b) => a + b, 0);
        const targetVolume = totalVolume * 0.7; // 70% of total volume

        const sortedBins = Object.entries(volumeProfile)
            .sort((a, b) => b[ 1 ] - a[ 1 ]); // Sort by volume descending

        let cumulativeVolume = 0;
        const includedBins: string[] = [];

        for (const [ binKey, volume ] of sortedBins) {
            cumulativeVolume += volume;
            includedBins.push(binKey);

            if (cumulativeVolume >= targetVolume) {
                break;
            }
        }

        const binNumbers = includedBins.map(bin =>
        {
            const binParts = bin.split('_');
            return binParts.length > 1 && binParts[ 1 ] ? parseInt(binParts[ 1 ]) || 0 : 0;
        });

        if (binNumbers.length === 0) {
            return { upper: 0, lower: 0 };
        }

        return {
            upper: Math.max(...binNumbers),
            lower: Math.min(...binNumbers)
        };
    }

    /**
     * Find volume nodes (high volume areas)
     */
    private findVolumeNodes(volumeProfile: Record<string, number>): Array<{ bin: number; volume: number; }>
    {
        const avgVolume = Object.values(volumeProfile).reduce((a, b) => a + b, 0) / Object.keys(volumeProfile).length;
        const nodes: Array<{ bin: number; volume: number; }> = [];

        for (const [ binKey, volume ] of Object.entries(volumeProfile)) {
            if (volume > avgVolume * 1.5) {
                const binParts = binKey.split('_');
                if (binParts.length > 1 && binParts[ 1 ]) {
                    nodes.push({
                        bin: parseInt(binParts[ 1 ]) || 0,
                        volume
                    });
                }
            }
        }

        return nodes.sort((a, b) => b.volume - a.volume);
    }

    /**
     * Generate volume signal
     */
    private generateVolumeSignal(volumeIndicators: any, volumePatterns: any, priceVolumeRelationship: any): string
    {
        let signal = 'NEUTRAL';
        let confidence = 0.5;

        // Volume spike signal
        if (volumeIndicators.volumeRatio > 2) {
            signal = 'HIGH_VOLUME_ALERT';
            confidence = 0.7;
        }

        // Volume pattern signals
        if (volumePatterns.primaryPattern) {
            const pattern = volumePatterns.primaryPattern;
            if (pattern.signal === 'BULLISH') {
                signal = 'BULLISH_VOLUME';
                confidence = Math.max(confidence, pattern.strength);
            } else if (pattern.signal === 'BEARISH') {
                signal = 'BEARISH_VOLUME';
                confidence = Math.max(confidence, pattern.strength);
            }
        }

        // Price-volume relationship signals
        if (priceVolumeRelationship.volumeConfirmation) {
            signal = 'VOLUME_CONFIRMED';
            confidence = Math.max(confidence, 0.6);
        }

        return signal;
    }

    /**
     * Default values when insufficient data
     */
    private getDefaultVolumeIndicators(): any
    {
        return {
            volumeSMA: 1000,
            currentVolume: 1000,
            volumeRatio: 1.0,
            obv: 0,
            vwap: 0,
            priceVsVwap: 0,
            volumeChange: 0,
            volumeMomentum: 0
        };
    }

    private getDefaultVolumePatterns(): any
    {
        return {
            primaryPattern: null,
            allPatterns: [],
            patternStrength: 0.5
        };
    }

    private getDefaultPriceVolumeRelationship(): any
    {
        return {
            correlation: 0,
            priceVolumeTrend: 'NEUTRAL',
            volumeConfirmation: false,
            strength: 0.5
        };
    }

    private getDefaultVolumeProfile(): any
    {
        return {
            volumeProfile: {},
            pointOfControl: 0,
            valueArea: { upper: 0, lower: 0 },
            volumeNodes: []
        };
    }
}
