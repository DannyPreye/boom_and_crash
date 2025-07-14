# Backtesting System for Deriv Trading Bot

This backtesting system allows you to test the AI trading agent's performance using historical data from the Deriv WebSocket API. It provides comprehensive performance metrics to evaluate the profitability and accuracy of your trading strategy.

## Features

- **Historical Data Integration**: Uses Deriv WebSocket API to fetch real historical data
- **AI Agent Testing**: Tests the Advanced Trading Agent with historical market conditions
- **Comprehensive Metrics**: Calculates win rate, profit factor, Sharpe ratio, max drawdown, and more
- **Confidence Analysis**: Analyzes performance across different confidence levels
- **Trade-by-Trade Analysis**: Detailed breakdown of each trade with entry/exit prices and P&L
- **Risk Management**: Implements proper position sizing and stop-loss/take-profit logic

## Quick Start

### 1. Set up Environment Variables

Create a `.env` file with your API credentials:

```env
DERIV_API_URL=wss://ws.derivws.com/websockets/v3
DERIV_API_TOKEN=your_deriv_token_here
DERIV_APP_ID=your_app_id_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 2. Run a Quick Test

```bash
# Test the backtesting system
npm run test:backtest

# Or run directly with ts-node
npx ts-node test-backtest.ts
```

### 3. Use the API Endpoints

#### Run a Backtest

```bash
curl -X POST http://localhost:3000/api/analytics/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BOOM1000",
    "timeframe": "5m",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "initial_balance": 10000,
    "risk_per_trade": 0.02,
    "min_confidence_threshold": 0.7
  }'
```

#### Get Accuracy Statistics

```bash
curl "http://localhost:3000/api/analytics/accuracy?symbol=BOOM1000&timeframe=5m&period=30d"
```

## Configuration Options

### Backtest Configuration

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `symbol` | string | Trading symbol (BOOM1000, CRASH1000, etc.) | "BOOM1000" |
| `timeframe` | string | Trading timeframe | "5m", "15m", "1h" |
| `start_date` | string | Start date (YYYY-MM-DD) | "2024-01-01" |
| `end_date` | string | End date (YYYY-MM-DD) | "2024-01-31" |
| `initial_balance` | number | Starting capital | 10000 |
| `risk_per_trade` | number | Risk per trade (0.01 = 1%) | 0.02 |
| `min_confidence_threshold` | number | Minimum AI confidence to trade | 0.7 |

### Trading Logic

The backtesting system implements the following trading logic:

1. **Entry Conditions**:
   - AI confidence >= minimum threshold
   - No existing position
   - Check every 5 minutes (300 ticks)

2. **Exit Conditions**:
   - Take profit: 2% move in favor
   - Stop loss: 1% move against
   - Time-based exit: 30 minutes maximum

3. **Position Sizing**:
   - Risk per trade = Initial balance × Risk percentage
   - Example: $10,000 × 2% = $200 risk per trade

## Performance Metrics

### Basic Metrics

- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of profitable trades
- **Total P&L**: Net profit/loss in dollars
- **Profit Factor**: Gross profit / Gross loss
- **Max Drawdown**: Largest peak-to-trough decline

### Advanced Metrics

- **Sharpe Ratio**: Risk-adjusted returns
- **Accuracy**: Percentage of correct predictions
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall

### Risk Metrics

- **Confusion Matrix**: Detailed breakdown of predictions vs actual outcomes
- **Daily Returns**: P&L and win rate by day
- **Monthly Summary**: Performance breakdown by month
- **Confidence Distribution**: Performance across different confidence levels

## Example Results

```
📈 BACKTEST RESULTS
==================================================
Symbol: BOOM1000
Timeframe: 5m
Period: 2024-01-01 to 2024-01-31
Initial Balance: $10,000.00
Risk per Trade: 2.0%
Min Confidence: 70.0%

📊 PERFORMANCE METRICS
------------------------------
Total Trades: 45
Winning Trades: 32
Losing Trades: 13
Win Rate: 71.11%
Total P&L: $1,245.75
Max Drawdown: -$156.80
Sharpe Ratio: 1.85
Profit Factor: 2.8
Avg Trade Duration: 18.5 minutes

🎯 ACCURACY METRICS
------------------------------
Overall Accuracy: 71.11%
Precision: 72.73%
Recall: 69.57%
F1 Score: 71.12%
```

## Interpreting Results

### Good Performance Indicators

- **Win Rate > 70%**: High accuracy
- **Profit Factor > 2**: Good risk/reward
- **Sharpe Ratio > 1**: Good risk-adjusted returns
- **Max Drawdown < 5%**: Low risk

### Warning Signs

- **Win Rate < 50%**: Poor accuracy
- **Profit Factor < 1**: Losing strategy
- **Sharpe Ratio < 0.5**: Poor risk-adjusted returns
- **Max Drawdown > 10%**: High risk

## Optimization Tips

### 1. Adjust Confidence Threshold

- **High threshold (0.8+)**: Fewer trades, higher accuracy
- **Low threshold (0.6-)**: More trades, lower accuracy
- **Optimal range**: 0.7-0.8 for most strategies

### 2. Optimize Risk Management

- **Conservative**: 1% risk per trade
- **Moderate**: 2% risk per trade
- **Aggressive**: 3%+ risk per trade (not recommended)

### 3. Test Different Timeframes

- **Short-term**: 1m, 5m for scalping
- **Medium-term**: 15m, 30m for swing trading
- **Long-term**: 1h, 4h for trend following

### 4. Symbol-Specific Testing

- **BOOM indices**: Test during low volatility periods
- **CRASH indices**: Test during high volatility periods
- **Volatility indices**: Test across different market conditions

## API Endpoints

### POST /api/analytics/backtest

Run a comprehensive backtest.

**Request Body:**
```json
{
  "symbol": "BOOM1000",
  "timeframe": "5m",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "initial_balance": 10000,
  "risk_per_trade": 0.02,
  "min_confidence_threshold": 0.7
}
```

**Response:**
```json
{
  "config": { ... },
  "total_trades": 45,
  "winning_trades": 32,
  "losing_trades": 13,
  "win_rate": 71.11,
  "total_pnl": 1245.75,
  "max_drawdown": -156.80,
  "sharpe_ratio": 1.85,
  "profit_factor": 2.8,
  "avg_trade_duration": 18.5,
  "trades": [ ... ],
  "performance_metrics": { ... }
}
```

### GET /api/analytics/accuracy

Get accuracy statistics for a period.

**Query Parameters:**
- `symbol`: Trading symbol
- `timeframe`: Trading timeframe
- `period`: Time period (24h, 7d, 30d, all)

**Response:**
```json
{
  "symbol": "BOOM1000",
  "timeframe": "5m",
  "period": "30d",
  "total_predictions": 45,
  "correct_predictions": 32,
  "accuracy_percentage": 71.11,
  "confidence_distribution": [ ... ],
  "last_updated": "2024-01-31T12:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **No trades generated**: Increase confidence threshold or extend test period
2. **Poor performance**: Check market conditions and adjust parameters
3. **API errors**: Verify API credentials and network connection
4. **Slow performance**: Reduce test period or use mock data for development

### Performance Optimization

1. **Use shorter periods** for quick testing
2. **Increase confidence threshold** to reduce noise
3. **Test during stable market conditions** for more reliable results
4. **Use multiple symbols** to diversify testing

## Next Steps

1. **Run multiple backtests** with different parameters
2. **Compare performance** across different symbols and timeframes
3. **Optimize the AI model** based on backtest results
4. **Implement live trading** with proven strategies
5. **Monitor performance** and adjust parameters as needed

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify API credentials and network connectivity
3. Test with shorter periods first
4. Review the configuration parameters

Happy backtesting! 🚀
