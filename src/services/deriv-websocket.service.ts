import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DerivTickData, DerivCandleData, DerivSymbol, DerivWSMessage, DerivSubscription, DerivConnectionState, SyntheticSymbol } from '../types/deriv.types';
import { config } from '../config';
import { derivLogger, logError, PerformanceTimer } from '../utils/logger';

export class DerivWebSocketService extends EventEmitter
{
    private ws: WebSocket | null = null;
    private connectionState: DerivConnectionState;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private requestQueue: Map<number, (response: any) => void> = new Map();
    private requestCounter = 1;

    constructor ()
    {
        super();
        this.connectionState = {
            isConnected: false,
            lastHeartbeat: 0,
            reconnectAttempts: 0,
            subscriptions: new Map(),
        };
    }

    /**
     * Connect to Deriv WebSocket API
     */
    async connect(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            try {
                derivLogger.info('Connecting to Deriv WebSocket API...');

                this.ws = new WebSocket(config.deriv.apiUrl);

                this.ws.on('open', () =>
                {
                    derivLogger.info('Connected to Deriv WebSocket API');
                    this.connectionState.isConnected = true;
                    this.connectionState.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) =>
                {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', (code: number, reason: Buffer) =>
                {
                    derivLogger.warn(`WebSocket connection closed: ${code} - ${reason.toString()}`);
                    this.handleDisconnection();
                });

                this.ws.on('error', (error: Error) =>
                {
                    logError(derivLogger, error, 'WebSocket connection error');
                    this.handleDisconnection();
                    reject(error);
                });

            } catch (error) {
                logError(derivLogger, error, 'Failed to create WebSocket connection');
                reject(error);
            }
        });
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void
    {
        derivLogger.info('Disconnecting from Deriv WebSocket API...');

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.connectionState.isConnected = false;
        this.emit('disconnected');
    }

    /**
     * Subscribe to tick data for a symbol
     */
    async subscribeToTicks(symbol: SyntheticSymbol): Promise<string>
    {
        const subscriptionId = uuidv4();
        const timer = new PerformanceTimer(derivLogger, `subscribe_ticks_${symbol}`);

        try {
            const message = {
                ticks: symbol,
                subscribe: 1,
                req_id: this.getNextRequestId(),
            };

            await this.sendMessage(message);

            const subscription: DerivSubscription = {
                id: subscriptionId,
                symbol,
                subscribe: 'ticks',
            };

            this.connectionState.subscriptions.set(subscriptionId, subscription);

            timer.end({ symbol, subscription_id: subscriptionId });
            derivLogger.info(`Subscribed to ticks for ${symbol}`);

            return subscriptionId;
        } catch (error) {
            timer.end({ symbol, error: true });
            logError(derivLogger, error, `Failed to subscribe to ticks for ${symbol}`);
            throw error;
        }
    }

    /**
     * Subscribe to candle data for a symbol
     */
    async subscribeToCandles(
        symbol: SyntheticSymbol,
        granularity: number = 60
    ): Promise<string>
    {
        const subscriptionId = uuidv4();
        const timer = new PerformanceTimer(derivLogger, `subscribe_candles_${symbol}`);

        try {
            const message = {
                ticks_history: symbol,
                granularity,
                style: 'candles',
                count: config.prediction.maxHistoricalCandles,
                subscribe: 1,
                req_id: this.getNextRequestId(),
            };

            await this.sendMessage(message);

            const subscription: DerivSubscription = {
                id: subscriptionId,
                symbol,
                subscribe: 'candles',
                granularity,
                style: 'candles',
            };

            this.connectionState.subscriptions.set(subscriptionId, subscription);

            timer.end({ symbol, granularity, subscription_id: subscriptionId });
            derivLogger.info(`Subscribed to candles for ${symbol} (${granularity}s)`);

            return subscriptionId;
        } catch (error) {
            timer.end({ symbol, granularity, error: true });
            logError(derivLogger, error, `Failed to subscribe to candles for ${symbol}`);
            throw error;
        }
    }

    /**
     * Unsubscribe from a subscription
     */
    async unsubscribe(subscriptionId: string): Promise<void>
    {
        const subscription = this.connectionState.subscriptions.get(subscriptionId);
        if (!subscription) {
            derivLogger.warn(`Subscription ${subscriptionId} not found`);
            return;
        }

        try {
            const message = {
                forget: subscription.id,
                req_id: this.getNextRequestId(),
            };

            await this.sendMessage(message);
            this.connectionState.subscriptions.delete(subscriptionId);

            derivLogger.info(`Unsubscribed from ${subscription.symbol}`);
        } catch (error) {
            logError(derivLogger, error, `Failed to unsubscribe from ${subscriptionId}`);
            throw error;
        }
    }

    /**
     * Get current connection state
     */
    getConnectionState(): DerivConnectionState
    {
        return { ...this.connectionState };
    }

    /**
     * Check if connected
     */
    isConnected(): boolean
    {
        return this.connectionState.isConnected && this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Send a message to the WebSocket
     */
    private async sendMessage(message: DerivWSMessage): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.isConnected()) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const reqId = message.req_id || this.getNextRequestId();
            message.req_id = reqId;

            // Store the resolve function for this request
            this.requestQueue.set(reqId, resolve);

            // Set timeout for the request
            setTimeout(() =>
            {
                if (this.requestQueue.has(reqId)) {
                    this.requestQueue.delete(reqId);
                    reject(new Error(`Request ${reqId} timed out`));
                }
            }, 10000); // 10 second timeout

            this.ws!.send(JSON.stringify(message));
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(data: string): void
    {
        try {
            const message: DerivWSMessage = JSON.parse(data);

            // Handle request responses
            if (message.req_id && this.requestQueue.has(message.req_id)) {
                const resolver = this.requestQueue.get(message.req_id)!;
                this.requestQueue.delete(message.req_id);
                resolver(message);
                return;
            }

            // Handle subscription data
            this.handleSubscriptionData(message);

        } catch (error) {
            logError(derivLogger, error, 'Failed to parse WebSocket message', { data });
        }
    }

    /**
     * Handle subscription data
     */
    private handleSubscriptionData(message: DerivWSMessage): void
    {
        if (message.msg_type === 'tick') {
            this.handleTickData(message);
        } else if (message.msg_type === 'candles') {
            this.handleCandleData(message);
        } else if (message.msg_type === 'ohlc') {
            this.handleOHLCData(message);
        }
    }

    /**
     * Handle tick data
     */
    private handleTickData(message: any): void
    {
        try {
            const tickData: DerivTickData = {
                symbol: message.tick.symbol,
                tick: message.tick.tick,
                epoch: message.tick.epoch,
                quote: message.tick.quote,
                pip_size: message.tick.pip_size,
            };

            this.emit('tick', tickData);
        } catch (error) {
            logError(derivLogger, error, 'Failed to process tick data', { message });
        }
    }

    /**
     * Handle candle data
     */
    private handleCandleData(message: any): void
    {
        try {
            if (message.candles && Array.isArray(message.candles)) {
                message.candles.forEach((candle: any) =>
                {
                    const candleData: DerivCandleData = {
                        symbol: message.symbol || 'unknown',
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        epoch: candle.epoch,
                    };

                    this.emit('candle', candleData);
                });
            }
        } catch (error) {
            logError(derivLogger, error, 'Failed to process candle data', { message });
        }
    }

    /**
     * Handle OHLC data
     */
    private handleOHLCData(message: any): void
    {
        try {
            const candleData: DerivCandleData = {
                symbol: message.ohlc.symbol,
                open: message.ohlc.open,
                high: message.ohlc.high,
                low: message.ohlc.low,
                close: message.ohlc.close,
                epoch: message.ohlc.epoch,
            };

            this.emit('candle', candleData);
        } catch (error) {
            logError(derivLogger, error, 'Failed to process OHLC data', { message });
        }
    }

    /**
     * Handle disconnection
     */
    private handleDisconnection(): void
    {
        this.connectionState.isConnected = false;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        this.emit('disconnected');

        // Attempt reconnection if not manually disconnected
        if (this.connectionState.reconnectAttempts < config.websocket.maxReconnectAttempts) {
            this.scheduleReconnection();
        } else {
            derivLogger.error('Max reconnection attempts reached');
            this.emit('error', new Error('Max reconnection attempts reached'));
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnection(): void
    {
        this.connectionState.reconnectAttempts++;
        const delay = config.websocket.reconnectInterval * this.connectionState.reconnectAttempts;

        derivLogger.info(
            `Scheduling reconnection attempt ${this.connectionState.reconnectAttempts} in ${delay}ms`
        );

        this.reconnectTimeout = setTimeout(() =>
        {
            this.connect().catch(error =>
            {
                logError(derivLogger, error, 'Reconnection attempt failed');
            });
        }, delay);
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void
    {
        this.heartbeatInterval = setInterval(() =>
        {
            if (this.isConnected()) {
                this.sendMessage({ ping: 1 }).catch(error =>
                {
                    logError(derivLogger, error, 'Heartbeat failed');
                });
                this.connectionState.lastHeartbeat = Date.now();
            }
        }, config.websocket.heartbeatInterval);
    }

    /**
     * Get next request ID
     */
    private getNextRequestId(): number
    {
        return this.requestCounter++;
    }
}
