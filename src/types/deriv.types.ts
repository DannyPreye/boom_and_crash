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

export interface DerivSymbol
{
    symbol: string;
    display_name: string;
    market: string;
    submarket: string;
    symbol_type: 'synthetic_index';
    pip: number;
    spot?: number;
}

export interface DerivAPIConfig
{
    apiUrl: string;
    apiToken: string;
    appId: string;
}

export interface DerivWSMessage
{
    msg_type?: string;
    req_id?: number;
    [ key: string ]: any;
}

export interface DerivSubscription
{
    id: string;
    symbol: string;
    subscribe: 'ticks' | 'candles' | 'ohlc';
    granularity?: number;
    style?: 'ticks' | 'candles';
    count?: number;
}

export type SyntheticSymbol = 'BOOM1000' | 'BOOM500' | 'CRASH1000' | 'CRASH500' | 'R_10' | 'R_25' | 'R_50' | 'R_75' | 'R_100';

export interface DerivConnectionState
{
    isConnected: boolean;
    lastHeartbeat: number;
    reconnectAttempts: number;
    subscriptions: Map<string, DerivSubscription>;
}
