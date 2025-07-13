import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { MarketFeatures } from '../services/feature-engineering';

// Agent State Interface
export interface TradingAgentState
{
    messages: BaseMessage[];
    symbol: string;
    timeframe: string;
    currentPrice: number;
    marketFeatures: MarketFeatures;
    marketData?: any;
    analysis?: string;
    prediction?: 'UP' | 'DOWN';
    confidence?: number;
    tradingLevels?: {
        entry_price: number;
        stop_loss: number;
        take_profit: number;
        risk_reward_ratio: number;
        max_drawdown_pips: number;
        target_pips: number;
    };
    priceTargets?: {
        immediate: number;
        short_term: number;
        medium_term: number;
    };
    riskManagement?: {
        position_size_suggestion: number;
        max_risk_per_trade: number;
        probability_of_success: number;
    };
    reasoning?: string;
    error?: string;
}

export class AutonomousTradingAgent
{
    private llm: ChatGoogleGenerativeAI;
    private graph: StateGraph<TradingAgentState>;

    constructor (apiKey: string)
    {
        this.llm = new ChatGoogleGenerativeAI({
            apiKey,
            model: 'gemini-2.5-pro',
            temperature: 0.1,
        });

        this.graph = this.createGraph();
    }

    private createGraph(): StateGraph<TradingAgentState>
    {
        const graph = new StateGraph<TradingAgentState>({
            channels: {
                messages: {
                    reducer: (current: BaseMessage[], update: BaseMessage[]) => current.concat(update),
                    default: () => [],
                },
                symbol: { default: () => '' },
                timeframe: { default: () => '' },
                currentPrice: { default: () => 0 },
                marketFeatures: { default: () => ({} as MarketFeatures) },
                marketData: { default: () => null },
                analysis: { default: () => undefined },
                prediction: { default: () => undefined },
                confidence: { default: () => undefined },
                tradingLevels: { default: () => undefined },
                priceTargets: { default: () => undefined },
                riskManagement: { default: () => undefined },
                reasoning: { default: () => undefined },
                error: { default: () => undefined },
            },
        });

        // Add nodes
        graph.addNode('analyze_market', this.analyzeMarket.bind(this));
        graph.addNode('generate_prediction', this.generatePrediction.bind(this));
        graph.addNode('calculate_levels', this.calculateTradingLevels.bind(this));
        graph.addNode('validate_prediction', this.validatePrediction.bind(this));

        // Add edges
        graph.addEdge('__start__', 'analyze_market');
        graph.addEdge('analyze_market', 'generate_prediction');
        graph.addEdge('generate_prediction', 'calculate_levels');
        graph.addEdge('calculate_levels', 'validate_prediction');
        graph.addEdge('validate_prediction', '__end__');

        return graph.compile();
    }

    private async analyzeMarket(state: TradingAgentState): Promise<Partial<TradingAgentState>>
    {
        const prompt = `
You are an expert trading analyst specializing in Deriv synthetic indices. Analyze the current market conditions for ${state.symbol} on ${state.timeframe} timeframe.

Current Market Data:
- Symbol: ${state.symbol}
- Timeframe: ${state.timeframe}
- Current Price: ${state.currentPrice}
- Technical Indicators:
  * RSI: ${state.marketFeatures.rsi}
  * MACD: ${state.marketFeatures.macd}
  * Bollinger Bands Position: ${state.marketFeatures.bollinger_position}
  * Trend Strength: ${state.marketFeatures.trend_strength}
  * Volatility Momentum: ${state.marketFeatures.volatility_momentum}
  * Support/Resistance Proximity: ${state.marketFeatures.support_resistance_proximity}
  ${state.marketFeatures.spike_proximity ? `* Spike Proximity: ${state.marketFeatures.spike_proximity}` : ''}
  ${state.marketFeatures.spike_probability ? `* Spike Probability: ${state.marketFeatures.spike_probability}` : ''}

Please provide a comprehensive market analysis considering:
1. Current trend direction and strength
2. Volatility conditions
3. Key support and resistance levels
4. Market sentiment indicators
5. For Boom/Crash indices: spike patterns and timing
6. Overall market structure and momentum

Provide your analysis in a clear, professional format focusing on actionable insights for trading decisions.
`;

        try {
            const response = await this.llm.invoke([ new HumanMessage(prompt) ]);

            return {
                analysis: response.content as string,
                messages: [ ...state.messages, new HumanMessage(prompt), response ],
            };
        } catch (error) {
            return {
                error: `Market analysis failed: ${error}`,
                messages: [ ...state.messages, new HumanMessage(prompt) ],
            };
        }
    }

    private async generatePrediction(state: TradingAgentState): Promise<Partial<TradingAgentState>>
    {
        const prompt = `
Based on your previous market analysis, generate a precise trading prediction for ${state.symbol}.

Market Analysis:
${state.analysis}

Current Price: ${state.currentPrice}

You must provide:
1. Direction prediction (UP or DOWN) with detailed reasoning
2. Confidence level (0.50 to 0.95) based on signal strength
3. Key factors supporting your prediction
4. Time horizon for the prediction on ${state.timeframe} timeframe
5. Main risks to consider

Be specific about why you chose this direction and confidence level. Consider:
- Technical indicator alignment
- Market structure and momentum
- Volatility conditions
- For Boom/Crash: spike timing and probability
- Risk-reward potential

Format your response as:
PREDICTION: [UP/DOWN]
CONFIDENCE: [0.XX]
REASONING: [Detailed explanation]
KEY_FACTORS: [List 3-5 key supporting factors]
TIME_HORIZON: [Expected timeframe for move]
RISKS: [Main risks to watch]
`;

        try {
            const response = await this.llm.invoke([
                new HumanMessage(prompt)
            ]);

            const content = response.content as string;

            // Parse the response
            const predictionMatch = content.match(/PREDICTION:\s*(UP|DOWN)/i);
            const confidenceMatch = content.match(/CONFIDENCE:\s*([0-9.]+)/);

            const prediction = predictionMatch ? predictionMatch[ 1 ].toUpperCase() as 'UP' | 'DOWN' : 'UP';
            const confidence = confidenceMatch ? Math.max(0.5, Math.min(0.95, parseFloat(confidenceMatch[ 1 ]))) : 0.65;

            return {
                prediction,
                confidence,
                reasoning: content,
                messages: [ ...state.messages, new HumanMessage(prompt), response ],
            };
        } catch (error) {
            return {
                error: `Prediction generation failed: ${error}`,
                prediction: 'UP' as 'UP' | 'DOWN',
                confidence: 0.6,
                messages: [ ...state.messages, new HumanMessage(prompt) ],
            };
        }
    }

    private async calculateTradingLevels(state: TradingAgentState): Promise<Partial<TradingAgentState>>
    {
        const prompt = `
You are a professional risk management specialist. Calculate precise trading levels for this trade setup:

Trade Setup:
- Symbol: ${state.symbol}
- Current Price: ${state.currentPrice}
- Prediction: ${state.prediction}
- Confidence: ${state.confidence}
- Timeframe: ${state.timeframe}

Market Context:
${state.analysis}

Prediction Reasoning:
${state.reasoning}

Calculate the following with precise numerical values:

1. ENTRY PRICE: Optimal entry point (consider current price and any pullback expectations)

2. STOP LOSS: Based on:
   - Symbol characteristics (${state.symbol} typical volatility)
   - Current market volatility: ${state.marketFeatures.volatility_momentum}
   - Support/resistance levels: ${state.marketFeatures.support_resistance_proximity}
   - Confidence level: ${state.confidence}

3. TAKE PROFIT: Based on:
   - Risk-reward ratio appropriate for confidence level
   - Realistic price targets for ${state.timeframe} timeframe
   - Market structure and resistance/support levels

4. PRICE TARGETS:
   - Immediate (1-5 minutes): Conservative near-term target
   - Short-term (15-30 minutes): Medium probability target
   - Medium-term (1-4 hours): Optimistic but realistic target

5. RISK MANAGEMENT:
   - Position size as percentage of capital (0.5% to 3% max)
   - Maximum risk per trade (1-2%)
   - Probability of success assessment

Guidelines for ${state.symbol}:
${this.getSymbolGuidelines(state.symbol)}

Provide exact numbers formatted as:
ENTRY_PRICE: [price]
STOP_LOSS: [price]
TAKE_PROFIT: [price]
RISK_REWARD_RATIO: [ratio]
DRAWDOWN_PIPS: [pips]
TARGET_PIPS: [pips]
IMMEDIATE_TARGET: [price]
SHORT_TERM_TARGET: [price]
MEDIUM_TERM_TARGET: [price]
POSITION_SIZE: [percentage]
MAX_RISK: [percentage]
SUCCESS_PROBABILITY: [percentage]
`;

        try {
            const response = await this.llm.invoke([ new HumanMessage(prompt) ]);
            const content = response.content as string;

            // Parse trading levels from response
            const tradingLevels = this.parseTradi;
