import { MarketFeatures } from './feature-engineering';

export interface TradingLevels
{
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    risk_reward_ratio: number;
    max_drawdown_pips: number;
    target_pips: number;
}

export interface PriceTargets
{
    immediate: number; // 1-5 minutes
    short_term: number; // 15-30 minutes
    medium_term: number; // 1-4 hours
}

export interface RiskManagement
{
    position_size_suggestion: number; // percentage of capital
    max_risk_per_trade: number;
    probability_of_success: number;
}

export interface VolatilityProfile
{
    daily_range: number;
    hourly_range: number;
    spike_frequency: number; // for Boom/Crash
    typical_move_size: number;
}

export class TradingLevelsService
{

    calculateTradingLevels(
        currentPrice: number,
        prediction: 'UP' | 'DOWN',
        features: MarketFeatures,
        symbol: string,
        timeframe: string,
        confidence: number
    ): TradingLevels
    {
        const volatilityProfile = this.getVolatilityProfile(symbol, features);
        const riskRewardRatio = this.calculateOptimalRiskReward(confidence, volatilityProfile);

        if (prediction === 'UP') {
            return this.calculateBuyLevels(currentPrice, features, volatilityProfile, riskRewardRatio, timeframe, symbol);
        } else {
            return this.calculateSellLevels(currentPrice, features, volatilityProfile, riskRewardRatio, timeframe, symbol);
        }
    }

    private calculateBuyLevels(
        currentPrice: number,
        features: MarketFeatures,
        volatility: VolatilityProfile,
        riskReward: number,
        timeframe: string,
        symbol: string
    ): TradingLevels
    {
        // Dynamic stop loss based on volatility and support levels
        const atr = features.volatility_momentum || volatility.typical_move_size;
        const stopLossDistance = this.calculateStopLossDistance(atr, timeframe, features);
        const stopLoss = currentPrice - stopLossDistance;

        // Take profit based on risk-reward ratio and resistance levels
        const takeProfitDistance = stopLossDistance * riskReward;
        let takeProfit = currentPrice + takeProfitDistance;

        // Adjust for nearby resistance levels
        const nearestResistance = this.findNearestResistance(currentPrice, features);
        if (nearestResistance && nearestResistance < takeProfit && nearestResistance > currentPrice) {
            takeProfit = nearestResistance * 0.95; // Take profit slightly before resistance
        }

        return {
            entry_price: currentPrice,
            stop_loss: Math.max(stopLoss, currentPrice * 0.98), // Min 2% stop loss
            take_profit: Math.min(takeProfit, currentPrice * 1.15), // Max 15% take profit
            risk_reward_ratio: (takeProfit - currentPrice) / (currentPrice - stopLoss),
            max_drawdown_pips: this.priceToPips(stopLossDistance, symbol),
            target_pips: this.priceToPips(takeProfit - currentPrice, symbol)
        };
    }

    private calculateSellLevels(
        currentPrice: number,
        features: MarketFeatures,
        volatility: VolatilityProfile,
        riskReward: number,
        timeframe: string,
        symbol: string
    ): TradingLevels
    {
        const atr = features.volatility_momentum || volatility.typical_move_size;
        const stopLossDistance = this.calculateStopLossDistance(atr, timeframe, features);
        const stopLoss = currentPrice + stopLossDistance;

        const takeProfitDistance = stopLossDistance * riskReward;
        let takeProfit = currentPrice - takeProfitDistance;

        // Adjust for nearby support levels
        const nearestSupport = this.findNearestSupport(currentPrice, features);
        if (nearestSupport && nearestSupport > takeProfit && nearestSupport < currentPrice) {
            takeProfit = nearestSupport * 1.05; // Take profit slightly after support
        }

        return {
            entry_price: currentPrice,
            stop_loss: Math.min(stopLoss, currentPrice * 1.02), // Min 2% stop loss
            take_profit: Math.max(takeProfit, currentPrice * 0.85), // Max 15% take profit
            risk_reward_ratio: (currentPrice - takeProfit) / (stopLoss - currentPrice),
            max_drawdown_pips: this.priceToPips(stopLossDistance, symbol),
            target_pips: this.priceToPips(currentPrice - takeProfit, symbol)
        };
    }

    private calculateStopLossDistance(atr: number, timeframe: string, features: MarketFeatures): number
    {
        let multiplier = 1.5; // Base ATR multiplier

        // Adjust based on timeframe
        const timeframeMultipliers = {
            '1m': 0.8,
            '5m': 1.0,
            '15m': 1.3,
            '30m': 1.6,
            '1h': 2.0
        };

        multiplier *= timeframeMultipliers[ timeframe as keyof typeof timeframeMultipliers ] || 1.0;

        // Adjust based on market conditions
        if (features.trend_strength > 0.7) {
            multiplier *= 0.8; // Tighter stops in strong trends
        }

        if (features.volatility_momentum > 0.6) {
            multiplier *= 1.3; // Wider stops in high volatility
        }

        // For Boom/Crash, consider spike proximity
        if (features.spike_probability && features.spike_probability > 0.3) {
            multiplier *= 0.7; // Tighter stops when spike is likely
        }

        return Math.max(atr * multiplier, 0.01); // Minimum 1% stop loss
    }

    private calculateOptimalRiskReward(confidence: number, volatility: VolatilityProfile): number
    {
        // Base risk-reward based on confidence
        let riskReward = 1.5; // Minimum 1:1.5

        if (confidence > 0.85) riskReward = 3.0;
        else if (confidence > 0.8) riskReward = 2.5;
        else if (confidence > 0.7) riskReward = 2.0;
        else if (confidence > 0.6) riskReward = 1.7;

        // Adjust for volatility - higher volatility allows for better risk-reward
        if (volatility.typical_move_size > volatility.daily_range * 0.3) {
            riskReward *= 1.2;
        }

        return Math.min(riskReward, 4.0); // Cap at 1:4
    }

    calculatePriceTargets(
        currentPrice: number,
        prediction: 'UP' | 'DOWN',
        features: MarketFeatures,
        symbol: string
    ): PriceTargets
    {
        const volatility = this.getVolatilityProfile(symbol, features);
        const direction = prediction === 'UP' ? 1 : -1;

        return {
            immediate: currentPrice + (direction * volatility.typical_move_size * 0.3), // 1-5 min target
            short_term: currentPrice + (direction * volatility.typical_move_size * 0.6), // 15-30 min target
            medium_term: currentPrice + (direction * volatility.hourly_range * 0.4) // 1-4 hour target
        };
    }

    calculateRiskManagement(
        confidence: number,
        volatility: VolatilityProfile,
        stopLossDistance: number
    ): RiskManagement
    {
        // Position size based on 1-2% risk per trade
        const maxRiskPerTrade = confidence > 0.8 ? 0.02 : 0.01; // 2% for high confidence, 1% for lower

        // Calculate position size to risk only the specified percentage
        const riskPercentage = stopLossDistance / 100; // Convert to percentage
        const positionSize = maxRiskPerTrade / Math.max(riskPercentage, 0.005); // Min 0.5% risk

        return {
            position_size_suggestion: Math.min(positionSize, 0.1), // Cap at 10% of capital
            max_risk_per_trade: maxRiskPerTrade,
            probability_of_success: this.calculateSuccessProbability(confidence, volatility)
        };
    }

    getVolatilityProfile(symbol: string, features: MarketFeatures): VolatilityProfile
    {
        // Different volatility profiles for different synthetic indices
        const baseProfiles: Record<string, VolatilityProfile> = {
            'BOOM1000': {
                daily_range: 0.15, // 15% daily range
                hourly_range: 0.05,
                spike_frequency: 0.001, // 1 in 1000 chance per tick
                typical_move_size: 0.02
            },
            'BOOM500': {
                daily_range: 0.20,
                hourly_range: 0.07,
                spike_frequency: 0.002, // 1 in 500 chance per tick
                typical_move_size: 0.025
            },
            'CRASH1000': {
                daily_range: 0.15,
                hourly_range: 0.05,
                spike_frequency: 0.001,
                typical_move_size: 0.02
            },
            'CRASH500': {
                daily_range: 0.20,
                hourly_range: 0.07,
                spike_frequency: 0.002,
                typical_move_size: 0.025
            },
            'R_10': { daily_range: 0.10, hourly_range: 0.03, spike_frequency: 0, typical_move_size: 0.015 },
            'R_25': { daily_range: 0.25, hourly_range: 0.08, spike_frequency: 0, typical_move_size: 0.035 },
            'R_50': { daily_range: 0.50, hourly_range: 0.15, spike_frequency: 0, typical_move_size: 0.07 },
            'R_75': { daily_range: 0.75, hourly_range: 0.22, spike_frequency: 0, typical_move_size: 0.10 },
            'R_100': { daily_range: 1.00, hourly_range: 0.30, spike_frequency: 0, typical_move_size: 0.14 }
        };

        const baseProfile = baseProfiles[ symbol ] || baseProfiles[ 'R_25' ]!;

        // Adjust based on current market conditions
        const volatilityMultiplier = features.volatility_momentum || 1.0;

        return {
            daily_range: baseProfile.daily_range || 0.25,
            hourly_range: baseProfile.hourly_range * volatilityMultiplier,
            spike_frequency: baseProfile.spike_frequency || 0,
            typical_move_size: baseProfile.typical_move_size * volatilityMultiplier
        };
    }

    private findNearestResistance(currentPrice: number, features: MarketFeatures): number | null
    {
        // Use support_resistance_proximity to estimate resistance
        if (features.support_resistance_proximity > 0.8) {
            // We're near resistance, estimate it
            return currentPrice * 1.02; // 2% above current price
        }

        // Use RSI overbought as resistance indicator
        if (features.rsi > 70) {
            return currentPrice * 1.03; // 3% above when overbought
        }

        return null;
    }

    private findNearestSupport(currentPrice: number, features: MarketFeatures): number | null
    {
        // Use support_resistance_proximity to estimate support
        if (features.support_resistance_proximity < 0.2) {
            // We're near support, estimate it
            return currentPrice * 0.98; // 2% below current price
        }

        // Use RSI oversold as support indicator
        if (features.rsi < 30) {
            return currentPrice * 0.97; // 3% below when oversold
        }

        return null;
    }

    private priceToPips(priceDistance: number, symbol: string): number
    {
        // Different pip calculations for different symbols
        if (symbol.includes('R_')) {
            // Volatility indices typically have different pip values
            return Math.round(priceDistance * 1000);
        } else {
            // Boom/Crash indices
            return Math.round(priceDistance * 10000);
        }
    }

    private calculateSuccessProbability(confidence: number, volatility: VolatilityProfile): number
    {
        // Adjust confidence based on market volatility
        let adjustedProbability = confidence;

        // High volatility can increase both risk and reward
        if (volatility.typical_move_size > 0.05) {
            adjustedProbability *= 0.9; // Slightly reduce probability in high volatility
        }

        // Spike instruments have different success patterns
        if (volatility.spike_frequency > 0) {
            adjustedProbability *= 0.95; // Slightly more unpredictable
        }

        return Math.max(0.5, Math.min(0.95, adjustedProbability));
    }
}
