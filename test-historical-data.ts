import { EnhancedFeatureEngineeringService } from './src/services/enhanced-feature-engineering.service';
import { DerivWebSocketClient } from './src/services/deriv-client';

async function testHistoricalData()
{
    console.log('🧪 Testing Historical Data Integration');
    console.log('='.repeat(50));

    // Create a mock Deriv client (since we don't have real credentials)
    const mockDerivClient = new DerivWebSocketClient('wss://ws.binaryws.com/websockets/v3', 'mock_token', 'mock_app_id');

    // Create feature service
    const featureService = new EnhancedFeatureEngineeringService();
    const symbol = 'BOOM1000';

    console.log(`📊 Fetching historical data for ${symbol}...`);

    // Get historical data (this will generate mock data since we're not connected)
    const historicalData = await mockDerivClient.getHistoricalData(symbol, 12); // 12 months

    console.log(`📊 Retrieved ${historicalData.ticks.length} historical ticks`);
    console.log(`🕯️ Retrieved ${historicalData.candles.length} historical candles`);
    console.log(`📈 Price range: ${Math.min(...historicalData.ticks.map(t => t.quote))} to ${Math.max(...historicalData.ticks.map(t => t.quote))}`);

    // Feed historical data to the feature service
    console.log('\n🔧 Feeding historical data to feature service...');
    historicalData.ticks.forEach(tick => featureService.addTick(tick));
    historicalData.candles.forEach(candle => featureService.addCandle(candle));

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

    console.log('\n📈 Additional Features:');
    console.log(`   Price Velocity: ${features.price_velocity.toFixed(6)}`);
    console.log(`   Price Acceleration: ${features.price_acceleration.toFixed(6)}`);
    console.log(`   Volatility Momentum: ${features.volatility_momentum.toFixed(3)}`);
    console.log(`   Trend Strength: ${features.trend_strength.toFixed(3)}`);
    console.log(`   Volatility Rank: ${(features.volatility_rank * 100).toFixed(1)}th percentile`);

    // Check if we have meaningful data (not default values)
    const hasMeaningfulData = features.technical_indicators.rsi !== 50 ||
        features.technical_indicators.macd_line !== 0 ||
        features.technical_indicators.atr !== 0;

    console.log('\n✅ Test Results:');
    console.log(`   Has meaningful technical indicators: ${hasMeaningfulData ? '✅ YES' : '❌ NO'}`);
    console.log(`   Candles used: ${historicalData.candles.length}`);
    console.log(`   Ticks used: ${historicalData.ticks.length}`);

    if (hasMeaningfulData) {
        console.log('🎉 SUCCESS: Technical indicators are now being calculated with meaningful historical data!');
    } else {
        console.log('⚠️ WARNING: Technical indicators are still showing default values.');
    }

    console.log('\n✅ Test completed!');
}

// Run the test
testHistoricalData().catch(console.error);
