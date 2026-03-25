// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { globalStore } from "@/app/store/jotaiStore";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import * as React from "react";
import { useState } from "react";
import type { HyperliquidOrder, HyperliquidPosition, PortfolioViewModel } from "./portfolio-model";
import "./portfolio.scss";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number, decimals = 2): string {
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pnlClass(val: string | number): string {
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (n > 0) return "pnl-positive";
    if (n < 0) return "pnl-negative";
    return "";
}

// ── overview card ────────────────────────────────────────────────────────────

function OverviewPanel({
    marginSummary,
}: {
    marginSummary: {
        accountValue: string;
        totalNtlPos: string;
        totalRawUsd: string;
        totalMarginUsed: string;
        withdrawable: string;
    };
}) {
    const stats = [
        { label: "Account Value", value: "$" + fmt(marginSummary.accountValue) },
        { label: "Total Position", value: "$" + fmt(marginSummary.totalNtlPos) },
        { label: "Margin Used", value: "$" + fmt(marginSummary.totalMarginUsed) },
        { label: "Withdrawable", value: "$" + fmt(marginSummary.withdrawable) },
    ];

    return (
        <div className="portfolio-overview">
            {stats.map((s) => (
                <div key={s.label} className="pf-stat-card">
                    <div className="pf-stat-label">{s.label}</div>
                    <div className="pf-stat-value">{s.value}</div>
                </div>
            ))}
        </div>
    );
}

// ── positions table ───────────────────────────────────────────────────────────

function PositionsPanel({ positions }: { positions: HyperliquidPosition[] }) {
    if (positions.length === 0) {
        return <div className="pf-empty">No open positions</div>;
    }
    return (
        <div className="pf-table-wrapper">
            <table className="pf-table">
                <thead>
                    <tr>
                        <th>Coin</th>
                        <th>Side</th>
                        <th>Size</th>
                        <th>Entry Px</th>
                        <th>Value</th>
                        <th>uPnL</th>
                        <th>ROE</th>
                        <th>Leverage</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map((p) => {
                        const szi = parseFloat(p.szi);
                        const side = szi >= 0 ? "Long" : "Short";
                        return (
                            <tr key={p.coin}>
                                <td className="pf-coin">{p.coin}</td>
                                <td className={szi >= 0 ? "pnl-positive" : "pnl-negative"}>{side}</td>
                                <td>{fmt(Math.abs(szi), 4)}</td>
                                <td>${fmt(p.entryPx)}</td>
                                <td>${fmt(p.positionValue)}</td>
                                <td className={pnlClass(p.unrealizedPnl)}>
                                    ${fmt(p.unrealizedPnl)}
                                </td>
                                <td className={pnlClass(p.returnOnEquity)}>
                                    {(parseFloat(p.returnOnEquity) * 100).toFixed(2)}%
                                </td>
                                <td>
                                    {p.leverage?.value}x{" "}
                                    <span className="pf-lev-type">({p.leverage?.type})</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── orders table ─────────────────────────────────────────────────────────────

function OrdersPanel({ orders }: { orders: HyperliquidOrder[] }) {
    if (orders.length === 0) {
        return <div className="pf-empty">No open orders</div>;
    }
    return (
        <div className="pf-table-wrapper">
            <table className="pf-table">
                <thead>
                    <tr>
                        <th>Coin</th>
                        <th>Side</th>
                        <th>Limit Px</th>
                        <th>Size</th>
                        <th>Filled</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((o) => {
                        const filled = parseFloat(o.origSz) - parseFloat(o.sz);
                        return (
                            <tr key={o.oid}>
                                <td className="pf-coin">{o.coin}</td>
                                <td className={o.side === "B" ? "pnl-positive" : "pnl-negative"}>
                                    {o.side === "B" ? "Buy" : "Sell"}
                                </td>
                                <td>${fmt(o.limitPx)}</td>
                                <td>{fmt(o.sz, 4)}</td>
                                <td>
                                    {fmt(filled, 4)} / {fmt(o.origSz, 4)}
                                </td>
                                <td className="pf-time">{new Date(o.timestamp).toLocaleTimeString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── address input ─────────────────────────────────────────────────────────────

function AddressInput({ model }: { model: PortfolioViewModel }) {
    const [input, setInput] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (input.trim()) model.loadWallet(input.trim());
    }

    return (
        <div className="pf-address-prompt">
            <div className="pf-address-title">
                <i className="fa fa-wallet" /> Hyperliquid Portfolio Viewer
            </div>
            <p className="pf-address-desc">
                Enter a Hyperliquid wallet address to view positions, orders, and account summary.
            </p>
            <form className="pf-address-form" onSubmit={handleSubmit}>
                <input
                    className="pf-address-input"
                    placeholder="0x… wallet address"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                />
                <button type="submit" className="pf-address-btn">
                    Load
                </button>
            </form>
        </div>
    );
}

// ── main view ─────────────────────────────────────────────────────────────────

interface PortfolioViewProps {
    model: PortfolioViewModel;
}

type TabKey = "overview" | "positions" | "orders";

export function PortfolioView({ model }: PortfolioViewProps) {
    const address = useAtomValue(model.walletAddress);
    const portfolio = useAtomValue(model.portfolio);
    const loading = useAtomValue(model.isLoading);
    const activeTab = useAtomValue(model.activeTab);

    if (!address) {
        return (
            <div className="portfolio-view">
                <AddressInput model={model} />
            </div>
        );
    }

    const tabs: { key: TabKey; label: string; icon: string }[] = [
        { key: "overview", label: "Overview", icon: "chart-pie" },
        { key: "positions", label: "Positions", icon: "layer-group" },
        { key: "orders", label: "Orders", icon: "list" },
    ];

    return (
        <div className="portfolio-view">
            {/* ── header ── */}
            <div className="pf-header">
                <div className="pf-wallet">
                    <i className="fa fa-wallet" />
                    <span className="pf-wallet-address">{address.slice(0, 8)}…{address.slice(-6)}</span>
                </div>
                <div className="pf-header-actions">
                    <button
                        className="pf-btn"
                        onClick={() => model.loadWallet(address)}
                        title="Refresh"
                    >
                        <i className={clsx("fa fa-sync", loading && "fa-spin")} />
                    </button>
                    <button
                        className="pf-btn pf-btn-sm"
                        onClick={() => globalStore.set(model.walletAddress, "")}
                        title="Change wallet"
                    >
                        <i className="fa fa-xmark" />
                    </button>
                </div>
            </div>

            {portfolio.error && (
                <div className="pf-error">{portfolio.error}</div>
            )}

            {/* ── tabs ── */}
            <div className="pf-tabs">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        className={clsx("pf-tab", activeTab === t.key && "active")}
                        onClick={() => globalStore.set(model.activeTab, t.key)}
                    >
                        <i className={`fa fa-${t.icon}`} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ── content ── */}
            <div className="pf-content">
                {activeTab === "overview" && (
                    <OverviewPanel marginSummary={portfolio.marginSummary} />
                )}
                {activeTab === "positions" && (
                    <PositionsPanel positions={portfolio.positions} />
                )}
                {activeTab === "orders" && (
                    <OrdersPanel orders={portfolio.openOrders} />
                )}
            </div>
        </div>
    );
}
