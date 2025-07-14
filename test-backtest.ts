import { BacktestService } from './src/services/backtest.service';
import { DerivWebSocketClient } from './src/services/deriv-client';
import { EnhancedFeatureEngineeringService } from './src/services/enhanced-feature-engineering.service';
import { AdvancedTradingAgent } from './src/agents/advanced-trading-agent';
import { BacktestConfig } from './src/types/analytics.types';

async function testBacktest()
{
    console.log('🧪 Testing Backtesting System');
    console.log('='.repeat(50));

    try {
        // Initialize services
        const derivApiUrl = process.env.DERIV_API_URL || 'wss://ws.derivws.com/websockets/v3';
        const derivApiToken = process.env.DERIV_API_TOKEN || 'demo-token';
        const derivAppId = process.env.DERIV_APP_ID || '1089';
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || 'demo-key';

        console.log('🔑 Using Deriv API credentials:');
        console.log(`   URL: ${derivApiUrl}`);
        console.log(`   App ID: ${derivAppId}`);
        console.log(`   Token: ${derivApiToken.substring(0, 10)}...`);
        console.log(`   Anthropic Key: ${anthropicApiKey.substring(0, 10)}...`);

        console.log('🔧 Initializing services...');
        const derivClient = new DerivWebSocketClient(derivApiUrl, derivApiToken, derivAppId);
        const featureService = new EnhancedFeatureEngineeringService();
        const tradingAgent = new AdvancedTradingAgent(anthropicApiKey);

        // Initialize backtest service
        const backtestService = new BacktestService(derivClient, featureService, tradingAgent);

        // Define backtest configuration
        // Use current data for backtesting
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 3); // Last 3 days for better data availability

        const config: BacktestConfig = {
            symbol: 'BOOM1000',
            timeframe: '1h',
            start_date: startDate.toISOString().split('T')[ 0 ] || '2024-01-01', // Format as YYYY-MM-DD
            end_date: endDate.toISOString().split('T')[ 0 ] || '2024-01-31', // Format as YYYY-MM-DD
            initial_balance: 100,
            risk_per_trade: 0.02, // 2% risk per trade
            min_confidence_threshold: 0.6, // Lowered threshold to get more trades
        };

        console.log('📊 Running backtest with configuration:', config);
        console.log('⏳ This may take a few minutes...');

        // Run the backtest
        const result = await backtestService.runBacktest(config);

        // Display results
        console.log('\n📈 BACKTEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Symbol: ${result.config.symbol}`);
        console.log(`Timeframe: ${result.config.timeframe}`);
        console.log(`Period: ${result.config.start_date} to ${result.config.end_date}`);
        console.log(`Initial Balance: $${result.config.initial_balance.toFixed(2)}`);
        console.log(`Risk per Trade: ${(result.config.risk_per_trade * 100).toFixed(1)}%`);
        console.log(`Min Confidence: ${(result.config.min_confidence_threshold * 100).toFixed(1)}%`);

        console.log('\n📊 PERFORMANCE METRICS');
        console.log('-'.repeat(30));
        console.log(`Total Trades: ${result.total_trades}`);
        console.log(`Winning Trades: ${result.winning_trades}`);
        console.log(`Losing Trades: ${result.losing_trades}`);
        console.log(`Win Rate: ${result.win_rate.toFixed(2)}%`);
        console.log(`Total P&L: $${result.total_pnl.toFixed(2)}`);
        console.log(`Max Drawdown: $${result.max_drawdown.toFixed(2)}`);
        console.log(`Sharpe Ratio: ${result.sharpe_ratio.toFixed(2)}`);
        console.log(`Profit Factor: ${result.profit_factor.toFixed(2)}`);
        console.log(`Avg Trade Duration: ${result.avg_trade_duration.toFixed(1)} minutes`);

        console.log('\n🎯 ACCURACY METRICS');
        console.log('-'.repeat(30));
        console.log(`Overall Accuracy: ${result.performance_metrics.accuracy.toFixed(2)}%`);
        console.log(`Precision: ${result.performance_metrics.precision.toFixed(2)}%`);
        console.log(`Recall: ${result.performance_metrics.recall.toFixed(2)}%`);
        console.log(`F1 Score: ${result.performance_metrics.f1_score.toFixed(2)}%`);

        console.log('\n📊 CONFUSION MATRIX');
        console.log('-'.repeat(30));
        console.log(`True Positives: ${result.performance_metrics.confusion_matrix.true_positive}`);
        console.log(`True Negatives: ${result.performance_metrics.confusion_matrix.true_negative}`);
        console.log(`False Positives: ${result.performance_metrics.confusion_matrix.false_positive}`);
        console.log(`False Negatives: ${result.performance_metrics.confusion_matrix.false_negative}`);

        console.log('\n📈 CONFIDENCE DISTRIBUTION');
        console.log('-'.repeat(30));
        result.performance_metrics.confusion_matrix.true_positive > 0 && console.log('✅ The AI agent shows promising results!');
        result.performance_metrics.confusion_matrix.false_positive > 0 && console.log('⚠️ Some false positives detected - consider adjusting confidence threshold');
        result.performance_metrics.confusion_matrix.false_negative > 0 && console.log('⚠️ Some false negatives detected - consider lowering confidence threshold');

        // Sample of recent trades
        if (result.trades.length > 0) {
            console.log('\n📋 RECENT TRADES (Last 5)');
            console.log('-'.repeat(30));
            const recentTrades = result.trades.slice(-5);
            recentTrades.forEach((trade, index) =>
            {
                console.log(`${index + 1}. ${trade.direction} | Entry: $${trade.entry_price.toFixed(4)} | Exit: $${trade.exit_price.toFixed(4)} | P&L: $${trade.pnl.toFixed(2)} | Confidence: ${(trade.confidence * 100).toFixed(1)}% | ${trade.was_correct ? '✅' : '❌'}`);
            });
        }

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS');
        console.log('-'.repeat(30));
        if (result.win_rate >= 70) {
            console.log('✅ High win rate - consider increasing position size');
        } else if (result.win_rate < 50) {
            console.log('⚠️ Low win rate - consider improving the AI model or adjusting parameters');
        }

        if (result.profit_factor >= 2) {
            console.log('✅ Good profit factor - the strategy is profitable');
        } else if (result.profit_factor < 1) {
            console.log('❌ Poor profit factor - the strategy is losing money');
        }

        if (result.sharpe_ratio >= 1) {
            console.log('✅ Good risk-adjusted returns');
        } else {
            console.log('⚠️ Low risk-adjusted returns - consider risk management improvements');
        }

        console.log('\n🎉 Backtest completed successfully!');

    } catch (error) {
        console.error('❌ Backtest failed:', error);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testBacktest().catch(console.error);
}

export { testBacktest };
