import { EnhancedFeatureEngineeringService } from './src/services/enhanced-feature-engineering.service';
import { DerivTickData } from './src/services/deriv-client';

// Create sample tick data for testing
function createSampleTicks(symbol: string, count: number): DerivTickData[]
{
    const ticks: DerivTickData[] = [];
    const basePrice = 100;
    const baseTime = Date.now() - (count * 1000); // Start from 1 second ago

    for (let i = 0; i < count; i++) {
        // Create some price variation
        const priceVariation = Math.sin(i * 0.1) * 2; // Small sine wave variation
        const price = basePrice + priceVariation;

        ticks.push({
            symbol,
            quote: price,
            tick: price, // Add the missing tick property
            epoch: baseTime + (i * 1000), // Each tick 1 second apart
            pip_size: 4
        });
    }

    return ticks;
}

async function testTechnicalIndicators()
{
    console.log('🧪 Testing Technical Indicators Calculation');
    console.log('='.repeat(50));

    const featureService = new EnhancedFeatureEngineeringService();
    const symbol = 'BOOM1000';

    // Create sample data
    const sampleTicks = createSampleTicks(symbol, 100);
    console.log(`📊 Created ${sampleTicks.length} sample ticks`);
    console.log(`📈 Price range: ${Math.min(...sampleTicks.map(t => t.quote))} to ${Math.max(...sampleTicks.map(t => t.quote))}`);

    // Add ticks to the service
    sampleTicks.forEach(tick => featureService.addTick(tick));

    // Generate enhanced features
    console.log('\n🔧 Generating enhanced features...');
    const features = featureService.generateEnhancedFeatures(symbol);

    console.log('\n📊 Technical Indicators Results:');
    console.log(`   RSI: ${features.technical_indicators.rsi.toFixed(2)}`);
    console.log(`   MACD Line: ${features.technical_indicators.macd_line.toFixed(4)}`);
    console.log(`   MACD Signal: ${features.technical_indicators.macd_signal.toFixed(4)}`);
    console.log(`   MACD Histogram: ${features.technical_indicators.macd_histogram.toFixed(4)}`);
    console.log(`   Stochastic: ${features.technical_indicators.stochastic.toFixed(2)}`);
    console.log(`   Williams %R: ${features.technical_indicators.williams_r.toFixed(2)}`);
    console.log(`   ATR: ${features.technical_indicators.atr.toFixed(4)}`);
    console.log(`   ATR Normalized: ${features.technical_indicators.atr_normalized.toFixed(2)}`);
    console.log(`   Bollinger Position: ${features.technical_indicators.bollinger_position.toFixed(2)}`);

    console.log('\n🌡️ Market Regime:');
    console.log(`   Overall Regime: ${features.market_regime.overall_regime}`);
    console.log(`   Volatility State: ${features.market_regime.volatility_state}`);
    console.log(`   Trend State: ${features.market_regime.trend_state}`);
    console.log(`   Momentum State: ${features.market_regime.momentum_state}`);
    console.log(`   Confluence Score: ${(features.market_regime.confluence_score * 100).toFixed(1)}%`);

    console.log('\n✅ Test completed!');
}

// Run the test
testTechnicalIndicators().catch(console.error);
