import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';
import { MarketFeatures } from '../services/feature-engineering';

interface MultiTimeframeData
{
    higher_timeframe: {
        trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
        strength: number;
        support_resistance: { support: number; resistance: number; };
        momentum: number;
    };
    intermediate_timeframe: {
        trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        momentum: number;
        reversal_signals: string[];
        swing_levels: { high: number; low: number; };
    };
    confluence: {
        score: number;
        aligned: boolean;
        conflicting_signals: string[];
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
    // private llm: ChatGoogleGenerativeAI;
    private llm: ChatAnthropic;

    constructor (apiKey: string)
    {
        this.llm = new ChatAnthropic({
            apiKey,
            model: 'claude-sonnet-4-20250514', // Fixed: Use correct model name
            temperature: 0.1,

        });
    }

    async generateCompletePrediction(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        marketFeatures: MarketFeatures
    ): Promise<AutonomousPredictionResult>
    {
        // Generate multi-timeframe analysis data
        const multiTimeframeData = this.generateMultiTimeframeData(symbol, currentPrice, marketFeatures);

        const prompt = `You are an expert algorithmic trader specializing in Deriv synthetic indices with 85%+ accuracy.

🎯 TRADING ANALYSIS REQUEST for ${symbol} on ${timeframe} timeframe

📊 CURRENT MARKET CONDITIONS:
• Symbol: ${symbol} (${this.getSymbolCharacteristics(symbol)})
• Current Price: ${currentPrice}
• Timeframe: ${timeframe}

📈 TECHNICAL ANALYSIS:
• RSI: ${marketFeatures.rsi.toFixed(2)} ${this.interpretRSI(marketFeatures.rsi)}
• Trend Strength: ${marketFeatures.trend_strength.toFixed(3)} ${this.interpretTrend(marketFeatures.trend_strength)}
• Volatility Momentum: ${marketFeatures.volatility_momentum.toFixed(3)}
• Price Velocity: ${marketFeatures.price_velocity.toFixed(6)}
• Price Acceleration: ${marketFeatures.price_acceleration.toFixed(6)}
• Support/Resistance Proximity: ${marketFeatures.support_resistance_proximity.toFixed(3)}
• MACD Signal: ${marketFeatures.macd_signal.toFixed(6)}
• Bollinger Position: ${marketFeatures.bollinger_position.toFixed(3)} ${this.interpretBollinger(marketFeatures.bollinger_position)}
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
- For BOOM: Low spike probability or safe distance from expected spike
- For volatility indices: Positive momentum with controlled volatility

**For DOWN prediction, consider:**
- RSI > 30 (not oversold)
- Negative trend strength (< -0.4)
- Price near resistance
- Bearish higher timeframe alignment
- For CRASH: Low crash probability or safe distance
- For volatility indices: Negative momentum

**Risk Management Rules:**
- Stop loss: 1.5-2% for volatile symbols, 1-1.5% for stable symbols
- Take profit: 1.5-3x stop loss distance
- Confidence: High confluence (0.8+) = 80-90%, Medium (0.6-0.8) = 70-80%, Low (<0.6) = 60-70%
- Position size: Higher confidence = larger size (max 3% risk)

**Symbol-Specific Considerations:**
${symbol.includes('BOOM') ? '- BOOM indices: Consider spike timing, use tighter stops near expected spikes' : ''}
${symbol.includes('CRASH') ? '- CRASH indices: Monitor crash proximity, protect profits quickly' : ''}
${symbol.includes('R_') ? '- Volatility indices: Adjust for volatility level, trend-following works well' : ''}

⚡ REQUIRED OUTPUT:

Analyze ALL the data above and provide your professional trading decision in this EXACT JSON format:

\`\`\`json
{
  "prediction": "UP" or "DOWN",
  "confidence": 0.65,
  "reasoning": "Clear explanation of why you chose UP/DOWN, highlighting the strongest supporting factors and addressing any conflicting signals",
  "entry_price": ${currentPrice},
  "stop_loss": calculate based on symbol volatility and risk rules above,
  "take_profit": calculate based on 1.5-3x risk reward,
  "risk_reward_ratio": 1.8,
  "immediate_target": ${(currentPrice * 1.005).toFixed(2)},
  "short_term_target": calculate 1-2% move,
  "medium_term_target": calculate 2-4% move,
  "position_size": calculate based on confidence (0.01-0.03),
  "higher_timeframe_trend": "${multiTimeframeData.higher_timeframe.trend}",
  "confluence_score": ${multiTimeframeData.confluence.score.toFixed(2)},
  "key_factors": ["list", "3-5", "main", "decision", "factors"],
  "technical_score": rate technical setup 0.5-0.95,
  "market_structure_quality": "HIGH", "MEDIUM", or "LOW",
  "timeframe_confluence": "STRONG", "MODERATE", or "WEAK"
}
\`\`\`

🔴 CRITICAL: Your reasoning must demonstrate deep analysis of the provided data. Don't just state the prediction - explain WHY based on the technical indicators, multi-timeframe alignment, and symbol-specific behavior patterns.`;

        try {
            console.log('🧠 Generating enhanced autonomous prediction for', symbol);

            // Add validation before LLM call
            if (!this.llm) {
                throw new Error('LLM not initialized');
            }

            // Add timeout wrapper
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

            // Extract JSON from response
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                console.error('No JSON found in response:', content.substring(0, 500));
                throw new Error('No JSON found in LLM response');
            }

            let jsonData;
            try {
                jsonData = JSON.parse(jsonMatch[ 1 ]!);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('JSON content:', jsonMatch[ 1 ]);
                throw new Error('Invalid JSON in LLM response');
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
                    pattern: jsonData.pattern_score || 0.7,
                    confluence: jsonData.confluence_bonus || multiTimeframeData.confluence.score,
                    key_factors: jsonData.key_factors || [ "Multi-timeframe analysis", "Technical indicators", "Confluence score" ],
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

    private getSymbolSpecificGuidance(symbol: string, features: MarketFeatures): string
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
            const volLevel = parseInt(symbol.split('_')[ 1 ]) || 25;
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

} catch (error) {
    console.error('Autonomous prediction failed:', error);

    // Fallback to a basic prediction if AI fails
    return this.generateFallbackPrediction(symbol, timeframe, currentPrice, marketFeatures);
}
    }

    /**
     * Test the LLM connection and basic functionality
     */
    async testConnection(): Promise<boolean>;
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
    marketFeatures: MarketFeatures
): MultiTimeframeData;
{
    // Simulate higher timeframe analysis based on trend strength and volatility
    const trendStrength = marketFeatures.trend_strength;
    const volatilityMomentum = marketFeatures.volatility_momentum;
    const rsi = marketFeatures.rsi;

    // Higher timeframe trend determination
    let higherTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
    if (trendStrength > 0.6 && volatilityMomentum > 0.5) {
        higherTrend = rsi > 50 ? 'BULLISH' : 'BEARISH';
    } else if (trendStrength > 0.4) {
        higherTrend = rsi > 60 ? 'BULLISH' : rsi < 40 ? 'BEARISH' : 'SIDEWAYS';
    }

    // Intermediate timeframe momentum
    let intermediateMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (Math.abs(volatilityMomentum) > 0.3) {
        intermediateMomentum = volatilityMomentum > 0 ? 'BULLISH' : 'BEARISH';
    }

    // Calculate confluence score based on timeframe alignment
    const trendAlignment = higherTrend === 'SIDEWAYS' ? 0.5 :
        (higherTrend === 'BULLISH' && intermediateMomentum === 'BULLISH') ||
            (higherTrend === 'BEARISH' && intermediateMomentum === 'BEARISH') ? 1.0 : 0.3;

    const confluenceScore = (trendAlignment + (Math.abs(trendStrength - 0.5) * 2)) / 2;

    // Generate realistic support/resistance levels based on current price and volatility
    const volatilityRange = this.getSymbolVolatilityRange(symbol);
    const supportLevel = currentPrice * (1 - volatilityRange * 0.5);
    const resistanceLevel = currentPrice * (1 + volatilityRange * 0.5);

    return {
        higher_timeframe: {
            trend: higherTrend,
            strength: trendStrength,
            support_resistance: {
                support: supportLevel,
                resistance: resistanceLevel
            },
            momentum: volatilityMomentum
        },
        intermediate_timeframe: {
            trend: intermediateMomentum,
            momentum: volatilityMomentum * 0.8, // Slightly dampened from higher timeframe
            reversal_signals: this.generateReversalSignals(marketFeatures),
            swing_levels: {
                high: currentPrice * (1 + volatilityRange * 0.3),
                low: currentPrice * (1 - volatilityRange * 0.3)
            }
        },
        confluence: {
            score: confluenceScore,
            aligned: confluenceScore > 0.7,
            conflicting_signals: confluenceScore < 0.5 ? [ 'Timeframe divergence detected' ] : []
        }
    };
}

    private getSymbolVolatilityRange(symbol: string): number;
{
    const volatilityMap: Record<string, number> = {
        'BOOM1000': 0.08, 'BOOM500': 0.12,
        'CRASH1000': 0.08, 'CRASH500': 0.12,
        'R_10': 0.03, 'R_25': 0.06, 'R_50': 0.12,
        'R_75': 0.18, 'R_100': 0.25
    };
    return volatilityMap[ symbol ] || 0.1;
}

    private generateReversalSignals(marketFeatures: MarketFeatures): string[];
{
    const signals: string[] = [];

    if (marketFeatures.rsi > 70) signals.push('RSI Overbought');
    if (marketFeatures.rsi < 30) signals.push('RSI Oversold');
    if (marketFeatures.bollinger_position > 0.8) signals.push('Bollinger Upper Band Touch');
    if (marketFeatures.bollinger_position < 0.2) signals.push('Bollinger Lower Band Touch');
    if (Math.abs(marketFeatures.macd_signal) > 0.7) signals.push('MACD Divergence');

    return signals;
}

    private getSymbolInfo(symbol: string): string;
{
    const symbolInfo: Record<string, string> = {
        'BOOM1000': 'Boom 1000: Spikes UP approximately every 1000 ticks. High volatility with sudden price jumps. Typical daily range: 6-10%. Best for breakout strategies.',
        'BOOM500': 'Boom 500: Spikes UP approximately every 500 ticks. Higher spike frequency than BOOM1000. Typical daily range: 8-15%. More volatile, requires tighter stops.',
        'CRASH1000': 'Crash 1000: Spikes DOWN approximately every 1000 ticks. High volatility with sudden price drops. Typical daily range: 6-10%. Best for breakdown strategies.',
        'CRASH500': 'Crash 500: Spikes DOWN approximately every 500 ticks. Higher spike frequency than CRASH1000. Typical daily range: 8-15%. More volatile, requires tighter stops.',
        'R_10': 'Volatility 10: Low volatility index. Typical daily range: 3-6%. Suitable for tight range trading. 1 pip movements common.',
        'R_25': 'Volatility 25: Medium-low volatility. Typical daily range: 8-15%. Good for swing trading. Moderate pip movements.',
        'R_50': 'Volatility 50: Medium volatility. Typical daily range: 15-25%. Active price movements. Good for trend following.',
        'R_75': 'Volatility 75: Medium-high volatility. Typical daily range: 20-35%. Strong price movements. Requires wider stops.',
        'R_100': 'Volatility 100: High volatility index. Typical daily range: 25-45%. Very active price movements. Best for experienced traders.',
    };

    return symbolInfo[ symbol ] || 'Unknown symbol. Use conservative approach with standard volatility assumptions.';
}

    private validateResult(result: AutonomousPredictionResult): void
    {
        // Validate confidence
        if(result.confidence < 0.5 || result.confidence > 0.95) {
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

    private calculatePips(priceDistance: number, symbol: string): number;
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
    marketFeatures: MarketFeatures
): AutonomousPredictionResult;
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
}
