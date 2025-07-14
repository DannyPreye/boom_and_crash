import { AutonomousPredictionResult } from '../agents/autonomous-trading-agent';
import { logger } from '../utils/logger';
import { TechnicalIndicators } from '../types/prediction.types';
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';

interface LLMPrediction
{
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
    timeframe: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    entry_price?: number;
    stop_loss?: number;
    take_profit?: number;
}

interface StatisticalPrediction
{
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    method: string;
}

export class MLPredictorService
{
    private llm: ChatAnthropic;

    constructor (apiKey: string)
    {
        this.llm = new ChatAnthropic({
            apiKey,
            model: 'claude-sonnet-4-20250514',
            temperature: 0.1,
            maxTokens: 2000,
        });
    }

    async predictNextTick(
        marketData: { currentPrice: number; priceHistory: number[]; },
        technicalIndicators: TechnicalIndicators,
        patterns: any,
        volumeAnalysis: any
    ): Promise<AutonomousPredictionResult>
    {
        try {
            logger.info('Starting LLM-based prediction analysis');

            console.log('🔍 ML Predictor Debug - Technical Indicators received:');
            console.log(`   RSI: ${technicalIndicators.rsi?.toFixed(2) || 'N/A'}`);
            console.log(`   MACD Signal: ${technicalIndicators.macd_signal?.toFixed(4) || 'N/A'}`);
            console.log(`   Bollinger Position: ${technicalIndicators.bollinger_position?.toFixed(2) || 'N/A'}`);
            console.log(`   EMA Short: ${technicalIndicators.ema_short?.toFixed(2) || 'N/A'}`);
            console.log(`   EMA Long: ${technicalIndicators.ema_long?.toFixed(2) || 'N/A'}`);
            console.log(`   ADX: ${technicalIndicators.adx?.toFixed(2) || 'N/A'}`);
            console.log(`   Stochastic: ${technicalIndicators.stochastic?.toFixed(2) || 'N/A'}`);
            console.log(`   Williams %R: ${technicalIndicators.williams_r?.toFixed(2) || 'N/A'}`);
            console.log(`   Current Price: ${marketData.currentPrice}`);
            console.log(`   Price History Length: ${marketData.priceHistory.length}`);

            // Get LLM prediction
            const llmPrediction = await this.getLLMPrediction(
                marketData,
                technicalIndicators,
                patterns,
                volumeAnalysis
            );

            // Get statistical fallback prediction
            const statisticalPrediction = this.getStatisticalPrediction(
                marketData,
                technicalIndicators
            );

            // Combine predictions using ensemble approach
            const finalPrediction = this.combinePredictions(
                llmPrediction,
                statisticalPrediction,
                marketData.currentPrice
            );

            logger.info('LLM prediction completed', {
                llmDirection: llmPrediction.direction,
                llmConfidence: llmPrediction.confidence,
                statisticalDirection: statisticalPrediction.direction,
                statisticalConfidence: statisticalPrediction.confidence,
                finalDirection: finalPrediction.prediction,
                finalConfidence: finalPrediction.confidence
            });

            return finalPrediction;
        } catch (error) {
            logger.error('Error in LLM prediction', { error });
            // Fallback to statistical prediction only
            const fallbackPrediction = this.getStatisticalPrediction(
                marketData,
                technicalIndicators
            );
            return this.buildFallbackResult(fallbackPrediction, marketData.currentPrice);
        }
    }

    private async getLLMPrediction(
        marketData: { currentPrice: number; priceHistory: number[]; },
        technicalIndicators: TechnicalIndicators,
        patterns: any,
        volumeAnalysis: any
    ): Promise<LLMPrediction>
    {
        const prompt = this.buildAnalysisPrompt(
            marketData,
            technicalIndicators,
            patterns,
            volumeAnalysis
        );

        try {
            const response = await this.llm.invoke([ new HumanMessage(prompt) ]);
            const content = response.content as string;

            return this.parseLLMResponse(content);
        } catch (error) {
            logger.error('LLM API error', { error });
            throw new Error(`LLM API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private buildAnalysisPrompt(
        marketData: { currentPrice: number; priceHistory: number[]; },
        technicalIndicators: TechnicalIndicators,
        patterns: any,
        volumeAnalysis: any
    ): string
    {
        const currentPrice = marketData.currentPrice;
        const priceHistory = marketData.priceHistory.slice(-20); // Last 20 prices

        // Fix: Add null checks for priceHistory
        if (priceHistory.length === 0) {
            return this.buildFallbackPrompt(currentPrice, technicalIndicators);
        }

        const firstPrice = priceHistory[ 0 ];
        if (firstPrice === undefined || firstPrice === 0) {
            return this.buildFallbackPrompt(currentPrice, technicalIndicators);
        }

        const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;

        return `You are a professional financial analyst specializing in binary options trading. Provide precise, data-driven analysis in valid JSON format only.

Analyze the following market data for binary options trading and provide your prediction in valid JSON format only.

CURRENT MARKET DATA:
- Current Price: ${currentPrice}
- Price Change (last 20 ticks): ${priceChange.toFixed(2)}%
- Recent Price Trend: ${this.getPriceTrend(priceHistory)}

TECHNICAL INDICATORS:
- RSI: ${technicalIndicators.rsi?.toFixed(2) || 'N/A'}
- MACD Signal: ${technicalIndicators.macd_signal?.toFixed(4) || 'N/A'}
- Bollinger Position: ${technicalIndicators.bollinger_position?.toFixed(2) || 'N/A'}
- EMA Short: ${technicalIndicators.ema_short?.toFixed(2) || 'N/A'}
- EMA Long: ${technicalIndicators.ema_long?.toFixed(2) || 'N/A'}
- ADX: ${technicalIndicators.adx?.toFixed(2) || 'N/A'}
- Stochastic: ${technicalIndicators.stochastic?.toFixed(2) || 'N/A'}
- Williams %R: ${technicalIndicators.williams_r?.toFixed(2) || 'N/A'}

PATTERN ANALYSIS:
${this.formatPatterns(patterns)}

VOLUME ANALYSIS:
${this.formatVolumeAnalysis(volumeAnalysis)}

ANALYSIS REQUIREMENTS:
1. Consider all technical indicators and their relationships
2. Evaluate pattern strength and reliability
3. Assess volume confirmation
4. Consider market momentum and trend strength
5. Factor in volatility (if available)
6. Evaluate risk-reward ratio

RESPONSE FORMAT (valid JSON only):
{
  "direction": "UP|DOWN|NEUTRAL",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed analysis explanation",
  "timeframe": "1m|5m|15m",
  "risk_level": "LOW|MEDIUM|HIGH",
  "entry_price": number (optional),
  "stop_loss": number (optional),
  "take_profit": number (optional)
}

Provide only the JSON response, no additional text.`;
    }

    private buildFallbackPrompt(currentPrice: number, technicalIndicators: TechnicalIndicators): string
    {
        return `You are a professional financial analyst specializing in binary options trading. Provide precise, data-driven analysis in valid JSON format only.

CURRENT MARKET DATA:
- Current Price: ${currentPrice}
- Price Change: Insufficient data
- Recent Price Trend: Insufficient data

TECHNICAL INDICATORS:
- RSI: ${technicalIndicators.rsi?.toFixed(2) || 'N/A'}
- MACD Signal: ${technicalIndicators.macd_signal?.toFixed(4) || 'N/A'}
- Bollinger Position: ${technicalIndicators.bollinger_position?.toFixed(2) || 'N/A'}
- EMA Short: ${technicalIndicators.ema_short?.toFixed(2) || 'N/A'}
- EMA Long: ${technicalIndicators.ema_long?.toFixed(2) || 'N/A'}
- ADX: ${technicalIndicators.adx?.toFixed(2) || 'N/A'}
- Stochastic: ${technicalIndicators.stochastic?.toFixed(2) || 'N/A'}
- Williams %R: ${technicalIndicators.williams_r?.toFixed(2) || 'N/A'}

PATTERN ANALYSIS:
No pattern data available

VOLUME ANALYSIS:
No volume data available

ANALYSIS REQUIREMENTS:
1. Consider available technical indicators
2. Evaluate current market conditions
3. Provide conservative analysis given limited data

RESPONSE FORMAT (valid JSON only):
{
  "direction": "UP|DOWN|NEUTRAL",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed analysis explanation",
  "timeframe": "1m|5m|15m",
  "risk_level": "LOW|MEDIUM|HIGH",
  "entry_price": number (optional),
  "stop_loss": number (optional),
  "take_profit": number (optional)
}

Provide only the JSON response, no additional text.`;
    }

    private formatPatterns(patterns: any): string
    {
        if (!patterns || typeof patterns !== 'object') {
            return 'No pattern data available';
        }
        // FIX 3: Explicitly type array
        const patternInfo: string[] = [];
        if (patterns.chart?.patterns) {
            for (const pattern of patterns.chart.patterns) {
                patternInfo.push(`- ${pattern.name}: ${pattern.direction} (confidence: ${pattern.confidence})`);
            }
        }
        if (patterns.support_resistance) {
            patternInfo.push(`- Support: ${patterns.support_resistance.support}`);
            patternInfo.push(`- Resistance: ${patterns.support_resistance.resistance}`);
        }
        return patternInfo.length > 0 ? patternInfo.join('\n') : 'No specific patterns detected';
    }

    private formatVolumeAnalysis(volumeAnalysis: any): string
    {
        if (!volumeAnalysis || typeof volumeAnalysis !== 'object') {
            return 'No volume data available';
        }
        // FIX 3: Explicitly type array
        const volumeInfo: string[] = [];
        if (volumeAnalysis.volume_trend) {
            volumeInfo.push(`- Volume Trend: ${volumeAnalysis.volume_trend}`);
        }
        if (volumeAnalysis.volume_sma) {
            volumeInfo.push(`- Volume SMA: ${volumeAnalysis.volume_sma}`);
        }
        if (volumeAnalysis.volume_ratio) {
            volumeInfo.push(`- Volume Ratio: ${volumeAnalysis.volume_ratio}`);
        }
        return volumeInfo.length > 0 ? volumeInfo.join('\n') : 'No volume analysis available';
    }

    private getPriceTrend(priceHistory: number[]): string
    {
        if (priceHistory.length < 3) return 'Insufficient data';

        const recent = priceHistory.slice(-3);
        const first = recent[ 0 ];
        const last = recent[ recent.length - 1 ];

        // Fix: Add null checks
        if (first === undefined || last === undefined) {
            return 'Insufficient data';
        }

        if (last > first * 1.001) return 'Uptrend';
        if (last < first * 0.999) return 'Downtrend';
        return 'Sideways';
    }

    private parseLLMResponse(content: string): LLMPrediction
    {
        // Try multiple parsing approaches
        let parsed: any = null;

        console.log('LLM Response:', content);

        // Method 1: Direct JSON parsing
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            logger.warn('Direct JSON parsing failed, trying to extract JSON');
        }

        // Method 2: Extract JSON from markdown code blocks
        if (!parsed) {
            const jsonMatch = content.match(/```json\s*(\{.*?\})\s*```/s);
            if (jsonMatch && jsonMatch[ 1 ]) {
                try {
                    parsed = JSON.parse(jsonMatch[ 1 ]);
                } catch (e) {
                    logger.warn('JSON extraction from markdown failed');
                }
            }
        }

        // Method 3: Extract JSON from code blocks without language
        if (!parsed) {
            const codeMatch = content.match(/```\s*(\{.*?\})\s*```/s);
            if (codeMatch && codeMatch[ 1 ]) {
                try {
                    parsed = JSON.parse(codeMatch[ 1 ]);
                } catch (e) {
                    logger.warn('JSON extraction from code block failed');
                }
            }
        }

        // Method 4: Find JSON object in text
        if (!parsed) {
            const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
            if (jsonObjectMatch) {
                try {
                    parsed = JSON.parse(jsonObjectMatch[ 0 ]);
                } catch (e) {
                    logger.warn('JSON object extraction failed');
                }
            }
        }

        if (!parsed) {
            throw new Error('Failed to parse LLM response as JSON');
        }

        // Validate and provide fallbacks
        return this.validateAndSanitizePrediction(parsed);
    }

    private validateAndSanitizePrediction(parsed: any): LLMPrediction
    {
        const validDirections = [ 'UP', 'DOWN', 'NEUTRAL' ];
        const validRiskLevels = [ 'LOW', 'MEDIUM', 'HIGH' ];
        const validTimeframes = [ '1m', '5m', '15m' ];

        return {
            direction: validDirections.includes(parsed.direction) ? parsed.direction : 'NEUTRAL',
            confidence: this.clampNumber(parsed.confidence, 0, 1, 0.5),
            reasoning: parsed.reasoning || 'No reasoning provided',
            timeframe: validTimeframes.includes(parsed.timeframe) ? parsed.timeframe : '1m',
            risk_level: validRiskLevels.includes(parsed.risk_level) ? parsed.risk_level : 'MEDIUM',
            entry_price: typeof parsed.entry_price === 'number' ? parsed.entry_price : undefined,
            stop_loss: typeof parsed.stop_loss === 'number' ? parsed.stop_loss : undefined,
            take_profit: typeof parsed.take_profit === 'number' ? parsed.take_profit : undefined
        };
    }

    private clampNumber(value: any, min: number, max: number, fallback: number): number
    {
        const num = typeof value === 'number' ? value : fallback;
        return Math.max(min, Math.min(max, num));
    }

    private getStatisticalPrediction(
        marketData: { currentPrice: number; priceHistory: number[]; },
        technicalIndicators: TechnicalIndicators
    ): StatisticalPrediction
    {
        // FIX 3: Explicitly type array
        const signals: StatisticalPrediction[] = [];
        // RSI signals
        if (typeof technicalIndicators.rsi === 'number') {
            if (technicalIndicators.rsi < 30) signals.push({ direction: 'UP', confidence: 0.7, method: 'RSI oversold' });
            if (technicalIndicators.rsi > 70) signals.push({ direction: 'DOWN', confidence: 0.7, method: 'RSI overbought' });
        }
        // MACD Signal
        if (typeof technicalIndicators.macd_signal === 'number') {
            if (technicalIndicators.macd_signal > 0) {
                signals.push({ direction: 'UP', confidence: 0.6, method: 'MACD bullish' });
            } else if (technicalIndicators.macd_signal < 0) {
                signals.push({ direction: 'DOWN', confidence: 0.6, method: 'MACD bearish' });
            }
        }
        // Bollinger Position
        if (typeof technicalIndicators.bollinger_position === 'number') {
            if (technicalIndicators.bollinger_position < 0.2) {
                signals.push({ direction: 'UP', confidence: 0.65, method: 'Price near lower Bollinger Band' });
            } else if (technicalIndicators.bollinger_position > 0.8) {
                signals.push({ direction: 'DOWN', confidence: 0.65, method: 'Price near upper Bollinger Band' });
            }
        }
        // Stochastic
        if (typeof technicalIndicators.stochastic === 'number') {
            if (technicalIndicators.stochastic < 20) {
                signals.push({ direction: 'UP', confidence: 0.6, method: 'Stochastic oversold' });
            } else if (technicalIndicators.stochastic > 80) {
                signals.push({ direction: 'DOWN', confidence: 0.6, method: 'Stochastic overbought' });
            }
        }
        if (signals.length === 0) {
            return { direction: 'NEUTRAL', confidence: 0.3, method: 'No clear signals' };
        }
        // Aggregate signals
        const upSignals = signals.filter(s => s.direction === 'UP');
        const downSignals = signals.filter(s => s.direction === 'DOWN');
        if (upSignals.length > downSignals.length) {
            const avgConfidence = upSignals.reduce((sum, s) => sum + s.confidence, 0) / upSignals.length;
            return { direction: 'UP', confidence: avgConfidence, method: upSignals.map(s => s.method).join(', ') };
        } else if (downSignals.length > upSignals.length) {
            const avgConfidence = downSignals.reduce((sum, s) => sum + s.confidence, 0) / downSignals.length;
            return { direction: 'DOWN', confidence: avgConfidence, method: downSignals.map(s => s.method).join(', ') };
        } else {
            return { direction: 'NEUTRAL', confidence: 0.4, method: 'Mixed signals' };
        }
    }

    private buildFallbackResult(
        stat: StatisticalPrediction,
        currentPrice: number
    ): AutonomousPredictionResult
    {
        return {
            symbol: 'UNKNOWN',
            timeframe: '1m',
            prediction: stat.direction === 'UP' ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, stat.confidence * 0.8)),
            trading_levels: {
                entry_price: currentPrice,
                stop_loss: currentPrice * 0.985,
                take_profit: currentPrice * 1.025,
                risk_reward_ratio: 1.5,
                max_drawdown_pips: Math.round(Math.abs(currentPrice * 0.015) * 10000),
                target_pips: Math.round(Math.abs(currentPrice * 0.025) * 10000),
            },
            price_targets: {
                immediate: currentPrice * 1.005,
                short_term: currentPrice * 1.015,
                medium_term: currentPrice * 1.025,
            },
            risk_management: {
                position_size_suggestion: 0.02,
                max_risk_per_trade: 0.015,
                probability_of_success: Math.max(0.5, Math.min(0.95, stat.confidence * 0.8)),
            },
            multi_timeframe_analysis: 'Statistical fallback',
            higher_timeframe_trend: 'SIDEWAYS',
            intermediate_timeframe_momentum: 'NEUTRAL',
            timeframe_confluence: 'WEAK',
            market_structure_quality: 'MEDIUM',
            confluence_bonus: 0.0,
            analysis: stat.method,
            reasoning: `Fallback prediction due to LLM error: ${stat.method}`,
            factors: {
                technical: stat.confidence,
                sentiment: 0,
                pattern: 0,
                confluence: 0,
                key_factors: [ stat.method ],
            },
        };
    }

    private combinePredictions(
        llmPrediction: LLMPrediction,
        statisticalPrediction: StatisticalPrediction,
        currentPrice: number
    ): AutonomousPredictionResult
    {
        // Weight LLM prediction more heavily (70%) but consider statistical as backup
        const llmWeight = 0.7;
        const statisticalWeight = 0.3;
        let finalDirection: 'UP' | 'DOWN' | 'NEUTRAL';
        let finalConfidence: number;
        // If both predictions agree, boost confidence
        if (llmPrediction.direction === statisticalPrediction.direction) {
            finalDirection = llmPrediction.direction;
            finalConfidence = Math.min(0.95,
                (llmPrediction.confidence * llmWeight) + (statisticalPrediction.confidence * statisticalWeight) + 0.1
            );
        } else {
            // If they disagree, go with LLM but reduce confidence
            finalDirection = llmPrediction.direction;
            finalConfidence = (llmPrediction.confidence * llmWeight) + (statisticalPrediction.confidence * statisticalWeight) * 0.5;
        }
        // Always return a full AutonomousPredictionResult
        return {
            symbol: 'UNKNOWN',
            timeframe: '1m',
            prediction: finalDirection === 'UP' ? 'UP' : 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, finalConfidence)),
            trading_levels: {
                entry_price: llmPrediction.entry_price || currentPrice,
                stop_loss: llmPrediction.stop_loss || (currentPrice * 0.985),
                take_profit: llmPrediction.take_profit || (currentPrice * 1.025),
                risk_reward_ratio: 1.5,
                max_drawdown_pips: Math.round(Math.abs((llmPrediction.entry_price || currentPrice) - (llmPrediction.stop_loss || currentPrice * 0.985)) * 10000),
                target_pips: Math.round(Math.abs((llmPrediction.take_profit || currentPrice * 1.025) - (llmPrediction.entry_price || currentPrice)) * 10000),
            },
            price_targets: {
                immediate: llmPrediction.entry_price ? llmPrediction.entry_price * 1.005 : currentPrice * 1.005,
                short_term: llmPrediction.entry_price ? llmPrediction.entry_price * 1.015 : currentPrice * 1.015,
                medium_term: llmPrediction.entry_price ? llmPrediction.entry_price * 1.025 : currentPrice * 1.025,
            },
            risk_management: {
                position_size_suggestion: 0.02,
                max_risk_per_trade: 0.015,
                probability_of_success: Math.max(0.5, Math.min(0.95, finalConfidence)),
            },
            multi_timeframe_analysis: 'LLM/statistical ensemble',
            higher_timeframe_trend: 'SIDEWAYS',
            intermediate_timeframe_momentum: 'NEUTRAL',
            timeframe_confluence: 'MODERATE',
            market_structure_quality: 'MEDIUM',
            confluence_bonus: 0.0,
            analysis: llmPrediction.reasoning,
            reasoning: `LLM: ${llmPrediction.reasoning} | Statistical: ${statisticalPrediction.method}`,
            factors: {
                technical: llmPrediction.confidence,
                sentiment: 0,
                pattern: 0,
                confluence: 0,
                key_factors: [ llmPrediction.reasoning, statisticalPrediction.method ],
            },
        };
    }
}
