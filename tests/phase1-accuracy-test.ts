import { EnhancedTradingIntegrationService } from '../src/services/enhanced-trading-integration.service';
import { DerivTickData, DerivCandleData } from '../src/types/deriv.types';

/**
 * Phase 1 Enhanced Trading System Test
 * Tests the complete enhanced trading pipeline for accuracy improvements
 */

// Test configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'your-api-key-here';
const TEST_SYMBOLS = [ 'BOOM1000', 'CRASH500', 'R_25', 'R_50', 'R_100' ];

class Phase1AccuracyTest
{
    private integrationService: EnhancedTradingIntegrationService;

    constructor ()
    {
        this.integrationService = new EnhancedTradingIntegrationService(ANTHROPIC_API_KEY);
    }

    /**
     * Generate test data for different symbol types
     */
    private generateTestData(symbol: string): { ticks: DerivTickData[], candles: DerivCandleData[]; }
    {
        const basePrice = this.getBasePrice(symbol);
        const volatility = this.getSymbolVolatility(symbol);

        // Generate 200 ticks over 10 minutes
        const ticks: DerivTickData[] = [];
        const startTime = Date.now() - 600000; // 10 minutes ago

        let currentPrice = basePrice;

        for (let i = 0; i < 200; i++) {
            const timeDiff = i * 3000; // 3 second intervals
            const randomWalk = (Math.random() - 0.5) * volatility;

            // Add symbol-specific patterns
            if (symbol.includes('BOOM') && Math.random() < 0.01) {
                currentPrice *= 1.02; // Boom spike
            } else if (symbol.includes('CRASH') && Math.random() < 0.01) {
                currentPrice *= 0.98; // Crash spike
            } else {
                currentPrice += randomWalk;
            }

            ticks.push({
                symbol,
                tick: currentPrice,
                epoch: Math.floor((startTime + timeDiff) / 1000),
                quote: currentPrice,
                pip_size: symbol.includes('R_') ? 0.001 : 0.0001
            });
        }

        // Generate 50 candles from ticks
        const candles: DerivCandleData[] = [];
        const ticksPerCandle = 4; // 4 ticks per candle

        for (let i = 0; i < 50; i++) {
            const candleTicks = ticks.slice(i * ticksPerCandle, (i + 1) * ticksPerCandle);
            if (candleTicks.length === 0) break;

            const open = candleTicks[ 0 ].tick;
            const close = candleTicks[ candleTicks.length - 1 ].tick;
            const high = Math.max(...candleTicks.map(t => t.tick));
            const low = Math.min(...candleTicks.map(t => t.tick));

            candles.push({
                symbol,
                open,
                high,
                low,
                close,
                epoch: candleTicks[ 0 ].epoch,
                volume: Math.random() * 1000
            });
        }

        return { ticks, candles };
    }

    private getBasePrice(symbol: string): number
    {
        const basePrices: Record<string, number> = {
            'BOOM1000': 500.0,
            'BOOM500': 600.0,
            'CRASH1000': 400.0,
            'CRASH500': 350.0,
            'R_10': 100.0,
            'R_25': 200.0,
            'R_50': 150.0,
            'R_75': 300.0,
            'R_100': 250.0
        };
        return basePrices[ symbol ] || 100.0;
    }

    private getSymbolVolatility(symbol: string): number
    {
        const volatilities: Record<string, number> = {
            'BOOM1000': 0.5,
            'BOOM500': 0.8,
            'CRASH1000': 0.5,
            'CRASH500': 0.8,
            'R_10': 0.1,
            'R_25': 0.25,
            'R_50': 0.5,
            'R_75': 0.75,
            'R_100': 1.0
        };
        return volatilities[ symbol ] || 0.3;
    }

    /**
     * Test Phase 1 improvements for a single symbol
     */
    async testSymbolAnalysis(symbol: string): Promise<void>
    {
        console.log(`\n🎯 Testing Phase 1 improvements for ${symbol}`);
        console.log('═'.repeat(60));

        try {
            const { ticks, candles } = this.generateTestData(symbol);
            const currentPrice = ticks[ ticks.length - 1 ].tick;

            console.log(`📊 Generated test data: ${ticks.length} ticks, ${candles.length} candles`);
            console.log(`💰 Current price: ${currentPrice.toFixed(4)}`);

            const result = await this.integrationService.generateEnhancedTradingPrediction(
                symbol,
                '1m',
                ticks,
                candles,
                currentPrice
            );

            // Display results
            this.displayResults(symbol, result);

        } catch (error) {
            console.error(`❌ Test failed for ${symbol}:`, error);
        }
    }

    /**
     * Display comprehensive test results
     */
    private displayResults(symbol: string, result: any): void
    {
        const prediction = result.prediction;
        const features = result.enhancedFeatures;
        const metrics = result.performanceMetrics;
        const metadata = result.metadata;

        console.log(`\n📈 PREDICTION RESULTS`);
        console.log(`   Direction: ${prediction.prediction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Entry: ${prediction.trading_levels.entry_price.toFixed(4)}`);
        console.log(`   Stop Loss: ${prediction.trading_levels.stop_loss.toFixed(4)}`);
        console.log(`   Take Profit: ${prediction.trading_levels.take_profit.toFixed(4)}`);
        console.log(`   Risk/Reward: ${prediction.trading_levels.risk_reward_ratio.toFixed(2)}`);

        console.log(`\n🔧 PHASE 1 TECHNICAL INDICATORS`);
        const tech = features.technical_indicators;
        console.log(`   RSI (Wilder's): ${tech.rsi.toFixed(2)}`);
        console.log(`   MACD Line: ${tech.macd_line.toFixed(4)}`);
        console.log(`   MACD Histogram: ${tech.macd_histogram.toFixed(4)}`);
        console.log(`   ATR: ${tech.atr.toFixed(4)} (${tech.atr_normalized.toFixed(2)}%)`);
        console.log(`   Stochastic: ${tech.stochastic.toFixed(2)}`);
        console.log(`   Williams %R: ${tech.williams_r.toFixed(2)}`);

        console.log(`\n🌡️ MARKET REGIME ANALYSIS`);
        const regime = features.market_regime;
        console.log(`   Overall Regime: ${regime.overall_regime}`);
        console.log(`   Volatility State: ${regime.volatility_state}`);
        console.log(`   Trend State: ${regime.trend_state}`);
        console.log(`   Momentum State: ${regime.momentum_state}`);
        console.log(`   Confluence Score: ${(regime.confluence_score * 100).toFixed(1)}%`);

        console.log(`\n⚡ PERFORMANCE METRICS`);
        console.log(`   Technical Strength: ${(metrics.technical_strength.rsi_family * 100).toFixed(1)}%`);
        console.log(`   Processing Time: ${metrics.processing_efficiency.total_processing_ms}ms`);
        console.log(`   Data Quality: ${metadata.dataQuality.tick_quality}/${metadata.dataQuality.candle_quality}`);

        console.log(`\n📊 PHASE 1 ACCURACY IMPROVEMENTS`);
        const accuracy = metadata.accuracyEstimate;
        console.log(`   Baseline Accuracy: ${(accuracy.baseline_accuracy * 100).toFixed(1)}%`);
        console.log(`   Phase 1 Improvement: +${(accuracy.phase1_improvement * 100).toFixed(1)}%`);
        console.log(`   Estimated Accuracy: ${(accuracy.estimated_accuracy * 100).toFixed(1)}%`);

        console.log(`\n   Improvement Breakdown:`);
        Object.entries(accuracy.improvement_breakdown).forEach(([ key, value ]) =>
        {
            console.log(`     ${key}: +${(value as number * 100).toFixed(1)}%`);
        });

        if (features.spike_analysis) {
            console.log(`\n💥 SPIKE ANALYSIS`);
            const spike = features.spike_analysis;
            console.log(`   Proximity State: ${spike.proximity_state}`);
            console.log(`   Spike Probability: ${(spike.probability * 100).toFixed(1)}%`);
            console.log(`   Ticks Since Last: ${spike.ticks_since_last}/${spike.expected_ticks}`);
        }

        console.log(`\n🎯 PHASE 1 IMPROVEMENTS ACTIVE:`);
        const improvements = metadata.phase1Improvements;
        Object.entries(improvements).forEach(([ key, value ]) =>
        {
            if (typeof value === 'boolean') {
                console.log(`   ${key}: ${value ? '✅' : '❌'}`);
            }
        });
    }

    /**
     * Run batch test for all symbols
     */
    async runBatchTest(): Promise<void>
    {
        console.log('🚀 PHASE 1 ENHANCED TRADING SYSTEM TEST');
        console.log('Testing symbol-specific optimizations and accuracy improvements');
        console.log('═'.repeat(80));

        const batchRequests = TEST_SYMBOLS.map(symbol =>
        {
            const { ticks, candles } = this.generateTestData(symbol);
            return {
                symbol,
                timeframe: '1m',
                tickData: ticks,
                candleData: candles,
                currentPrice: ticks[ ticks.length - 1 ].tick
            };
        });

        console.log(`\n📊 Processing batch of ${batchRequests.length} symbols...`);

        const batchResult = await this.integrationService.processBatchPredictions(batchRequests);

        console.log(`\n📈 BATCH TEST RESULTS`);
        console.log(`   Total Symbols: ${batchResult.summary.total}`);
        console.log(`   Successful: ${batchResult.summary.successful}`);
        console.log(`   Failed: ${batchResult.summary.failed}`);
        console.log(`   Average Processing Time: ${batchResult.summary.averageProcessingTime.toFixed(0)}ms`);
        console.log(`   Average Accuracy Improvement: +${(batchResult.summary.averageAccuracyImprovement * 100).toFixed(1)}%`);

        if (batchResult.errors.length > 0) {
            console.log(`\n❌ ERRORS:`);
            batchResult.errors.forEach(error =>
            {
                console.log(`   ${error.symbol}: ${error.error}`);
            });
        }

        // Individual symbol tests
        for (const symbol of TEST_SYMBOLS) {
            await this.testSymbolAnalysis(symbol);
        }
    }

    /**
     * Performance benchmark test
     */
    async runPerformanceBenchmark(): Promise<void>
    {
        console.log(`\n⚡ PERFORMANCE BENCHMARK - Phase 1 vs Baseline`);
        console.log('═'.repeat(60));

        const iterations = 10;
        const symbol = 'R_25';
        const times: number[] = [];
        const accuracyImprovements: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const { ticks, candles } = this.generateTestData(symbol);
            const currentPrice = ticks[ ticks.length - 1 ].tick;

            const startTime = Date.now();
            const result = await this.integrationService.generateEnhancedTradingPrediction(
                symbol,
                '1m',
                ticks,
                candles,
                currentPrice
            );
            const endTime = Date.now();

            times.push(endTime - startTime);
            accuracyImprovements.push(result.metadata.accuracyEstimate.phase1_improvement);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const avgImprovement = accuracyImprovements.reduce((a, b) => a + b, 0) / accuracyImprovements.length;

        console.log(`   Iterations: ${iterations}`);
        console.log(`   Average Processing Time: ${avgTime.toFixed(0)}ms`);
        console.log(`   Min/Max Time: ${Math.min(...times)}ms / ${Math.max(...times)}ms`);
        console.log(`   Average Accuracy Improvement: +${(avgImprovement * 100).toFixed(1)}%`);
        console.log(`   Target Achievement: ${avgImprovement >= 0.05 ? '✅ 5%+ achieved' : '⚠️ Below 5% target'}`);
    }
}

// Main test execution
async function runPhase1Tests(): Promise<void>
{
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your-api-key-here') {
        console.error('❌ Please set ANTHROPIC_API_KEY environment variable');
        process.exit(1);
    }

    const testSuite = new Phase1AccuracyTest();

    try {
        // Run comprehensive tests
        await testSuite.runBatchTest();
        await testSuite.runPerformanceBenchmark();

        console.log(`\n🎉 PHASE 1 TESTING COMPLETE`);
        console.log(`Target: 5-8% accuracy improvement`);
        console.log(`Status: Phase 1 enhanced technical indicators implemented`);
        console.log(`Next: Integrate with live trading system for validation`);

    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Export for use in other tests
export { Phase1AccuracyTest, runPhase1Tests };

// Run tests if called directly
if (require.main === module) {
    runPhase1Tests().catch(console.error);
}
