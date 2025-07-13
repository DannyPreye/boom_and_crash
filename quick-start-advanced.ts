#!/usr/bin/env ts-node

/**
 * Quick Start - Advanced Trading Agent Demo
 * Demonstrates the improved AI trading agent with Phase 2 enhancements
 */

import { AdvancedTradingIntegrationService } from './src/services/advanced-trading-integration.service';
import { DerivTickData, DerivCandleData } from './src/types/deriv.types';

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'your-api-key-here';
const DEMO_SYMBOL = 'R_50'; // Medium volatility symbol for demo

/**
 * Generate demo data for the advanced agent
 */
function generateDemoData(): { ticks: DerivTickData[], candles: DerivCandleData[]; }
{
    console.log('📊 Generating demo data...');

    const basePrice = 150.0;
    const volatility = 0.5;
    const ticks: DerivTickData[] = [];
    const candles: DerivCandleData[] = [];

    let currentPrice = basePrice;
    const startTime = Date.now() - 1800000; // 30 minutes ago

    // Generate 300 ticks
    for (let i = 0; i < 300; i++) {
        const timeDiff = i * 6000; // 6 second intervals
        const randomWalk = (Math.random() - 0.5) * volatility;

        // Add some trend and cyclical patterns
        const trend = Math.sin(i * 0.1) * 0.2;
        currentPrice += randomWalk + trend;

        // Ensure price stays positive
        currentPrice = Math.max(currentPrice, basePrice * 0.7);

        ticks.push({
            symbol: DEMO_SYMBOL,
            tick: currentPrice,
            epoch: Math.floor((startTime + timeDiff) / 1000),
            quote: currentPrice,
            pip_size: 0.001
        });
    }

    // Generate 60 candles from ticks
    const ticksPerCandle = 5;
    for (let i = 0; i < 60; i++) {
        const candleTicks = ticks.slice(i * ticksPerCandle, (i + 1) * ticksPerCandle);
        if (candleTicks.length === 0) break;

        const open = candleTicks[ 0 ].tick;
        const close = candleTicks[ candleTicks.length - 1 ].tick;
        const high = Math.max(...candleTicks.map(t => t.tick));
        const low = Math.min(...candleTicks.map(t => t.tick));

        // Generate realistic volume
        const baseVolume = 1000;
        const volumeMultiplier = 1 + Math.abs(close - open) / open;
        const volume = baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4);

        candles.push({
            symbol: DEMO_SYMBOL,
            open,
            high,
            low,
            close,
            epoch: candleTicks[ 0 ].epoch,
            volume: Math.floor(volume)
        });
    }

    console.log(`✅ Generated ${ticks.length} ticks and ${candles.length} candles`);
    return { ticks, candles };
}

/**
 * Display demo results in a user-friendly format
 */
function displayDemoResults(result: any): void
{
    console.log('\n🎯 ADVANCED TRADING AGENT DEMO RESULTS');
    console.log('═'.repeat(80));

    const prediction = result.prediction;
    const metrics = result.performanceMetrics;
    const accuracy = result.metadata.accuracyEstimate;

    // Main prediction
    console.log(`\n📈 PREDICTION: ${prediction.prediction}`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    console.log(`   Entry Price: ${prediction.trading_levels.entry_price.toFixed(4)}`);
    console.log(`   Stop Loss: ${prediction.trading_levels.stop_loss.toFixed(4)}`);
    console.log(`   Take Profit: ${prediction.trading_levels.take_profit.toFixed(4)}`);
    console.log(`   Risk/Reward: ${prediction.trading_levels.risk_reward_ratio.toFixed(2)}`);

    // Advanced indicators summary
    console.log(`\n🔧 ADVANCED TECHNICAL ANALYSIS`);
    if (result.advancedIndicators.ichimoku) {
        console.log(`   Ichimoku Cloud: ${result.advancedIndicators.ichimoku.cloudPosition}`);
    }
    if (result.advancedIndicators.fibonacci) {
        console.log(`   Fibonacci Position: ${result.advancedIndicators.fibonacci.currentPosition}`);
    }
    if (result.advancedIndicators.elliottWave) {
        console.log(`   Elliott Wave: ${result.advancedIndicators.elliottWave.currentWave}/${result.advancedIndicators.elliottWave.waveCount}`);
    }

    // Multi-timeframe analysis
    console.log(`\n⏰ MULTI-TIMEFRAME ANALYSIS`);
    console.log(`   Overall Confluence: ${(result.multiTimeframeAnalysis.overallConfluence * 100).toFixed(1)}%`);
    console.log(`   Dominant Trend: ${result.multiTimeframeAnalysis.trendAlignment.dominantTrend}`);
    console.log(`   Recommendation: ${result.multiTimeframeAnalysis.recommendation}`);

    // Pattern recognition
    console.log(`\n🔍 PATTERN RECOGNITION`);
    if (result.patterns.candlestick.primaryPattern) {
        console.log(`   Candlestick Pattern: ${result.patterns.candlestick.primaryPattern.name}`);
        console.log(`   Pattern Reliability: ${(result.patterns.candlestick.reliability * 100).toFixed(1)}%`);
    }
    if (result.patterns.chart.primaryPattern) {
        console.log(`   Chart Pattern: ${result.patterns.chart.primaryPattern.name}`);
        console.log(`   Pattern Completion: ${(result.patterns.chart.completion * 100).toFixed(1)}%`);
    }

    // Volume analysis
    console.log(`\n📊 VOLUME ANALYSIS`);
    console.log(`   Volume Ratio: ${result.volumeAnalysis.volumeRatio.toFixed(2)}x`);
    console.log(`   Volume Signal: ${result.volumeAnalysis.volumeSignal}`);
    console.log(`   VWAP: ${result.volumeAnalysis.vwap.toFixed(4)}`);

    // Machine learning
    console.log(`\n🤖 MACHINE LEARNING`);
    console.log(`   Ensemble Prediction: ${result.mlPrediction.ensemble.prediction}`);
    console.log(`   Model Confidence: ${(result.mlPrediction.ensemble.confidence * 100).toFixed(1)}%`);
    console.log(`   Model Agreement: ${(result.mlPrediction.ensemble.agreement * 100).toFixed(1)}%`);
    console.log(`   Top Features: ${result.mlPrediction.featureImportance.slice(0, 3).join(', ')}`);

    // Performance metrics
    console.log(`\n⚡ PERFORMANCE METRICS`);
    console.log(`   Technical Strength: ${(metrics.technical_strength.advanced_indicators * 100).toFixed(1)}%`);
    console.log(`   Multi-Timeframe Score: ${(metrics.multi_timeframe_score.overall_confluence * 100).toFixed(1)}%`);
    console.log(`   Pattern Score: ${(metrics.pattern_score.candlestick_reliability * 100).toFixed(1)}%`);
    console.log(`   Volume Score: ${(metrics.volume_score.volume_ratio * 100).toFixed(1)}%`);
    console.log(`   ML Score: ${(metrics.ml_score.ensemble_confidence * 100).toFixed(1)}%`);
    console.log(`   Processing Time: ${metrics.processing_efficiency.total_processing_ms}ms`);

    // Accuracy improvements
    console.log(`\n📊 ACCURACY IMPROVEMENTS`);
    console.log(`   Baseline Accuracy: ${(accuracy.baseline_accuracy * 100).toFixed(1)}%`);
    console.log(`   Phase 2 Improvement: +${(accuracy.phase2_improvement * 100).toFixed(1)}%`);
    console.log(`   Estimated Accuracy: ${(accuracy.estimated_accuracy * 100).toFixed(1)}%`);

    // Phase 2 improvements summary
    console.log(`\n🎯 PHASE 2 IMPROVEMENTS ACTIVE:`);
    const improvements = result.metadata.phase2Improvements;
    const activeImprovements = Object.entries(improvements)
        .filter(([ _, value ]) => typeof value === 'boolean' && value)
        .map(([ key, _ ]) => key);

    activeImprovements.forEach(improvement =>
    {
        console.log(`   ✅ ${improvement.replace(/_/g, ' ').toLowerCase()}`);
    });

    console.log(`\n💡 KEY INSIGHTS:`);
    console.log(`   • Advanced technical indicators provide deeper market insights`);
    console.log(`   • Multi-timeframe analysis ensures trend confirmation`);
    console.log(`   • Pattern recognition identifies high-probability setups`);
    console.log(`   • Volume analysis validates price movements`);
    console.log(`   • Machine learning ensemble improves prediction accuracy`);
    console.log(`   • Comprehensive risk management protects capital`);
}

/**
 * Main demo function
 */
async function runAdvancedDemo(): Promise<void>
{
    console.log('🚀 ADVANCED TRADING AGENT DEMO');
    console.log('Phase 2 Implementation with Advanced Technical Analysis');
    console.log('═'.repeat(80));

    try {
        // Check API key
        if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY === 'your-api-key-here') {
            console.error('❌ Please set your ANTHROPIC_API_KEY environment variable');
            console.log('   export ANTHROPIC_API_KEY="your-actual-api-key"');
            process.exit(1);
        }

        // Initialize advanced trading service
        console.log('🔧 Initializing Advanced Trading Integration Service...');
        const service = new AdvancedTradingIntegrationService(ANTHROPIC_API_KEY);

        // Generate demo data
        const { ticks, candles } = generateDemoData();
        const currentPrice = ticks[ ticks.length - 1 ].tick;

        console.log(`\n📊 Current Price: ${currentPrice.toFixed(4)}`);
        console.log(`📈 Data Points: ${ticks.length} ticks, ${candles.length} candles`);

        // Generate advanced prediction
        console.log('\n🧠 Generating Advanced Trading Prediction...');
        console.log('   This may take 10-15 seconds for comprehensive analysis...');

        const startTime = Date.now();
        const result = await service.generateAdvancedTradingPrediction(
            DEMO_SYMBOL,
            '1m',
            ticks,
            candles,
            currentPrice
        );
        const totalTime = Date.now() - startTime;

        console.log(`✅ Advanced analysis completed in ${totalTime}ms`);

        // Display results
        displayDemoResults(result);

        console.log('\n🎉 Demo completed successfully!');
        console.log('\n📚 Next Steps:');
        console.log('   • Review the PHASE2_README.md for detailed documentation');
        console.log('   • Run tests with: npm run test:advanced');
        console.log('   • Customize parameters for your specific symbols');
        console.log('   • Monitor performance and adjust as needed');

    } catch (error) {
        console.error('❌ Demo failed:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('   • Check your API key is valid');
        console.log('   • Ensure all dependencies are installed');
        console.log('   • Check network connectivity');
        console.log('   • Review error logs for specific issues');
    }
}

// Run demo if this file is executed directly
if (require.main === module) {
    runAdvancedDemo().catch(console.error);
}

export { runAdvancedDemo };
