// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BlockNodeModel } from "@/app/block/blocktypes";
import { globalStore } from "@/app/store/jotaiStore";
import type { TabModel } from "@/app/store/tab-model";
import { atom, PrimitiveAtom } from "jotai";

export type HyperliquidPosition = {
    coin: string;
    szi: string;        // signed size (positive = long, negative = short)
    entryPx: string;    // average entry price
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string;
    leverage: { type: string; value: number };
    marginUsed: string;
    maxTradeSzs: string[];
    cumFunding: { allTime: string; sinceOpen: string; sinceChange: string };
};

export type HyperliquidOrder = {
    coin: string;
    side: string;
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
    cloid: string;
};

export type PortfolioState = {
    marginSummary: {
        accountValue: string;
        totalNtlPos: string;
        totalRawUsd: string;
        totalMarginUsed: string;
        withdrawable: string;
    };
    positions: HyperliquidPosition[];
    openOrders: HyperliquidOrder[];
    address: string;
    error: string;
};

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

const REFRESH_INTERVAL_MS = 10000;

export class PortfolioViewModel implements ViewModel {
    blockId: string;
    nodeModel: BlockNodeModel;
    tabModel: TabModel;

    viewType = "portfolio";
    viewIcon = atom("wallet");
    viewName = atom("Portfolio");

    walletAddress: PrimitiveAtom<string>;
    portfolio: PrimitiveAtom<PortfolioState>;
    isLoading: PrimitiveAtom<boolean>;
    activeTab: PrimitiveAtom<"positions" | "orders" | "overview">;

    private refreshTimer: ReturnType<typeof setInterval> = null;

    viewComponent: React.ComponentType<any>;

    constructor({ blockId, nodeModel, tabModel }: ViewModelInitType) {
        this.blockId = blockId;
        this.nodeModel = nodeModel;
        this.tabModel = tabModel;

        this.walletAddress = atom("");
        this.portfolio = atom({
            marginSummary: {
                accountValue: "0",
                totalNtlPos: "0",
                totalRawUsd: "0",
                totalMarginUsed: "0",
                withdrawable: "0",
            },
            positions: [],
            openOrders: [],
            address: "",
            error: "",
        } as PortfolioState);
        this.isLoading = atom(false);
        this.activeTab = atom("overview" as "positions" | "orders" | "overview");

        // Dynamically import view component
        import("./portfolio").then((m) => {
            this.viewComponent = m.PortfolioView;
        });

        this.startAutoRefresh();
    }

    async loadWallet(address: string): Promise<void> {
        if (!address || !address.trim()) return;
        globalStore.set(this.walletAddress, address.trim());
        await this.fetchPortfolio(address.trim());
    }

    async fetchPortfolio(address: string): Promise<void> {
        if (!address) return;
        globalStore.set(this.isLoading, true);
        try {
            const [clearingResp, ordersResp] = await Promise.all([
                fetch(HYPERLIQUID_API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "clearinghouseState", user: address }),
                }),
                fetch(HYPERLIQUID_API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "openOrders", user: address }),
                }),
            ]);

            const clearing = await clearingResp.json();
            const orders: HyperliquidOrder[] = await ordersResp.json();

            const positions: HyperliquidPosition[] = (clearing?.assetPositions ?? [])
                .filter((ap: any) => parseFloat(ap.position?.szi ?? "0") !== 0)
                .map((ap: any) => ap.position as HyperliquidPosition);

            const marginSummary = clearing?.marginSummary ?? {
                accountValue: "0",
                totalNtlPos: "0",
                totalRawUsd: "0",
                totalMarginUsed: "0",
                withdrawable: "0",
            };

            globalStore.set(this.portfolio, {
                marginSummary,
                positions,
                openOrders: Array.isArray(orders) ? orders : [],
                address,
                error: "",
            });
        } catch (e) {
            globalStore.set(this.portfolio, {
                ...globalStore.get(this.portfolio),
                error: String(e),
            });
        } finally {
            globalStore.set(this.isLoading, false);
        }
    }

    private startAutoRefresh(): void {
        this.refreshTimer = setInterval(() => {
            const addr = globalStore.get(this.walletAddress);
            if (addr) {
                this.fetchPortfolio(addr);
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
