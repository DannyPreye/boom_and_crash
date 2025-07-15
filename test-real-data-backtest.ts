import { BacktestService } from './src/services/backtest.service';
import { DerivWebSocketClient } from './src/services/deriv-client';
import { EnhancedFeatureEngineeringService } from './src/services/enhanced-feature-engineering.service';
import { AdvancedTradingAgent } from './src/agents/advanced-trading-agent';
import { BacktestConfig } from './src/types/analytics.types';

async function testRealDataBacktest()
{
    console.log('🎯 REAL DATA BACKTEST TEST');
    console.log('='.repeat(50));

    try {
        // Initialize services with proper API keys
        const derivApiUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
        const derivApiToken = process.env.DERIV_API_TOKEN || 'demo-token';
        const derivAppId = process.env.DERIV_APP_ID || '1089';
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || 'demo-key';

        console.log('🔑 Using credentials:');
        console.log(`   Deriv API URL: ${derivApiUrl}`);
        console.log(`   Deriv App ID: ${derivAppId}`);
        console.log(`   ⚠️  REAL DATA ONLY - No mock data allowed`);

        console.log('🔧 Initializing services...');
        const derivClient = new DerivWebSocketClient(derivApiUrl, derivApiToken, derivAppId);
        const featureService = new EnhancedFeatureEngineeringService();
        const tradingAgent = new AdvancedTradingAgent(anthropicApiKey);

        // Initialize backtest service
        const backtestService = new BacktestService(derivClient, featureService, tradingAgent);

        // Test with a shorter period first (last 3 days of 2024)
        const endDate = new Date('2024-12-31');
        const startDate = new Date('2024-12-28'); // Just 3 days for testing

        console.log(`📅 REAL DATA TEST - Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`📊 Epoch range: ${Math.floor(startDate.getTime() / 1000)} to ${Math.floor(endDate.getTime() / 1000)}`);

        const config: BacktestConfig = {
            symbol: 'BOOM1000',
            timeframe: '1h',
            start_date: startDate.toISOString().split('T')[ 0 ]!, // 2024-12-28
            end_date: endDate.toISOString().split('T')[ 0 ]!, // 2024-12-31
            initial_balance: 1000,
            risk_per_trade: 0.02,
            min_confidence_threshold: 0.60,
        };

        console.log('🚀 Starting REAL DATA backtest...');
        console.log('⚠️  This will FAIL if mock data is used - only real Deriv data allowed');

        const result = await backtestService.runBacktest(config);

        console.log('\n✅ BACKTEST COMPLETED SUCCESSFULLY');
        console.log('📊 Results:');
        console.log(`   Total Trades: ${result.total_trades}`);
        console.log(`   Win Rate: ${result.win_rate.toFixed(2)}%`);
        console.log(`   Total P&L: $${result.total_pnl.toFixed(2)}`);
        console.log(`   Profit Factor: ${result.profit_factor.toFixed(2)}`);

        if (result.trades.length > 0) {
            const firstTrade = result.trades[ 0 ];
            const lastTrade = result.trades[ result.trades.length - 1 ];
            console.log('\n📋 Trade Timeline:');
            console.log(`   First Trade: ${firstTrade.entry_time} - ${firstTrade.direction} - P&L: $${firstTrade.pnl.toFixed(2)}`);
            console.log(`   Last Trade: ${lastTrade.entry_time} - ${lastTrade.direction} - P&L: $${lastTrade.pnl.toFixed(2)}`);
        }

        console.log('\n🎉 REAL DATA BACKTEST VALIDATION PASSED!');

    } catch (error) {
        console.error('❌ BACKTEST FAILED:', error);

        // Check if it's a mock data related error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('mock') || errorMessage.includes('1970')) {
            console.error('🚨 CRITICAL: Mock data or invalid timestamps detected!');
            console.error('   This indicates the backtest is not using real Deriv historical data');
        }

        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testRealDataBacktest().catch(console.error);
}

export { testRealDataBacktest };
