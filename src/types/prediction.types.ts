export type PredictionDirection = 'UP' | 'DOWN';
export type SyntheticSymbol = 'BOOM1000' | 'BOOM500' | 'CRASH1000' | 'CRASH500' | 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h';

export interface PredictionRequest
{
    symbol: SyntheticSymbol;
    timeframe: Timeframe;
    includeAnalysis?: boolean;
}

export interface PredictionFactors
{
    technical: number;
    sentiment: number;
    pattern: number;
    spike_proximity?: number; // For Boom/Crash
    volatility_momentum?: number; // For Volatility indices
}

export interface PredictionResponse
{
    symbol: SyntheticSymbol;
    timeframe: Timeframe;
    prediction: PredictionDirection;
    confidence: number;
    factors: PredictionFactors;
    analysis?: string;
    timestamp: string;
    model_version: string;
    request_id: string;
}

export interface MarketFeatures
{
    price_velocity: number;
    price_acceleration: number;
    ticks_since_last_spike?: number;
    volatility_momentum: number;
    trend_strength: number;
    support_resistance_proximity: number;
    volume_profile?: number;
    time_features: TimeFeatures;
    technical_indicators: TechnicalIndicators;
}

export interface TimeFeatures
{
    hour_of_day: number;
    day_of_week: number;
    is_london_session: boolean;
    is_new_york_session: boolean;
    is_asian_session: boolean;
    time_since_market_open: number;
}

export interface TechnicalIndicators
{
    rsi: number;
    macd_signal: number;
    bollinger_position: number;
    ema_short: number;
    ema_long: number;
    adx: number;
    stochastic: number;
    williams_r: number;
}

export interface EnsembleWeights
{
    gemini: number;
    lstm: number;
    statistical: number;
    transformer: number;
}

export interface ModelPrediction
{
    direction: PredictionDirection;
    confidence: number;
    model_name: string;
    processing_time_ms: number;
}

export interface EnsemblePrediction
{
    final_prediction: PredictionDirection;
    final_confidence: number;
    individual_predictions: ModelPrediction[];
    ensemble_weights: EnsembleWeights;
    processing_time_ms: number;
}
