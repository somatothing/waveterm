// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BlockNodeModel } from "@/app/block/blocktypes";
import { globalStore } from "@/app/store/jotaiStore";
import type { TabModel } from "@/app/store/tab-model";
import { atom, PrimitiveAtom } from "jotai";

export type CandleData = {
    ts: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type OrderBookLevel = {
    px: string;
    sz: string;
    n: number;
};

export type OrderBook = {
    levels: [OrderBookLevel[], OrderBookLevel[]]; // [bids, asks]
    time: number;
};

export type Trade = {
    coin: string;
    side: string;
    px: string;
    sz: string;
    time: number;
    hash: string;
    tid: number;
};

export type MarketSummary = {
    coin: string;
    markPx: string;
    midPx: string;
    prevDayPx: string;
    dayNtlVlm: string;
    premium: string;
    openInterest: string;
    oraclePx: string;
    impactPxs: string[];
    dayBaseVlm: string;
};

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "ARB", "HYPE", "AVAX", "LINK", "DOT"];

const REFRESH_INTERVAL_MS = 5000;

export class FinstreamViewModel implements ViewModel {
    blockId: string;
    nodeModel: BlockNodeModel;
    tabModel: TabModel;

    viewType = "finstream";
    viewIcon = atom("chart-line");
    viewName = atom("FinStream");

    selectedSymbol: PrimitiveAtom<string>;
    availableSymbols: PrimitiveAtom<string[]>;
    orderBook: PrimitiveAtom<OrderBook>;
    recentTrades: PrimitiveAtom<Trade[]>;
    marketSummary: PrimitiveAtom<MarketSummary>;
    priceHistory: PrimitiveAtom<CandleData[]>;
    isLoading: PrimitiveAtom<boolean>;
    errorMsg: PrimitiveAtom<string>;
    autoRefresh: PrimitiveAtom<boolean>;

    private refreshTimer: ReturnType<typeof setInterval> = null;

    viewComponent: React.ComponentType<any>;

    constructor({ blockId, nodeModel, tabModel }: ViewModelInitType) {
        this.blockId = blockId;
        this.nodeModel = nodeModel;
        this.tabModel = tabModel;

        this.selectedSymbol = atom("BTC");
        this.availableSymbols = atom(DEFAULT_SYMBOLS);
        this.orderBook = atom(null as OrderBook);
        this.recentTrades = atom([] as Trade[]);
        this.marketSummary = atom(null as MarketSummary);
        this.priceHistory = atom([] as CandleData[]);
        this.isLoading = atom(false);
        this.errorMsg = atom("");
        this.autoRefresh = atom(true);

        // Dynamically import the view component to avoid circular dependencies
        import("./finstream").then((m) => {
            this.viewComponent = m.FinstreamView;
        });

        this.fetchAllData();
        this.startAutoRefresh();
    }

    private async fetchAllData(): Promise<void> {
        const symbol = globalStore.get(this.selectedSymbol);
        globalStore.set(this.isLoading, true);
        globalStore.set(this.errorMsg, "");

        try {
            await Promise.all([
                this.fetchMarketSummary(symbol),
                this.fetchOrderBook(symbol),
                this.fetchRecentTrades(symbol),
                this.fetchPriceHistory(symbol),
            ]);
        } catch (e) {
            globalStore.set(this.errorMsg, String(e));
        } finally {
            globalStore.set(this.isLoading, false);
        }
    }

    private async fetchMarketSummary(symbol: string): Promise<void> {
        try {
            const resp = await fetch(HYPERLIQUID_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "metaAndAssetCtxs" }),
            });
            const data = await resp.json();
            // data is [meta, assetCtxs]
            const meta = data[0];
            const assetCtxs = data[1];
            const universe: { name: string }[] = meta?.universe ?? [];
            const idx = universe.findIndex((u) => u.name === symbol);
            if (idx >= 0 && assetCtxs[idx]) {
                const ctx = assetCtxs[idx];
                const summary: MarketSummary = {
                    coin: symbol,
                    markPx: ctx.markPx ?? "0",
                    midPx: ctx.midPx ?? "0",
                    prevDayPx: ctx.prevDayPx ?? "0",
                    dayNtlVlm: ctx.dayNtlVlm ?? "0",
                    premium: ctx.premium ?? "0",
                    openInterest: ctx.openInterest ?? "0",
                    oraclePx: ctx.oraclePx ?? "0",
                    impactPxs: ctx.impactPxs ?? [],
                    dayBaseVlm: ctx.dayBaseVlm ?? "0",
                };
                globalStore.set(this.marketSummary, summary);
            }
        } catch (e) {
            console.warn("[finstream] fetchMarketSummary error:", e);
        }
    }

    private async fetchOrderBook(symbol: string): Promise<void> {
        try {
            const resp = await fetch(HYPERLIQUID_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "l2Book", coin: symbol }),
            });
            const data: OrderBook = await resp.json();
            globalStore.set(this.orderBook, data);
        } catch (e) {
            console.warn("[finstream] fetchOrderBook error:", e);
        }
    }

    private async fetchRecentTrades(symbol: string): Promise<void> {
        try {
            const resp = await fetch(HYPERLIQUID_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "recentTrades", coin: symbol }),
            });
            const data: Trade[] = await resp.json();
            globalStore.set(this.recentTrades, Array.isArray(data) ? data.slice(0, 30) : []);
        } catch (e) {
            console.warn("[finstream] fetchRecentTrades error:", e);
        }
    }

    private async fetchPriceHistory(symbol: string): Promise<void> {
        try {
            // Fetch hourly candle data for the past 48h
            const endTime = Date.now();
            const startTime = endTime - 48 * 60 * 60 * 1000;
            const resp = await fetch(HYPERLIQUID_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "candleSnapshot",
                    req: { coin: symbol, interval: "1h", startTime, endTime },
                }),
            });
            const data = await resp.json();
            const candles: CandleData[] = Array.isArray(data)
                ? data.map((c: any) => ({
                      ts: c.t,
                      open: parseFloat(c.o),
                      high: parseFloat(c.h),
                      low: parseFloat(c.l),
                      close: parseFloat(c.c),
                      volume: parseFloat(c.v),
                  }))
                : [];
            globalStore.set(this.priceHistory, candles);
        } catch (e) {
            console.warn("[finstream] fetchPriceHistory error:", e);
        }
    }

    setSymbol(symbol: string): void {
        globalStore.set(this.selectedSymbol, symbol);
        this.fetchAllData();
    }

    refresh(): void {
        this.fetchAllData();
    }

    private startAutoRefresh(): void {
        this.refreshTimer = setInterval(() => {
            if (globalStore.get(this.autoRefresh)) {
                this.fetchAllData();
            }
        }, REFRESH_INTERVAL_MS);
    }

    dispose(): void {
        if (this.refreshTimer != null) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    giveFocus(): boolean {
        return false;
    }
}
