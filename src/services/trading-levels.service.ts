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
        // More accurate stop loss calculation based on real market behavior
        const baseStopLossPercentage = this.getBaseStopLoss(symbol, timeframe);
        const volatilityAdjustment = this.getVolatilityAdjustment(features, symbol);
        const stopLossPercentage = baseStopLossPercentage * volatilityAdjustment;

        const stopLoss = currentPrice * (1 - stopLossPercentage);
        const stopLossDistance = currentPrice - stopLoss;

        // Take profit based on realistic risk-reward and market conditions
        const takeProfitDistance = stopLossDistance * riskReward;
        let takeProfit = currentPrice + takeProfitDistance;

        // Adjust for realistic market targets
        const maxRealisticGain = this.getMaxRealisticGain(symbol, timeframe);
        takeProfit = Math.min(takeProfit, currentPrice * (1 + maxRealisticGain));

        // Ensure minimum risk-reward ratio
        if ((takeProfit - currentPrice) < (stopLossDistance * 1.5)) {
            takeProfit = currentPrice + (stopLossDistance * 1.5);
        }

        // Remove safety caps to see natural calculation
        const actualStopLoss = stopLoss;
        const actualTakeProfit = takeProfit;
        const actualRiskReward = (actualTakeProfit - currentPrice) / (currentPrice - actualStopLoss);

        return {
            entry_price: currentPrice,
            stop_loss: actualStopLoss,
            take_profit: actualTakeProfit,
            risk_reward_ratio: actualRiskReward,
            max_drawdown_pips: this.priceToPips(currentPrice - actualStopLoss, symbol, currentPrice),
            target_pips: this.priceToPips(actualTakeProfit - currentPrice, symbol, currentPrice)
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
        // More accurate sell levels calculation
        const baseStopLossPercentage = this.getBaseStopLoss(symbol, timeframe);
        const volatilityAdjustment = this.getVolatilityAdjustment(features, symbol);
        const stopLossPercentage = baseStopLossPercentage * volatilityAdjustment;

        const stopLoss = currentPrice * (1 + stopLossPercentage);
        const stopLossDistance = stopLoss - currentPrice;

        // Take profit based on realistic risk-reward and market conditions
        const takeProfitDistance = stopLossDistance * riskReward;
        let takeProfit = currentPrice - takeProfitDistance;

        // Adjust for realistic market targets
        const maxRealisticGain = this.getMaxRealisticGain(symbol, timeframe);
        takeProfit = Math.max(takeProfit, currentPrice * (1 - maxRealisticGain));

        // Ensure minimum risk-reward ratio
        if ((currentPrice - takeProfit) < (stopLossDistance * 1.5)) {
            takeProfit = currentPrice - (stopLossDistance * 1.5);
        }

        // Remove safety caps to see natural calculation
        const actualStopLoss = stopLoss;
        const actualTakeProfit = takeProfit;
        const actualRiskReward = (currentPrice - actualTakeProfit) / (actualStopLoss - currentPrice);

        return {
            entry_price: currentPrice,
            stop_loss: actualStopLoss,
            take_profit: actualTakeProfit,
            risk_reward_ratio: actualRiskReward,
            max_drawdown_pips: this.priceToPips(actualStopLoss - currentPrice, symbol, currentPrice),
            target_pips: this.priceToPips(currentPrice - actualTakeProfit, symbol, currentPrice)
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
        // More conservative and realistic risk-reward based on confidence
        let riskReward = 1.2; // Minimum 1:1.2

        // Base risk-reward tiers based on confidence levels
        if (confidence > 0.9) riskReward = 2.0;        // Very high confidence
        else if (confidence > 0.85) riskReward = 1.8;  // High confidence
        else if (confidence > 0.8) riskReward = 1.6;   // Good confidence
        else if (confidence > 0.75) riskReward = 1.5;  // Moderate confidence
        else if (confidence > 0.7) riskReward = 1.4;   // Low-moderate confidence
        else if (confidence > 0.65) riskReward = 1.3;  // Low confidence
        else riskReward = 1.2;                          // Very low confidence

        // Adjust for market volatility - be more conservative in volatile markets
        if (volatility.typical_move_size > 0.02) {
            riskReward *= 0.9; // Slightly lower R:R in highly volatile markets
        } else if (volatility.typical_move_size < 0.01) {
            riskReward *= 1.1; // Slightly higher R:R in stable markets
        }

        // For spike instruments, be more conservative
        if (volatility.spike_frequency > 0) {
            riskReward *= 0.85; // More conservative for Boom/Crash
        }

        return Math.max(1.2, Math.min(riskReward, 2.5)); // Cap between 1:1.2 and 1:2.5
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
        // More realistic position sizing
        const maxRiskPerTrade = confidence > 0.8 ? 0.02 : 0.01; // 2% for high confidence, 1% for lower

        // Calculate position size based on stop loss percentage
        const stopLossPercentage = Math.abs(stopLossDistance / 100); // Convert to absolute percentage
        const positionSize = Math.min(maxRiskPerTrade / Math.max(stopLossPercentage, 0.01), 0.05); // Cap at 5%

        // Conservative position sizing based on confidence
        let adjustedPositionSize = positionSize;
        if (confidence > 0.85) adjustedPositionSize = Math.min(0.03, positionSize); // High confidence: up to 3%
        else if (confidence > 0.75) adjustedPositionSize = Math.min(0.02, positionSize); // Good confidence: up to 2%
        else if (confidence > 0.65) adjustedPositionSize = Math.min(0.015, positionSize); // Moderate confidence: up to 1.5%
        else adjustedPositionSize = Math.min(0.01, positionSize); // Low confidence: up to 1%

        return {
            position_size_suggestion: Math.max(0.005, adjustedPositionSize), // Minimum 0.5%
            max_risk_per_trade: maxRiskPerTrade,
            probability_of_success: this.calculateSuccessProbability(confidence, volatility)
        };
    }

    getVolatilityProfile(symbol: string, features: MarketFeatures): VolatilityProfile
    {
        // More accurate volatility profiles based on real Deriv data
        const baseProfiles: Record<string, VolatilityProfile> = {
            'BOOM1000': {
                daily_range: 0.08,      // 8% typical daily range
                hourly_range: 0.02,     // 2% typical hourly range
                spike_frequency: 0.001, // 1 in 1000 chance per tick
                typical_move_size: 0.008 // 0.8% typical move
            },
            'BOOM500': {
                daily_range: 0.12,      // 12% typical daily range
                hourly_range: 0.035,    // 3.5% typical hourly range
                spike_frequency: 0.002, // 1 in 500 chance per tick
                typical_move_size: 0.012 // 1.2% typical move
            },
            'CRASH1000': {
                daily_range: 0.08,      // 8% typical daily range
                hourly_range: 0.02,     // 2% typical hourly range
                spike_frequency: 0.001, // 1 in 1000 chance per tick
                typical_move_size: 0.008 // 0.8% typical move
            },
            'CRASH500': {
                daily_range: 0.12,      // 12% typical daily range
                hourly_range: 0.035,    // 3.5% typical hourly range
                spike_frequency: 0.002, // 1 in 500 chance per tick
                typical_move_size: 0.012 // 1.2% typical move
            },
            'R_10': {
                daily_range: 0.05,      // 5% daily range for low volatility
                hourly_range: 0.012,    // 1.2% hourly range
                spike_frequency: 0,     // No spikes
                typical_move_size: 0.004 // 0.4% typical move
            },
            'R_25': {
                daily_range: 0.12,      // 12% daily range
                hourly_range: 0.025,    // 2.5% hourly range
                spike_frequency: 0,     // No spikes
                typical_move_size: 0.008 // 0.8% typical move
            },
            'R_50': {
                daily_range: 0.25,      // 25% daily range
                hourly_range: 0.05,     // 5% hourly range
                spike_frequency: 0,     // No spikes
                typical_move_size: 0.015 // 1.5% typical move
            },
            'R_75': {
                daily_range: 0.35,      // 35% daily range
                hourly_range: 0.075,    // 7.5% hourly range
                spike_frequency: 0,     // No spikes
                typical_move_size: 0.022 // 2.2% typical move
            },
            'R_100': {
                daily_range: 0.45,      // 45% daily range
                hourly_range: 0.1,      // 10% hourly range
                spike_frequency: 0,     // No spikes
                typical_move_size: 0.03  // 3% typical move
            }
        };

        const baseProfile = baseProfiles[ symbol ] || baseProfiles[ 'R_25' ]!;

        // Adjust based on current market conditions more intelligently
        const volatilityMultiplier = Math.max(0.5, Math.min(2.0, features.volatility_momentum || 1.0));

        return {
            daily_range: baseProfile.daily_range * volatilityMultiplier,
            hourly_range: baseProfile.hourly_range * volatilityMultiplier,
            spike_frequency: baseProfile.spike_frequency,
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

    private priceToPips(priceDistance: number, symbol: string, currentPrice?: number): number
    {
        // Standard pip calculations for trading platforms
        const absDistance = Math.abs(priceDistance);

        if (symbol.includes('R_')) {
            // Volatility indices: usually quoted to 3 decimal places
            // 1 pip = 0.001, so multiply by 1000
            return Math.round(absDistance * 1000);
        } else if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
            // Boom/Crash indices: usually quoted to 3 decimal places
            // For these large numbers, 1 pip = 0.001
            return Math.round(absDistance * 1000);
        } else {
            // Default: assume 2 decimal places, 1 pip = 0.01
            return Math.round(absDistance * 100);
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

    private getBaseStopLoss(symbol: string, timeframe: string): number
    {
        // Much more conservative and realistic base stop loss percentages
        const symbolStopLoss: Record<string, number> = {
            'BOOM1000': 0.003,  // 0.3% base for BOOM1000 (about 50 pips)
            'BOOM500': 0.005,   // 0.5% base for BOOM500 (about 85 pips)
            'CRASH1000': 0.003, // 0.3% base for CRASH1000 (about 50 pips)
            'CRASH500': 0.005,  // 0.5% base for CRASH500 (about 85 pips)
            'R_10': 0.002,      // 0.2% for low volatility (about 2 pips)
            'R_25': 0.004,      // 0.4% for medium-low volatility (about 10 pips)
            'R_50': 0.006,      // 0.6% for medium volatility (about 30 pips)
            'R_75': 0.008,      // 0.8% for medium-high volatility (about 60 pips)
            'R_100': 0.01       // 1% for high volatility (about 100 pips)
        };

        const timeframeMultiplier: Record<string, number> = {
            '1m': 0.6,   // Tighter stops for scalping
            '5m': 0.8,   // Slightly tighter
            '15m': 1.0,  // Base multiplier
            '30m': 1.2,  // Slightly wider for swing
            '1h': 1.4    // Wider stops for position trades
        };

        const baseStopLoss = symbolStopLoss[ symbol ] || 0.005;
        const multiplier = timeframeMultiplier[ timeframe ] || 1.0;

        return baseStopLoss * multiplier;
    }

    private getVolatilityAdjustment(features: MarketFeatures, symbol: string): number
    {
        let adjustment = 1.0;

        // More conservative volatility adjustments
        if (features.volatility_momentum > 0.7) {
            adjustment *= 1.15; // Only 15% wider stops in high volatility
        } else if (features.volatility_momentum < 0.3) {
            adjustment *= 0.9; // Only 10% tighter stops in low volatility
        }

        // Minimal trend strength adjustment
        if (features.trend_strength > 0.8) {
            adjustment *= 0.95; // Only 5% tighter stops in strong trends
        } else if (features.trend_strength < 0.3) {
            adjustment *= 1.05; // Only 5% wider stops in choppy markets
        }

        // Special adjustment for Boom/Crash near spike zones
        if ((symbol.includes('BOOM') || symbol.includes('CRASH')) && (features.spike_probability || 0) > 0.4) {
            adjustment *= 0.8; // 20% tighter stops when spike is imminent
        }

        // Minimal RSI extreme conditions adjustment
        if (features.rsi > 80 || features.rsi < 20) {
            adjustment *= 0.95; // Only 5% tighter stops at extremes
        }

        return Math.max(0.8, Math.min(1.3, adjustment)); // Cap between 80% and 130%
    }

    private getMaxRealisticGain(symbol: string, timeframe: string): number
    {
        // Maximum realistic gains based on historical data and symbol characteristics
        const symbolMaxGains: Record<string, Record<string, number>> = {
            'BOOM1000': {
                '1m': 0.005,   // 0.5% max for 1 minute
                '5m': 0.01,    // 1% max for 5 minutes
                '15m': 0.025,  // 2.5% max for 15 minutes
                '30m': 0.04,   // 4% max for 30 minutes
                '1h': 0.06     // 6% max for 1 hour
            },
            'BOOM500': {
                '1m': 0.008,   // 0.8% max for 1 minute
                '5m': 0.015,   // 1.5% max for 5 minutes
                '15m': 0.035,  // 3.5% max for 15 minutes
                '30m': 0.055,  // 5.5% max for 30 minutes
                '1h': 0.08     // 8% max for 1 hour
            },
            'CRASH1000': {
                '1m': 0.005,
                '5m': 0.01,
                '15m': 0.025,
                '30m': 0.04,
                '1h': 0.06
            },
            'CRASH500': {
                '1m': 0.008,
                '5m': 0.015,
                '15m': 0.035,
                '30m': 0.055,
                '1h': 0.08
            },
            'R_10': {
                '1m': 0.003,
                '5m': 0.008,
                '15m': 0.015,
                '30m': 0.025,
                '1h': 0.04
            },
            'R_25': {
                '1m': 0.006,
                '5m': 0.012,
                '15m': 0.025,
                '30m': 0.04,
                '1h': 0.06
            },
            'R_50': {
                '1m': 0.01,
                '5m': 0.02,
                '15m': 0.04,
                '30m': 0.065,
                '1h': 0.1
            },
            'R_75': {
                '1m': 0.015,
                '5m': 0.03,
                '15m': 0.055,
                '30m': 0.08,
                '1h': 0.12
            },
            'R_100': {
                '1m': 0.02,
                '5m': 0.04,
                '15m': 0.07,
                '30m': 0.1,
                '1h': 0.15
            }
        };

        const symbolGains = symbolMaxGains[ symbol ];
        if (!symbolGains) {
            // Default gains for unknown symbols
            const defaults: Record<string, number> = {
                '1m': 0.005,
                '5m': 0.01,
                '15m': 0.025,
                '30m': 0.04,
                '1h': 0.06
            };
            return defaults[ timeframe ] || 0.03;
        }

        return symbolGains[ timeframe ] || 0.03;
    }
}
