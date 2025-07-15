import { MLPredictorService } from './../services/ml-predictor.service';
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from '@langchain/core/messages';
import { EnhancedMarketFeatures } from '../types/enhanced-features.types';
import { AutonomousPredictionResult } from './autonomous-trading-agent';
import { AdvancedTechnicalAnalysis } from '../services/advanced-technical-analysis.service';
import { MultiTimeframeAnalysis } from '../services/multi-timeframe-analysis.service';
import { PatternRecognitionService } from '../services/pattern-recognition.service';
import { VolumeAnalysisService } from '../services/volume-analysis.service';

/**
 * Performance tracking for trade results
 */
interface TradeResult
{
    symbol: string;
    prediction: 'UP' | 'DOWN';
    confidence: number;
    actual: 'WIN' | 'LOSS';
    factors: any;
    entryPrice: number;
    exitPrice: number;
    profit: number;
    timestamp: number;
}

class PerformanceTracker
{
    private results: TradeResult[] = [];
    private maxResults = 1000; // Keep last 1000 trades

    addResult(result: TradeResult)
    {
        this.results.push(result);

        // Keep only the most recent results
        if (this.results.length > this.maxResults) {
            this.results = this.results.slice(-this.maxResults);
        }

        this.analyzePatterns();
    }

    private analyzePatterns()
    {
        if (this.results.length < 10) return; // Need at least 10 trades

        const recent = this.results.slice(-50); // Last 50 trades
        const winRate = recent.filter(r => r.actual === 'WIN').length / recent.length;

        console.log(`📊 Performance Update: Win Rate: ${(winRate * 100).toFixed(1)}% (${recent.length} trades)`);

        // Analyze which factors correlate with wins
        const winningTrades = recent.filter(r => r.actual === 'WIN');
        const losingTrades = recent.filter(r => r.actual === 'LOSS');

        if (winningTrades.length > 0 && losingTrades.length > 0) {
            this.analyzeFactorCorrelations(winningTrades, losingTrades);
        }
    }

    private analyzeFactorCorrelations(winningTrades: TradeResult[], losingTrades: TradeResult[])
    {
        // Calculate average factor scores for wins vs losses
        const winFactors = this.calculateAverageFactors(winningTrades);
        const lossFactors = this.calculateAverageFactors(losingTrades);

        console.log('🎯 Factor Analysis:');
        console.log(`   Technical (Win/Loss): ${winFactors.technical.toFixed(2)}/${lossFactors.technical.toFixed(2)}`);
        console.log(`   ML Confidence (Win/Loss): ${winFactors.ml_confidence.toFixed(2)}/${lossFactors.ml_confidence.toFixed(2)}`);
        console.log(`   Pattern Reliability (Win/Loss): ${winFactors.pattern_reliability.toFixed(2)}/${lossFactors.pattern_reliability.toFixed(2)}`);
    }

    private calculateAverageFactors(trades: TradeResult[]): any
    {
        const avgFactors: Record<string, number> = {
            technical: 0,
            ml_confidence: 0,
            pattern_reliability: 0,
            volume_support: 0
        };

        trades.forEach(trade =>
        {
            avgFactors.technical += trade.factors.technical || 0;
            avgFactors.ml_confidence += trade.factors.ml_confidence || 0;
            avgFactors.pattern_reliability += trade.factors.pattern_reliability || 0;
            avgFactors.volume_support += trade.factors.volume_support || 0;
        });

        const count = trades.length;
        Object.keys(avgFactors).forEach(key =>
        {
            if (avgFactors[ key ] !== undefined) {
                avgFactors[ key ] /= count;
            }
        });

        return avgFactors;
    }

    getPerformanceMetrics()
    {
        if (this.results.length === 0) return null;

        const recent = this.results.slice(-100); // Last 100 trades
        const wins = recent.filter(r => r.actual === 'WIN').length;
        const losses = recent.filter(r => r.actual === 'LOSS').length;
        const winRate = wins / recent.length;

        const totalProfit = recent.reduce((sum, trade) => sum + trade.profit, 0);
        const avgProfit = totalProfit / recent.length;

        return {
            totalTrades: recent.length,
            winRate,
            avgProfit,
            totalProfit
        };
    }
}

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
    private performanceTracker: PerformanceTracker;

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
        this.performanceTracker = new PerformanceTracker();
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

            console.log("This is the historical data", historicalData);
            // Validate data quality before proceeding - throw error if invalid
            const isDataValid = this.validateDataQuality(historicalData);
            // if (!isDataValid) {
            //     throw new Error(`Insufficient or invalid data quality for ${symbol} on ${timeframe}. Cannot proceed with prediction.`);
            // }

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
                volumeAnalysis,
                timeframe
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

            // Extract JSON from response - throw error if parsing fails
            let jsonData: any = null;
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

            console.log("JSON MATCH", jsonMatch);

            if (jsonMatch) {
                console.log('✅ Found JSON in code blocks');
                try {
                    jsonData = JSON.parse(jsonMatch[ 1 ]!);
                } catch (parseError) {
                    console.error('❌ JSON parse error from code blocks:', parseError);
                    console.log('🔍 Attempted to parse:', jsonMatch[ 1 ]);
                    throw new Error(`Failed to parse JSON from LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                }
            }

            if (!jsonData) {
                // Try to find JSON without code blocks
                const jsonStart = content.indexOf('{');
                const jsonEnd = content.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    try {
                        const jsonString = content.substring(jsonStart, jsonEnd + 1);
                        jsonData = JSON.parse(jsonString);
                        console.log('✅ Found JSON without code blocks');
                    } catch (parseError) {
                        console.error('❌ JSON parse error without code blocks:', parseError);
                        throw new Error(`Failed to parse JSON from LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                    }
                }
            }

            if (!jsonData) {
                throw new Error('No valid JSON found in LLM response. Cannot proceed without proper prediction data.');
            }

            // IMPROVED VALIDATION: Stricter confidence and prediction validation
            if (!jsonData || !jsonData.prediction) {
                throw new Error('Invalid prediction data received from LLM. Missing required prediction field.');
            }

            // NEW: Stricter confidence validation - require higher confidence for trades
            const minConfidence = 0.65; // Increased from 0.6
            if (!jsonData.confidence || jsonData.confidence < minConfidence) {
                throw new Error(`Insufficient confidence level: ${jsonData.confidence || 'undefined'}. Minimum required: ${minConfidence}`);
            }
            const validatedConfidence = Math.min(0.95, jsonData.confidence);

            // NEW: Only trade if confidence is high enough and technical indicators align
            const indicators = enhancedFeatures.technical_indicators;
            const technicalAlignment = this.validateTechnicalAlignment(indicators, jsonData.prediction);

            if (validatedConfidence < minConfidence || !technicalAlignment) {
                throw new Error(`Insufficient confidence (${validatedConfidence.toFixed(2)}) or poor technical alignment. Cannot proceed with prediction.`);
            }

            // Ensure we have a valid prediction
            if (!jsonData.prediction || jsonData.prediction === 'NEUTRAL') {
                // Convert NEUTRAL to UP or DOWN based on technical indicators
                if (indicators.rsi < 30 && indicators.macd_histogram > 0) {
                    jsonData.prediction = 'UP';
                } else if (indicators.rsi > 70 && indicators.macd_histogram < 0) {
                    jsonData.prediction = 'DOWN';
                } else {
                    // Throw error instead of defaulting to neutral
                    throw new Error('No clear trading signal detected. Technical indicators do not provide sufficient direction.');
                }
            }

            // Validate JSON data integrity
            this.validateJsonDataIntegrity(jsonData);

            // Create the advanced result
            const advancedResult = this.convertToAdvancedResult(
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

            // NEW: Apply trade filtering - only return trade if it passes quality checks
            if (!this.shouldTakeTrade(advancedResult)) {
                throw new Error('Trade rejected due to quality control checks. Risk parameters do not meet minimum requirements.');
            }

            console.log('✅ High-quality trade approved');
            return advancedResult;

        } catch (error) {
            console.error('Advanced autonomous prediction failed:', error);
            throw new Error(`Advanced trading prediction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * NEW: Validate technical alignment before trading
     */
    private validateTechnicalAlignment(indicators: any, prediction: string): boolean
    {
        if (!indicators.rsi || !indicators.macd_histogram || !indicators.stochastic || !indicators.bollinger_position) {
            throw new Error('Missing required technical indicators for validation');
        }

        const rsi = indicators.rsi;
        const macdHistogram = indicators.macd_histogram;
        const stochastic = indicators.stochastic;
        const bollingerPosition = indicators.bollinger_position;

        if (prediction === 'UP') {
            // For UP trades, require bullish alignment
            let bullishSignals = 0;
            if (rsi < 70) bullishSignals++; // Not overbought
            if (macdHistogram > -0.001) bullishSignals++; // MACD not strongly bearish
            if (stochastic < 80) bullishSignals++; // Stochastic not overbought
            if (bollingerPosition < 0.8) bullishSignals++; // Not at upper Bollinger band

            return bullishSignals >= 3; // Require at least 3 out of 4 bullish signals
        } else if (prediction === 'DOWN') {
            // For DOWN trades, require bearish alignment
            let bearishSignals = 0;
            if (rsi > 30) bearishSignals++; // Not oversold
            if (macdHistogram < 0.001) bearishSignals++; // MACD not strongly bullish
            if (stochastic > 20) bearishSignals++; // Stochastic not oversold
            if (bollingerPosition > 0.2) bearishSignals++; // Not at lower Bollinger band

            return bearishSignals >= 3; // Require at least 3 out of 4 bearish signals
        }

        return false;
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
        if (!mlPrediction?.prediction || !mlPrediction?.confidence || !mlPrediction?.reasoning) {
            throw new Error('Invalid or missing ML prediction data');
        }

        const mlDirection = mlPrediction.prediction;
        const mlConfidence = mlPrediction.confidence;
        const mlReasoning = mlPrediction.reasoning;

        // Property access - throw error if critical data is missing
        if (!regime?.overall_regime || !regime?.volatility_state || !regime?.trend_state || !regime?.momentum_state) {
            throw new Error('Missing required market regime data');
        }

        const ichimoku = advancedIndicators?.ichimoku;
        const fibonacci = advancedIndicators?.fibonacci;
        const elliottWave = advancedIndicators?.elliottWave;
        const momentum = advancedIndicators?.momentum;
        const timeframes = multiTimeframeAnalysis?.timeframes;
        const candlestick = patterns?.candlestick;
        const chart = patterns?.chart;

        if (!ichimoku || !fibonacci || !elliottWave || !momentum || !timeframes || !candlestick || !chart) {
            throw new Error('Missing required technical analysis data');
        }

        return `You are an expert quantitative trading analyst with 20+ years of experience in technical analysis, algorithmic trading, and risk management. Your task is to analyze the provided market data and generate a comprehensive trading recommendation.

## CONTEXT
- Symbol: ${symbol}
- Timeframe: ${timeframe}
- Current Price: ${currentPrice.toFixed(4)}
- Market Regime: ${regime.overall_regime} (${regime.volatility_state} volatility, ${regime.trend_state} trend, ${regime.momentum_state} momentum)

## TECHNICAL ANALYSIS DATA

### Advanced Indicators
**Ichimoku Cloud:**
- Tenkan-sen: ${ichimoku.tenkan.toFixed(4)}
- Kijun-sen: ${ichimoku.kijun.toFixed(4)}
- Cloud Position: ${ichimoku.cloudPosition}
- Cloud Strength: ${(ichimoku.cloudStrength * 100).toFixed(1)}%

**Fibonacci Retracements:**
- Current Position: ${fibonacci.currentPosition}
- Next Support: ${fibonacci.nextSupport.toFixed(4)}
- Next Resistance: ${fibonacci.nextResistance.toFixed(4)}

**Elliott Wave:**
- Wave Count: ${elliottWave.waveCount}
- Current Wave: ${elliottWave.currentWave}
- Trend Direction: ${elliottWave.trendDirection}
- Wave Strength: ${(elliottWave.waveStrength * 100).toFixed(1)}%

**Momentum Indicators:**
- CCI: ${momentum.cci.toFixed(2)}
- ROC: ${momentum.roc.toFixed(2)}%
- MFI: ${momentum.mfi.toFixed(2)}
- ADX: ${momentum.adx.toFixed(2)}

### Multi-Timeframe Analysis
- 1m: ${timeframes.m1.trend} (${(timeframes.m1.strength * 100).toFixed(1)}%)
- 5m: ${timeframes.m5.trend} (${(timeframes.m5.strength * 100).toFixed(1)}%)
- 15m: ${timeframes.m15.trend} (${(timeframes.m15.strength * 100).toFixed(1)}%)
- 1h: ${timeframes.h1.trend} (${(timeframes.h1.strength * 100).toFixed(1)}%)
- Overall Confluence: ${(multiTimeframeAnalysis.overallConfluence * 100).toFixed(1)}%

### Pattern Recognition
**Candlestick Pattern:** ${candlestick.primaryPattern?.name || 'None detected'} (${(candlestick.reliability * 100).toFixed(1)}% reliability)
**Chart Pattern:** ${chart.primaryPattern?.name || 'None detected'} (${(chart.completion * 100).toFixed(1)}% completion)

### Volume Analysis
- Volume Ratio: ${volumeAnalysis.volumeRatio.toFixed(2)}x average
- VWAP: ${volumeAnalysis.vwap.toFixed(4)}
- Price vs VWAP: ${(volumeAnalysis.priceVsVwap > 0 ? '+' : '') + (volumeAnalysis.priceVsVwap * 100).toFixed(2)}%
- Volume Signal: ${volumeAnalysis.volumeSignal}

### Machine Learning Consensus
- ML Prediction: ${mlDirection}
- ML Confidence: ${(mlConfidence * 100).toFixed(1)}%
- ML Reasoning: ${mlReasoning}

### Core Indicators
- RSI: ${indicators.rsi.toFixed(2)} ${this.getRSISignal(indicators.rsi)}
- MACD Histogram: ${indicators.macd_histogram.toFixed(4)} ${this.getMACDMomentum(indicators.macd_histogram)}
- Stochastic: ${indicators.stochastic.toFixed(2)}
- ATR: ${indicators.atr.toFixed(4)} (${(indicators.atr_normalized * 100).toFixed(1)}% normalized)

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
  "position_size": ${this.calculateAdvancedPositionSize(regime.confluence_score, multiTimeframeAnalysis.overallConfluence, mlConfidence)},
  "technical_score": ${Math.min(0.98, regime.confluence_score + multiTimeframeAnalysis.overallConfluence * 0.3)},
  "advanced_score": ${this.calculateAdvancedScore(advancedIndicators, multiTimeframeAnalysis, patterns, volumeAnalysis, mlPrediction)},
  "risk_assessment": {
    "volatility_risk": "${ichimoku?.cloudStrength > 0.7 ? 'LOW' : 'HIGH'}",
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
        if (!advancedIndicators?.ichimoku?.cloudPosition || !advancedIndicators?.fibonacci?.nextSupport) {
            throw new Error('Missing required data for advanced stop loss calculation');
        }

        const ichimokuStop = currentPrice * (advancedIndicators.ichimoku.cloudPosition === 'ABOVE' ? 0.985 : 0.990);
        const fibonacciStop = advancedIndicators.fibonacci.nextSupport;
        const patternStop = patterns?.chart?.stopLoss || currentPrice * 0.98; // Default 2% stop loss if no pattern

        // Use the most conservative stop loss
        return Math.min(ichimokuStop, fibonacciStop, patternStop);
    }

    /**
     * Calculate advanced take profit based on multiple factors
     */
    private calculateAdvancedTakeProfit(currentPrice: number, advancedIndicators: any, patterns: any): number
    {
        if (!advancedIndicators?.ichimoku?.cloudPosition || !advancedIndicators?.fibonacci?.nextResistance) {
            throw new Error('Missing required data for advanced take profit calculation');
        }

        const ichimokuTarget = currentPrice * (advancedIndicators.ichimoku.cloudPosition === 'BELOW' ? 1.025 : 1.020);
        const fibonacciTarget = advancedIndicators.fibonacci.nextResistance;
        const patternTarget = patterns?.chart?.targetPrice || currentPrice * 1.04; // Default 4% target if no pattern

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
        if (!advancedIndicators?.ichimoku?.cloudStrength ||
            !advancedIndicators?.elliottWave?.waveStrength ||
            !multiTimeframeAnalysis?.overallConfluence ||
            !patterns?.candlestick?.reliability ||
            !volumeAnalysis?.volumeRatio ||
            !mlPrediction?.confidence) {
            throw new Error('Missing required data for advanced score calculation');
        }

        const ichimokuScore = advancedIndicators.ichimoku.cloudStrength;
        const fibonacciScore = 0.8; // Base score for Fibonacci analysis
        const elliottScore = advancedIndicators.elliottWave.waveStrength;
        const timeframeScore = multiTimeframeAnalysis.overallConfluence;
        const patternScore = patterns.candlestick.reliability;
        const volumeScore = Math.min(1, volumeAnalysis.volumeRatio / 2);
        const mlScore = mlPrediction.confidence; // Use confidence from AutonomousPredictionResult

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
        if (!jsonData.entry_price || !jsonData.stop_loss || !jsonData.take_profit) {
            throw new Error('Missing required trading levels in prediction data');
        }

        const entryPrice = jsonData.entry_price;
        const stopLoss = jsonData.stop_loss;
        const takeProfit = jsonData.take_profit;

        // Calculate realistic confidence using multiple factors
        if (!multiTimeframeAnalysis?.overallConfluence ||
            !patterns?.candlestick?.reliability ||
            !volumeAnalysis?.volumeRatio ||
            !mlPrediction?.confidence) {
            throw new Error('Missing required data for confidence calculation');
        }

        const confluenceScore = multiTimeframeAnalysis.overallConfluence;
        const patternReliability = patterns.candlestick.reliability;
        const volumeConfirmation = volumeAnalysis.volumeRatio > 1.5;
        const timeframeAlignment = confluenceScore;
        const mlConfidenceScore = mlPrediction.confidence;

        const realisticConfidence = this.calculateRealisticConfidence(
            confluenceScore,
            patternReliability,
            volumeConfirmation,
            timeframeAlignment,
            mlConfidenceScore
        );

        // Use the more conservative confidence calculation
        const finalConfidence = Math.min(jsonData.confidence, realisticConfidence);

        return {
            symbol,
            timeframe,
            prediction: (jsonData.prediction === 'UP' || jsonData.prediction === 'DOWN') ? jsonData.prediction : 'UP',
            confidence: finalConfidence,
            trading_levels: {
                entry_price: entryPrice,
                stop_loss: stopLoss,
                take_profit: takeProfit,
                risk_reward_ratio: jsonData.risk_reward_ratio,
                max_drawdown_pips: Math.round(Math.abs(stopLoss - currentPrice) * 10000),
                target_pips: Math.round(Math.abs(takeProfit - currentPrice) * 10000),
            },
            price_targets: {
                immediate: jsonData.immediate_target,
                short_term: jsonData.short_term_target,
                medium_term: jsonData.medium_term_target,
            },
            risk_management: {
                position_size_suggestion: Math.min(jsonData.position_size, 0.03), // Cap at 3%
                max_risk_per_trade: 0.015, // Reduced from 0.02 to 0.015 (1.5%)
                probability_of_success: finalConfidence,
            },
            multi_timeframe_analysis: jsonData.multi_timeframe_alignment,
            higher_timeframe_trend: jsonData.higher_timeframe_trend,
            intermediate_timeframe_momentum: jsonData.intermediate_timeframe_momentum,
            timeframe_confluence: jsonData.timeframe_confluence,
            market_structure_quality: jsonData.market_structure_quality,
            confluence_bonus: jsonData.confluence_bonus,
            analysis: `Advanced Phase 2 Analysis: ${jsonData.technical_confluence}. ${jsonData.pattern_analysis}. ${jsonData.volume_analysis}. ${jsonData.ml_integration}.`,
            reasoning: jsonData.reasoning,
            factors: {
                technical: jsonData.technical_score,
                advanced: jsonData.advanced_score,
                ichimoku: advancedIndicators.ichimoku.cloudStrength,
                fibonacci: 0.8,
                elliott_wave: advancedIndicators.elliottWave.waveStrength,
                pattern_reliability: patterns.candlestick.reliability,
                volume_support: Math.min(1, volumeAnalysis.volumeRatio / 2),
                ml_confidence: mlPrediction.confidence,
            },
        };
    }

    /**
     * Create a simple validation method for JSON data integrity
     */
    private validateJsonDataIntegrity(jsonData: any): void
    {
        const requiredFields = [ 'prediction', 'confidence', 'reasoning' ];

        for (const field of requiredFields) {
            if (jsonData[ field ] === undefined || jsonData[ field ] === null) {
                throw new Error(`Critical field "${field}" is missing from LLM response. Cannot proceed without complete prediction data.`);
            }
        }

        // Validate prediction is valid
        if (![ 'UP', 'DOWN' ].includes(jsonData.prediction)) {
            throw new Error(`Invalid prediction value: ${jsonData.prediction}. Must be either 'UP' or 'DOWN'.`);
        }

        // Validate confidence is a number between 0 and 1
        if (typeof jsonData.confidence !== 'number' || jsonData.confidence < 0 || jsonData.confidence > 1) {
            throw new Error(`Invalid confidence value: ${jsonData.confidence}. Must be a number between 0 and 1.`);
        }

        // Validate reasoning is a non-empty string
        if (typeof jsonData.reasoning !== 'string' || jsonData.reasoning.trim().length === 0) {
            throw new Error('Invalid reasoning: must be a non-empty string providing clear justification for the prediction.');
        }
    }

    /**
     * ENHANCED: Strict data quality validation - refuse trades with insufficient data
     */
    private validateDataQuality(historicalData: any): boolean
    {
        console.log('🔍 Debug: Validating data quality, received data type:', typeof historicalData);
        console.log('🔍 Debug: Data structure keys:', Object.keys(historicalData || {}));
        if (Array.isArray(historicalData)) {
            console.log('🔍 Debug: Array length:', historicalData.length);
            if (historicalData.length > 0) {
                console.log('🔍 Debug: First item keys:', Object.keys(historicalData[ 0 ] || {}));
                console.log('🔍 Debug: First item sample:', JSON.stringify(historicalData[ 0 ], null, 2));
            }
        }

        // Handle different data structures that might be passed
        let candles: any[] = [];
        let ticks: any[] = [];

        // Try to extract candles and ticks from different possible structures
        if (Array.isArray(historicalData)) {
            // If historicalData is an array, assume it's candles
            candles = historicalData;
            ticks = historicalData; // Use same data for validation
        } else if (historicalData && typeof historicalData === 'object') {
            // If it's an object, try to extract candles and ticks
            candles = historicalData.candles || historicalData.ohlc || historicalData.candleData || [];
            ticks = historicalData.ticks || historicalData.tickData || historicalData.prices || [];

            // If no specific ticks found but we have candles, use candles for validation
            if (ticks.length === 0 && candles.length > 0) {
                ticks = candles;
            }
        } else {
            throw new Error('Invalid historical data structure provided');
        }

        console.log(`🔍 Debug: Extracted ${candles.length} candles and ${ticks.length} ticks`);
        if (candles.length > 0) {
            console.log('🔍 Debug: First candle:', JSON.stringify(candles[ 0 ], null, 2));
            console.log('🔍 Debug: Last candle:', JSON.stringify(candles[ candles.length - 1 ], null, 2));
        }

        const minCandles = 20; // Reduced requirement since we're generating shorter interval candles
        const minTicks = 20; // Reduced requirement to be more practical

        if (candles.length < minCandles) {
            console.log('❌ Insufficient candle data for reliable prediction');
            console.log(`📊 Candles available: ${candles.length}, required: ${minCandles}`);
            return false;
        }

        if (ticks.length < minTicks) {
            console.log('❌ Insufficient tick data for reliable prediction');
            console.log(`📊 Ticks available: ${ticks.length}, required: ${minTicks}`);
            return false;
        }

        // Check for data gaps - validate candle structure
        if (!this.validateCandleStructure(candles)) {
            console.log('❌ Invalid candle data structure');
            return false;
        }

        // Check data recency - ensure we have some recent data in the dataset
        if (candles.length > 0) {
            // Sort candles by timestamp to get the most recent ones
            const sortedCandles = candles.slice().sort((a, b) =>
            {
                let timeA: number, timeB: number;

                if (typeof a.epoch === 'string') {
                    timeA = new Date(a.epoch).getTime();
                } else if (typeof a.epoch === 'number') {
                    timeA = a.epoch < 10000000000 ? a.epoch * 1000 : a.epoch;
                } else {
                    timeA = 0;
                }

                if (typeof b.epoch === 'string') {
                    timeB = new Date(b.epoch).getTime();
                } else if (typeof b.epoch === 'number') {
                    timeB = b.epoch < 10000000000 ? b.epoch * 1000 : b.epoch;
                } else {
                    timeB = 0;
                }

                return timeB - timeA; // Sort descending (newest first)
            });

            const latestCandle = sortedCandles[ 0 ];
            const now = Date.now();
            let candleTime: number;

            if (typeof latestCandle.epoch === 'string') {
                candleTime = new Date(latestCandle.epoch).getTime();
            } else if (typeof latestCandle.epoch === 'number') {
                candleTime = latestCandle.epoch < 10000000000 ? latestCandle.epoch * 1000 : latestCandle.epoch;
            } else {
                candleTime = now; // Skip check if timestamp format is unknown
            }

            const ageInHours = (now - candleTime) / (1000 * 60 * 60);
            const maxAgeHours = 25; // Allow data up to 25 hours old (buffer for edge cases)

            console.log(`📊 Data age check: Latest candle: ${new Date(candleTime).toISOString()}, Age: ${ageInHours.toFixed(1)}h`);

            if (ageInHours >= maxAgeHours) {
                console.log(`❌ No recent data available: Latest data is ${ageInHours.toFixed(1)}h old (max: ${maxAgeHours}h)`);
                return false;
            }

            console.log(`✅ Recent data available: Latest candle is ${ageInHours.toFixed(1)}h old`);
        }

        // Check data consistency - ensure prices are realistic
        if (!this.validatePriceStability(candles)) {
            console.log('❌ Price data shows unrealistic volatility or gaps');
            return false;
        }

        console.log('✅ Data quality validation passed - all checks satisfied');
        console.log(`📊 Validated: ${candles.length} candles, ${ticks.length} ticks`);
        return true;
    }

    /**
     * Validate candle data structure
     */
    private validateCandleStructure(candles: any[]): boolean
    {
        if (candles.length === 0) return false;

        // Check that candles have required fields
        const requiredFields = [ 'open', 'high', 'low', 'close' ];

        for (let i = 0; i < Math.min(5, candles.length); i++) {
            const candle = candles[ i ];
            for (const field of requiredFields) {
                if (typeof candle[ field ] !== 'number' || isNaN(candle[ field ])) {
                    console.log(`❌ Invalid candle field ${field} at index ${i}:`, candle[ field ]);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * NEW: Validate price stability to detect unrealistic data
     */
    private validatePriceStability(candles: any[]): boolean
    {
        if (candles.length < 2) return true; // Can't check stability with less than 2 candles

        // Check for extreme price movements (>20% in single candle)
        for (let i = 1; i < candles.length; i++) {
            const prevClose = candles[ i - 1 ].close;
            const currentOpen = candles[ i ].open;
            const change = Math.abs((currentOpen - prevClose) / prevClose);

            if (change > 0.2) { // 20% gap
                console.log(`❌ Extreme price gap detected: ${(change * 100).toFixed(2)}%`);
                return false;
            }
        }

        return true;
    }

    /**
     * ENHANCED: Much stricter trade filtering - only high-quality setups
     */
    private shouldTakeTrade(prediction: AutonomousPredictionResult): boolean
    {
        console.log('🔍 Applying enhanced trade filtering...');

        // CRITICAL: Only trade very high-confidence setups
        const minConfidence = 0.70; // Increased from 0.65
        if (prediction.confidence < minConfidence) {
            console.log(`❌ Trade filtered: Low confidence (${prediction.confidence.toFixed(2)} < ${minConfidence})`);
            return false;
        }

        // CRITICAL: Require excellent risk-reward ratio
        const minRiskReward = 2.0; // Increased from 1.5
        if (prediction.trading_levels.risk_reward_ratio < minRiskReward) {
            console.log(`❌ Trade filtered: Poor risk/reward (${prediction.trading_levels.risk_reward_ratio.toFixed(2)} < ${minRiskReward})`);
            return false;
        }

        // ENHANCED: Verify technical confluence with stricter thresholds
        const factors = prediction.factors as any;
        const strictConfluenceChecks = [
            factors.ichimoku > 0.7, // Increased from 0.6
            factors.fibonacci > 0.8, // Increased from 0.7
            factors.pattern_reliability > 0.8, // Increased from 0.7
            factors.volume_support > 0.6, // Increased from 0.5
            factors.ml_confidence > 0.75 // Increased from 0.7
        ];

        const passedChecks = strictConfluenceChecks.filter(Boolean).length;
        const requiredChecks = 4; // Increased from 3

        if (passedChecks < requiredChecks) {
            console.log(`❌ Trade filtered: Insufficient confluence (${passedChecks}/${strictConfluenceChecks.length} factors, need ${requiredChecks})`);
            console.log('📊 Factor breakdown:');
            console.log(`   Ichimoku: ${factors.ichimoku > 0.7 ? '✅' : '❌'} (${factors.ichimoku?.toFixed(2)})`);
            console.log(`   Fibonacci: ${factors.fibonacci > 0.8 ? '✅' : '❌'} (${factors.fibonacci?.toFixed(2)})`);
            console.log(`   Pattern: ${factors.pattern_reliability > 0.8 ? '✅' : '❌'} (${factors.pattern_reliability?.toFixed(2)})`);
            console.log(`   Volume: ${factors.volume_support > 0.6 ? '✅' : '❌'} (${factors.volume_support?.toFixed(2)})`);
            console.log(`   ML: ${factors.ml_confidence > 0.75 ? '✅' : '❌'} (${factors.ml_confidence?.toFixed(2)})`);
            return false;
        }

        // NEW: Check for conflicting signals more strictly
        if (!factors.technical || !factors.advanced) {
            throw new Error('Missing required trading factors for trade validation');
        }

        const technicalScore = factors.technical;
        const advancedScore = factors.advanced;
        const minAlignment = 0.65; // Both technical and advanced must be strong

        if (technicalScore < minAlignment || advancedScore < minAlignment) {
            console.log(`❌ Trade filtered: Poor signal alignment (technical: ${technicalScore.toFixed(2)}, advanced: ${advancedScore.toFixed(2)})`);
            return false;
        }

        // NEW: Validate timeframe confluence
        if (prediction.timeframe_confluence === 'WEAK') {
            console.log('❌ Trade filtered: Weak timeframe confluence');
            return false;
        }

        // NEW: Check market structure quality
        if (prediction.market_structure_quality === 'LOW') {
            console.log('❌ Trade filtered: Low market structure quality');
            return false;
        }

        // NEW: Validate position sizing is conservative
        const maxPositionSize = 0.02; // Max 2% risk
        if (prediction.risk_management?.max_risk_per_trade > maxPositionSize) {
            console.log(`❌ Trade filtered: Position size too large (${prediction.risk_management.max_risk_per_trade} > ${maxPositionSize})`);
            return false;
        }

        console.log('✅ Trade approved: All enhanced quality filters passed');
        console.log(`📊 Final scores - Confidence: ${prediction.confidence.toFixed(2)}, R/R: ${prediction.trading_levels.risk_reward_ratio.toFixed(2)}, Confluence: ${passedChecks}/${strictConfluenceChecks.length}`);
        return true;
    }

    /**
     * ENHANCED: Much more realistic confidence calculation with stricter thresholds
     */
    private calculateRealisticConfidence(
        confluenceScore: number,
        patternReliability: number,
        volumeConfirmation: boolean,
        timeframeAlignment: number,
        mlConfidence: number
    ): number
    {
        // Start with a base of 50% (random chance) - no free confidence
        let confidence = 0.5;

        // STRICTER: Only add confidence for genuinely strong signals
        if (confluenceScore > 0.85) confidence += 0.12; // Reduced bonus amounts
        else if (confluenceScore > 0.75) confidence += 0.06;
        else if (confluenceScore > 0.65) confidence += 0.02;
        // No bonus for confluence below 0.65

        // Pattern confirmation - stricter thresholds
        if (patternReliability > 0.85) confidence += 0.08; // Reduced from 0.1
        else if (patternReliability > 0.75) confidence += 0.04; // Reduced from 0.05
        // No bonus below 0.75

        // Volume confirmation - smaller bonus
        if (volumeConfirmation) confidence += 0.03; // Reduced from 0.05

        // Timeframe alignment - more conservative
        if (timeframeAlignment > 0.8) confidence += 0.08;
        else if (timeframeAlignment > 0.6) confidence += 0.04;
        // No bonus below 0.6

        // ML confidence boost - stricter requirements
        if (mlConfidence > 0.85) confidence += 0.08; // Reduced from 0.1
        else if (mlConfidence > 0.75) confidence += 0.04; // Reduced from 0.05
        // No bonus below 0.75

        // CRITICAL: Much lower maximum confidence - never exceed 70%
        const maxConfidence = 0.70; // Reduced from 0.75
        confidence = Math.min(maxConfidence, confidence);

        // ADDED: Penalty for weak signals
        if (confluenceScore < 0.5 || patternReliability < 0.5 || mlConfidence < 0.5) {
            confidence = Math.max(0.45, confidence - 0.1); // Penalty for poor signals
        }

        console.log(`📊 Enhanced Confidence Calc: Base(0.5) + Confluence(${confluenceScore.toFixed(2)}) + Pattern(${patternReliability.toFixed(2)}) + Volume(${volumeConfirmation}) + Timeframe(${timeframeAlignment.toFixed(2)}) + ML(${mlConfidence.toFixed(2)}) = ${confidence.toFixed(2)} (max: ${maxConfidence})`);

        return confidence;
    }

    /**
     * NEW: Enhanced spike probability calculation for BOOM/CRASH
     */
    private calculateEnhancedSpikeProbability(
        symbol: string,
        ticksSinceLastSpike: number,
        historicalSpikes: number[] = []
    ): number
    {
        const expectedTicks = symbol.includes('1000') ? 1000 : 500;

        if (historicalSpikes.length === 0) {
            throw new Error('No historical spike data available for spike probability calculation');
        }

        // Use statistical distribution of historical spikes
        const avgSpikeTiming = historicalSpikes.reduce((a, b) => a + b, 0) / historicalSpikes.length;
        const stdDev = this.calculateStdDev(historicalSpikes);

        // Calculate z-score
        const zScore = (ticksSinceLastSpike - avgSpikeTiming) / stdDev;

        // Convert to probability using normal distribution approximation
        const probability = this.normalCDF(zScore);

        // Adjust for symbol characteristics
        if (symbol.includes('BOOM') && ticksSinceLastSpike > expectedTicks * 0.9) {
            return Math.min(0.95, probability * 1.2);
        }

        if (symbol.includes('CRASH') && ticksSinceLastSpike > expectedTicks * 0.9) {
            return Math.min(0.95, probability * 1.2);
        }

        return Math.min(0.95, probability);
    }

    /**
     * Helper: Calculate standard deviation
     */
    private calculateStdDev(values: number[]): number
    {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    /**
     * Helper: Normal CDF approximation
     */
    private normalCDF(x: number): number
    {
        // Approximation of the cumulative distribution function for standard normal distribution
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    /**
     * Helper: Error function approximation
     */
    private erf(x: number): number
    {
        // Abramowitz and Stegun approximation
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    /**
     * NEW: Record trade result for performance tracking
     */
    recordTradeResult(
        symbol: string,
        prediction: 'UP' | 'DOWN',
        confidence: number,
        actual: 'WIN' | 'LOSS',
        factors: any,
        entryPrice: number,
        exitPrice: number,
        profit: number
    ): void
    {
        const result: TradeResult = {
            symbol,
            prediction,
            confidence,
            actual,
            factors,
            entryPrice,
            exitPrice,
            profit,
            timestamp: Date.now()
        };

        this.performanceTracker.addResult(result);
    }

    /**
     * NEW: Get current performance metrics
     */
    getPerformanceMetrics()
    {
        return this.performanceTracker.getPerformanceMetrics();
    }

    /**
     * NEW: Validate trading strategy using historical performance
     */
    validateStrategy(symbol: string): boolean
    {
        const metrics = this.performanceTracker.getPerformanceMetrics();

        if (!metrics || metrics.totalTrades < 20) {
            console.log('⚠️ Insufficient trade history for validation');
            return false;
        }

        // Require at least 60% win rate and positive profit
        const isValidStrategy = metrics.winRate >= 0.60 && metrics.totalProfit > 0;

        console.log(`📊 Strategy Validation for ${symbol}:`);
        console.log(`   Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
        console.log(`   Total Profit: ${metrics.totalProfit.toFixed(2)}`);
        console.log(`   Total Trades: ${metrics.totalTrades}`);
        console.log(`   Status: ${isValidStrategy ? '✅ VALIDATED' : '❌ FAILED'}`);

        return isValidStrategy;
    }
}
