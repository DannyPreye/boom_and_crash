import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { geminiLogger, logError, PerformanceTimer } from '../utils/logger';
import
{
    SyntheticSymbol,
    PredictionDirection,
    MarketFeatures,
    Timeframe
} from '../types/prediction.types';

export interface MarketSentimentAnalysis
{
    sentiment_score: number; // -1 to 1 (-1 = very bearish, 1 = very bullish)
    confidence: number; // 0 to 1
    key_factors: string[];
    market_context: string;
    risk_assessment: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GeminiPrediction
{
    direction: PredictionDirection;
    confidence: number;
    reasoning: string;
    factors_analyzed: string[];
    sentiment_analysis: MarketSentimentAnalysis;
    processing_time_ms: number;
}

export class GeminiAIService
{
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor ()
    {
        this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    }

    /**
     * Analyze market sentiment and generate prediction
     */
    async generatePrediction(
        symbol: SyntheticSymbol,
        timeframe: Timeframe,
        features: MarketFeatures,
        recentNews?: string[]
    ): Promise<GeminiPrediction>
    {
        const timer = new PerformanceTimer(geminiLogger, `gemini_prediction_${symbol}`);

        try {
            const prompt = this.buildPredictionPrompt(symbol, timeframe, features, recentNews);

            geminiLogger.info('Generating prediction with Gemini AI', {
                symbol,
                timeframe,
                prompt_length: prompt.length
            });

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const prediction = this.parsePredictionResponse(text);
            const processingTime = timer.end({ symbol, timeframe, confidence: prediction.confidence });

            return {
                ...prediction,
                processing_time_ms: processingTime,
            };

        } catch (error) {
            timer.end({ symbol, timeframe, error: true });
            logError(geminiLogger, error, 'Failed to generate Gemini prediction', { symbol, timeframe });
            throw error;
        }
    }

    /**
     * Analyze market sentiment from news and context
     */
    async analyzeMarketSentiment(
        symbol: SyntheticSymbol,
        newsItems?: string[],
        marketContext?: string
    ): Promise<MarketSentimentAnalysis>
    {
        const timer = new PerformanceTimer(geminiLogger, `sentiment_analysis_${symbol}`);

        try {
            const prompt = this.buildSentimentPrompt(symbol, newsItems, marketContext);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const sentiment = this.parseSentimentResponse(text);
            timer.end({ symbol, sentiment_score: sentiment.sentiment_score });

            return sentiment;

        } catch (error) {
            timer.end({ symbol, error: true });
            logError(geminiLogger, error, 'Failed to analyze market sentiment', { symbol });
            throw error;
        }
    }

    /**
     * Build prediction prompt for Gemini
     */
    private buildPredictionPrompt(
        symbol: SyntheticSymbol,
        timeframe: Timeframe,
        features: MarketFeatures,
        recentNews?: string[]
    ): string
    {
        const symbolInfo = this.getSymbolInfo(symbol);

        return `
You are an expert AI trader specializing in Deriv synthetic indices with 90%+ prediction accuracy.

SYMBOL: ${symbol} (${symbolInfo.description})
TIMEFRAME: ${timeframe}
CURRENT MARKET CONDITIONS:

Technical Features:
- Price Velocity: ${features.price_velocity}
- Price Acceleration: ${features.price_acceleration}
- Volatility Momentum: ${features.volatility_momentum}
- Trend Strength: ${features.trend_strength}
- Support/Resistance Proximity: ${features.support_resistance_proximity}
${features.ticks_since_last_spike ? `- Ticks Since Last Spike: ${features.ticks_since_last_spike}` : ''}

Technical Indicators:
- RSI: ${features.technical_indicators.rsi}
- MACD Signal: ${features.technical_indicators.macd_signal}
- Bollinger Position: ${features.technical_indicators.bollinger_position}
- EMA Short: ${features.technical_indicators.ema_short}
- EMA Long: ${features.technical_indicators.ema_long}
- ADX: ${features.technical_indicators.adx}
- Stochastic: ${features.technical_indicators.stochastic}
- Williams %R: ${features.technical_indicators.williams_r}

Time Context:
- Hour of Day: ${features.time_features.hour_of_day}
- Day of Week: ${features.time_features.day_of_week}
- London Session: ${features.time_features.is_london_session}
- New York Session: ${features.time_features.is_new_york_session}
- Asian Session: ${features.time_features.is_asian_session}

${symbolInfo.specialConsiderations}

${recentNews && recentNews.length > 0 ? `
Recent Market News:
${recentNews.map((news, i) => `${i + 1}. ${news}`).join('\n')}
` : ''}

TASK: Provide a JSON response with your prediction:

{
  "direction": "UP" or "DOWN",
  "confidence": 0.0 to 1.0,
  "reasoning": "detailed explanation of your analysis",
  "factors_analyzed": ["factor1", "factor2", ...],
  "sentiment_analysis": {
    "sentiment_score": -1.0 to 1.0,
    "confidence": 0.0 to 1.0,
    "key_factors": ["factor1", "factor2", ...],
    "market_context": "brief market context",
    "risk_assessment": "LOW", "MEDIUM", or "HIGH"
  }
}

Focus on synthetic index characteristics, pattern recognition, and ensemble analysis. Be precise and confident.
`;
    }

    /**
     * Build sentiment analysis prompt
     */
    private buildSentimentPrompt(
        symbol: SyntheticSymbol,
        newsItems?: string[],
        marketContext?: string
    ): string
    {
        return `
Analyze market sentiment for ${symbol} synthetic index.

${newsItems && newsItems.length > 0 ? `
Recent News Items:
${newsItems.map((news, i) => `${i + 1}. ${news}`).join('\n')}
` : ''}

${marketContext ? `Market Context: ${marketContext}` : ''}

Provide JSON response:
{
  "sentiment_score": -1.0 to 1.0,
  "confidence": 0.0 to 1.0,
  "key_factors": ["factor1", "factor2", ...],
  "market_context": "brief analysis",
  "risk_assessment": "LOW", "MEDIUM", or "HIGH"
}
`;
    }

    /**
     * Parse Gemini prediction response
     */
    private parsePredictionResponse(text: string): Omit<GeminiPrediction, 'processing_time_ms'>
    {
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[ 0 ]);

            return {
                direction: parsed.direction as PredictionDirection,
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || 'No reasoning provided',
                factors_analyzed: Array.isArray(parsed.factors_analyzed) ? parsed.factors_analyzed : [],
                sentiment_analysis: {
                    sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_analysis?.sentiment_score || 0)),
                    confidence: Math.max(0, Math.min(1, parsed.sentiment_analysis?.confidence || 0.5)),
                    key_factors: Array.isArray(parsed.sentiment_analysis?.key_factors)
                        ? parsed.sentiment_analysis.key_factors
                        : [],
                    market_context: parsed.sentiment_analysis?.market_context || '',
                    risk_assessment: parsed.sentiment_analysis?.risk_assessment || 'MEDIUM',
                },
            };

        } catch (error) {
            geminiLogger.warn('Failed to parse Gemini response, using fallback', { text, error });

            // Fallback prediction based on simple text analysis
            const isPositive = text.toLowerCase().includes('up') ||
                text.toLowerCase().includes('bull') ||
                text.toLowerCase().includes('buy');

            return {
                direction: isPositive ? 'UP' : 'DOWN',
                confidence: 0.5,
                reasoning: 'Fallback prediction due to parsing error',
                factors_analyzed: [ 'text_analysis' ],
                sentiment_analysis: {
                    sentiment_score: isPositive ? 0.3 : -0.3,
                    confidence: 0.5,
                    key_factors: [ 'text_analysis' ],
                    market_context: 'Unable to parse detailed analysis',
                    risk_assessment: 'MEDIUM',
                },
            };
        }
    }

    /**
     * Parse sentiment analysis response
     */
    private parseSentimentResponse(text: string): MarketSentimentAnalysis
    {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[ 0 ]);

            return {
                sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_score || 0)),
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                key_factors: Array.isArray(parsed.key_factors) ? parsed.key_factors : [],
                market_context: parsed.market_context || '',
                risk_assessment: parsed.risk_assessment || 'MEDIUM',
            };

        } catch (error) {
            geminiLogger.warn('Failed to parse sentiment response, using neutral sentiment');

            return {
                sentiment_score: 0,
                confidence: 0.5,
                key_factors: [ 'parsing_error' ],
                market_context: 'Unable to parse sentiment analysis',
                risk_assessment: 'MEDIUM',
            };
        }
    }

    /**
     * Get symbol-specific information for prompts
     */
    private getSymbolInfo(symbol: SyntheticSymbol): { description: string; specialConsiderations: string; }
    {
        const symbolData = {
            BOOM1000: {
                description: 'Boom 1000 Index - synthetic index with upward spikes every ~1000 ticks',
                specialConsiderations: `
BOOM 1000 SPECIAL CHARACTERISTICS:
- Upward spikes occur approximately every 1000 ticks
- Between spikes, price generally trends downward
- Spike proximity is crucial for prediction accuracy
- Consider tick count since last spike for timing
- Higher probability of spike if >800 ticks since last spike
        `,
            },
            BOOM500: {
                description: 'Boom 500 Index - synthetic index with upward spikes every ~500 ticks',
                specialConsiderations: `
BOOM 500 SPECIAL CHARACTERISTICS:
- Upward spikes occur approximately every 500 ticks
- More frequent spikes than BOOM1000
- Between spikes, price generally trends downward
- Consider tick count since last spike for timing
        `,
            },
            CRASH1000: {
                description: 'Crash 1000 Index - synthetic index with downward spikes every ~1000 ticks',
                specialConsiderations: `
CRASH 1000 SPECIAL CHARACTERISTICS:
- Downward spikes occur approximately every 1000 ticks
- Between spikes, price generally trends upward
- Spike proximity is crucial for prediction accuracy
- Consider tick count since last spike for timing
        `,
            },
            CRASH500: {
                description: 'Crash 500 Index - synthetic index with downward spikes every ~500 ticks',
                specialConsiderations: `
CRASH 500 SPECIAL CHARACTERISTICS:
- Downward spikes occur approximately every 500 ticks
- More frequent spikes than CRASH1000
- Between spikes, price generally trends upward
- Consider tick count since last spike for timing
        `,
            },
            R_10: {
                description: 'Volatility 10 Index - 10% constant volatility synthetic index',
                specialConsiderations: `
VOLATILITY 10 SPECIAL CHARACTERISTICS:
- Constant 10% volatility
- No predictable spikes like Boom/Crash
- Focus on technical indicators and momentum
- Trend-following strategies often work better
        `,
            },
            R_25: {
                description: 'Volatility 25 Index - 25% constant volatility synthetic index',
                specialConsiderations: `
VOLATILITY 25 SPECIAL CHARACTERISTICS:
- Constant 25% volatility
- Higher volatility than R_10
- No predictable spikes like Boom/Crash
- Focus on volatility momentum and breakouts
        `,
            },
            R_50: {
                description: 'Volatility 50 Index - 50% constant volatility synthetic index',
                specialConsiderations: `
VOLATILITY 50 SPECIAL CHARACTERISTICS:
- Constant 50% volatility
- Medium-high volatility synthetic index
- Suitable for momentum strategies
- Consider volatility clustering patterns
        `,
            },
            R_75: {
                description: 'Volatility 75 Index - 75% constant volatility synthetic index',
                specialConsiderations: `
VOLATILITY 75 SPECIAL CHARACTERISTICS:
- Constant 75% volatility
- High volatility synthetic index
- Rapid price movements
- Focus on short-term momentum
        `,
            },
            R_100: {
                description: 'Volatility 100 Index - 100% constant volatility synthetic index',
                specialConsiderations: `
VOLATILITY 100 SPECIAL CHARACTERISTICS:
- Constant 100% volatility (highest)
- Extremely rapid price movements
- Best for very short-term predictions
- High risk, high opportunity
        `,
            },
        };

        return symbolData[ symbol ] || {
            description: 'Unknown synthetic index',
            specialConsiderations: 'No special considerations available.',
        };
    }
}
