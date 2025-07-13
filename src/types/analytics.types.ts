export interface BacktestConfig
{
    symbol: string;
    timeframe: string;
    start_date: string;
    end_date: string;
    initial_balance: number;
    risk_per_trade: number;
    min_confidence_threshold: number;
}

export interface BacktestResult
{
    config: BacktestConfig;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    total_pnl: number;
    max_drawdown: number;
    sharpe_ratio: number;
    profit_factor: number;
    avg_trade_duration: number;
    trades: BacktestTrade[];
    performance_metrics: PerformanceMetrics;
}

export interface BacktestTrade
{
    entry_time: string;
    exit_time: string;
    direction: 'UP' | 'DOWN';
    entry_price: number;
    exit_price: number;
    pnl: number;
    confidence: number;
    duration_minutes: number;
    was_correct: boolean;
}

export interface PerformanceMetrics
{
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix: ConfusionMatrix;
    daily_returns: DailyReturn[];
    monthly_summary: MonthlySummary[];
}

export interface ConfusionMatrix
{
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
}

export interface DailyReturn
{
    date: string;
    pnl: number;
    trades: number;
    win_rate: number;
}

export interface MonthlySummary
{
    month: string;
    total_pnl: number;
    total_trades: number;
    win_rate: number;
    best_day: number;
    worst_day: number;
}

export interface AccuracyStats
{
    symbol: string;
    timeframe: string;
    period: '24h' | '7d' | '30d' | 'all';
    total_predictions: number;
    correct_predictions: number;
    accuracy_percentage: number;
    confidence_distribution: ConfidenceDistribution[];
    last_updated: string;
}

export interface ConfidenceDistribution
{
    confidence_range: string; // e.g., "0.8-0.9"
    count: number;
    accuracy: number;
}
