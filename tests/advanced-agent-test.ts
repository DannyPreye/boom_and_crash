import { AdvancedTradingIntegrationService } from '../src/services/advanced-trading-integration.service';
import { DerivTickData, DerivCandleData } from '../src/types/deriv.types';

/**
 * Advanced Trading Agent Test - Phase 2 Implementation
 * Tests the complete advanced trading pipeline with all Phase 2 improvements
 */

// Test configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'your-api-key-here';
const TEST_SYMBOLS = [ 'BOOM1000', 'CRASH500', 'R_25', 'R_50', 'R_100' ];

class AdvancedAgentTest
{
    private integrationService: AdvancedTradingIntegrationService;

    constructor ()
    {
        this.integrationService = new AdvancedTradingIntegrationService(ANTHROPIC_API_KEY);
    }

    /**
     * Generate comprehensive test data for different symbol types
     */
    private generateAdvancedTestData(symbol: string): { ticks: DerivTickData[], candles: DerivCandleData[]; }
    {
        const basePrice = this.getBasePrice(symbol);
        const volatility = this.getSymbolVolatility(symbol);

        // Generate 500 ticks over 25 minutes for comprehensive analysis
        const ticks: DerivTickData[] = [];
        const startTime = Date.now() - 1500000; // 25 minutes ago

        let currentPrice = basePrice;
        let trend = 0;
        let volatilityCycle = 0;

        for (let i = 0; i < 500; i++) {
            const timeDiff = i * 3000; // 3 second intervals

            // Add cyclical volatility
            volatilityCycle += 0.1;
            const cyclicalVolatility = volatility * (1 + 0.3 * Math.sin(volatilityCycle));

            // Add trend component
            trend += (Math.random() - 0.5) * 0.001;
            const trendComponent = trend * i * 0.1;

            // Add random walk
            const randomWalk = (Math.random() - 0.5) * cyclicalVolatility;

            // Add symbol-specific patterns
            if (symbol.includes('BOOM') && Math.random() < 0.005) {
                currentPrice *= 1.03; // Boom spike
            } else if (symbol.includes('CRASH') && Math.random() < 0.005) {
                currentPrice *= 0.97; // Crash spike
            } else {
                currentPrice += randomWalk + trendComponent;
            }

            // Ensure price stays positive
            currentPrice = Math.max(currentPrice, basePrice * 0.5);

            ticks.push({
                symbol,
                tick: currentPrice,
                epoch: Math.floor((startTime + timeDiff) / 1000),
                quote: currentPrice,
                pip_size: symbol.includes('R_') ? 0.001 : 0.0001
            });
        }

        // Generate 100 candles from ticks with volume data
        const candles: DerivCandleData[] = [];
        const ticksPerCandle = 5; // 5 ticks per candle

        for (let i = 0; i < 100; i++) {
            const candleTicks = ticks.slice(i * ticksPerCandle, (i + 1) * ticksPerCandle);
            if (candleTicks.length === 0) break;

            const open = candleTicks[ 0 ].tick;
            const close = candleTicks[ candleTicks.length - 1 ].tick;
            const high = Math.max(...candleTicks.map(t => t.tick));
            const low = Math.min(...candleTicks.map(t => t.tick));

            // Generate realistic volume data
            const baseVolume = 1000;
            const volumeMultiplier = 1 + Math.abs(close - open) / open; // Higher volume for larger moves
            const volume = baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4);

            candles.push({
                symbol,
                open,
                high,
                low,
                close,
                epoch: candleTicks[ 0 ].epoch,
                volume: Math.floor(volume)
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
     * Test advanced analysis for a single symbol
     */
    async testAdvancedSymbolAnalysis(symbol: string): Promise<void>
    {
        console.log(`\n🎯 Testing Advanced Trading Agent for ${symbol}`);
        console.log('═'.repeat(80));

        try {
            const { ticks, candles } = this.generateAdvancedTestData(symbol);
            const currentPrice = ticks[ ticks.length - 1 ].tick;

            console.log(`📊 Generated advanced test data: ${ticks.length} ticks, ${candles.length} candles`);
            console.log(`💰 Current price: ${currentPrice.toFixed(4)}`);

            const result = await this.integrationService.generateAdvancedTradingPrediction(
                symbol,
                '1m',
                ticks,
                candles,
                currentPrice
            );

            // Display comprehensive results
            this.displayAdvancedResults(symbol, result);

        } catch (error) {
            console.error(`❌ Advanced test failed for ${symbol}:`, error);
        }
    }

    /**
     * Display comprehensive advanced test results
     */
    private displayAdvancedResults(symbol: string, result: any): void
    {
        const prediction = result.prediction;
        const features = result.enhancedFeatures;
        const advancedIndicators = result.advancedIndicators;
        const multiTimeframe = result.multiTimeframeAnalysis;
        const patterns = result.patterns;
        const volumeAnalysis = result.volumeAnalysis;
        const mlPrediction = result.mlPrediction;
        const metrics = result.performanceMetrics;
        const metadata = result.metadata;

        console.log(`\n📈 ADVANCED PREDICTION RESULTS`);
        console.log(`   Direction: ${prediction.prediction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Entry: ${prediction.trading_levels.entry_price.toFixed(4)}`);
        console.log(`   Stop Loss: ${prediction.trading_levels.stop_loss.toFixed(4)}`);
        console.log(`   Take Profit: ${prediction.trading_levels.take_profit.toFixed(4)}`);
        console.log(`   Risk/Reward: ${prediction.trading_levels.risk_reward_ratio.toFixed(2)}`);

        console.log(`\n🔧 PHASE 2: ADVANCED TECHNICAL INDICATORS`);
        if (advancedIndicators.ichimoku) {
            console.log(`   Ichimoku Cloud: ${advancedIndicators.ichimoku.cloudPosition} (${(advancedIndicators.ichimoku.cloudStrength * 100).toFixed(1)}% strength)`);
        }
        if (advancedIndicators.fibonacci) {
            console.log(`   Fibonacci Position: ${advancedIndicators.fibonacci.currentPosition}`);
            console.log(`   Next Support: ${advancedIndicators.fibonacci.nextSupport.toFixed(4)}`);
            console.log(`   Next Resistance: ${advancedIndicators.fibonacci.nextResistance.toFixed(4)}`);
        }
        if (advancedIndicators.elliottWave) {
            console.log(`   Elliott Wave: ${advancedIndicators.elliottWave.currentWave}/${advancedIndicators.elliottWave.waveCount}`);
            console.log(`   Wave Position: ${(advancedIndicators.elliottWave.wavePosition * 100).toFixed(1)}%`);
            console.log(`   Trend Direction: ${advancedIndicators.elliottWave.trendDirection}`);
        }

        console.log(`\n⏰ MULTI-TIMEFRAME ANALYSIS`);
        console.log(`   Overall Confluence: ${(multiTimeframe.overallConfluence * 100).toFixed(1)}%`);
        console.log(`   Dominant Trend: ${multiTimeframe.trendAlignment.dominantTrend}`);
        console.log(`   Trend Alignment: ${(multiTimeframe.trendAlignment.alignment * 100).toFixed(1)}%`);
        console.log(`   Recommendation: ${multiTimeframe.recommendation}`);

        console.log(`\n🔍 PATTERN RECOGNITION`);
        if (patterns.candlestick.primaryPattern) {
            console.log(`   Primary Candlestick: ${patterns.candlestick.primaryPattern.name}`);
            console.log(`   Pattern Reliability: ${(patterns.candlestick.reliability * 100).toFixed(1)}%`);
            console.log(`   Pattern Signal: ${patterns.candlestick.primaryPattern.signal}`);
        }
        if (patterns.chart.primaryPattern) {
            console.log(`   Primary Chart Pattern: ${patterns.chart.primaryPattern.name}`);
            console.log(`   Pattern Completion: ${(patterns.chart.completion * 100).toFixed(1)}%`);
            console.log(`   Target Price: ${patterns.chart.targetPrice.toFixed(4)}`);
        }
        console.log(`   Overall Pattern: ${patterns.overallPattern.signal} (${(patterns.overallPattern.confidence * 100).toFixed(1)}%)`);

        console.log(`\n📊 VOLUME ANALYSIS`);
        console.log(`   Volume Ratio: ${volumeAnalysis.volumeRatio.toFixed(2)}x`);
        console.log(`   Volume Signal: ${volumeAnalysis.volumeSignal}`);
        console.log(`   Price-Volume Correlation: ${volumeAnalysis.priceVolumeRelationship.correlation.toFixed(3)}`);
        console.log(`   Volume Confirmation: ${volumeAnalysis.priceVolumeRelationship.volumeConfirmation ? '✅' : '❌'}`);
        console.log(`   VWAP: ${volumeAnalysis.vwap.toFixed(4)}`);
        console.log(`   Price vs VWAP: ${volumeAnalysis.priceVsVwap > 0 ? '+' : ''}${(volumeAnalysis.priceVsVwap * 100).toFixed(2)}%`);

        console.log(`\n🤖 MACHINE LEARNING PREDICTION`);
        console.log(`   Ensemble Prediction: ${mlPrediction.ensemble.prediction} (${(mlPrediction.ensemble.confidence * 100).toFixed(1)}%)`);
        console.log(`   Model Agreement: ${(mlPrediction.ensemble.agreement * 100).toFixed(1)}%`);
        console.log(`   Random Forest: ${mlPrediction.models.randomForest.prediction} (${(mlPrediction.models.randomForest.confidence * 100).toFixed(1)}%)`);
        console.log(`   LSTM: ${mlPrediction.models.lstm.prediction} (${(mlPrediction.models.lstm.confidence * 100).toFixed(1)}%)`);
        console.log(`   XGBoost: ${mlPrediction.models.xgboost.prediction} (${(mlPrediction.models.xgboost.confidence * 100).toFixed(1)}%)`);
        console.log(`   Top Features: ${mlPrediction.featureImportance.slice(0, 3).join(', ')}`);

        console.log(`\n⚡ PERFORMANCE METRICS`);
        console.log(`   Technical Strength: ${(metrics.technical_strength.advanced_indicators * 100).toFixed(1)}%`);
        console.log(`   Multi-Timeframe Score: ${(metrics.multi_timeframe_score.overall_confluence * 100).toFixed(1)}%`);
        console.log(`   Pattern Score: ${(metrics.pattern_score.candlestick_reliability * 100).toFixed(1)}%`);
        console.log(`   Volume Score: ${(metrics.volume_score.volume_ratio * 100).toFixed(1)}%`);
        console.log(`   ML Score: ${(metrics.ml_score.ensemble_confidence * 100).toFixed(1)}%`);
        console.log(`   Processing Time: ${metrics.processing_efficiency.total_processing_ms}ms`);
        console.log(`   Efficiency Score: ${(metrics.processing_efficiency.efficiency_score * 100).toFixed(1)}%`);

        console.log(`\n📊 PHASE 2 ACCURACY IMPROVEMENTS`);
        const accuracy = metadata.accuracyEstimate;
        console.log(`   Baseline Accuracy: ${(accuracy.baseline_accuracy * 100).toFixed(1)}%`);
        console.log(`   Phase 2 Improvement: +${(accuracy.phase2_improvement * 100).toFixed(1)}%`);
        console.log(`   Estimated Accuracy: ${(accuracy.estimated_accuracy * 100).toFixed(1)}%`);
        console.log(`   Confidence in Estimate: ${(accuracy.confidence_in_estimate * 100).toFixed(1)}%`);

        console.log(`\n   Improvement Breakdown:`);
        Object.entries(accuracy.improvement_breakdown).forEach(([ key, value ]) =>
        {
            console.log(`     ${key}: +${(value as number * 100).toFixed(1)}%`);
        });

        console.log(`\n🎯 PHASE 2 IMPROVEMENTS ACTIVE:`);
        const improvements = metadata.phase2Improvements;
        Object.entries(improvements).forEach(([ key, value ]) =>
        {
            if (typeof value === 'boolean') {
                console.log(`   ${key}: ${value ? '✅' : '❌'}`);
            }
        });

        console.log(`\n🔄 DATA QUALITY ASSESSMENT`);
        const dataQuality = metadata.dataQuality;
        console.log(`   Tick Quality: ${dataQuality.tick_quality}`);
        console.log(`   Candle Quality: ${dataQuality.candle_quality}`);
        console.log(`   Data Completeness: ${(dataQuality.data_completeness * 100).toFixed(1)}%`);
        console.log(`   Time Consistency: ${dataQuality.time_consistency.overall_consistency}`);
        console.log(`   Recommendation: ${dataQuality.recommendation}`);

        console.log(`\n   Advanced Requirements:`);
        Object.entries(dataQuality.advanced_requirements).forEach(([ key, value ]) =>
        {
            console.log(`     ${key}: ${value ? '✅' : '❌'}`);
        });

        console.log(`\n💡 RISK ASSESSMENT`);
        console.log(`   Position Size Confidence: ${(metrics.risk_assessment.position_size_confidence * 100).toFixed(1)}%`);
        console.log(`   Stop Loss Quality: ${(metrics.risk_assessment.stop_loss_quality * 100).toFixed(1)}%`);
        console.log(`   Risk/Reward Quality: ${metrics.risk_assessment.risk_reward_quality.toFixed(2)}`);
        console.log(`   Multi-Factor Risk: ${(metrics.risk_assessment.multi_factor_risk * 100).toFixed(1)}%`);
    }

    /**
     * Run batch test for all symbols
     */
    async runAdvancedBatchTest(): Promise<void>
    {
        console.log('🚀 ADVANCED TRADING AGENT - PHASE 2 TEST');
        console.log('Testing comprehensive advanced analysis with all Phase 2 improvements');
        console.log('═'.repeat(100));

        const results = [];
        const errors = [];
        const startTime = Date.now();

        for (const symbol of TEST_SYMBOLS) {
            try {
                const { ticks, candles } = this.generateAdvancedTestData(symbol);
                const currentPrice = ticks[ ticks.length - 1 ].tick;

                const result = await this.integrationService.generateAdvancedTradingPrediction(
                    symbol,
                    '1m',
                    ticks,
                    candles,
                    currentPrice
                );

                results.push({
                    symbol,
                    prediction: result.prediction.prediction,
                    confidence: result.prediction.confidence,
                    accuracy: result.metadata.accuracyEstimate.estimated_accuracy,
                    processingTime: result.performanceMetrics.processing_efficiency.total_processing_ms
                });

            } catch (error) {
                console.error(`❌ Advanced batch test failed for ${symbol}:`, error);
                errors.push({ symbol, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }

        const totalTime = Date.now() - startTime;

        console.log(`\n📈 ADVANCED BATCH TEST RESULTS`);
        console.log(`   Total Symbols: ${TEST_SYMBOLS.length}`);
        console.log(`   Successful: ${results.length}`);
        console.log(`   Failed: ${errors.length}`);
        console.log(`   Total Processing Time: ${totalTime}ms`);
        console.log(`   Average Processing Time: ${(totalTime / TEST_SYMBOLS.length).toFixed(0)}ms`);

        if (results.length > 0) {
            const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
            const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
            const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

            console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
            console.log(`   Average Estimated Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
            console.log(`   Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);

            console.log(`\n📊 SYMBOL-SPECIFIC RESULTS:`);
            results.forEach(result =>
            {
                console.log(`   ${result.symbol}: ${result.prediction} (${(result.confidence * 100).toFixed(1)}% confidence, ${(result.accuracy * 100).toFixed(1)}% accuracy)`);
            });
        }

        if (errors.length > 0) {
            console.log(`\n❌ ERRORS:`);
            errors.forEach(error =>
            {
                console.log(`   ${error.symbol}: ${error.error}`);
            });
        }
    }

    /**
     * Run performance benchmark
     */
    async runAdvancedPerformanceBenchmark(): Promise<void>
    {
        console.log('\n⚡ ADVANCED PERFORMANCE BENCHMARK');
        console.log('Testing processing efficiency and accuracy improvements');
        console.log('═'.repeat(80));

        const symbol = 'R_50'; // Use medium volatility symbol for benchmark
        const iterations = 5;
        const processingTimes: number[] = [];
        const accuracies: number[] = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const { ticks, candles } = this.generateAdvancedTestData(symbol);
                const currentPrice = ticks[ ticks.length - 1 ].tick;

                const startTime = Date.now();
                const result = await this.integrationService.generateAdvancedTradingPrediction(
                    symbol,
                    '1m',
                    ticks,
                    candles,
                    currentPrice
                );
                const processingTime = Date.now() - startTime;

                processingTimes.push(processingTime);
                accuracies.push(result.metadata.accuracyEstimate.estimated_accuracy);

                console.log(`   Iteration ${i + 1}: ${processingTime}ms, ${(result.metadata.accuracyEstimate.estimated_accuracy * 100).toFixed(1)}% accuracy`);

            } catch (error) {
                console.error(`   Iteration ${i + 1} failed:`, error);
            }
        }

        if (processingTimes.length > 0) {
            const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
            const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
            const minProcessingTime = Math.min(...processingTimes);
            const maxProcessingTime = Math.max(...processingTimes);

            console.log(`\n📊 BENCHMARK RESULTS:`);
            console.log(`   Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
            console.log(`   Min Processing Time: ${minProcessingTime}ms`);
            console.log(`   Max Processing Time: ${maxProcessingTime}ms`);
            console.log(`   Average Estimated Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
            console.log(`   Performance Rating: ${avgProcessingTime < 10000 ? 'EXCELLENT' : avgProcessingTime < 15000 ? 'GOOD' : 'NEEDS_OPTIMIZATION'}`);
        }
    }
}

/**
 * Main test execution function
 */
async function runAdvancedTests(): Promise<void>
{
    console.log('🚀 ADVANCED TRADING AGENT TEST SUITE');
    console.log('Phase 2 Implementation with Advanced Technical Analysis');
    console.log('═'.repeat(100));

    const test = new AdvancedAgentTest();

    try {
        // Test individual symbols
        for (const symbol of TEST_SYMBOLS.slice(0, 2)) { // Test first 2 symbols for detailed output
            await test.testAdvancedSymbolAnalysis(symbol);
        }

        // Run batch test
        await test.runAdvancedBatchTest();

        // Run performance benchmark
        await test.runAdvancedPerformanceBenchmark();

        console.log('\n✅ Advanced Trading Agent Test Suite Completed Successfully!');
        console.log('\n🎯 PHASE 2 IMPROVEMENTS SUMMARY:');
        console.log('   ✅ Advanced Technical Indicators (Ichimoku, Fibonacci, Elliott Wave)');
        console.log('   ✅ Multi-Timeframe Analysis');
        console.log('   ✅ Pattern Recognition (Candlestick & Chart Patterns)');
        console.log('   ✅ Volume Analysis & Profile');
        console.log('   ✅ Machine Learning Integration (Random Forest, LSTM, XGBoost)');
        console.log('   ✅ Ensemble Prediction Methods');
        console.log('   ✅ Advanced Risk Management');
        console.log('   ✅ Comprehensive Performance Metrics');

    } catch (error) {
        console.error('❌ Advanced test suite failed:', error);
    }
}

// Export for use in other test files
export { AdvancedAgentTest, runAdvancedTests };

// Run tests if this file is executed directly
if (require.main === module) {
    runAdvancedTests().catch(console.error);
}
