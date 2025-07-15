import { AdvancedTradingAgent } from '../agents/advanced-trading-agent';
import { BacktestService } from './backtest.service';
import { EnhancedFeatureEngineeringService } from './enhanced-feature-engineering.service';
import { DerivWebSocketClient } from './deriv-client';
import { AutonomousPredictionResult } from '../agents/autonomous-trading-agent';
import { logger } from '../utils/logger';

/**
 * Comprehensive Trading Quality Control Service
 * Implements all the improvements for achieving 60-70% win rate
 */
export class TradingQualityControlService
{
    private advancedAgent: AdvancedTradingAgent;
    private backtestService: BacktestService;
    private featureService: EnhancedFeatureEngineeringService;
    private derivClient: DerivWebSocketClient;
    private validatedStrategies: Set<string> = new Set();
    private lastValidationTime: Map<string, number> = new Map();
    private rejectedTradesCount: Map<string, number> = new Map();

    constructor (
        advancedAgent: AdvancedTradingAgent,
        backtestService: BacktestService,
        featureService: EnhancedFeatureEngineeringService,
        derivClient: DerivWebSocketClient
    )
    {
        this.advancedAgent = advancedAgent;
        this.backtestService = backtestService;
        this.featureService = featureService;
        this.derivClient = derivClient;
    }

    /**
     * MAIN ENTRY POINT: Generate trading prediction with full quality pipeline
     * This implements all the improvements to achieve 60-70% win rate
     */
    async generateQualityControlledPrediction(
        symbol: string,
        timeframe: string = '1m'
    ): Promise<AutonomousPredictionResult | null>
    {
        const startTime = Date.now();
        console.log(`🎯 Quality-controlled prediction pipeline for ${symbol}`);

        try {
            // IMPROVEMENT 1: Strategy validation before any trading
            const isValidated = await this.ensureStrategyValidation(symbol, timeframe);
            if (!isValidated) {
                this.incrementRejectionCount(symbol, 'strategy_validation');
                return null;
            }

            // IMPROVEMENT 2: Strict data quality requirements
            const qualityData = await this.fetchAndValidateData(symbol);
            if (!qualityData) {
                this.incrementRejectionCount(symbol, 'data_quality');
                return null;
            }

            // IMPROVEMENT 3: Enhanced feature engineering
            // Add data to feature service buffers
            qualityData.ticks.forEach(tick => this.featureService.addTick(tick));
            qualityData.candles.forEach(candle => this.featureService.addCandle(candle));

            const enhancedFeatures = this.featureService.generateEnhancedFeatures(symbol);

            const currentPrice = qualityData.ticks[ qualityData.ticks.length - 1 ]?.quote || 0;
            if (currentPrice === 0) {
                this.incrementRejectionCount(symbol, 'invalid_price');
                return null;
            }

            // IMPROVEMENT 4: Advanced prediction with all enhancements
            const rawPrediction = await this.advancedAgent.generateAdvancedPrediction(
                symbol,
                timeframe,
                currentPrice,
                enhancedFeatures,
                qualityData
            );

            if (!rawPrediction) {
                this.incrementRejectionCount(symbol, 'prediction_failed');
                return null;
            }

            // IMPROVEMENT 5: Multi-layer quality gates
            const qualityApprovedPrediction = this.applyQualityGates(rawPrediction, symbol);
            if (!qualityApprovedPrediction) {
                this.incrementRejectionCount(symbol, 'quality_gates');
                return null;
            }

            const processingTime = Date.now() - startTime;
            console.log(`✅ Quality prediction generated in ${processingTime}ms`);
            console.log(`📊 Final confidence: ${qualityApprovedPrediction.confidence.toFixed(2)}, R/R: ${qualityApprovedPrediction.trading_levels.risk_reward_ratio.toFixed(2)}`);

            return qualityApprovedPrediction;

        } catch (error) {
            logger.error('Quality control pipeline failed', { error, symbol, timeframe });
            this.incrementRejectionCount(symbol, 'pipeline_error');
            return null;
        }
    }

    /**
     * IMPROVEMENT 1: Strategy validation with backtesting
     */
    private async ensureStrategyValidation(symbol: string, timeframe: string): Promise<boolean>
    {
        const validationKey = `${symbol}_${timeframe}`;
        const lastValidation = this.lastValidationTime.get(validationKey) || 0;
        const now = Date.now();
        const validationExpiry = 12 * 60 * 60 * 1000; // 12 hours (more frequent revalidation)

        if (this.validatedStrategies.has(validationKey) && (now - lastValidation) < validationExpiry) {
            return true;
        }

        console.log(`🧪 Validating strategy for ${symbol}...`);

        try {
            const isValid = await this.backtestService.validateStrategy(symbol, timeframe);

            if (isValid) {
                this.validatedStrategies.add(validationKey);
                this.lastValidationTime.set(validationKey, now);
                console.log(`✅ Strategy validated for ${symbol}`);
                return true;
            } else {
                this.validatedStrategies.delete(validationKey);
                console.log(`❌ Strategy validation failed for ${symbol} - requires optimization`);
                return false;
            }
        } catch (error) {
            logger.error('Strategy validation error', { error, symbol, timeframe });
            return false;
        }
    }

    /**
     * IMPROVEMENT 2: Enhanced data quality validation
     */
    private async fetchAndValidateData(symbol: string): Promise<{ ticks: any[], candles: any[]; } | null>
    {
        try {
            // Use the correct method from DerivWebSocketClient
            const historicalData = await this.derivClient.getHistoricalData(symbol, 3); // 3 months of data
            const { ticks, candles } = historicalData;

            // STRICT data requirements (as per improvement plan)
            if (!ticks || !candles || ticks.length < 1000 || candles.length < 200) {
                console.log(`❌ Insufficient data: ${ticks?.length || 0} ticks, ${candles?.length || 0} candles`);
                return null;
            }

            // Data freshness check (stricter - within 2 minutes)
            const latestTick = ticks[ ticks.length - 1 ];
            const now = Date.now() / 1000;
            if (latestTick && (now - latestTick.epoch) > 120) {
                console.log('❌ Data too stale:', new Date(latestTick.epoch * 1000));
                return null;
            }

            // Price stability validation
            if (!this.validatePriceStability(ticks.slice(-100))) {
                console.log('❌ Price data shows unrealistic volatility');
                return null;
            }

            // Data gap detection
            const gaps = this.detectDataGaps(candles);
            if (gaps.length > 3) {
                console.log(`❌ Too many data gaps: ${gaps.length}`);
                return null;
            }

            console.log('✅ Data quality validation passed');
            return { ticks, candles };

        } catch (error) {
            logger.error('Data validation error', { error, symbol });
            return null;
        }
    }

    /**
     * IMPROVEMENT 3: Enhanced price stability validation
     */
    private validatePriceStability(recentTicks: any[]): boolean
    {
        if (recentTicks.length < 10) return false;

        const prices = recentTicks.map(tick => tick.quote);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = (maxPrice - minPrice) / minPrice;

        // More conservative - flag if >3% volatility in recent ticks
        if (priceRange > 0.03) {
            console.warn(`⚠️ High volatility detected: ${(priceRange * 100).toFixed(2)}%`);
            return false;
        }

        // Check for price jumps
        for (let i = 1; i < prices.length; i++) {
            const change = Math.abs(prices[ i ] - prices[ i - 1 ]) / prices[ i - 1 ];
            if (change > 0.01) { // 1% single-tick jump
                console.warn(`⚠️ Large price jump detected: ${(change * 100).toFixed(2)}%`);
                return false;
            }
        }

        return true;
    }

    /**
     * IMPROVEMENT 4: Enhanced data gap detection
     */
    private detectDataGaps(candles: any[]): Array<{ start: number, end: number, duration: number; }>
    {
        const gaps: Array<{ start: number, end: number, duration: number; }> = [];
        const expectedInterval = 60; // 1 minute in seconds

        for (let i = 1; i < candles.length; i++) {
            const timeDiff = candles[ i ].epoch - candles[ i - 1 ].epoch;
            if (timeDiff > expectedInterval * 2) {
                gaps.push({
                    start: candles[ i - 1 ].epoch,
                    end: candles[ i ].epoch,
                    duration: timeDiff
                });
            }
        }

        return gaps;
    }

    /**
     * IMPROVEMENT 5: Multi-layer quality gates (strictest filtering)
     */
    private applyQualityGates(prediction: AutonomousPredictionResult, symbol: string): AutonomousPredictionResult | null
    {
        console.log('🔒 Applying quality gates...');

        // GATE 1: Minimum confidence (increased from original 0.65 to 0.72)
        if (prediction.confidence < 0.72) {
            console.log(`❌ Gate 1 failed: Confidence ${prediction.confidence.toFixed(2)} < 0.72`);
            return null;
        }

        // GATE 2: Minimum risk-reward ratio (increased to 2.5)
        if (prediction.trading_levels.risk_reward_ratio < 2.5) {
            console.log(`❌ Gate 2 failed: R/R ${prediction.trading_levels.risk_reward_ratio.toFixed(2)} < 2.5`);
            return null;
        }

        // GATE 3: Technical confluence requirements
        const factors = prediction.factors as any;
        if (!factors) {
            console.log('❌ Gate 3 failed: Missing factors');
            return null;
        }

        const strongFactors = [
            factors.technical > 0.75,
            factors.advanced > 0.75,
            factors.ml_confidence > 0.80,
            factors.pattern_reliability > 0.80,
            factors.volume_support > 0.65
        ].filter(Boolean).length;

        if (strongFactors < 4) { // Require 4 out of 5 strong factors
            console.log(`❌ Gate 3 failed: Only ${strongFactors}/5 strong factors`);
            return null;
        }

        // GATE 4: Timeframe confluence
        if (prediction.timeframe_confluence === 'WEAK') {
            console.log('❌ Gate 4 failed: Weak timeframe confluence');
            return null;
        }

        // GATE 5: Market structure quality
        if (prediction.market_structure_quality === 'LOW') {
            console.log('❌ Gate 5 failed: Low market structure quality');
            return null;
        }

        // GATE 6: Position sizing validation
        if (prediction.risk_management.max_risk_per_trade > 0.015) {
            console.log(`❌ Gate 6 failed: Risk per trade ${prediction.risk_management.max_risk_per_trade} > 0.015`);
            return null;
        }

        // GATE 7: BOOM/CRASH specific validation
        if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
            if (!this.validateBoomCrashSignals(prediction, symbol)) {
                console.log('❌ Gate 7 failed: BOOM/CRASH validation');
                return null;
            }
        }

        console.log('✅ All quality gates passed');
        return prediction;
    }

    /**
     * IMPROVEMENT 6: BOOM/CRASH specific validation
     */
    private validateBoomCrashSignals(prediction: AutonomousPredictionResult, symbol: string): boolean
    {
        // For BOOM/CRASH indices, we need higher confidence due to their unique nature
        if (prediction.confidence < 0.75) {
            console.log('❌ BOOM/CRASH requires higher confidence');
            return false;
        }

        // Check spike probability if available in factors
        const factors = prediction.factors as any;
        if (factors.spike_probability && factors.spike_probability < 0.7) {
            console.log('❌ Low spike probability for BOOM/CRASH');
            return false;
        }

        return true;
    }

    /**
     * IMPROVEMENT 7: Trade result recording for continuous learning
     */
    recordTradeResult(
        symbol: string,
        prediction: 'UP' | 'DOWN',
        confidence: number,
        actual: 'WIN' | 'LOSS',
        entryPrice: number,
        exitPrice: number,
        factors: any
    ): void
    {
        const profit = actual === 'WIN' ?
            Math.abs(exitPrice - entryPrice) :
            -Math.abs(exitPrice - entryPrice);

        this.advancedAgent.recordTradeResult(
            symbol,
            prediction,
            confidence,
            actual,
            factors,
            entryPrice,
            exitPrice,
            profit
        );

        // Auto-invalidate strategy if performance degrades
        const metrics = this.advancedAgent.getPerformanceMetrics();
        if (metrics && metrics.totalTrades >= 20 && metrics.winRate < 0.55) {
            console.warn(`⚠️ Performance degraded for ${symbol} - invalidating strategy`);
            this.validatedStrategies.delete(`${symbol}_1m`);
        }

        console.log(`📊 Trade recorded: ${symbol} ${prediction} ${actual} (${profit > 0 ? '+' : ''}${profit.toFixed(4)})`);
    }

    /**
     * Track rejection reasons for analysis
     */
    private incrementRejectionCount(symbol: string, reason: string): void
    {
        const key = `${symbol}_${reason}`;
        this.rejectedTradesCount.set(key, (this.rejectedTradesCount.get(key) || 0) + 1);
        console.log(`📊 Trade rejected: ${symbol} - ${reason} (count: ${this.rejectedTradesCount.get(key)})`);
    }

    /**
     * Get comprehensive performance and quality metrics
     */
    getQualityMetrics()
    {
        const performanceMetrics = this.advancedAgent.getPerformanceMetrics();
        const validatedStrategies = Array.from(this.validatedStrategies);

        // Calculate rejection statistics
        const rejectionStats = {};
        for (const [ key, count ] of this.rejectedTradesCount.entries()) {
            const [ symbol, reason ] = key.split('_');
            if (!rejectionStats[ symbol ]) rejectionStats[ symbol ] = {};
            rejectionStats[ symbol ][ reason ] = count;
        }

        return {
            performance: performanceMetrics,
            validatedStrategies: validatedStrategies.length,
            strategyList: validatedStrategies,
            rejectionStats,
            qualityStatus: performanceMetrics ?
                (performanceMetrics.winRate >= 0.6 ? 'EXCELLENT' :
                    performanceMetrics.winRate >= 0.5 ? 'GOOD' : 'NEEDS_IMPROVEMENT')
                : 'INSUFFICIENT_DATA'
        };
    }

    /**
     * Force strategy revalidation for specific symbol
     */
    async forceStrategyRevalidation(symbol: string, timeframe: string = '1m'): Promise<boolean>
    {
        const validationKey = `${symbol}_${timeframe}`;
        this.validatedStrategies.delete(validationKey);
        this.lastValidationTime.delete(validationKey);

        console.log(`🔄 Forcing revalidation for ${symbol}`);
        return await this.ensureStrategyValidation(symbol, timeframe);
    }

    /**
     * Clear all validations and reset quality control
     */
    resetQualityControl(): void
    {
        this.validatedStrategies.clear();
        this.lastValidationTime.clear();
        this.rejectedTradesCount.clear();
        console.log('🔄 Quality control system reset');
    }
}
