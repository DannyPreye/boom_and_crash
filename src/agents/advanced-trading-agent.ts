import { MLPredictorService } from './../services/ml-predictor.service';
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';
import { EnhancedMarketFeatures } from '../types/enhanced-features.types';
import { AutonomousPredictionResult } from './autonomous-trading-agent';
import { AdvancedTechnicalAnalysis } from '../services/advanced-technical-analysis.service';
import { MultiTimeframeAnalysis } from '../services/multi-timeframe-analysis.service';
import { PatternRecognitionService } from '../services/pattern-recognition.service';
import { VolumeAnalysisService } from '../services/volume-analysis.service';
// import { MLPredictorService } from '../services/ml-predictor.service';

/**
 * Advanced Trading Agent - Phase 2 Implementation
 * Features advanced technical analysis, multi-timeframe analysis, pattern recognition,
 * volume analysis, and machine learning integration for superior prediction accuracy
 */
export class AdvancedTradingAgent
{
    private llm: ChatAnthropic;
    private technicalAnalysis: AdvancedTechnicalAnalysis;
    private multiTimeframe: MultiTimeframeAnalysis;
    private patternRecognition: PatternRecognitionService;
    private volumeAnalysis: VolumeAnalysisService;
    private mlPredictor: MLPredictorService;

    constructor (apiKey: string)
    {
        this.llm = new ChatAnthropic({
            apiKey,
            model: 'claude-sonnet-4-20250514',
            temperature: 0.05, // Lower temperature for more consistent analysis
            maxTokens: 3000,
        });

        this.technicalAnalysis = new AdvancedTechnicalAnalysis();
        this.multiTimeframe = new MultiTimeframeAnalysis();
        this.patternRecognition = new PatternRecognitionService();
        this.volumeAnalysis = new VolumeAnalysisService();
        this.mlPredictor = new MLPredictorService(apiKey);
    }

    /**
     * Generate advanced prediction using comprehensive technical analysis
     */
    async generateAdvancedPrediction(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        enhancedFeatures: EnhancedMarketFeatures,
        historicalData: any
    ): Promise<AutonomousPredictionResult>
    {
        try {
            console.log('🧠 Advanced AI Analysis - Symbol:', symbol, 'Timeframe:', timeframe);

            // Phase 1: Advanced Technical Analysis
            const advancedIndicators = await this.technicalAnalysis.calculateAdvancedIndicators(
                historicalData,
                symbol
            );

            // Phase 2: Multi-timeframe Analysis
            const multiTimeframeAnalysis = await this.multiTimeframe.analyzeMultipleTimeframes(
                historicalData,
                symbol
            );

            // Phase 3: Pattern Recognition
            const patterns = await this.patternRecognition.identifyPatterns(
                historicalData,
                symbol
            );

            // Phase 4: Volume Analysis
            const volumeAnalysis = await this.volumeAnalysis.analyzeVolume(
                historicalData,
                symbol
            );

            // Phase 5: Machine Learning Prediction
            // Convert enhanced features technical indicators to the format expected by ML predictor
            const technicalIndicatorsForML = {
                rsi: enhancedFeatures.technical_indicators.rsi,
                macd_signal: enhancedFeatures.technical_indicators.macd_signal,
                bollinger_position: enhancedFeatures.technical_indicators.bollinger_position,
                ema_short: enhancedFeatures.technical_indicators.rsi, // Use RSI as proxy for EMA short
                ema_long: enhancedFeatures.technical_indicators.stoch_rsi, // Use Stochastic RSI as proxy for EMA long
                adx: enhancedFeatures.technical_indicators.atr_normalized * 100, // Convert ATR normalized to ADX-like scale
                stochastic: enhancedFeatures.technical_indicators.stochastic,
                williams_r: enhancedFeatures.technical_indicators.williams_r
            };

            const mlPrediction = await this.mlPredictor.predictNextTick(
                {
                    currentPrice,
                    priceHistory: historicalData.map((d: any) => d.close)
                },
                technicalIndicatorsForML,
                patterns,
                volumeAnalysis
            );

            // Phase 6: Generate comprehensive prompt
            const prompt = this.buildAdvancedPrompt(
                symbol,
                timeframe,
                currentPrice,
                enhancedFeatures,
                advancedIndicators,
                multiTimeframeAnalysis,
                patterns,
                volumeAnalysis,
                mlPrediction
            );

            // Phase 7: Get AI analysis
            const timeoutPromise = new Promise((_, reject) =>
            {
                setTimeout(() => reject(new Error('Advanced LLM call timeout after 45 seconds')), 45000);
            });

            const llmPromise = this.llm.invoke([ new HumanMessage(prompt) ]);
            const response = await Promise.race([ llmPromise, timeoutPromise ]) as any;

            if (!response || !response.content) {
                throw new Error('Empty response from advanced LLM');
            }

            console.log('🔍 Raw LLM Response:', response);

            const content = response.content as string;
            console.log('📊 Advanced analysis completed, parsing response...');
            console.log('📝 Response content length:', content.length);


            // Extract JSON from response with multiple fallback methods
            let jsonData: any = null;
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

            if (jsonMatch) {
                console.log('✅ Found JSON in code blocks');
                try {
                    jsonData = JSON.parse(jsonMatch[ 1 ]!);
                } catch (parseError) {
                    console.error('❌ JSON parse error from code blocks:', parseError);
                    console.log('🔍 Attempted to parse:', jsonMatch[ 1 ]);
                }
            }

            // Fallback 1: Try to find JSON without code blocks
            if (!jsonData) {
                console.log('🔄 Trying fallback JSON extraction...');
                const jsonStart = content.indexOf('{');
                const jsonEnd = content.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    const jsonString = content.substring(jsonStart, jsonEnd + 1);
                    try {
                        jsonData = JSON.parse(jsonString);
                        console.log('✅ Found JSON without code blocks');
                    } catch (parseError) {
                        console.error('❌ JSON parse error from fallback extraction:', parseError);
                        console.log('🔍 Attempted to parse:', jsonString);
                    }
                }
            }

            // Fallback 2: Try to extract JSON from any text
            if (!jsonData) {
                console.log('🔄 Trying regex JSON extraction...');
                const jsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
                const matches = content.match(jsonRegex);

                if (matches) {
                    for (const match of matches) {
                        try {
                            jsonData = JSON.parse(match);
                            console.log('✅ Found JSON with regex extraction');
                            break;
                        } catch (parseError) {
                            console.log('⚠️ Failed to parse potential JSON:', match.substring(0, 100));
                        }
                    }
                }
            }

            // If all parsing attempts failed, create a default response
            if (!jsonData) {
                console.error('❌ All JSON parsing attempts failed. Creating fallback response.');
                console.log('🔍 Full response content:', content);

                // Create a minimal valid JSON structure
                jsonData = {
                    prediction: 'UP',
                    confidence: 0.5,
                    reasoning: 'Fallback response due to JSON parsing failure',
                    technical_confluence: 'Unable to parse technical analysis',
                    multi_timeframe_alignment: 'Unable to parse multi-timeframe analysis',
                    pattern_analysis: 'Unable to parse pattern analysis',
                    volume_analysis: 'Unable to parse volume analysis',
                    ml_integration: 'Unable to parse ML integration',
                    entry_price: currentPrice,
                    stop_loss: currentPrice * 0.99,
                    take_profit: currentPrice * 1.01,
                    risk_reward_ratio: 1.0,
                    immediate_target: currentPrice * 1.005,
                    short_term_target: currentPrice * 1.015,
                    medium_term_target: currentPrice * 1.025,
                    position_size: 0.01,
                    technical_score: 0.5,
                    advanced_score: 0.5
                };
            }



            // Validate and sanitize the JSON data
            jsonData = this.validateAndSanitizeJsonData(jsonData, currentPrice);

            return this.convertToAdvancedResult(
                symbol,
                timeframe,
                jsonData,
                currentPrice,
                enhancedFeatures,
                advancedIndicators,
                multiTimeframeAnalysis,
                patterns,
                volumeAnalysis,
                mlPrediction
            );

        } catch (error) {
            console.error('Advanced autonomous prediction failed:', error);
            return this.generateAdvancedFallback(
                symbol,
                timeframe,
                currentPrice,
                enhancedFeatures
            );
        }
    }

    /**
     * Build advanced prompt with proper prompt engineering standards
     */
    private buildAdvancedPrompt(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        features: EnhancedMarketFeatures,
        advancedIndicators: any,
        multiTimeframeAnalysis: any,
        patterns: any,
        volumeAnalysis: any,
        mlPrediction: any
    ): string
    {
        const indicators = features.technical_indicators;
        const regime = features.market_regime;

        // Handle mlPrediction structure - it's an AutonomousPredictionResult from MLPredictorService
        const mlDirection = mlPrediction?.prediction || 'NEUTRAL';
        const mlConfidence = mlPrediction?.confidence || 0.5;
        const mlReasoning = mlPrediction?.reasoning || 'No ML reasoning available';

        // Safe property access with fallbacks
        const ichimoku = advancedIndicators?.ichimoku || {};
        const fibonacci = advancedIndicators?.fibonacci || {};
        const elliottWave = advancedIndicators?.elliottWave || {};
        const momentum = advancedIndicators?.momentum || {};
        const timeframes = multiTimeframeAnalysis?.timeframes || {};
        const candlestick = patterns?.candlestick || {};
        const chart = patterns?.chart || {};

        return `You are an expert quantitative trading analyst with 20+ years of experience in technical analysis, algorithmic trading, and risk management. Your task is to analyze the provided market data and generate a comprehensive trading recommendation.

## CONTEXT
- Symbol: ${symbol}
- Timeframe: ${timeframe}
- Current Price: ${currentPrice.toFixed(4)}
- Market Regime: ${regime?.overall_regime || 'UNKNOWN'} (${regime?.volatility_state || 'UNKNOWN'} volatility, ${regime?.trend_state || 'UNKNOWN'} trend, ${regime?.momentum_state || 'UNKNOWN'} momentum)

## TECHNICAL ANALYSIS DATA

### Advanced Indicators
**Ichimoku Cloud:**
- Tenkan-sen: ${ichimoku.tenkan?.toFixed(4) || 'N/A'}
- Kijun-sen: ${ichimoku.kijun?.toFixed(4) || 'N/A'}
- Cloud Position: ${ichimoku.cloudPosition || 'UNKNOWN'}
- Cloud Strength: ${ichimoku.cloudStrength ? (ichimoku.cloudStrength * 100).toFixed(1) : 'N/A'}%

**Fibonacci Retracements:**
- Current Position: ${fibonacci.currentPosition || 'UNKNOWN'}
- Next Support: ${fibonacci.nextSupport?.toFixed(4) || 'N/A'}
- Next Resistance: ${fibonacci.nextResistance?.toFixed(4) || 'N/A'}

**Elliott Wave:**
- Wave Count: ${elliottWave.waveCount || 'UNKNOWN'}
- Current Wave: ${elliottWave.currentWave || 'UNKNOWN'}
- Trend Direction: ${elliottWave.trendDirection || 'UNKNOWN'}
- Wave Strength: ${elliottWave.waveStrength ? (elliottWave.waveStrength * 100).toFixed(1) : 'N/A'}%

**Momentum Indicators:**
- CCI: ${momentum.cci?.toFixed(2) || 'N/A'}
- ROC: ${momentum.roc?.toFixed(2) || 'N/A'}%
- MFI: ${momentum.mfi?.toFixed(2) || 'N/A'}
- ADX: ${momentum.adx?.toFixed(2) || 'N/A'}

### Multi-Timeframe Analysis
- 1m: ${timeframes.m1?.trend || 'UNKNOWN'} (${timeframes.m1?.strength ? (timeframes.m1.strength * 100).toFixed(1) : 'N/A'}%)
- 5m: ${timeframes.m5?.trend || 'UNKNOWN'} (${timeframes.m5?.strength ? (timeframes.m5.strength * 100).toFixed(1) : 'N/A'}%)
- 15m: ${timeframes.m15?.trend || 'UNKNOWN'} (${timeframes.m15?.strength ? (timeframes.m15.strength * 100).toFixed(1) : 'N/A'}%)
- 1h: ${timeframes.h1?.trend || 'UNKNOWN'} (${timeframes.h1?.strength ? (timeframes.h1.strength * 100).toFixed(1) : 'N/A'}%)
- Overall Confluence: ${multiTimeframeAnalysis?.overallConfluence ? (multiTimeframeAnalysis.overallConfluence * 100).toFixed(1) : 'N/A'}%

### Pattern Recognition
**Candlestick Pattern:** ${candlestick.primaryPattern?.name || 'None detected'} (${candlestick.reliability ? (candlestick.reliability * 100).toFixed(1) : 'N/A'}% reliability)
**Chart Pattern:** ${chart.primaryPattern?.name || 'None detected'} (${chart.completion ? (chart.completion * 100).toFixed(1) : 'N/A'}% completion)

### Volume Analysis
- Volume Ratio: ${volumeAnalysis?.volumeRatio?.toFixed(2) || 'N/A'}x average
- VWAP: ${volumeAnalysis?.vwap?.toFixed(4) || 'N/A'}
- Price vs VWAP: ${volumeAnalysis?.priceVsVwap ? (volumeAnalysis.priceVsVwap > 0 ? '+' : '') + (volumeAnalysis.priceVsVwap * 100).toFixed(2) : 'N/A'}%
- Volume Signal: ${volumeAnalysis?.volumeSignal || 'UNKNOWN'}

### Machine Learning Consensus
- ML Prediction: ${mlDirection}
- ML Confidence: ${(mlConfidence * 100).toFixed(1)}%
- ML Reasoning: ${mlReasoning}

### Core Indicators
- RSI: ${indicators.rsi?.toFixed(2) || 'N/A'} ${this.getRSISignal(indicators.rsi || 50)}
- MACD Histogram: ${indicators.macd_histogram?.toFixed(4) || 'N/A'} ${this.getMACDMomentum(indicators.macd_histogram || 0)}
- Stochastic: ${indicators.stochastic?.toFixed(2) || 'N/A'}
- ATR: ${indicators.atr?.toFixed(4) || 'N/A'} (${indicators.atr_normalized ? (indicators.atr_normalized * 100).toFixed(1) : 'N/A'}% normalized)

## ANALYSIS REQUIREMENTS

1. **Synthesize all technical indicators** to determine overall market bias
2. **Evaluate multi-timeframe confluence** for trend confirmation
3. **Assess pattern reliability** and completion status
4. **Validate price action** with volume analysis
5. **Integrate machine learning predictions** into final decision
6. **Calculate appropriate risk levels** based on volatility and confluence
7. **Determine optimal position sizing** considering all risk factors

## CONFIDENCE CALIBRATION
- High confluence (>80%): 0.85-0.95 confidence
- Medium confluence (60-80%): 0.70-0.85 confidence
- Low confluence (<60%): 0.55-0.70 confidence
- Pattern confirmation: +10-15% confidence boost
- Volume support: +5-10% confidence boost
- ML agreement: +10-20% confidence boost

## OUTPUT FORMAT
Provide your analysis in the following JSON format. IMPORTANT: Ensure the JSON is valid and properly formatted with no trailing commas or syntax errors.

\`\`\`json
{
  "technical_confluence": "Brief summary of technical indicator agreement/disagreement",
  "multi_timeframe_alignment": "Assessment of timeframe confluence and trend alignment",
  "pattern_analysis": "Evaluation of pattern reliability and implications",
  "volume_analysis": "Volume confirmation or divergence analysis",
  "ml_integration": "How ML predictions align with technical analysis",
  "prediction": "UP",
  "confidence": 0.85,
  "reasoning": "Clear explanation of why you chose UP/DOWN, highlighting the strongest supporting factors and addressing any conflicting signals",
  "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
  "entry_price": ${currentPrice},
  "stop_loss": ${this.calculateAdvancedStopLoss(currentPrice, advancedIndicators, patterns)},
  "take_profit": ${this.calculateAdvancedTakeProfit(currentPrice, advancedIndicators, patterns)},
  "risk_reward_ratio": ${this.calculateAdvancedRiskReward(currentPrice, advancedIndicators)},
  "immediate_target": ${(currentPrice * 1.008).toFixed(4)},
  "short_term_target": ${(currentPrice * 1.015).toFixed(4)},
  "medium_term_target": ${(currentPrice * 1.025).toFixed(4)},
  "position_size": ${this.calculateAdvancedPositionSize(regime?.confluence_score || 0.5, multiTimeframeAnalysis?.overallConfluence || 0.5, mlConfidence)},
  "technical_score": ${Math.min(0.98, (regime?.confluence_score || 0.5) + (multiTimeframeAnalysis?.overallConfluence || 0.5) * 0.3)},
  "advanced_score": ${this.calculateAdvancedScore(advancedIndicators, multiTimeframeAnalysis, patterns, volumeAnalysis, mlPrediction)},
  "risk_assessment": {
    "volatility_risk": "${ichimoku.cloudStrength > 0.7 ? 'LOW' : 'HIGH'}",
    "pattern_reliability": "${candlestick.reliability > 0.8 ? 'HIGH' : 'MEDIUM'}",
    "volume_support": "${volumeAnalysis?.volumeRatio > 1.5 ? 'STRONG' : 'WEAK'}",
    "ml_confidence": "${mlConfidence > 0.8 ? 'HIGH' : 'MEDIUM'}"
  }
}
\`\`\`

## CRITICAL REQUIREMENTS
1. **JSON VALIDITY**: Ensure the JSON is syntactically correct with no trailing commas
2. **REQUIRED FIELDS**: Include all fields shown in the template above
3. **DATA TYPES**: Use numbers for numeric values, strings for text, arrays for lists
4. **NO EXTRA TEXT**: Do not include any text before or after the JSON block
5. **EXACT FORMAT**: Follow the exact structure and field names provided

## REASONING REQUIREMENTS
- Your reasoning MUST clearly explain why you chose UP or DOWN
- If predicting UP: Explain bullish factors and why they outweigh bearish signals
- If predicting DOWN: Explain bearish factors and why they outweigh bullish signals
- Acknowledge conflicting signals but explain why your chosen direction is stronger
- Be specific about which indicators, patterns, or timeframes support your decision
- Avoid contradictions between your reasoning and prediction direction

## IMPORTANT NOTES
- Base your decision on the strongest confluence of indicators
- Consider market regime context in your analysis
- Provide specific reasoning for your confidence level
- Ensure risk-reward ratios are appropriate for the market conditions
- Be conservative when indicators show mixed signals
- ALWAYS ensure your reasoning directly supports your prediction direction`;
    }

    /**
     * Calculate advanced stop loss based on multiple factors
     */
    private calculateAdvancedStopLoss(currentPrice: number, advancedIndicators: any, patterns: any): number
    {
        const ichimokuStop = currentPrice * (advancedIndicators?.ichimoku?.cloudPosition === 'ABOVE' ? 0.985 : 0.990);
        const fibonacciStop = advancedIndicators?.fibonacci?.nextSupport || (currentPrice * 0.99);
        const patternStop = patterns?.chart?.stopLoss || (currentPrice * 0.99);

        // Use the most conservative stop loss
        return Math.min(ichimokuStop, fibonacciStop, patternStop);
    }

    /**
     * Calculate advanced take profit based on multiple factors
     */
    private calculateAdvancedTakeProfit(currentPrice: number, advancedIndicators: any, patterns: any): number
    {
        const ichimokuTarget = currentPrice * (advancedIndicators?.ichimoku?.cloudPosition === 'BELOW' ? 1.025 : 1.020);
        const fibonacciTarget = advancedIndicators?.fibonacci?.nextResistance || (currentPrice * 1.01);
        const patternTarget = patterns?.chart?.targetPrice || (currentPrice * 1.01);

        // Use the most realistic take profit
        return Math.max(ichimokuTarget, fibonacciTarget, patternTarget);
    }

    /**
     * Calculate advanced risk-reward ratio
     */
    private calculateAdvancedRiskReward(currentPrice: number, advancedIndicators: any): number
    {
        const stopLoss = this.calculateAdvancedStopLoss(currentPrice, advancedIndicators, {});
        const takeProfit = this.calculateAdvancedTakeProfit(currentPrice, advancedIndicators, {});

        const risk = currentPrice - stopLoss;
        const reward = takeProfit - currentPrice;

        return reward / risk;
    }

    /**
     * Calculate advanced position size
     */
    private calculateAdvancedPositionSize(confluenceScore: number, timeframeConfluence: number, mlConfidence: number): number
    {
        const baseSize = 0.02; // 2% base position
        const confluenceBonus = confluenceScore * 0.01;
        const timeframeBonus = timeframeConfluence * 0.01;
        const mlBonus = mlConfidence * 0.01;

        return Math.min(0.05, baseSize + confluenceBonus + timeframeBonus + mlBonus);
    }

    /**
     * Calculate comprehensive advanced score
     */
    private calculateAdvancedScore(
        advancedIndicators: any,
        multiTimeframeAnalysis: any,
        patterns: any,
        volumeAnalysis: any,
        mlPrediction: any
    ): number
    {
        const ichimokuScore = advancedIndicators?.ichimoku?.cloudStrength || 0.5;
        const fibonacciScore = 0.8; // Base score for Fibonacci analysis
        const elliottScore = advancedIndicators?.elliottWave?.waveStrength || 0.5;
        const timeframeScore = multiTimeframeAnalysis?.overallConfluence || 0.5;
        const patternScore = patterns?.candlestick?.reliability || 0.5;
        const volumeScore = Math.min(1, (volumeAnalysis?.volumeRatio || 1) / 2);
        const mlScore = mlPrediction?.confidence || 0.5; // Use confidence from AutonomousPredictionResult

        return (ichimokuScore + fibonacciScore + elliottScore + timeframeScore + patternScore + volumeScore + mlScore) / 7;
    }

    /**
     * Helper methods for signal interpretation (enhanced)
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

    /**
     * Convert AI response to advanced result
     */
    private convertToAdvancedResult(
        symbol: string,
        timeframe: string,
        jsonData: any,
        currentPrice: number,
        features: EnhancedMarketFeatures,
        advancedIndicators: any,
        multiTimeframeAnalysis: any,
        patterns: any,
        volumeAnalysis: any,
        mlPrediction: any
    ): AutonomousPredictionResult
    {
        const entryPrice = jsonData.entry_price || currentPrice;
        const stopLoss = jsonData.stop_loss || (currentPrice * 0.99);
        const takeProfit = jsonData.take_profit || (currentPrice * 1.01);

        return {
            symbol,
            timeframe,
            prediction: (jsonData.prediction === 'UP' || jsonData.prediction === 'DOWN') ? jsonData.prediction : 'UP',
            confidence: jsonData.confidence || 0.75,
            trading_levels: {
                entry_price: entryPrice,
                stop_loss: stopLoss,
                take_profit: takeProfit,
                risk_reward_ratio: jsonData.risk_reward_ratio || 1.5,
                max_drawdown_pips: Math.round(Math.abs(stopLoss - currentPrice) * 10000),
                target_pips: Math.round(Math.abs(takeProfit - currentPrice) * 10000),
            },
            price_targets: {
                immediate: jsonData.immediate_target || (currentPrice * 1.005),
                short_term: jsonData.short_term_target || (currentPrice * 1.015),
                medium_term: jsonData.medium_term_target || (currentPrice * 1.025),
            },
            risk_management: {
                position_size_suggestion: jsonData.position_size || 0.02,
                max_risk_per_trade: 0.02,
                probability_of_success: jsonData.confidence || 0.75,
            },
            multi_timeframe_analysis: jsonData.multi_timeframe_alignment || 'Advanced multi-timeframe analysis completed',
            higher_timeframe_trend: jsonData.higher_timeframe_trend || 'BULLISH',
            intermediate_timeframe_momentum: jsonData.intermediate_timeframe_momentum || 'BULLISH',
            timeframe_confluence: jsonData.timeframe_confluence || 'STRONG',
            market_structure_quality: jsonData.market_structure_quality || 'HIGH',
            confluence_bonus: jsonData.confluence_bonus || 0.1,
            analysis: `Advanced Phase 2 Analysis: ${jsonData.technical_confluence || 'Technical confluence analysis'}. ${jsonData.pattern_analysis || 'Pattern analysis completed'}. ${jsonData.volume_analysis || 'Volume analysis completed'}. ${jsonData.ml_integration || 'ML integration completed'}.`,
            reasoning: jsonData.reasoning || 'Advanced technical analysis with multi-timeframe, pattern, volume, and ML integration',
            factors: {
                technical: jsonData.technical_score || 0.7,
                advanced: jsonData.advanced_score || 0.8,
                ichimoku: advancedIndicators?.ichimoku?.cloudStrength || 0.5,
                fibonacci: 0.8,
                elliott_wave: advancedIndicators?.elliottWave?.waveStrength || 0.5,
                pattern_reliability: patterns?.candlestick?.reliability || 0.5,
                volume_support: Math.min(1, (volumeAnalysis?.volumeRatio || 1) / 2),
                ml_confidence: mlPrediction?.confidence || 0.5,
            },
        };
    }

    /**
     * Generate advanced fallback prediction
     */
    private generateAdvancedFallback(
        symbol: string,
        timeframe: string,
        currentPrice: number,
        features: EnhancedMarketFeatures
    ): AutonomousPredictionResult
    {
        console.log('⚠️ Using advanced fallback prediction');

        const regime = features.market_regime;
        const indicators = features.technical_indicators;

        // Simple fallback based on RSI and MACD
        let prediction = 'NEUTRAL';
        let confidence = 0.5;

        if (indicators.rsi < 30 && indicators.macd_histogram > 0) {
            prediction = 'UP';
            confidence = 0.6;
        } else if (indicators.rsi > 70 && indicators.macd_histogram < 0) {
            prediction = 'DOWN';
            confidence = 0.6;
        }

        return {
            symbol,
            timeframe,
            prediction: prediction as 'UP' | 'DOWN',
            confidence,
            trading_levels: {
                entry_price: currentPrice,
                stop_loss: currentPrice * 0.99,
                take_profit: currentPrice * 1.01,
                risk_reward_ratio: 1.0,
                max_drawdown_pips: Math.round(Math.abs(currentPrice * 0.99 - currentPrice) * 10000),
                target_pips: Math.round(Math.abs(currentPrice * 1.01 - currentPrice) * 10000),
            },
            price_targets: {
                immediate: currentPrice * 1.005,
                short_term: currentPrice * 1.015,
                medium_term: currentPrice * 1.025,
            },
            risk_management: {
                position_size_suggestion: 0.01,
                max_risk_per_trade: 0.01,
                probability_of_success: confidence,
            },
            multi_timeframe_analysis: 'Fallback analysis - multi-timeframe not available',
            higher_timeframe_trend: 'SIDEWAYS',
            intermediate_timeframe_momentum: 'NEUTRAL',
            timeframe_confluence: 'WEAK',
            market_structure_quality: 'LOW',
            confluence_bonus: 0.0,
            analysis: 'Advanced fallback analysis based on basic indicators (RSI, MACD, Market regime)',
            reasoning: 'Advanced fallback analysis based on basic indicators',
            factors: {
                technical: 0.5,
                advanced: 0.5,
                rsi: indicators.rsi / 100,
                macd: Math.abs(indicators.macd_histogram),
                regime: regime.confluence_score,
            },
        };
    }

    /**
     * Validates and sanitizes the parsed JSON data to ensure all required fields are present
     * and provides fallback values for missing fields.
     */
    private validateAndSanitizeJsonData(jsonData: any, currentPrice: number): any
    {
        const requiredFields = [
            'prediction',
            'confidence',
            'reasoning',
            'entry_price',
            'stop_loss',
            'take_profit',
            'risk_reward_ratio',
            'immediate_target',
            'short_term_target',
            'medium_term_target',
            'position_size',
            'technical_score',
            'advanced_score',
            'risk_assessment',
            'technical_confluence',
            'multi_timeframe_alignment',
            'pattern_analysis',
            'volume_analysis',
            'ml_integration',
        ];

        for (const field of requiredFields) {
            if (jsonData[ field ] === undefined || jsonData[ field ] === null) {
                console.warn(`Warning: Required field "${field}" is missing or null in JSON. Using fallback value.`);
                // Provide a default or fallback value based on the field's purpose
                switch (field) {
                    case 'prediction':
                        jsonData[ field ] = 'UP'; // Default to UP
                        break;
                    case 'confidence':
                        jsonData[ field ] = 0.75; // Default to 75%
                        break;
                    case 'reasoning':
                        jsonData[ field ] = `Fallback reasoning: Prediction is ${jsonData.prediction || 'UP'} based on basic technical analysis.`;
                        break;
                    case 'entry_price':
                        jsonData[ field ] = currentPrice;
                        break;
                    case 'stop_loss':
                        jsonData[ field ] = currentPrice * 0.99;
                        break;
                    case 'take_profit':
                        jsonData[ field ] = currentPrice * 1.01;
                        break;
                    case 'risk_reward_ratio':
                        jsonData[ field ] = 1.5; // Default to 1.5
                        break;
                    case 'immediate_target':
                        jsonData[ field ] = currentPrice * 1.005;
                        break;
                    case 'short_term_target':
                        jsonData[ field ] = currentPrice * 1.015;
                        break;
                    case 'medium_term_target':
                        jsonData[ field ] = currentPrice * 1.025;
                        break;
                    case 'position_size':
                        jsonData[ field ] = 0.02; // Default to 2%
                        break;
                    case 'technical_score':
                        jsonData[ field ] = 0.7; // Default to 70%
                        break;
                    case 'advanced_score':
                        jsonData[ field ] = 0.8; // Default to 80%
                        break;
                    case 'risk_assessment':
                        jsonData[ field ] = {
                            volatility_risk: 'HIGH', // Default to HIGH
                            pattern_reliability: 'MEDIUM', // Default to MEDIUM
                            volume_support: 'WEAK', // Default to WEAK
                            ml_confidence: 'MEDIUM' // Default to MEDIUM
                        };
                        break;
                    case 'technical_confluence':
                        jsonData[ field ] = 'Fallback technical confluence due to missing field.';
                        break;
                    case 'multi_timeframe_alignment':
                        jsonData[ field ] = 'Fallback multi-timeframe alignment due to missing field.';
                        break;
                    case 'pattern_analysis':
                        jsonData[ field ] = 'Fallback pattern analysis due to missing field.';
                        break;
                    case 'volume_analysis':
                        jsonData[ field ] = 'Fallback volume analysis due to missing field.';
                        break;
                    case 'ml_integration':
                        jsonData[ field ] = 'Fallback ML integration due to missing field.';
                        break;
                }
            }
        }

        // Ensure risk_assessment is an object
        if (typeof jsonData.risk_assessment !== 'object' || jsonData.risk_assessment === null) {
            console.warn('Warning: risk_assessment is not an object. Creating a default one.');
            jsonData.risk_assessment = {
                volatility_risk: 'HIGH',
                pattern_reliability: 'MEDIUM',
                volume_support: 'WEAK',
                ml_confidence: 'MEDIUM'
            };
        }

        // Ensure technical_confluence is a string
        if (typeof jsonData.technical_confluence !== 'string') {
            console.warn('Warning: technical_confluence is not a string. Creating a default one.');
            jsonData.technical_confluence = 'Fallback technical confluence due to missing field.';
        }

        // Ensure multi_timeframe_alignment is a string
        if (typeof jsonData.multi_timeframe_alignment !== 'string') {
            console.warn('Warning: multi_timeframe_alignment is not a string. Creating a default one.');
            jsonData.multi_timeframe_alignment = 'Fallback multi-timeframe alignment due to missing field.';
        }

        // Ensure pattern_analysis is a string
        if (typeof jsonData.pattern_analysis !== 'string') {
            console.warn('Warning: pattern_analysis is not a string. Creating a default one.');
            jsonData.pattern_analysis = 'Fallback pattern analysis due to missing field.';
        }

        // Ensure volume_analysis is a string
        if (typeof jsonData.volume_analysis !== 'string') {
            console.warn('Warning: volume_analysis is not a string. Creating a default one.');
            jsonData.volume_analysis = 'Fallback volume analysis due to missing field.';
        }

        // Ensure ml_integration is a string
        if (typeof jsonData.ml_integration !== 'string') {
            console.warn('Warning: ml_integration is not a string. Creating a default one.');
            jsonData.ml_integration = 'Fallback ML integration due to missing field.';
        }

        // Validate reasoning alignment with prediction
        this.validateReasoningAlignment(jsonData);

        return jsonData;
    }

    /**
     * Validates that the reasoning aligns with the prediction direction
     */
    private validateReasoningAlignment(jsonData: any): void
    {
        if (!jsonData.reasoning || !jsonData.prediction) {
            return;
        }

        const reasoning = jsonData.reasoning.toLowerCase();
        const prediction = jsonData.prediction.toUpperCase();

        // Check for contradictions
        const hasBullishTerms = reasoning.includes('bull') || reasoning.includes('up') || reasoning.includes('long') || reasoning.includes('buy');
        const hasBearishTerms = reasoning.includes('bear') || reasoning.includes('down') || reasoning.includes('short') || reasoning.includes('sell');

        if (prediction === 'UP' && hasBearishTerms && !hasBullishTerms) {
            console.warn('⚠️ Warning: UP prediction but reasoning contains bearish terms without bullish justification');
        } else if (prediction === 'DOWN' && hasBullishTerms && !hasBearishTerms) {
            console.warn('⚠️ Warning: DOWN prediction but reasoning contains bullish terms without bearish justification');
        }

        // Ensure reasoning mentions the prediction direction
        if (!reasoning.includes(prediction.toLowerCase())) {
            console.warn(`⚠️ Warning: Reasoning does not clearly mention the prediction direction (${prediction})`);
        }
    }
}
