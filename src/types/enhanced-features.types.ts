// Enhanced Technical Indicators for Phase 1 Implementation

export interface EnhancedTechnicalIndicators
{
    // RSI family
    rsi: number;
    stoch_rsi: number;
    rsi_divergence: number;

    // MACD family
    macd_line: number;
    macd_signal: number;
    macd_histogram: number;
    macd_divergence: number;

    // Volatility
    atr: number;
    atr_normalized: number;
    true_range: number;

    // Additional momentum
    stochastic: number;
    williams_r: number;

    // Original indicators (enhanced)
    bollinger_position: number;
    bollinger_width: number;
    bollinger_squeeze: boolean;
}

export interface SymbolConfiguration
{
    rsi_period: number;
    macd: {
        fast: number;
        slow: number;
        signal: number;
    };
    atr_period: number;
    spike_threshold: number;
    volatility_multiplier: number;
    bollinger_period: number;
    bollinger_std: number;
}

export interface MarketRegime
{
    volatility_state: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    trend_state: 'STRONG_UP' | 'WEAK_UP' | 'SIDEWAYS' | 'WEAK_DOWN' | 'STRONG_DOWN';
    momentum_state: 'ACCELERATING' | 'STEADY' | 'DECELERATING';
    overall_regime: 'TRENDING' | 'RANGING' | 'BREAKOUT' | 'REVERSAL';
    confluence_score: number; // 0-1 strength of regime signals
}

export interface SpikeAnalysis
{
    proximity_state: 'SAFE' | 'WARNING' | 'DANGER' | 'IMMINENT';
    probability: number;
    ticks_since_last: number;
    expected_ticks: number;
    spike_strength_prediction: number; // 0-1 expected spike magnitude
}

export interface EnhancedMarketFeatures
{
    // Original features (preserved for compatibility)
    price_velocity: number;
    price_acceleration: number;
    volatility_momentum: number;
    trend_strength: number;
    support_resistance_proximity: number;
    rsi: number;
    macd_signal: number;
    bollinger_position: number;
    ticks_since_last_spike?: number;
    spike_probability?: number;

    // Enhanced technical indicators
    technical_indicators: EnhancedTechnicalIndicators;

    // Market regime analysis
    market_regime: MarketRegime;

    // Enhanced spike analysis (Boom/Crash specific)
    spike_analysis?: SpikeAnalysis;

    // Session analysis
    session_strength: number; // 0-1 based on time of day
    session_volatility_adjustment: number; // multiplier for expected volatility

    // Symbol-specific features
    symbol_momentum: number; // adjusted for symbol characteristics
    volatility_rank: number; // percentile rank vs historical volatility
}

// Symbol-specific configurations for optimal performance
export const SYMBOL_CONFIGS: Record<string, SymbolConfiguration> = {
    'BOOM1000': {
        rsi_period: 21,
        macd: { fast: 8, slow: 21, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.03,
        volatility_multiplier: 1.2,
        bollinger_period: 20,
        bollinger_std: 2.0
    },
    'BOOM500': {
        rsi_period: 14,
        macd: { fast: 8, slow: 21, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.04,
        volatility_multiplier: 1.5,
        bollinger_period: 15,
        bollinger_std: 2.0
    },
    'CRASH1000': {
        rsi_period: 21,
        macd: { fast: 8, slow: 21, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.03,
        volatility_multiplier: 1.2,
        bollinger_period: 20,
        bollinger_std: 2.0
    },
    'CRASH500': {
        rsi_period: 14,
        macd: { fast: 8, slow: 21, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.04,
        volatility_multiplier: 1.5,
        bollinger_period: 15,
        bollinger_std: 2.0
    },
    'R_10': {
        rsi_period: 9,
        macd: { fast: 12, slow: 26, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.015,
        volatility_multiplier: 0.8,
        bollinger_period: 20,
        bollinger_std: 2.0
    },
    'R_25': {
        rsi_period: 14,
        macd: { fast: 12, slow: 26, signal: 9 },
        atr_period: 14,
        spike_threshold: 0.02,
        volatility_multiplier: 1.0,
        bollinger_period: 20,
        bollinger_std: 2.0
    },
    'R_50': {
        rsi_period: 14,
        macd: { fast: 10, slow: 21, signal: 7 },
        atr_period: 14,
        spike_threshold: 0.025,
        volatility_multiplier: 1.1,
        bollinger_period: 20,
        bollinger_std: 2.0
    },
    'R_75': {
        rsi_period: 21,
        macd: { fast: 8, slow: 17, signal: 7 },
        atr_period: 14,
        spike_threshold: 0.03,
        volatility_multiplier: 1.3,
        bollinger_period: 15,
        bollinger_std: 2.0
    },
    'R_100': {
        rsi_period: 21,
        macd: { fast: 8, slow: 17, signal: 7 },
        atr_period: 14,
        spike_threshold: 0.035,
        volatility_multiplier: 1.5,
        bollinger_period: 15,
        bollinger_std: 2.0
    },
};

// Session strength based on UTC time
export interface SessionStrength
{
    london: number;
    new_york: number;
    asia: number;
    overlap_bonus: number;
}

export const SESSION_TIMES = {
    LONDON: { start: 8, end: 17 }, // UTC
    NEW_YORK: { start: 13, end: 22 }, // UTC
    ASIA: { start: 0, end: 9 }, // UTC
};
