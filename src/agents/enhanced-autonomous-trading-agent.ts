import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';
import { MarketFeatures } from '../services/feature-engineering';
import { EnhancedMarketFeatures, SYMBOL_CONFIGS } from '../types/enhanced-features.types';
import { AutonomousPredictionResult } from './autonomous-trading-agent';

/**
 * Enhanced Autonomous Trading Agent - Phase 1 Implementation
 * Leverages symbol-specific technical indicators and market regime analysis
 */
export class EnhancedAutonomousTradingAgent
{
    private llm: ChatAnthropic;

    constructor (apiKey: string)
    {
        this.llm = new ChatAnthropic({
            apiKey,
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.1,
            maxTokens: 2000,
        });
    }

    /**
     * Generate enhanced prediction using Phase 1 improvements
     */
    async generateEnhancedPrediction(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        enhancedFeatures: EnhancedMarketFeatures
    ): Promise<AutonomousPredictionResult>
    {

        const config = SYMBOL_CONFIGS[ symbol ] || SYMBOL_CONFIGS[ 'R_25' ];
        const prompt = this.buildEnhancedPrompt(symbol, timeframe, currentPrice, enhancedFeatures, config);

        try {
            console.log('🧠 Enhanced AI Analysis - Symbol:', symbol, 'Timeframe:', timeframe);

            const timeoutPromise = new Promise((_, reject) =>
            {
                setTimeout(() => reject(new Error('Enhanced LLM call timeout after 30 seconds')), 30000);
            });

            const llmPromise = this.llm.invoke([ new HumanMessage(prompt) ]);
            const response = await Promise.race([ llmPromise, timeoutPromise ]) as any;

            if (!response || !response.content) {
                throw new Error('Empty response from enhanced LLM');
            }

            const content = response.content as string;
            console.log('📊 Enhanced analysis completed, parsing response...');

            // Extract JSON from response
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                throw new Error('No JSON found in enhanced LLM response');
            }

            const jsonData = JSON.parse(jsonMatch[ 1 ]!);
            return this.convertToResult(symbol, timeframe, jsonData, currentPrice, enhancedFeatures);

        } catch (error) {
            console.error('Enhanced autonomous prediction failed:', error);
            return this.generateEnhancedFallback(symbol, timeframe, currentPrice, enhancedFeatures);
        }
    }

    /**
     * Build enhanced prompt with Phase 1 technical indicators
     */
    private buildEnhancedPrompt(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        features: EnhancedMarketFeatures,
        config: any
    ): string
    {
        const indicators = features.technical_indicators;
        const regime = features.market_regime;
        const spike = features.spike_analysis;

        return `🎯 ENHANCED TRADING ANALYSIS - Phase 1 Optimized

SYMBOL: ${symbol} | TIMEFRAME: ${timeframe} | PRICE: ${currentPrice}

═══ PHASE 1: ENHANCED TECHNICAL INDICATORS ═══
📊 RSI FAMILY (Symbol-optimized period: ${config.rsi_period}):
  • RSI (Wilder's): ${indicators.rsi.toFixed(2)} ${this.getRSISignal(indicators.rsi)}
  • Stochastic RSI: ${indicators.stoch_rsi.toFixed(2)} ${this.getStochRSISignal(indicators.stoch_rsi)}
  • RSI Divergence: ${this.getDivergenceSignal(indicators.rsi_divergence)}

📈 MACD FAMILY (${config.macd.fast}/${config.macd.slow}/${config.macd.signal}):
  • MACD Line: ${indicators.macd_line.toFixed(4)}
  • MACD Signal: ${indicators.macd_signal.toFixed(4)}
  • MACD Histogram: ${indicators.macd_histogram.toFixed(4)} ${this.getMACDMomentum(indicators.macd_histogram)}
  • MACD Divergence: ${this.getDivergenceSignal(indicators.macd_divergence)}

⚡ VOLATILITY ANALYSIS:
  • ATR: ${indicators.atr.toFixed(4)} (Normalized: ${indicators.atr_normalized.toFixed(2)}%)
  • True Range: ${indicators.true_range.toFixed(4)}
  • Volatility Rank: ${(features.volatility_rank * 100).toFixed(1)}th percentile

🎢 MOMENTUM INDICATORS:
  • Stochastic: ${indicators.stochastic.toFixed(2)} ${this.getStochasticSignal(indicators.stochastic)}
  • Williams %R: ${indicators.williams_r.toFixed(2)} ${this.getWilliamsRSignal(indicators.williams_r)}

🎈 BOLLINGER ANALYSIS:
  • Position: ${(indicators.bollinger_position * 100).toFixed(1)}% ${this.getBollingerPosition(indicators.bollinger_position)}
  • Width: ${(indicators.bollinger_width * 100).toFixed(2)}%
  • Squeeze: ${indicators.bollinger_squeeze ? '🔴 ACTIVE' : '🟢 NO'}

═══ PHASE 1: MARKET REGIME ANALYSIS ═══
🌡️ VOLATILITY STATE: ${regime.volatility_state}
📊 TREND STATE: ${regime.trend_state}
⚡ MOMENTUM STATE: ${regime.momentum_state}
🎯 OVERALL REGIME: ${regime.overall_regime}
🤝 CONFLUENCE SCORE: ${(regime.confluence_score * 100).toFixed(1)}%

═══ SESSION & SYMBOL ANALYSIS ═══
🌍 Session Strength: ${(features.session_strength * 100).toFixed(1)}%
📈 Symbol Momentum: ${(features.symbol_momentum * 100).toFixed(1)}%
⚙️ Volatility Adjustment: ${features.session_volatility_adjustment.toFixed(2)}x

${spike ? `
═══ SPIKE ANALYSIS (${symbol}) ═══
🎯 Proximity State: ${spike.proximity_state}
📊 Spike Probability: ${(spike.probability * 100).toFixed(1)}%
⏱️ Ticks Since Last: ${spike.ticks_since_last}/${spike.expected_ticks}
💥 Predicted Strength: ${(spike.spike_strength_prediction * 100).toFixed(1)}%
` : ''}

═══ SYMBOL CHARACTERISTICS ═══
${this.getSymbolInfo(symbol)}

🎯 ENHANCED ANALYSIS REQUIREMENTS:
1. **Technical Confluence**: Analyze ALL Phase 1 indicators for agreement/divergence
2. **Regime Alignment**: Factor in market regime (${regime.overall_regime}) for strategy selection
3. **Symbol Optimization**: Use ${symbol}-specific parameters and behavior patterns
4. **Volatility Context**: Current volatility rank (${(features.volatility_rank * 100).toFixed(1)}th percentile) vs normal
5. **Session Impact**: Adjust for session strength (${(features.session_strength * 100).toFixed(1)}%)
6. **Risk Management**: ATR-based stops and symbol-specific volatility multiplier

CONFIDENCE CALIBRATION RULES:
• High Confluence (${regime.confluence_score > 0.8 ? '✅' : '❌'}): 0.80-0.95 confidence
• Medium Confluence (${regime.confluence_score > 0.6 ? '✅' : '❌'}): 0.65-0.80 confidence
• Low Confluence (${regime.confluence_score <= 0.6 ? '✅' : '❌'}): 0.50-0.65 confidence
• Divergence Detected (${Math.abs(indicators.rsi_divergence) > 0 || Math.abs(indicators.macd_divergence) > 0 ? '⚠️' : '✅'}): Reduce confidence by 10-15%

Provide complete analysis with exact trading levels:

\`\`\`json
{
  "technical_confluence": "Multi-indicator analysis summary",
  "regime_strategy": "Strategy based on ${regime.overall_regime} regime",
  "prediction": "UP/DOWN",
  "confidence": 0.75,
  "reasoning": "Enhanced technical analysis with Phase 1 indicators",
  "key_factors": ["RSI family signals", "MACD confluence", "Volatility context"],
  "entry_price": ${currentPrice},
  "stop_loss": ${(currentPrice * (indicators.atr_normalized > 1 ? 0.985 : 0.990)).toFixed(2)},
  "take_profit": ${(currentPrice * (indicators.atr_normalized > 1 ? 1.025 : 1.015)).toFixed(2)},
  "risk_reward_ratio": 1.8,
  "immediate_target": ${(currentPrice * 1.005).toFixed(2)},
  "short_term_target": ${(currentPrice * 1.015).toFixed(2)},
  "medium_term_target": ${(currentPrice * 1.025).toFixed(2)},
  "position_size": ${Math.min(0.03, regime.confluence_score * 0.04).toFixed(3)},
  "technical_score": ${Math.min(0.95, regime.confluence_score + 0.1).toFixed(2)},
  "volatility_adjustment": ${features.session_volatility_adjustment.toFixed(2)},
  "regime_score": ${regime.confluence_score.toFixed(2)}
}
\`\`\``;
    }

    /**
     * Helper methods for signal interpretation
     */
    private getRSISignal(rsi: number): string
    {
        if (rsi > 80) return '🔴 EXTREME OVERBOUGHT';
        if (rsi > 70) return '🟠 OVERBOUGHT';
        if (rsi < 20) return '🔴 EXTREME OVERSOLD';
        if (rsi < 30) return '🟢 OVERSOLD';
        if (rsi > 55) return '🟡 BULLISH';
        if (rsi < 45) return '🟡 BEARISH';
        return '⚪ NEUTRAL';
    }

    private getStochRSISignal(stochRsi: number): string
    {
        if (stochRsi > 80) return '🔴 OVERBOUGHT';
        if (stochRsi < 20) return '🟢 OVERSOLD';
        return '⚪ NEUTRAL';
    }

    private getDivergenceSignal(divergence: number): string
    {
        if (divergence > 0.5) return '🟢 BULLISH DIVERGENCE';
        if (divergence < -0.5) return '🔴 BEARISH DIVERGENCE';
        return '⚪ NO DIVERGENCE';
    }

    private getMACDMomentum(histogram: number): string
    {
        if (histogram > 0.01) return '🟢 STRONG BULLISH';
        if (histogram > 0) return '🟡 WEAK BULLISH';
        if (histogram < -0.01) return '🔴 STRONG BEARISH';
        if (histogram < 0) return '🟠 WEAK BEARISH';
        return '⚪ NEUTRAL';
    }

    private getStochasticSignal(stoch: number): string
    {
        if (stoch > 80) return '🔴 OVERBOUGHT';
        if (stoch < 20) return '🟢 OVERSOLD';
        return '⚪ NEUTRAL';
    }

    private getWilliamsRSignal(williams: number): string
    {
        if (williams > -20) return '🔴 OVERBOUGHT';
        if (williams < -80) return '🟢 OVERSOLD';
        return '⚪ NEUTRAL';
    }

    private getBollingerPosition(position: number): string
    {
        if (position > 0.8) return '🔴 UPPER BAND';
        if (position < 0.2) return '🟢 LOWER BAND';
        if (position > 0.6) return '🟡 ABOVE MIDDLE';
        if (position < 0.4) return '🟡 BELOW MIDDLE';
        return '⚪ MIDDLE';
    }

    private getSymbolInfo(symbol: string): string
    {
        const symbolInfo: Record<string, string> = {
            'BOOM1000': '💥 Boom 1000: Upward spikes every ~1000 ticks. Optimized RSI(21), MACD(8,21,9)',
            'BOOM500': '💥 Boom 500: Faster spikes every ~500 ticks. Optimized RSI(14), MACD(8,21,9)',
            'CRASH1000': '📉 Crash 1000: Downward spikes every ~1000 ticks. Optimized RSI(21), MACD(8,21,9)',
            'CRASH500': '📉 Crash 500: Faster crashes every ~500 ticks. Optimized RSI(14), MACD(8,21,9)',
            'R_10': '🟢 Volatility 10: Low volatility. Optimized RSI(9), MACD(12,26,9)',
            'R_25': '🟡 Volatility 25: Medium-low volatility. Standard MACD(12,26,9)',
            'R_50': '🟠 Volatility 50: Medium volatility. Optimized MACD(10,21,7)',
            'R_75': '🔴 Volatility 75: High volatility. Fast MACD(8,17,7)',
            'R_100': '🔴 Volatility 100: Extreme volatility. Fast MACD(8,17,7)',
        };
        return symbolInfo[ symbol ] || '⚪ Unknown symbol - using default parameters';
    }

    /**
     * Convert LLM response to result format
     */
    private convertToResult(
        symbol: string,
        timeframe: string,
        jsonData: any,
        currentPrice: number,
        features: EnhancedMarketFeatures
    ): AutonomousPredictionResult
    {
        return {
            symbol,
            timeframe,
            prediction: jsonData.prediction as 'UP' | 'DOWN',
            confidence: Math.max(0.5, Math.min(0.95, jsonData.confidence || 0.75)),
            trading_levels: {
                entry_price: jsonData.entry_price || currentPrice,
                stop_loss: jsonData.stop_loss || currentPrice * 0.99,
                take_profit: jsonData.take_profit || currentPrice * 1.02,
                risk_reward_ratio: jsonData.risk_reward_ratio || 1.5,
                max_drawdown_pips: this.calculatePips(Math.abs((jsonData.stop_loss || currentPrice * 0.99) - currentPrice), symbol),
                target_pips: this.calculatePips(Math.abs((jsonData.take_profit || currentPrice * 1.02) - currentPrice), symbol),
            },
            price_targets: {
                immediate: jsonData.immediate_target || currentPrice * 1.005,
                short_term: jsonData.short_term_target || currentPrice * 1.015,
                medium_term: jsonData.medium_term_target || currentPrice * 1.025,
            },
            risk_management: {
                position_size_suggestion: jsonData.position_size || 0.02,
                max_risk_per_trade: jsonData.max_risk || 0.015,
                probability_of_success: jsonData.success_probability || features.market_regime.confluence_score,
            },
            // Enhanced fields
            multi_timeframe_analysis: jsonData.technical_confluence || "Enhanced Phase 1 analysis completed",
            higher_timeframe_trend: features.market_regime.trend_state.includes('UP') ? 'BULLISH' :
                features.market_regime.trend_state.includes('DOWN') ? 'BEARISH' : 'SIDEWAYS',
            intermediate_timeframe_momentum: features.market_regime.momentum_state === 'ACCELERATING' ? 'BULLISH' :
                features.market_regime.momentum_state === 'DECELERATING' ? 'BEARISH' : 'NEUTRAL',
            timeframe_confluence: features.market_regime.confluence_score > 0.8 ? 'STRONG' :
                features.market_regime.confluence_score > 0.6 ? 'MODERATE' : 'WEAK',
            market_structure_quality: features.market_regime.confluence_score > 0.8 ? 'HIGH' :
                features.market_regime.confluence_score > 0.5 ? 'MEDIUM' : 'LOW',
            confluence_bonus: features.market_regime.confluence_score,
            analysis: jsonData.technical_confluence || "Enhanced technical analysis with Phase 1 improvements",
            reasoning: jsonData.reasoning || "Symbol-specific indicators and market regime analysis",
            factors: {
                technical: jsonData.technical_score || 0.75,
                sentiment: 0.0, // Not implemented in Phase 1
                pattern: features.market_regime.confluence_score,
                confluence: features.market_regime.confluence_score,
                volatility_rank: features.volatility_rank,
                session_strength: features.session_strength,
                regime_alignment: features.market_regime.overall_regime === 'TRENDING' ? 0.8 : 0.5,
                key_factors: jsonData.key_factors || [ 'Enhanced RSI', 'Optimized MACD', 'ATR volatility' ],
            }
        };
    }

    /**
     * Generate enhanced fallback prediction
     */
    private generateEnhancedFallback(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        features: EnhancedMarketFeatures
    ): AutonomousPredictionResult
    {
        const indicators = features.technical_indicators;
        const regime = features.market_regime;

        // Enhanced fallback logic using Phase 1 indicators
        const rsiSignal = indicators.rsi > 70 ? -1 : indicators.rsi < 30 ? 1 : 0;
        const macdSignal = indicators.macd_histogram > 0 ? 1 : -1;
        const stochSignal = indicators.stochastic > 80 ? -1 : indicators.stochastic < 20 ? 1 : 0;

        const combinedSignal = rsiSignal + macdSignal + stochSignal;
        const prediction = combinedSignal > 0 ? 'UP' : 'DOWN';

        const baseConfidence = regime.confluence_score * 0.8 + 0.2; // Min 0.2, max 1.0
        const volatilityAdjustment = Math.min(indicators.atr_normalized / 100, 0.1);
        const sessionAdjustment = features.session_strength * 0.1;

        const confidence = Math.max(0.5, Math.min(0.85, baseConfidence + sessionAdjustment - volatilityAdjustment));

        return {
            symbol,
            timeframe,
            prediction,
            confidence,
            trading_levels: {
                entry_price: currentPrice,
                stop_loss: currentPrice * (prediction === 'UP' ? 0.985 : 1.015),
                take_profit: currentPrice * (prediction === 'UP' ? 1.025 : 0.975),
                risk_reward_ratio: 1.5,
                max_drawdown_pips: this.calculatePips(currentPrice * 0.015, symbol),
                target_pips: this.calculatePips(currentPrice * 0.025, symbol),
            },
            price_targets: {
                immediate: currentPrice * (prediction === 'UP' ? 1.005 : 0.995),
                short_term: currentPrice * (prediction === 'UP' ? 1.015 : 0.985),
                medium_term: currentPrice * (prediction === 'UP' ? 1.025 : 0.975),
            },
            risk_management: {
                position_size_suggestion: Math.min(0.03, regime.confluence_score * 0.04),
                max_risk_per_trade: 0.015,
                probability_of_success: confidence,
            },
            multi_timeframe_analysis: "Enhanced fallback analysis using Phase 1 technical indicators",
            higher_timeframe_trend: regime.trend_state.includes('UP') ? 'BULLISH' :
                regime.trend_state.includes('DOWN') ? 'BEARISH' : 'SIDEWAYS',
            intermediate_timeframe_momentum: regime.momentum_state === 'ACCELERATING' ? 'BULLISH' : 'NEUTRAL',
            timeframe_confluence: regime.confluence_score > 0.6 ? 'MODERATE' : 'WEAK',
            market_structure_quality: 'MEDIUM',
            confluence_bonus: regime.confluence_score,
            analysis: `Enhanced fallback: RSI(${indicators.rsi.toFixed(1)}), MACD(${indicators.macd_histogram.toFixed(3)}), Regime(${regime.overall_regime})`,
            reasoning: "Enhanced technical indicators suggest " + prediction + " bias with " + (confidence * 100).toFixed(1) + "% confidence",
            factors: {
                technical: confidence,
                sentiment: 0.0,
                pattern: regime.confluence_score,
                volatility_rank: features.volatility_rank,
                session_strength: features.session_strength,
                enhanced_fallback: true,
            }
        };
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
}
