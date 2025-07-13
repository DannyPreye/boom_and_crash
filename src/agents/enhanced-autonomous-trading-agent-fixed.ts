import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';
import { EnhancedMarketFeatures } from '../types/enhanced-features.types';
import * as TA from 'technicalindicators';
import { DerivCandleData } from '../services/deriv-client';

interface MultiTimeframeData
{
    higher_timeframe: {
        trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
        support_resistance: {
            support: number;
            resistance: number;
        };
    };
    intermediate_timeframe: {
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
    confluence: {
        score: number;
        aligned: boolean;
        reversal_signals: string[];
    };
}

export interface AutonomousPredictionResult
{
    symbol: string;
    timeframe: string;
    prediction: 'UP' | 'DOWN';
    confidence: number;
    trading_levels: {
        entry_price: number;
        stop_loss: number;
        take_profit: number;
        risk_reward_ratio: number;
        max_drawdown_pips: number;
        target_pips: number;
    };
    price_targets: {
        immediate: number;
        short_term: number;
        medium_term: number;
    };
    risk_management: {
        position_size_suggestion: number;
        max_risk_per_trade: number;
        probability_of_success: number;
    };
    // Multi-timeframe analysis fields
    multi_timeframe_analysis?: string;
    higher_timeframe_trend?: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    intermediate_timeframe_momentum?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    timeframe_confluence?: 'STRONG' | 'MODERATE' | 'WEAK' | 'DIVERGENT';
    market_structure_quality?: 'HIGH' | 'MEDIUM' | 'LOW';
    confluence_bonus?: number;
    // Legacy fields
    analysis: string;
    reasoning: string;
    factors: any;
}

export class AutonomousTradingAgent
{
    private llm: ChatAnthropic;

    constructor (apiKey: string)
    {
        this.llm = new ChatAnthropic({
            apiKey,
            model: 'claude-sonnet-4-20250514',
            temperature: 0.1,

        });
    }    async generateCompletePrediction(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        marketFeatures: EnhancedMarketFeatures,
        candleData?: DerivCandleData[] // Add optional candle data parameter
    ): Promise<AutonomousPredictionResult>
    {
        // Generate multi-timeframe analysis data
        const multiTimeframeData = this.generateMultiTimeframeData(symbol, currentPrice, marketFeatures);
        
        // Analyze candlestick patterns with real OHLC data if available
        const candlestickAnalysis = candleData && candleData.length >= 10 
            ? this.analyzeCandlestickPatternsFromOHLC(candleData)
            : this.getDefaultCandlestickAnalysis();
        const patternInterpretation = this.interpretCandlestickSignals(candlestickAnalysis);

        const prompt = `You are an expert algorithmic trader specializing in Deriv synthetic indices with 85%+ accuracy.

🎯 TRADING ANALYSIS REQUEST for ${symbol} on ${timeframe} timeframe

📊 CURRENT MARKET CONDITIONS:
• Symbol: ${symbol} (${this.getSymbolCharacteristics(symbol)})
• Current Price: ${currentPrice}
• Timeframe: ${timeframe}

📈 ENHANCED TECHNICAL ANALYSIS:
• RSI: ${marketFeatures.rsi.toFixed(2)} ${this.interpretRSI(marketFeatures.rsi)}
• Stochastic RSI: ${marketFeatures.technical_indicators.stoch_rsi.toFixed(2)} ${this.interpretStochRSI(marketFeatures.technical_indicators.stoch_rsi)}
• Williams %R: ${marketFeatures.technical_indicators.williams_r.toFixed(2)} ${this.interpretWilliamsR(marketFeatures.technical_indicators.williams_r)}
• Trend Strength: ${marketFeatures.trend_strength.toFixed(3)} ${this.interpretTrend(marketFeatures.trend_strength)}
• Volatility Momentum: ${marketFeatures.volatility_momentum.toFixed(3)}
• Price Velocity: ${marketFeatures.price_velocity.toFixed(6)}
• Price Acceleration: ${marketFeatures.price_acceleration.toFixed(6)}
• Support/Resistance Proximity: ${marketFeatures.support_resistance_proximity.toFixed(3)}

🔬 ENHANCED INDICATORS:
• MACD Line: ${marketFeatures.technical_indicators.macd_line.toFixed(6)}
• MACD Signal: ${marketFeatures.technical_indicators.macd_signal.toFixed(6)}
• MACD Histogram: ${marketFeatures.technical_indicators.macd_histogram.toFixed(6)} ${this.interpretMACDHistogram(marketFeatures.technical_indicators.macd_histogram)}
• ATR: ${marketFeatures.technical_indicators.atr.toFixed(4)} (Normalized: ${marketFeatures.technical_indicators.atr_normalized.toFixed(3)})
• Stochastic: ${marketFeatures.technical_indicators.stochastic.toFixed(2)} ${this.interpretStochastic(marketFeatures.technical_indicators.stochastic)}
• Bollinger Position: ${marketFeatures.bollinger_position.toFixed(3)} ${this.interpretBollinger(marketFeatures.bollinger_position)}
• Bollinger Width: ${marketFeatures.technical_indicators.bollinger_width.toFixed(4)} ${marketFeatures.technical_indicators.bollinger_squeeze ? '(SQUEEZE)' : ''}

🕯️ CANDLESTICK PATTERN ANALYSIS:
${patternInterpretation}

⚡ MARKET REGIME:
• Volatility State: ${marketFeatures.market_regime.volatility_state}
• Trend State: ${marketFeatures.market_regime.trend_state}
• Momentum State: ${marketFeatures.market_regime.momentum_state}
• Session Strength: ${(marketFeatures.session_strength * 100).toFixed(1)}%
• Volatility Rank: ${(marketFeatures.volatility_rank * 100).toFixed(1)}th percentile
${marketFeatures.ticks_since_last_spike ? `• Ticks Since Last Spike: ${marketFeatures.ticks_since_last_spike}` : ''}
${marketFeatures.spike_probability ? `• Spike Probability: ${(marketFeatures.spike_probability * 100).toFixed(1)}%` : ''}

🔍 MULTI-TIMEFRAME ANALYSIS:
• Higher Timeframe Trend: ${multiTimeframeData.higher_timeframe.trend} ${this.getTrendStrength(multiTimeframeData.higher_timeframe.trend)}
• Intermediate Timeframe: ${multiTimeframeData.intermediate_timeframe.trend}
• Support Level: ${multiTimeframeData.higher_timeframe.support_resistance.support.toFixed(2)}
• Resistance Level: ${multiTimeframeData.higher_timeframe.support_resistance.resistance.toFixed(2)}
• Price vs Support: ${((currentPrice / multiTimeframeData.higher_timeframe.support_resistance.support - 1) * 100).toFixed(2)}%
• Price vs Resistance: ${((currentPrice / multiTimeframeData.higher_timeframe.support_resistance.resistance - 1) * 100).toFixed(2)}%
• Confluence Score: ${multiTimeframeData.confluence.score.toFixed(2)} ${this.interpretConfluence(multiTimeframeData.confluence.score)}
• Reversal Signals: ${multiTimeframeData.confluence.reversal_signals.join(', ') || 'None detected'}

${this.getSymbolSpecificGuidance(symbol, marketFeatures)}

🎯 TRADING DECISION FRAMEWORK:

**For UP prediction, consider:**
- RSI < 70 (not overbought)
- Positive trend strength (> 0.4)
- Price above key support
- Bullish higher timeframe alignment
- Bullish candlestick patterns (Hammer, Engulfing, Morning Star)
- For BOOM: Low spike probability or safe distance from expected spike
- For volatility indices: Positive momentum with controlled volatility

**For DOWN prediction, consider:**
- RSI > 30 (not oversold)
- Negative trend strength (< -0.4)
- Price near resistance
- Bearish higher timeframe alignment
- Bearish candlestick patterns (Shooting Star, Engulfing, Evening Star)
- For CRASH: Low crash probability or safe distance
- For volatility indices: Negative momentum

**Candlestick Pattern Priority:**
- Strong reversal patterns (Hammer, Shooting Star) near support/resistance = HIGH priority
- Continuation patterns (Three White Soldiers, Three Black Crows) = MEDIUM priority
- Indecision patterns (Doji) = LOW priority unless at key levels

**Risk Management Rules:**
- Stop loss: 1.5-2% for volatile symbols, 1-1.5% for stable symbols
- Take profit: 1.5-3x stop loss distance
- Confidence: High confluence (0.8+) + bullish patterns = 80-90%, Medium (0.6-0.8) = 70-80%, Low (<0.6) = 60-70%
- Position size: Higher confidence + pattern confirmation = larger size (max 3% risk)

**Symbol-Specific Considerations:**
${symbol.includes('BOOM') ? '- BOOM indices: Consider spike timing, use tighter stops near expected spikes' : ''}
${symbol.includes('CRASH') ? '- CRASH indices: Monitor crash proximity, protect profits quickly' : ''}
${symbol.includes('R_') ? '- Volatility indices: Adjust for volatility level, trend-following works well' : ''}

⚡ REQUIRED OUTPUT:

Analyze the data including candlestick patterns and provide your trading decision in this EXACT JSON format:

\`\`\`json
{
  "prediction": "UP" or "DOWN",
  "confidence": 0.65,
  "reasoning": "Brief analysis covering technical indicators, candlestick patterns, trend alignment, and key factors",
  "entry_price": ${currentPrice},
  "stop_loss": calculate based on symbol volatility,
  "take_profit": calculate based on 1.5-3x risk reward,
  "risk_reward_ratio": 1.8,
  "immediate_target": ${(currentPrice * 1.005).toFixed(2)},
  "short_term_target": calculate 1-2% move,
  "medium_term_target": calculate 2-4% move,
  "position_size": calculate based on confidence (0.01-0.03),
  "higher_timeframe_trend": "${multiTimeframeData.higher_timeframe.trend}",
  "confluence_score": ${multiTimeframeData.confluence.score.toFixed(2)},
  "candlestick_patterns": ${JSON.stringify(candlestickAnalysis.patterns)},
  "pattern_strength": ${candlestickAnalysis.patternStrength.toFixed(2)},
  "pattern_bias": "${candlestickAnalysis.bullishSignals.length > candlestickAnalysis.bearishSignals.length ? 'BULLISH' : candlestickAnalysis.bearishSignals.length > candlestickAnalysis.bullishSignals.length ? 'BEARISH' : 'NEUTRAL'}",
  "key_factors": ["list", "3-4", "main", "factors", "including", "patterns"],
  "technical_score": rate technical setup 0.5-0.95,
  "market_structure_quality": "HIGH", "MEDIUM", or "LOW",
  "timeframe_confluence": "STRONG", "MODERATE", or "WEAK"
}
\`\`\``;

        try {
            console.log('🧠 Generating enhanced autonomous prediction for', symbol);

            if (!this.llm) {
                throw new Error('LLM not initialized');
            }

            const timeoutPromise = new Promise((_, reject) =>
            {
                setTimeout(() => reject(new Error('LLM call timeout after 30 seconds')), 30000);
            });

            const llmPromise = this.llm.invoke([ new HumanMessage(prompt) ]);
            const response = await Promise.race([ llmPromise, timeoutPromise ]) as any;

            if (!response || !response.content) {
                throw new Error('Empty response from LLM');
            }

            const content = response.content as string;
            console.log('📊 LLM analysis completed, parsing response...');

            // Extract JSON from response - try multiple formats
            let jsonString = '';

            // First try: Look for markdown-wrapped JSON
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonString = jsonMatch[ 1 ]!;
            } else {
                // Second try: Look for JSON object in the response (starts with {)
                const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
                if (jsonObjectMatch) {
                    jsonString = jsonObjectMatch[ 0 ];
                } else {
                    console.error('No JSON found in response:', content.substring(0, 1000));
                    throw new Error('No JSON found in LLM response');
                }
            }

            let jsonData;
            try {
                jsonData = JSON.parse(jsonString);
            } catch (parseError) {
                // Try to handle partial JSON response by attempting to complete it
                console.warn('Initial JSON parse failed, attempting to fix truncated response...');
                console.error('Original JSON content:', jsonString);

                // Try to complete common incomplete patterns
                let fixedJsonString = jsonString.trim();

                // If it doesn't end with } or ], try to close it
                if (!fixedJsonString.endsWith('}') && !fixedJsonString.endsWith(']')) {
                    // Count open braces/brackets to determine how many to close
                    const openBraces = (fixedJsonString.match(/\{/g) || []).length;
                    const closeBraces = (fixedJsonString.match(/\}/g) || []).length;
                    const openBrackets = (fixedJsonString.match(/\[/g) || []).length;
                    const closeBrackets = (fixedJsonString.match(/\]/g) || []).length;

                    // Add missing closing braces
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                        fixedJsonString += '}';
                    }

                    // Add missing closing brackets
                    for (let i = 0; i < openBrackets - closeBrackets; i++) {
                        fixedJsonString += ']';
                    }
                }

                try {
                    jsonData = JSON.parse(fixedJsonString);
                    console.log('✅ Successfully fixed truncated JSON response');
                } catch (secondParseError) {
                    console.error('Failed to fix JSON parse error:', secondParseError);
                    console.error('Fixed JSON content:', fixedJsonString);
                    throw new Error('Invalid JSON in LLM response - unable to parse or fix');
                }
            }

            // Convert to our result format with safe defaults
            const result: AutonomousPredictionResult = {
                symbol,
                timeframe,
                prediction: (jsonData.prediction === 'UP' || jsonData.prediction === 'DOWN') ? jsonData.prediction : 'UP',
                confidence: Math.max(0.5, Math.min(0.95, jsonData.confidence || 0.65)),
                trading_levels: {
                    entry_price: jsonData.entry_price || currentPrice,
                    stop_loss: jsonData.stop_loss || (currentPrice * 0.985),
                    take_profit: jsonData.take_profit || (currentPrice * 1.025),
                    risk_reward_ratio: jsonData.risk_reward_ratio || 1.5,
                    max_drawdown_pips: this.calculatePips(Math.abs((jsonData.entry_price || currentPrice) - (jsonData.stop_loss || currentPrice * 0.985)), symbol),
                    target_pips: this.calculatePips(Math.abs((jsonData.take_profit || currentPrice * 1.025) - (jsonData.entry_price || currentPrice)), symbol),
                },
                price_targets: {
                    immediate: jsonData.immediate_target || currentPrice * 1.005,
                    short_term: jsonData.short_term_target || currentPrice * 1.015,
                    medium_term: jsonData.medium_term_target || currentPrice * 1.025,
                },
                risk_management: {
                    position_size_suggestion: jsonData.position_size || 0.02,
                    max_risk_per_trade: jsonData.max_risk || 0.015,
                    probability_of_success: jsonData.success_probability || jsonData.confidence || 0.65,
                },
                // Multi-timeframe analysis fields
                multi_timeframe_analysis: jsonData.multi_timeframe_analysis || "Enhanced multi-timeframe analysis completed",
                higher_timeframe_trend: jsonData.higher_timeframe_trend || multiTimeframeData.higher_timeframe.trend,
                intermediate_timeframe_momentum: jsonData.intermediate_timeframe_momentum || multiTimeframeData.intermediate_timeframe.trend,
                timeframe_confluence: jsonData.timeframe_confluence || (multiTimeframeData.confluence.aligned ? 'STRONG' : 'WEAK'),
                market_structure_quality: jsonData.market_structure_quality || (multiTimeframeData.confluence.score > 0.7 ? 'HIGH' : 'MEDIUM'),
                confluence_bonus: jsonData.confluence_bonus || multiTimeframeData.confluence.score,
                // Legacy fields for backward compatibility
                analysis: jsonData.reasoning || "Enhanced autonomous analysis performed",
                reasoning: jsonData.reasoning || "Analysis based on comprehensive technical and multi-timeframe structure",
                factors: {
                    technical: jsonData.technical_score || 0.7,
                    sentiment: jsonData.sentiment_score || 0.0,
                    pattern: jsonData.pattern_score || candlestickAnalysis.patternStrength,
                    confluence: jsonData.confluence_bonus || multiTimeframeData.confluence.score,
                    candlestick_patterns: jsonData.candlestick_patterns || candlestickAnalysis.patterns,
                    pattern_strength: jsonData.pattern_strength || candlestickAnalysis.patternStrength,
                    pattern_bias: jsonData.pattern_bias || (candlestickAnalysis.bullishSignals.length > candlestickAnalysis.bearishSignals.length ? 'BULLISH' :
                        candlestickAnalysis.bearishSignals.length > candlestickAnalysis.bullishSignals.length ? 'BEARISH' : 'NEUTRAL'),
                    bullish_signals: candlestickAnalysis.bullishSignals,
                    bearish_signals: candlestickAnalysis.bearishSignals,
                    key_factors: jsonData.key_factors || [ "Multi-timeframe analysis", "Technical indicators", "Candlestick patterns", "Confluence score" ],
                    ...(symbol.includes('BOOM') || symbol.includes('CRASH')
                        ? { spike_proximity: marketFeatures.spike_probability || 0 }
                        : { volatility_momentum: marketFeatures.volatility_momentum }
                    ),
                }
            };

            // Validate the result
            this.validateResult(result);

            console.log(`✅ Enhanced prediction generated: ${result.prediction} (${(result.confidence * 100).toFixed(1)}%)`);
            return result;

        } catch (error) {
            console.error('❌ Enhanced autonomous prediction failed:', error);
            // Fallback to a basic prediction if AI fails
            return this.generateFallbackPrediction(symbol, timeframe, currentPrice, marketFeatures);
        }
    }

    // Helper methods for enhanced prompt
    private getSymbolCharacteristics(symbol: string): string
    {
        const characteristics: Record<string, string> = {
            'BOOM1000': 'Synthetic index with upward spikes every ~1000 ticks',
            'BOOM500': 'Synthetic index with upward spikes every ~500 ticks',
            'CRASH1000': 'Synthetic index with downward spikes every ~1000 ticks',
            'CRASH500': 'Synthetic index with downward spikes every ~500 ticks',
            'R_10': 'Low volatility index (10% annual)',
            'R_25': 'Medium-low volatility index (25% annual)',
            'R_50': 'Medium volatility index (50% annual)',
            'R_75': 'High volatility index (75% annual)',
            'R_100': 'Very high volatility index (100% annual)'
        };
        return characteristics[ symbol ] || 'Synthetic index';
    }

    private interpretRSI(rsi: number): string
    {
        if (rsi > 80) return '⚠️ EXTREMELY OVERBOUGHT';
        if (rsi > 70) return '🔴 OVERBOUGHT';
        if (rsi < 20) return '⚠️ EXTREMELY OVERSOLD';
        if (rsi < 30) return '🟢 OVERSOLD';
        if (rsi > 55) return '📈 BULLISH ZONE';
        if (rsi < 45) return '📉 BEARISH ZONE';
        return '⚪ NEUTRAL';
    }

    private interpretTrend(trend: number): string
    {
        if (trend > 0.6) return '🟢 STRONG UPTREND';
        if (trend > 0.2) return '📈 MODERATE UPTREND';
        if (trend < -0.6) return '🔴 STRONG DOWNTREND';
        if (trend < -0.2) return '📉 MODERATE DOWNTREND';
        return '⚪ SIDEWAYS';
    }

    private interpretBollinger(position: number): string
    {
        if (position > 0.8) return '🔴 NEAR UPPER BAND';
        if (position < 0.2) return '🟢 NEAR LOWER BAND';
        if (position > 0.6) return '📈 ABOVE MIDDLE';
        if (position < 0.4) return '📉 BELOW MIDDLE';
        return '⚪ MIDDLE ZONE';
    }

    private getTrendStrength(trend: string): string
    {
        if (trend === 'BULLISH') return '💪 STRONG';
        if (trend === 'BEARISH') return '💪 STRONG';
        return '⚪ WEAK';
    }

    private interpretConfluence(score: number): string
    {
        if (score > 0.8) return '🟢 VERY HIGH';
        if (score > 0.6) return '🟡 HIGH';
        if (score > 0.4) return '🟠 MODERATE';
        return '🔴 LOW';
    }

    private interpretStochRSI(stochRSI: number): string
    {
        if (stochRSI > 0.8) return '🔴 EXTREMELY OVERBOUGHT';
        if (stochRSI > 0.7) return '🔴 OVERBOUGHT';
        if (stochRSI < 0.2) return '🟢 EXTREMELY OVERSOLD';
        if (stochRSI < 0.3) return '🟢 OVERSOLD';
        return '⚪ NEUTRAL';
    }

    private interpretWilliamsR(williamsR: number): string
    {
        if (williamsR > -20) return '🔴 OVERBOUGHT';
        if (williamsR < -80) return '🟢 OVERSOLD';
        if (williamsR > -40) return '📈 BULLISH ZONE';
        if (williamsR < -60) return '📉 BEARISH ZONE';
        return '⚪ NEUTRAL';
    }

    private interpretMACDHistogram(histogram: number): string
    {
        if (histogram > 0.001) return '🟢 BULLISH MOMENTUM';
        if (histogram < -0.001) return '🔴 BEARISH MOMENTUM';
        if (histogram > 0) return '📈 WEAK BULLISH';
        if (histogram < 0) return '📉 WEAK BEARISH';
        return '⚪ NEUTRAL';
    }

    private interpretStochastic(stochastic: number): string
    {
        if (stochastic > 80) return '🔴 OVERBOUGHT';
        if (stochastic < 20) return '🟢 OVERSOLD';
        if (stochastic > 60) return '📈 BULLISH ZONE';
        if (stochastic < 40) return '📉 BEARISH ZONE';
        return '⚪ NEUTRAL';
    }

    private getSymbolSpecificGuidance(symbol: string, features: EnhancedMarketFeatures): string
    {
        if (symbol.includes('BOOM')) {
            const spikeRisk = features.spike_probability ? features.spike_probability > 0.7 : false;
            return `🎆 BOOM INDEX SPECIFIC ANALYSIS:
• Expected Spike Pattern: Upward spikes every ~${symbol.includes('1000') ? '1000' : '500'} ticks
• Current Spike Risk: ${spikeRisk ? '🔴 HIGH - Consider reduced position size' : '🟢 LOW - Normal position sizing'}
• Trading Strategy: ${spikeRisk ? 'Defensive positioning, quick profits' : 'Standard trend following acceptable'}
${features.ticks_since_last_spike ? `• Ticks Since Last Spike: ${features.ticks_since_last_spike}` : ''}`;
        }

        if (symbol.includes('CRASH')) {
            const crashRisk = features.spike_probability ? features.spike_probability > 0.7 : false;
            return `💥 CRASH INDEX SPECIFIC ANALYSIS:
• Expected Crash Pattern: Downward spikes every ~${symbol.includes('1000') ? '1000' : '500'} ticks
• Current Crash Risk: ${crashRisk ? '🔴 HIGH - Consider reduced position size' : '🟢 LOW - Normal position sizing'}
• Trading Strategy: ${crashRisk ? 'Defensive positioning, quick profits' : 'Standard trend following acceptable'}
${features.ticks_since_last_spike ? `• Ticks Since Last Crash: ${features.ticks_since_last_spike}` : ''}`;
        }

        if (symbol.includes('R_')) {
            const volLevel = parseInt(symbol.split('_')[ 1 ] || '25') || 25;
            return `📊 VOLATILITY INDEX SPECIFIC ANALYSIS:
• Volatility Level: ${volLevel}% annual (${volLevel > 50 ? 'HIGH' : volLevel > 25 ? 'MEDIUM' : 'LOW'})
• Trading Approach: ${volLevel > 75 ? 'Short-term scalping preferred' : volLevel > 25 ? 'Swing trading suitable' : 'Trend following optimal'}
• Risk Adjustment: ${volLevel > 50 ? 'Use tighter stops, smaller positions' : 'Standard risk management'}
• Volatility Momentum: ${features.volatility_momentum.toFixed(3)} ${features.volatility_momentum > 0.5 ? '(Increasing)' : '(Stable/Decreasing)'}`;
        }

        return '';
    }

    /**
     * Test the LLM connection and basic functionality
     */
    async testConnection(): Promise<boolean>
    {
        try {
            const testResponse = await this.llm.invoke([
                new HumanMessage("Respond with just: OK")
            ]);

            if (testResponse && testResponse.content) {
                console.log('LLM test successful:', testResponse.content);
                return true;
            }
            return false;
        } catch (error) {
            console.error('LLM test failed:', error);
            return false;
        }
    }

    /**
     * Simulate multi-timeframe analysis based on current price and volatility patterns
     */
    private generateMultiTimeframeData(
        symbol: string,
        currentPrice: number,
        marketFeatures: EnhancedMarketFeatures
    ): MultiTimeframeData
    {
        const volatilityRange = this.getSymbolVolatilityRange(symbol);

        // Higher timeframe trend (simulate based on trend strength)
        let higherTimeframeTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
        if (marketFeatures.trend_strength > 0.3) {
            higherTimeframeTrend = 'BULLISH';
        } else if (marketFeatures.trend_strength < -0.3) {
            higherTimeframeTrend = 'BEARISH';
        } else {
            higherTimeframeTrend = 'SIDEWAYS';
        }

        // Intermediate timeframe
        let intermediateTimeframeTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        if (marketFeatures.price_velocity > 0.001) {
            intermediateTimeframeTrend = 'BULLISH';
        } else if (marketFeatures.price_velocity < -0.001) {
            intermediateTimeframeTrend = 'BEARISH';
        } else {
            intermediateTimeframeTrend = 'NEUTRAL';
        }

        // Support and Resistance levels (simulate based on price and volatility)
        const support = currentPrice * (1 - volatilityRange * 0.02);
        const resistance = currentPrice * (1 + volatilityRange * 0.02);

        // Confluence score based on technical alignment
        const technicalAlignment = [
            marketFeatures.rsi > 30 && marketFeatures.rsi < 70, // RSI not extreme
            Math.abs(marketFeatures.trend_strength) > 0.2, // Clear trend
            marketFeatures.volatility_momentum > 0.3, // Good momentum
            higherTimeframeTrend !== 'SIDEWAYS', // Higher TF has direction
        ].filter(Boolean).length;

        const confluenceScore = technicalAlignment / 4;

        // Reversal signals
        const reversalSignals = this.generateReversalSignals(marketFeatures);

        return {
            higher_timeframe: {
                trend: higherTimeframeTrend,
                support_resistance: {
                    support,
                    resistance,
                },
            },
            intermediate_timeframe: {
                trend: intermediateTimeframeTrend,
            },
            confluence: {
                score: confluenceScore,
                aligned: confluenceScore > 0.6,
                reversal_signals: reversalSignals,
            },
        };
    }

    private getSymbolVolatilityRange(symbol: string): number
    {
        const volatilityRanges: Record<string, number> = {
            'BOOM1000': 0.05,
            'BOOM500': 0.08,
            'CRASH1000': 0.05,
            'CRASH500': 0.08,
            'R_10': 0.02,
            'R_25': 0.03,
            'R_50': 0.05,
            'R_75': 0.07,
            'R_100': 0.10,
        };
        return volatilityRanges[ symbol ] || 0.03;
    }

    private generateReversalSignals(marketFeatures: EnhancedMarketFeatures): string[]
    {
        const signals: string[] = [];

        if (marketFeatures.rsi > 70) signals.push('RSI Overbought');
        if (marketFeatures.rsi < 30) signals.push('RSI Oversold');
        if (marketFeatures.bollinger_position > 0.9) signals.push('Bollinger Upper Band');
        if (marketFeatures.bollinger_position < 0.1) signals.push('Bollinger Lower Band');
        if (Math.abs(marketFeatures.price_acceleration) > 0.00001) signals.push('Price Acceleration Divergence');

        return signals;
    }

    private getSymbolInfo(symbol: string): string
    {
        const symbolInfo: Record<string, string> = {
            'BOOM1000': 'Boom 1000 - Upward spikes every ~1000 ticks',
            'BOOM500': 'Boom 500 - Upward spikes every ~500 ticks',
            'CRASH1000': 'Crash 1000 - Downward spikes every ~1000 ticks',
            'CRASH500': 'Crash 500 - Downward spikes every ~500 ticks',
            'R_10': 'Volatility 10 Index - Low volatility',
            'R_25': 'Volatility 25 Index - Medium-low volatility',
            'R_50': 'Volatility 50 Index - Medium volatility',
            'R_75': 'Volatility 75 Index - High volatility',
            'R_100': 'Volatility 100 Index - Very high volatility',
        };
        return symbolInfo[ symbol ] || 'Unknown symbol';
    }

    private validateResult(result: AutonomousPredictionResult): void
    {
        // Validate confidence
        if (result.confidence < 0.5 || result.confidence > 0.95) {
            result.confidence = Math.max(0.5, Math.min(0.95, result.confidence));
        }

        // Validate risk-reward ratio
        if (result.trading_levels.risk_reward_ratio < 1.0 || result.trading_levels.risk_reward_ratio > 4.0) {
            result.trading_levels.risk_reward_ratio = Math.max(1.2, Math.min(2.5, result.trading_levels.risk_reward_ratio));
        }

        // Validate position size
        if (result.risk_management.position_size_suggestion < 0.005 || result.risk_management.position_size_suggestion > 0.05) {
            result.risk_management.position_size_suggestion = Math.max(0.005, Math.min(0.03, result.risk_management.position_size_suggestion));
        }

        // Validate stop loss makes sense
        const currentPrice = result.trading_levels.entry_price;
        const stopLoss = result.trading_levels.stop_loss;
        const takeProfit = result.trading_levels.take_profit;

        if (result.prediction === 'UP') {
            if (stopLoss >= currentPrice) {
                result.trading_levels.stop_loss = currentPrice * 0.985; // 1.5% stop loss
            }
            if (takeProfit <= currentPrice) {
                result.trading_levels.take_profit = currentPrice * 1.03; // 3% take profit
            }
        } else {
            if (stopLoss <= currentPrice) {
                result.trading_levels.stop_loss = currentPrice * 1.015; // 1.5% stop loss
            }
            if (takeProfit >= currentPrice) {
                result.trading_levels.take_profit = currentPrice * 0.97; // 3% take profit
            }
        }

        // Recalculate pips based on corrected levels
        result.trading_levels.max_drawdown_pips = this.calculatePips(
            Math.abs(result.trading_levels.entry_price - result.trading_levels.stop_loss),
            result.symbol
        );
        result.trading_levels.target_pips = this.calculatePips(
            Math.abs(result.trading_levels.take_profit - result.trading_levels.entry_price),
            result.symbol
        );
    }

    private calculatePips(priceDistance: number, symbol: string): number
    {
        if (symbol.includes('R_')) {
            return Math.round(Math.abs(priceDistance) * 1000);
        } else if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
            return Math.round(Math.abs(priceDistance) * 1000);
        }
        return Math.round(Math.abs(priceDistance) * 100);
    }

    private generateFallbackPrediction(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        marketFeatures: EnhancedMarketFeatures
    ): AutonomousPredictionResult
    {
        // Simple fallback logic
        const prediction: 'UP' | 'DOWN' = marketFeatures.trend_strength > 0.5 ? 'UP' : 'DOWN';
        const confidence = 0.65;

        const stopLossPercent = 0.015; // 1.5%
        const takeProfitPercent = stopLossPercent * 1.8; // 1:1.8 R:R

        return {
            symbol,
            timeframe,
            prediction,
            confidence,
            trading_levels: {
                entry_price: currentPrice,
                stop_loss: prediction === 'UP'
                    ? currentPrice * (1 - stopLossPercent)
                    : currentPrice * (1 + stopLossPercent),
                take_profit: prediction === 'UP'
                    ? currentPrice * (1 + takeProfitPercent)
                    : currentPrice * (1 - takeProfitPercent),
                risk_reward_ratio: 1.8,
                max_drawdown_pips: this.calculatePips(currentPrice * stopLossPercent, symbol),
                target_pips: this.calculatePips(currentPrice * takeProfitPercent, symbol),
            },
            price_targets: {
                immediate: currentPrice + (prediction === 'UP' ? 1 : -1) * currentPrice * 0.005,
                short_term: currentPrice + (prediction === 'UP' ? 1 : -1) * currentPrice * 0.015,
                medium_term: currentPrice + (prediction === 'UP' ? 1 : -1) * currentPrice * 0.03,
            },
            risk_management: {
                position_size_suggestion: 0.015,
                max_risk_per_trade: 0.015,
                probability_of_success: confidence,
            },
            analysis: `Fallback analysis for ${symbol}: Market trend suggests ${prediction} direction with moderate confidence.`,
            reasoning: `Basic trend-following approach due to AI analysis failure. Trend strength: ${marketFeatures.trend_strength}`,
            factors: {
                technical: 0.6,
                sentiment: 0.0,
                pattern: 0.6,
                volatility_momentum: marketFeatures.volatility_momentum,
            }
        };
    }

    /**
     * Analyze candlestick patterns using real OHLC data and technical indicators library
     */
    private analyzeCandlestickPatternsFromOHLC(candleData: DerivCandleData[]): {
        patterns: string[];
        bullishSignals: string[];
        bearishSignals: string[];
        patternStrength: number;
        patternConfidence: number;
    } {
        if (candleData.length < 10) {
            return this.getDefaultCandlestickAnalysis();
        }

        const patterns: string[] = [];
        const bullishSignals: string[] = [];
        const bearishSignals: string[] = [];

        // Convert candle data to format expected by technicalindicators library
        const ohlcData = candleData.map(candle => ({
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        }));

        // Use last 20 candles for pattern analysis
        const recentCandles = ohlcData.slice(-20);
        const lastCandle = recentCandles[recentCandles.length - 1];
        const secondLastCandle = recentCandles[recentCandles.length - 2];
        const thirdLastCandle = recentCandles[recentCandles.length - 3];

        try {
            // BULLISH PATTERNS
            
            // Hammer pattern detection
            const hammerResult = TA.hammerpattern({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (hammerResult && hammerResult[hammerResult.length - 1]) {
                patterns.push("Hammer");
                bullishSignals.push("Potential bullish reversal");
            }

            // Bullish Hammer Stick
            const bullishHammerResult = TA.bullishhammerstick({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bullishHammerResult && bullishHammerResult[bullishHammerResult.length - 1]) {
                patterns.push("Bullish Hammer");
                bullishSignals.push("Confirmed bullish reversal");
            }

            // Bullish Inverted Hammer
            const bullishInvertedHammerResult = TA.bullishinvertedhammerstick({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bullishInvertedHammerResult && bullishInvertedHammerResult[bullishInvertedHammerResult.length - 1]) {
                patterns.push("Bullish Inverted Hammer");
                bullishSignals.push("Potential bullish reversal");
            }

            // Bullish Engulfing
            const bullishEngulfingResult = TA.bullishengulfingpattern({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bullishEngulfingResult && bullishEngulfingResult[bullishEngulfingResult.length - 1]) {
                patterns.push("Bullish Engulfing");
                bullishSignals.push("Strong bullish reversal signal");
            }

            // Morning Star
            const morningStarResult = TA.morningstar({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (morningStarResult && morningStarResult[morningStarResult.length - 1]) {
                patterns.push("Morning Star");
                bullishSignals.push("Three-candle bullish reversal");
            }

            // Morning Doji Star
            const morningDojiStarResult = TA.morningdojistar({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (morningDojiStarResult && morningDojiStarResult[morningDojiStarResult.length - 1]) {
                patterns.push("Morning Doji Star");
                bullishSignals.push("Strong bullish reversal with doji");
            }

            // BEARISH PATTERNS

            // Shooting Star
            const shootingStarResult = TA.shootingstar({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (shootingStarResult && shootingStarResult[shootingStarResult.length - 1]) {
                patterns.push("Shooting Star");
                bearishSignals.push("Potential bearish reversal");
            }

            // Bearish Hammer Stick
            const bearishHammerResult = TA.bearishhammerstick({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bearishHammerResult && bearishHammerResult[bearishHammerResult.length - 1]) {
                patterns.push("Bearish Hammer");
                bearishSignals.push("Confirmed bearish reversal");
            }

            // Bearish Inverted Hammer
            const bearishInvertedHammerResult = TA.bearishinvertedhammerstick({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bearishInvertedHammerResult && bearishInvertedHammerResult[bearishInvertedHammerResult.length - 1]) {
                patterns.push("Bearish Inverted Hammer");
                bearishSignals.push("Potential bearish reversal");
            }

            // Bearish Engulfing
            const bearishEngulfingResult = TA.bearishengulfingpattern({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (bearishEngulfingResult && bearishEngulfingResult[bearishEngulfingResult.length - 1]) {
                patterns.push("Bearish Engulfing");
                bearishSignals.push("Strong bearish reversal signal");
            }

            // Evening Star
            const eveningStarResult = TA.eveningstar({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (eveningStarResult && eveningStarResult[eveningStarResult.length - 1]) {
                patterns.push("Evening Star");
                bearishSignals.push("Three-candle bearish reversal");
            }

            // Evening Doji Star
            const eveningDojiStarResult = TA.eveningdojistar({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (eveningDojiStarResult && eveningDojiStarResult[eveningDojiStarResult.length - 1]) {
                patterns.push("Evening Doji Star");
                bearishSignals.push("Strong bearish reversal with doji");
            }

            // NEUTRAL/INDECISION PATTERNS

            // Doji detection
            const dojiResult = TA.doji({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (dojiResult && dojiResult[dojiResult.length - 1]) {
                patterns.push("Doji");
            }

            // Dragonfly Doji
            const dragonflyDojiResult = TA.dragonflydoji({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (dragonflyDojiResult && dragonflyDojiResult[dragonflyDojiResult.length - 1]) {
                patterns.push("Dragonfly Doji");
                bullishSignals.push("Potential bullish reversal doji");
            }

            // Gravestone Doji
            const gravestoneDojiResult = TA.gravestonedoji({
                open: recentCandles.map(c => c.open),
                high: recentCandles.map(c => c.high),
                low: recentCandles.map(c => c.low),
                close: recentCandles.map(c => c.close)
            });
            if (gravestoneDojiResult && gravestoneDojiResult[gravestoneDojiResult.length - 1]) {
                patterns.push("Gravestone Doji");
                bearishSignals.push("Potential bearish reversal doji");
            }

            // Additional manual patterns based on price action
            if (lastCandle && secondLastCandle && thirdLastCandle) {
                
                // Three White Soldiers (manual detection)
                if (lastCandle.close > lastCandle.open && 
                    secondLastCandle.close > secondLastCandle.open && 
                    thirdLastCandle.close > thirdLastCandle.open &&
                    lastCandle.close > secondLastCandle.close &&
                    secondLastCandle.close > thirdLastCandle.close) {
                    patterns.push("Three White Soldiers");
                    bullishSignals.push("Strong bullish continuation");
                }

                // Three Black Crows (manual detection)
                if (lastCandle.close < lastCandle.open && 
                    secondLastCandle.close < secondLastCandle.open && 
                    thirdLastCandle.close < thirdLastCandle.open &&
                    lastCandle.close < secondLastCandle.close &&
                    secondLastCandle.close < thirdLastCandle.close) {
                    patterns.push("Three Black Crows");
                    bearishSignals.push("Strong bearish continuation");
                }

                // Pin Bar detection
                const lastRange = lastCandle.high - lastCandle.low;
                const lastBody = Math.abs(lastCandle.close - lastCandle.open);
                const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
                const lowerShadow = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

                if (lastRange > 0 && lastBody < lastRange * 0.3) {
                    if (upperShadow > lastRange * 0.6) {
                        patterns.push("Bearish Pin Bar");
                        bearishSignals.push("Rejection from highs");
                    } else if (lowerShadow > lastRange * 0.6) {
                        patterns.push("Bullish Pin Bar");
                        bullishSignals.push("Rejection from lows");
                    }
                }
            }

        } catch (error) {
            console.warn('Error in candlestick pattern analysis:', error);
            // Fall back to basic analysis if library fails
            return this.getDefaultCandlestickAnalysis();
        }

        // Calculate pattern strength and confidence
        const totalPatterns = patterns.length;
        const totalSignals = bullishSignals.length + bearishSignals.length;
        
        const patternStrength = Math.min(1.0, totalPatterns * 0.2 + totalSignals * 0.1);
        
        let patternConfidence = 0.5;
        if (totalSignals > 0) {
            const signalBalance = Math.abs(bullishSignals.length - bearishSignals.length);
            const dominantSignals = Math.max(bullishSignals.length, bearishSignals.length);
            
            if (signalBalance >= 2) {
                patternConfidence = 0.65 + (dominantSignals * 0.08);
            } else if (signalBalance >= 1) {
                patternConfidence = 0.58 + (dominantSignals * 0.05);
            }
            
            if (totalPatterns >= 3) {
                patternConfidence += 0.1;
            }
        }
        
        patternConfidence = Math.min(0.9, patternConfidence);

        return {
            patterns,
            bullishSignals,
            bearishSignals,
            patternStrength,
            patternConfidence
        };
    }

    /**
     * Get default candlestick analysis when no OHLC data is available
     */
    private getDefaultCandlestickAnalysis(): {
        patterns: string[];
        bullishSignals: string[];
        bearishSignals: string[];
        patternStrength: number;
        patternConfidence: number;
    } {
        return {
            patterns: [],
            bullishSignals: [],
            bearishSignals: [],
            patternStrength: 0,
            patternConfidence: 0.5
        };
    }

    /**
     * @deprecated Use analyzeCandlestickPatternsFromOHLC instead
     */
    private analyzeCandlestickPatterns(marketFeatures: EnhancedMarketFeatures): {
        patterns: string[];
        bullishSignals: string[];
        bearishSignals: string[];
        patternStrength: number;
        patternConfidence: number;
    } {
        // Fallback to default analysis
        return this.getDefaultCandlestickAnalysis();
    }

    private interpretCandlestickSignals(patternAnalysis: {
        patterns: string[];
        bullishSignals: string[];
        bearishSignals: string[];
        patternStrength: number;
        patternConfidence: number;
    }): string
    {
        if (patternAnalysis.patterns.length === 0) {
            return '⚪ No significant candlestick patterns detected';
        }

        let interpretation = `📊 CANDLESTICK PATTERN ANALYSIS:\n`;
        interpretation += `• Patterns Detected: ${patternAnalysis.patterns.join(', ')}\n`;
        interpretation += `• Pattern Strength: ${(patternAnalysis.patternStrength * 100).toFixed(1)}%\n`;
        interpretation += `• Pattern Confidence: ${(patternAnalysis.patternConfidence * 100).toFixed(1)}%\n`;

        if (patternAnalysis.bullishSignals.length > 0) {
            interpretation += `🟢 Bullish Signals: ${patternAnalysis.bullishSignals.join(', ')}\n`;
        }

        if (patternAnalysis.bearishSignals.length > 0) {
            interpretation += `🔴 Bearish Signals: ${patternAnalysis.bearishSignals.join(', ')}\n`;
        }

        // Overall pattern bias
        if (patternAnalysis.bullishSignals.length > patternAnalysis.bearishSignals.length) {
            interpretation += `📈 Overall Pattern Bias: BULLISH`;
        } else if (patternAnalysis.bearishSignals.length > patternAnalysis.bullishSignals.length) {
            interpretation += `📉 Overall Pattern Bias: BEARISH`;
        } else {
            interpretation += `⚪ Overall Pattern Bias: NEUTRAL`;
        }

        return interpretation;
    }
}
