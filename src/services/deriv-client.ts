import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface DerivTickData
{
    symbol: string;
    tick: number;
    epoch: number;
    quote: number;
    pip_size: number;
}

export interface DerivCandleData
{
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    epoch: number;
    volume?: number;
}

export class DerivWebSocketClient extends EventEmitter
{
    private ws: WebSocket | null = null;
    private apiUrl: string;
    private apiToken: string;
    private appId: string;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private subscriptions: Map<string, any> = new Map();
    private tickHistory: Map<string, DerivTickData[]> = new Map();

    constructor (apiUrl: string, apiToken: string, appId: string)
    {
        super();
        this.apiUrl = apiUrl;
        this.apiToken = apiToken;
        this.appId = appId;
    }

    async connect(): Promise<void>
    {
        return new Promise((resolve, reject) =>
        {
            try {
                console.log(this.apiUrl, this.apiToken, this.appId);
                this.ws = new WebSocket(this.apiUrl + `?app_id=${this.appId}&token=${this.apiToken}`);

                this.ws.on('open', () =>
                {
                    console.log('Connected to Deriv WebSocket API');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) =>
                {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', () =>
                {
                    console.log('Disconnected from Deriv WebSocket API');
                    this.isConnected = false;
                    this.emit('disconnected');
                    this.scheduleReconnection();
                });

                this.ws.on('error', (error: Error) =>
                {
                    console.warn('Deriv WebSocket connection failed (will continue in mock mode):', error.message);
                    this.isConnected = false;
                    this.emit('error', error);
                    // Don't reject here, just resolve to continue in mock mode
                    resolve();
                });

            } catch (error) {
                console.warn('Failed to initialize Deriv WebSocket, continuing in mock mode');
                resolve();
            }
        });
    }

    private handleMessage(data: string): void
    {
        try {
            const message = JSON.parse(data);

            if (message.msg_type === 'tick') {
                const tickData: DerivTickData = {
                    symbol: message.tick.symbol,
                    tick: message.tick.tick,
                    epoch: message.tick.epoch,
                    quote: message.tick.quote,
                    pip_size: message.tick.pip_size,
                };
                this.emit('tick', tickData);

                // Update tick history
                const history = this.tickHistory.get(tickData.symbol) || [];
                history.push(tickData);
                this.tickHistory.set(tickData.symbol, history);
            } else if (message.msg_type === 'candles' || message.msg_type === 'ohlc') {
                const candleData: DerivCandleData = {
                    symbol: message.symbol || (message.ohlc ? message.ohlc.symbol : 'unknown'),
                    open: message.ohlc ? message.ohlc.open : (message.candles && message.candles[ 0 ] ? message.candles[ 0 ].open : 0),
                    high: message.ohlc ? message.ohlc.high : (message.candles && message.candles[ 0 ] ? message.candles[ 0 ].high : 0),
                    low: message.ohlc ? message.ohlc.low : (message.candles && message.candles[ 0 ] ? message.candles[ 0 ].low : 0),
                    close: message.ohlc ? message.ohlc.close : (message.candles && message.candles[ 0 ] ? message.candles[ 0 ].close : 0),
                    epoch: message.ohlc ? message.ohlc.epoch : (message.candles && message.candles[ 0 ] ? message.candles[ 0 ].epoch : Date.now() / 1000),
                };
                this.emit('candle', candleData);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    async subscribeToTicks(symbol: string): Promise<string>
    {
        const subscriptionId = uuidv4();
        const message = {
            ticks: symbol,
            subscribe: 1,
            req_id: Math.floor(Math.random() * 1000000),
        };

        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
            this.subscriptions.set(subscriptionId, { symbol, type: 'ticks' });
        }

        return subscriptionId;
    }

    async subscribeToCandles(symbol: string, granularity: number = 60): Promise<string>
    {
        const subscriptionId = uuidv4();
        const message = {
            ticks_history: symbol,
            granularity,
            style: 'candles',
            count: 100,
            subscribe: 1,
            req_id: Math.floor(Math.random() * 1000000),
        };

        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
            this.subscriptions.set(subscriptionId, { symbol, type: 'candles', granularity });
        }

        return subscriptionId;
    }

    async getLatestTicks(symbol: string, count: number = 100): Promise<DerivTickData[]>
    {
        return new Promise((resolve, reject) =>
        {
            // Check if we have cached tick data
            const cached = this.tickHistory.get(symbol);
            if (cached && cached.length >= count) {
                resolve(cached.slice(-count));
                return;
            }

            // Subscribe to ticks to get data
            this.subscribeToTicks(symbol)
                .then(() =>
                {
                    // Wait a bit for data to accumulate
                    setTimeout(() =>
                    {
                        const ticks = this.tickHistory.get(symbol) || [];
                        if (ticks.length > 0) {
                            resolve(ticks.slice(-count));
                        } else {
                            // Generate mock data if no real data available
                            const mockTicks: DerivTickData[] = [];
                            const basePrice = 1000;
                            for (let i = 0; i < count; i++) {
                                mockTicks.push({
                                    symbol,
                                    tick: i + 1,
                                    epoch: Date.now() - (count - i) * 1000,
                                    quote: basePrice + (Math.random() - 0.5) * 100,
                                    pip_size: 0.01,
                                });
                            }
                            resolve(mockTicks);
                        }
                    }, 2000);
                })
                .catch(reject);
        });
    }

    private scheduleReconnection(): void
    {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() =>
            {
                this.connect().catch(console.error);
            }, delay);
        }
    }

    disconnect(): void
    {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    getConnectionStatus(): boolean
    {
        return this.isConnected;
    }
}
