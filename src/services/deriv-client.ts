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

    /**
     * Fetch extensive historical data (6 months to 1 year) for technical analysis
     */
    async getHistoricalData(symbol: string, months: number = 12): Promise<{ ticks: DerivTickData[], candles: DerivCandleData[]; }>
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.ws || !this.isConnected) {
                // Generate extensive mock data if not connected
                const mockData = this.generateExtensiveMockData(symbol, months);
                resolve(mockData);
                return;
            }

            const ticks: DerivTickData[] = [];
            const candles: DerivCandleData[] = [];
            let completedRequests = 0;
            const totalRequests = 3; // We'll make multiple requests to get enough data

            // Calculate time periods for different granularities
            const now = Math.floor(Date.now() / 1000);
            const sixMonthsAgo = now - (6 * 30 * 24 * 60 * 60); // 6 months ago
            const oneYearAgo = now - (12 * 30 * 24 * 60 * 60); // 1 year ago

            // Request 1: Daily candles for the past year (for long-term trends)
            const dailyRequest = {
                ticks_history: symbol,
                granularity: 86400, // 1 day
                style: 'candles',
                count: 365, // 1 year of daily data
                start: oneYearAgo,
                end: now,
                req_id: Math.floor(Math.random() * 1000000),
            };

            // Request 2: Hourly candles for the past 6 months (for medium-term analysis)
            const hourlyRequest = {
                ticks_history: symbol,
                granularity: 3600, // 1 hour
                style: 'candles',
                count: 4380, // 6 months of hourly data (6 * 30 * 24)
                start: sixMonthsAgo,
                end: now,
                req_id: Math.floor(Math.random() * 1000000),
            };

            // Request 3: 5-minute candles for the past month (for short-term analysis)
            const fiveMinRequest = {
                ticks_history: symbol,
                granularity: 300, // 5 minutes
                style: 'candles',
                count: 8640, // 1 month of 5-minute data (30 * 24 * 12)
                start: now - (30 * 24 * 60 * 60), // 1 month ago
                end: now,
                req_id: Math.floor(Math.random() * 1000000),
            };

            const handleResponse = (data: any) =>
            {
                if (data.msg_type === 'candles' && data.candles) {
                    const candleData: DerivCandleData[] = data.candles.map((candle: any) => ({
                        symbol: data.symbol || symbol,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                        epoch: candle.epoch,
                        volume: candle.volume || 0,
                    }));
                    candles.push(...candleData);
                }
                completedRequests++;

                if (completedRequests >= totalRequests) {
                    // Generate mock ticks based on the candle data
                    const mockTicks = this.generateTicksFromCandles(candles, symbol);
                    resolve({ ticks: mockTicks, candles });
                }
            };

            // Send requests
            this.ws.send(JSON.stringify(dailyRequest));
            this.ws.send(JSON.stringify(hourlyRequest));
            this.ws.send(JSON.stringify(fiveMinRequest));

            // Set up response handler
            const originalHandler = this.handleMessage.bind(this);
            this.handleMessage = (data: string) =>
            {
                try {
                    const message = JSON.parse(data);
                    if (message.msg_type === 'candles') {
                        handleResponse(message);
                    }
                    originalHandler(data);
                } catch (error) {
                    console.error('Failed to parse historical data message:', error);
                }
            };

            // Timeout after 10 seconds
            setTimeout(() =>
            {
                if (completedRequests < totalRequests) {
                    console.warn('Historical data request timed out, using mock data');
                    const mockData = this.generateExtensiveMockData(symbol, months);
                    resolve(mockData);
                }
            }, 10000);
        });
    }

    /**
     * Generate extensive mock data for testing (6 months to 1 year)
     */
    private generateExtensiveMockData(symbol: string, months: number): { ticks: DerivTickData[], candles: DerivCandleData[]; }
    {
        const ticks: DerivTickData[] = [];
        const candles: DerivCandleData[] = [];

        const now = Date.now();
        const startTime = now - (months * 30 * 24 * 60 * 60 * 1000); // months ago
        const basePrice = 1000;

        // Generate daily candles for the entire period
        const days = months * 30;
        for (let day = 0; day < days; day++) {
            const dayStart = startTime + (day * 24 * 60 * 60 * 1000);

            // Create price movement for the day
            const dailyTrend = Math.sin(day * 0.1) * 50; // Long-term trend
            const dailyVolatility = Math.random() * 20; // Daily volatility

            const open = basePrice + dailyTrend + (Math.random() - 0.5) * dailyVolatility;
            const high = open + Math.random() * dailyVolatility;
            const low = open - Math.random() * dailyVolatility;
            const close = open + (Math.random() - 0.5) * dailyVolatility;

            candles.push({
                symbol,
                open,
                high,
                low,
                close,
                epoch: Math.floor(dayStart / 1000),
                volume: Math.floor(Math.random() * 1000000) + 100000,
            });

            // Generate hourly ticks for this day
            for (let hour = 0; hour < 24; hour++) {
                const hourStart = dayStart + (hour * 60 * 60 * 1000);
                const priceVariation = Math.sin(hour * 0.3) * 5; // Hourly variation
                const tickPrice = close + priceVariation + (Math.random() - 0.5) * 2;

                ticks.push({
                    symbol,
                    tick: day * 24 + hour + 1,
                    epoch: Math.floor(hourStart / 1000),
                    quote: tickPrice,
                    pip_size: 0.01,
                });
            }
        }

        console.log(`📊 Generated ${ticks.length} mock ticks and ${candles.length} mock candles for ${months} months`);
        return { ticks, candles };
    }

    /**
     * Generate ticks from candle data for more granular analysis
     */
    private generateTicksFromCandles(candles: DerivCandleData[], symbol: string): DerivTickData[]
    {
        const ticks: DerivTickData[] = [];

        for (const candle of candles) {
            // Generate 24 ticks per candle (hourly data)
            for (let i = 0; i < 24; i++) {
                const tickTime = candle.epoch + (i * 3600); // Add hours
                const priceVariation = Math.sin(i * 0.3) * (candle.high - candle.low) * 0.1;
                const tickPrice = candle.close + priceVariation;

                ticks.push({
                    symbol,
                    tick: ticks.length + 1,
                    epoch: tickTime,
                    quote: tickPrice,
                    pip_size: 0.01,
                });
            }
        }

        return ticks;
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
