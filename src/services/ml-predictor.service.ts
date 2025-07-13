import { DerivCandleData } from '../types/deriv.types';
import { EnhancedMarketFeatures } from '../types/enhanced-features.types';

/**
 * Machine Learning Predictor Service
 * Uses statistical models and ensemble methods for price prediction
 */
export class MachineLearningPredictor
{

    /**
     * Generate prediction using multiple ML models
     */
    async generatePrediction(
        historicalData: DerivCandleData[],
        enhancedFeatures: EnhancedMarketFeatures,
        advancedIndicators: any
    ): Promise<any>
    {
        try {
            // Extract features for ML models
            const features = this.extractFeatures(historicalData, enhancedFeatures, advancedIndicators);

            // Generate predictions from different models
            const randomForest = this.randomForestPrediction(features);
            const lstm = this.lstmPrediction(features);
            const xgboost = this.xgboostPrediction(features);

            // Ensemble prediction
            const ensemble = this.ensemblePrediction([ randomForest, lstm, xgboost ]);

            // Feature importance analysis
            const featureImportance = this.analyzeFeatureImportance(features);

            return {
                models: {
                    randomForest,
                    lstm,
                    xgboost
                },
                ensemble,
                featureImportance,
                confidence: this.calculateModelConfidence([ randomForest, lstm, xgboost ])
            };
        } catch (error) {
            console.error('ML prediction failed:', error);
            return this.getDefaultMLPrediction();
        }
    }

    /**
     * Extract features for ML models
     */
    private extractFeatures(
        historicalData: DerivCandleData[],
        enhancedFeatures: EnhancedMarketFeatures,
        advancedIndicators: any
    ): any
    {
        if (historicalData.length < 20) {
            return this.getDefaultFeatures();
        }

        const prices = historicalData.map(c => c.close);
        const volumes = historicalData.map(c => c.volume || 1000);
        const highs = historicalData.map(c => c.high);
        const lows = historicalData.map(c => c.low);

        // Technical indicators
        const rsi = enhancedFeatures.technical_indicators.rsi;
        const macd = enhancedFeatures.technical_indicators.macd_line;
        const macdSignal = enhancedFeatures.technical_indicators.macd_signal;
        const macdHistogram = enhancedFeatures.technical_indicators.macd_histogram;
        const atr = enhancedFeatures.technical_indicators.atr;
        const stochastic = enhancedFeatures.technical_indicators.stochastic;
        const williamsR = enhancedFeatures.technical_indicators.williams_r;

        // Price-based features
        const priceChange = this.calculatePriceChange(prices);
        const priceMomentum = this.calculatePriceMomentum(prices);
        const volatility = this.calculateVolatility(prices);
        const trendStrength = this.calculateTrendStrength(prices);

        // Volume-based features
        const volumeChange = this.calculateVolumeChange(volumes);
        const volumeMomentum = this.calculateVolumeMomentum(volumes);
        const volumeRatio = this.calculateVolumeRatio(volumes);

        // Advanced indicators
        const ichimokuCloudPosition = advancedIndicators?.ichimoku?.cloudPosition === 'ABOVE' ? 1 :
            advancedIndicators?.ichimoku?.cloudPosition === 'BELOW' ? -1 : 0;
        const fibonacciPosition = advancedIndicators?.fibonacci?.currentPosition || 0.5;
        const elliottWavePosition = advancedIndicators?.elliottWave?.wavePosition || 0.5;

        // Market regime features
        const volatilityState = this.encodeVolatilityState(enhancedFeatures.market_regime.volatility_state);
        const trendState = this.encodeTrendState(enhancedFeatures.market_regime.trend_state);
        const momentumState = this.encodeMomentumState(enhancedFeatures.market_regime.momentum_state);

        return {
            // Technical indicators
            rsi: rsi / 100, // Normalize to 0-1
            macd: this.normalizeMACD(macd),
            macdSignal: this.normalizeMACD(macdSignal),
            macdHistogram: this.normalizeMACD(macdHistogram),
            atr: this.normalizeATR(atr, prices),
            stochastic: stochastic / 100, // Normalize to 0-1
            williamsR: (williamsR + 100) / 100, // Normalize to 0-1

            // Price features
            priceChange,
            priceMomentum,
            volatility,
            trendStrength,

            // Volume features
            volumeChange,
            volumeMomentum,
            volumeRatio,

            // Advanced indicators
            ichimokuCloudPosition,
            fibonacciPosition,
            elliottWavePosition,

            // Market regime
            volatilityState,
            trendState,
            momentumState,
            confluenceScore: enhancedFeatures.market_regime.confluence_score,

            // Session features
            sessionStrength: enhancedFeatures.session_strength,
            sessionVolatilityAdjustment: enhancedFeatures.session_volatility_adjustment,
            symbolMomentum: enhancedFeatures.symbol_momentum,
            volatilityRank: enhancedFeatures.volatility_rank
        };
    }

    /**
     * Random Forest prediction
     */
    private randomForestPrediction(features: any): any
    {
        // Simplified Random Forest implementation
        const featureWeights = {
            rsi: 0.15,
            macd: 0.12,
            macdHistogram: 0.10,
            priceMomentum: 0.08,
            volatility: 0.07,
            volumeRatio: 0.06,
            trendStrength: 0.05,
            confluenceScore: 0.05,
            ichimokuCloudPosition: 0.04,
            sessionStrength: 0.03,
            stochastic: 0.03,
            williamsR: 0.03,
            fibonacciPosition: 0.02,
            elliottWavePosition: 0.02,
            volumeMomentum: 0.02,
            priceChange: 0.02,
            volumeChange: 0.01
        };

        const prediction = this.weightedPrediction(features, featureWeights);
        const confidence = this.calculateModelConfidence([ prediction ]);

        return {
            prediction: prediction > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, confidence)),
            probability: prediction
        };
    }

    /**
     * LSTM Neural Network prediction
     */
    private lstmPrediction(features: any): any
    {
        // Simplified LSTM implementation focusing on sequential patterns
        const sequentialFeatures = [
            features.priceMomentum,
            features.volumeMomentum,
            features.trendStrength,
            features.macdHistogram,
            features.rsi
        ];

        // LSTM-like pattern recognition
        const trendConsistency = this.calculateTrendConsistency(sequentialFeatures);
        const patternStrength = this.calculatePatternStrength(sequentialFeatures);

        const prediction = (trendConsistency + patternStrength) / 2;
        const confidence = 0.6 + (patternStrength * 0.3);

        return {
            prediction: prediction > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, confidence)),
            probability: prediction
        };
    }

    /**
     * XGBoost prediction
     */
    private xgboostPrediction(features: any): any
    {
        // Simplified XGBoost implementation with gradient boosting
        const basePrediction = 0.5;
        const learningRate = 0.1;

        // Multiple boosting rounds
        let prediction = basePrediction;

        // Round 1: Technical indicators
        prediction += learningRate * this.boostRound(features.rsi, features.macd, features.stochastic);

        // Round 2: Price and volume
        prediction += learningRate * this.boostRound(features.priceMomentum, features.volumeRatio, features.trendStrength);

        // Round 3: Advanced indicators
        prediction += learningRate * this.boostRound(features.ichimokuCloudPosition, features.fibonacciPosition, features.confluenceScore);

        // Round 4: Market regime
        prediction += learningRate * this.boostRound(features.volatilityState, features.trendState, features.momentumState);

        const confidence = 0.65 + (Math.abs(prediction - 0.5) * 0.3);

        return {
            prediction: prediction > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, confidence)),
            probability: Math.max(0, Math.min(1, prediction))
        };
    }

    /**
     * Ensemble prediction combining all models
     */
    private ensemblePrediction(models: any[]): any
    {
        const predictions = models.map(m => m.probability);
        const confidences = models.map(m => m.confidence);

        // Weighted average based on confidence
        const totalWeight = confidences.reduce((a, b) => a + b, 0);
        const weightedPrediction = predictions.reduce((sum, pred, i) =>
            sum + (pred * confidences[ i ]), 0) / totalWeight;

        const ensembleConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        // Agreement bonus
        const agreement = this.calculateModelAgreement(models);
        const finalConfidence = ensembleConfidence + (agreement * 0.1);

        return {
            prediction: weightedPrediction > 0.5 ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, finalConfidence)),
            probability: weightedPrediction,
            agreement
        };
    }

    /**
     * Analyze feature importance
     */
    private analyzeFeatureImportance(features: any): string[]
    {
        const importanceScores: Array<{ feature: string; score: number; }> = [];

        // Calculate importance based on feature variance and correlation with prediction
        for (const [ feature, value ] of Object.entries(features)) {
            if (typeof value === 'number') {
                const score = Math.abs(value - 0.5) * 2; // Distance from neutral
                importanceScores.push({ feature, score });
            }
        }

        // Sort by importance and return top features
        return importanceScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.feature);
    }

    /**
     * Calculate model confidence
     */
    private calculateModelConfidence(models: any[]): number
    {
        if (models.length === 0) return 0.5;

        const confidences = models.map(m => m.confidence || 0.5);
        return confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }

    /**
     * Helper methods for feature extraction
     */
    private calculatePriceChange(prices: number[]): number
    {
        if (prices.length < 2) return 0;
        return ((prices[ prices.length - 1 ] ?? 0) - (prices[ 0 ] ?? 1)) / (prices[ 0 ] ?? 1);
    }

    private calculatePriceMomentum(prices: number[]): number
    {
        if (prices.length < 5) return 0;
        const recent = prices.slice(-5);
        return ((recent[ recent.length - 1 ] ?? 0) - (recent[ 0 ] ?? 1)) / (recent[ 0 ] ?? 1);
    }

    private calculateVolatility(prices: number[]): number
    {
        if (prices.length < 10) return 0;
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push(((prices[ i ] ?? 0) - (prices[ i - 1 ] ?? 1)) / (prices[ i - 1 ] ?? 1));
        }
        const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const variance = returns.length ? returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length : 0;
        return Math.sqrt(variance);
    }

    private calculateTrendStrength(prices: number[]): number
    {
        if (prices.length < 10) return 0.5;
        const recent = prices.slice(-10);
        const trend = this.calculateLinearTrend(recent);
        return Math.max(0, Math.min(1, (trend + 1) / 2));
    }

    private calculateVolumeChange(volumes: number[]): number
    {
        if (volumes.length < 2) return 0;
        return ((volumes[ volumes.length - 1 ] ?? 0) - (volumes[ 0 ] ?? 1)) / (volumes[ 0 ] ?? 1);
    }

    private calculateVolumeMomentum(volumes: number[]): number
    {
        if (volumes.length < 5) return 0;
        const recent = volumes.slice(-5);
        return ((recent[ recent.length - 1 ] ?? 0) - (recent[ 0 ] ?? 1)) / (recent[ 0 ] ?? 1);
    }

    private calculateVolumeRatio(volumes: number[]): number
    {
        if (volumes.length < 10) return 1;
        const currentVolume = volumes[ volumes.length - 1 ] ?? 1;
        const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10 || 1;
        return currentVolume / avgVolume;
    }

    /**
     * Normalization helpers
     */
    private normalizeMACD(value: number): number
    {
        return Math.max(-1, Math.min(1, value * 100));
    }

    private normalizeATR(atr: number, prices: number[]): number
    {
        if (prices.length === 0) return 0;
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        return atr / avgPrice;
    }

    /**
     * Encoding helpers
     */
    private encodeVolatilityState(state: string): number
    {
        const encoding: Record<string, number> = {
            'LOW': 0.25,
            'NORMAL': 0.5,
            'HIGH': 0.75,
            'EXTREME': 1.0
        };
        return encoding[ state ] || 0.5;
    }

    private encodeTrendState(state: string): number
    {
        const encoding: Record<string, number> = {
            'STRONG_UP': 1.0,
            'WEAK_UP': 0.75,
            'SIDEWAYS': 0.5,
            'WEAK_DOWN': 0.25,
            'STRONG_DOWN': 0.0
        };
        return encoding[ state ] || 0.5;
    }

    private encodeMomentumState(state: string): number
    {
        const encoding: Record<string, number> = {
            'ACCELERATING': 1.0,
            'STEADY': 0.5,
            'DECELERATING': 0.0
        };
        return encoding[ state ] || 0.5;
    }

    /**
     * ML algorithm helpers
     */
    private weightedPrediction(features: any, weights: Record<string, number>): number
    {
        let weightedSum = 0;
        let totalWeight = 0;

        for (const [ feature, weight ] of Object.entries(weights)) {
            if (features[ feature ] !== undefined) {
                weightedSum += features[ feature ] * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    }

    private calculateTrendConsistency(features: number[]): number
    {
        if (features.length < 2) return 0.5;

        let consistentCount = 0;
        for (let i = 1; i < features.length; i++) {
            if (((features[ i ] ?? 0) > 0.5 && (features[ i - 1 ] ?? 0) > 0.5) ||
                ((features[ i ] ?? 0) < 0.5 && (features[ i - 1 ] ?? 0) < 0.5)) {
                consistentCount++;
            }
        }

        return consistentCount / (features.length - 1);
    }

    private calculatePatternStrength(features: number[]): number
    {
        if (features.length < 3) return 0.5;

        const variance = this.calculateVariance(features);
        return Math.max(0, 1 - variance);
    }

    private calculateVariance(values: number[]): number
    {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }

    private boostRound(feature1: number, feature2: number, feature3: number): number
    {
        return (feature1 + feature2 + feature3) / 3 - 0.5;
    }

    private calculateLinearTrend(values: number[]): number
    {
        if (values.length < 2) return 0;

        const x1 = 0;
        const y1 = values[ 0 ] ?? 0;
        const x2 = values.length - 1;
        const y2 = values[ values.length - 1 ] ?? 0;

        return (y2 - y1) / (x2 - x1);
    }

    private calculateModelAgreement(models: any[]): number
    {
        if (models.length < 2) return 1;

        const predictions = models.map(m => m.prediction);
        const upCount = predictions.filter(p => p === 'UP').length;
        const downCount = predictions.filter(p => p === 'DOWN').length;

        return Math.max(upCount, downCount) / predictions.length;
    }

    /**
     * Default values
     */
    private getDefaultFeatures(): any
    {
        return {
            rsi: 0.5,
            macd: 0,
            macdSignal: 0,
            macdHistogram: 0,
            atr: 0,
            stochastic: 0.5,
            williamsR: 0.5,
            priceChange: 0,
            priceMomentum: 0,
            volatility: 0,
            trendStrength: 0.5,
            volumeChange: 0,
            volumeMomentum: 0,
            volumeRatio: 1,
            ichimokuCloudPosition: 0,
            fibonacciPosition: 0.5,
            elliottWavePosition: 0.5,
            volatilityState: 0.5,
            trendState: 0.5,
            momentumState: 0.5,
            confluenceScore: 0.5,
            sessionStrength: 0.5,
            sessionVolatilityAdjustment: 1,
            symbolMomentum: 0.5,
            volatilityRank: 0.5
        };
    }

    private getDefaultMLPrediction(): any
    {
        return {
            models: {
                randomForest: { prediction: 'NEUTRAL', confidence: 0.5, probability: 0.5 },
                lstm: { prediction: 'NEUTRAL', confidence: 0.5, probability: 0.5 },
                xgboost: { prediction: 'NEUTRAL', confidence: 0.5, probability: 0.5 }
            },
            ensemble: { prediction: 'NEUTRAL', confidence: 0.5, probability: 0.5, agreement: 1 },
            featureImportance: [ 'rsi', 'macd', 'priceMomentum', 'volumeRatio', 'trendStrength' ],
            confidence: 0.5
        };
    }
}
