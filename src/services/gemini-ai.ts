import { GoogleGenerativeAI } from '@google/generative-ai';
import { MarketFeatures } from './feature-engineering';

export interface GeminiPrediction
{
    direction: 'UP' | 'DOWN';
    confidence: number;
    reasoning: string;
    sentiment_score: number;
}

export class GeminiAIService
{
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor (apiKey: string)
    {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    }

    async generatePrediction(
        symbol: string,
        timeframe: string,
        features: MarketFeatures
    ): Promise<GeminiPrediction>
    {
        try {
            const prompt = this.buildPredictionPrompt(symbol, timeframe, features);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parsePredictionResponse(text);
        } catch (error) {
            console.error('Gemini prediction error:', error);
            // Fallback prediction
            return {
                direction: features.trend_strength > 0.5 ? 'UP' : 'DOWN',
                confidence: 0.6,
                reasoning: 'Fallback prediction due to AI service error',
                sentiment_score: 0,
            };
        }
    }

    private buildPredictionPrompt(symbol: string, timeframe: string, features: MarketFeatures): string
    {
        const symbolInfo = this.getSymbolInfo(symbol);

        return `
You are an expert AI trader specializing in Deriv synthetic indices with 90%+ prediction accuracy.

SYMBOL: ${symbol} (${symbolInfo.description})
TIMEFRAME: ${timeframe}

CURRENT MARKET FEATURES:
- Price Velocity: ${features.price_velocity.toFixed(6)}
- Price Acceleration: ${features.price_acceleration.toFixed(6)}
- Volatility Momentum: ${features.volatility_momentum.toFixed(4)}
- Trend Strength: ${features.trend_strength.toFixed(4)}
- Support/Resistance Proximity: ${features.support_resistance_proximity.toFixed(4)}
- RSI: ${features.rsi.toFixed(2)}
- MACD Signal: ${features.macd_signal.toFixed(6)}
- Bollinger Position: ${features.bollinger_position.toFixed(4)}
${features.ticks_since_last_spike ? `- Ticks Since Last Spike: ${features.ticks_since_last_spike}` : ''}
${features.spike_probability ? `- Spike Probability: ${features.spike_probability.toFixed(4)}` : ''}

${symbolInfo.analysis}

TASK: Analyze these features and provide a JSON response with your prediction:

{
  "direction": "UP" or "DOWN",
  "confidence": 0.0 to 1.0,
  "reasoning": "detailed explanation of your analysis",
  "sentiment_score": -1.0 to 1.0 (market sentiment)
}

Focus on:
1. Technical indicator convergence/divergence
2. Synthetic index specific patterns
3. Momentum and volatility analysis
4. ${symbol.includes('BOOM') || symbol.includes('CRASH') ? 'Spike timing probability' : 'Volatility breakout potential'}

Be precise and confident. Provide only the JSON response.
`;
    }

    private parsePredictionResponse(text: string): GeminiPrediction
    {
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[ 0 ]);

            return {
                direction: parsed.direction === 'UP' ? 'UP' : 'DOWN',
                confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
                reasoning: parsed.reasoning || 'No reasoning provided',
                sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_score || 0)),
            };
        } catch (error) {
            console.warn('Failed to parse Gemini response:', error);

            // Simple fallback based on text analysis
            const text_lower = text.toLowerCase();
            const isPositive = text_lower.includes('up') ||
                text_lower.includes('bull') ||
                text_lower.includes('buy') ||
                text_lower.includes('rise');

            return {
                direction: isPositive ? 'UP' : 'DOWN',
                confidence: 0.5,
                reasoning: 'Fallback analysis based on text content',
                sentiment_score: isPositive ? 0.3 : -0.3,
            };
        }
    }

    private getSymbolInfo(symbol: string): { description: string; analysis: string; }
    {
        const symbolData: Record<string, { description: string; analysis: string; }> = {
            BOOM1000: {
                description: 'Boom 1000 Index - upward spikes every ~1000 ticks',
                analysis: `
BOOM 1000 ANALYSIS GUIDE:
- Upward spikes occur approximately every 1000 ticks
- Between spikes, price generally trends downward with high probability
- When ticks_since_last_spike > 800, spike probability increases significantly
- Look for convergence of technical indicators before potential spike
- RSI below 30 often precedes spike events
- High volatility momentum may indicate approaching spike
        `,
            },
            BOOM500: {
                description: 'Boom 500 Index - upward spikes every ~500 ticks',
                analysis: `
BOOM 500 ANALYSIS GUIDE:
- More frequent spikes than BOOM1000 (every ~500 ticks)
- Faster price movements between spikes
- Technical indicators change more rapidly
- Consider shorter timeframe momentum
        `,
            },
            CRASH1000: {
                description: 'Crash 1000 Index - downward spikes every ~1000 ticks',
                analysis: `
CRASH 1000 ANALYSIS GUIDE:
- Downward spikes occur approximately every 1000 ticks
- Between spikes, price generally trends upward
- When ticks_since_last_spike > 800, spike probability increases
- RSI above 70 often precedes spike events
- Look for bearish divergence before spikes
        `,
            },
            CRASH500: {
                description: 'Crash 500 Index - downward spikes every ~500 ticks',
                analysis: `
CRASH 500 ANALYSIS GUIDE:
- More frequent downward spikes (every ~500 ticks)
- Faster upward movements between spikes
- Monitor for overbought conditions
        `,
            },
            R_10: {
                description: 'Volatility 10 Index - 10% constant volatility',
                analysis: `
VOLATILITY 10 ANALYSIS GUIDE:
- Constant 10% volatility synthetic index
- No predictable spikes like Boom/Crash
- Focus on technical indicators and momentum
- Trend-following strategies work well
- Lower volatility allows for clearer technical patterns
        `,
            },
            R_25: {
                description: 'Volatility 25 Index - 25% constant volatility',
                analysis: `
VOLATILITY 25 ANALYSIS GUIDE:
- Medium volatility (25%) synthetic index
- Balance between trend and momentum strategies
- Technical indicators more reliable than higher volatility indices
        `,
            },
            R_50: {
                description: 'Volatility 50 Index - 50% constant volatility',
                analysis: `
VOLATILITY 50 ANALYSIS GUIDE:
- Medium-high volatility synthetic index
- Good for momentum and breakout strategies
- Watch for volatility clustering patterns
        `,
            },
            R_75: {
                description: 'Volatility 75 Index - 75% constant volatility',
                analysis: `
VOLATILITY 75 ANALYSIS GUIDE:
- High volatility synthetic index
- Rapid price movements require quick decisions
- Focus on short-term momentum signals
        `,
            },
            R_100: {
                description: 'Volatility 100 Index - 100% constant volatility',
                analysis: `
VOLATILITY 100 ANALYSIS GUIDE:
- Highest volatility synthetic index
- Extremely rapid price movements
- Best suited for very short-term predictions
- Technical indicators may lag due to high volatility
        `,
            },
        };

        return symbolData[ symbol ] || {
            description: 'Unknown synthetic index',
            analysis: 'No specific analysis available for this symbol.',
        };
    }
}
