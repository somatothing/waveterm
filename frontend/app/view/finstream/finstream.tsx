// Copyright 2026, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { globalStore } from "@/app/store/jotaiStore";
import clsx from "clsx";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import * as Plot from "@observablehq/plot";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import type { CandleData, FinstreamViewModel, MarketSummary, OrderBook, Trade } from "./finstream-model";
import "./finstream.scss";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number, decimals = 2): string {
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(val: string | number): string {
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (!isFinite(n)) return "—";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

function pctChange(current: string, prev: string): { text: string; up: boolean } {
    const c = parseFloat(current);
    const p = parseFloat(prev);
    if (!isFinite(c) || !isFinite(p) || p === 0) return { text: "0.00%", up: true };
    const pct = ((c - p) / p) * 100;
    return { text: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%", up: pct >= 0 };
}

// ── sub-components ───────────────────────────────────────────────────────────

function MarketHeader({ summary }: { summary: MarketSummary }) {
    if (!summary) return null;
    const change = pctChange(summary.markPx, summary.prevDayPx);
    return (
        <div className="fin-market-header">
            <div className="fin-coin">{summary.coin}</div>
            <div className="fin-price">${fmt(summary.markPx)}</div>
            <div className={clsx("fin-change", change.up ? "up" : "down")}>{change.text}</div>
            <div className="fin-stat">
                <span className="fin-stat-label">OI</span>
                <span className="fin-stat-value">{fmtVol(summary.openInterest)}</span>
            </div>
            <div className="fin-stat">
                <span className="fin-stat-label">Vol 24h</span>
                <span className="fin-stat-value">${fmtVol(summary.dayNtlVlm)}</span>
            </div>
        </div>
    );
}

function PriceChart({ candles, width }: { candles: CandleData[]; width: number }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || candles.length === 0) return;
        containerRef.current.innerHTML = "";

        const plot = Plot.plot({
            width: width || 400,
            height: 160,
            style: {
                background: "transparent",
                color: "var(--main-text-color)",
                fontSize: "11px",
            },
            x: {
                type: "time",
                tickFormat: "%H:%M",
                label: null,
            },
            y: {
                label: null,
                grid: true,
                tickFormat: (d) => fmt(d, 0),
            },
            marks: [
                Plot.areaY(candles, {
                    x: (d) => new Date(d.ts),
                    y1: (d) => d.low,
                    y2: (d) => d.high,
                    fill: "var(--finstream-range-fill)",
                    fillOpacity: 0.3,
                }),
                Plot.lineY(candles, {
                    x: (d) => new Date(d.ts),
                    y: (d) => d.close,
                    stroke: "var(--finstream-line-color)",
                    strokeWidth: 2,
                }),
            ],
        });
        containerRef.current.appendChild(plot);
        return () => {
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, [candles, width]);

    return <div className="fin-chart" ref={containerRef} />;
}

function OrderBookSide({
    levels,
    side,
    maxSize,
}: {
    levels: { px: string; sz: string; n: number }[];
    side: "bid" | "ask";
    maxSize: number;
}) {
    return (
        <div className={clsx("fin-ob-side", side)}>
            {levels.slice(0, 10).map((lvl, i) => {
                const pct = maxSize > 0 ? (parseFloat(lvl.sz) / maxSize) * 100 : 0;
                return (
                    <div key={i} className="fin-ob-row">
                        <div className="fin-ob-bar-bg">
                            <div
                                className={clsx("fin-ob-bar", side)}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="fin-ob-px">{fmt(lvl.px)}</span>
                        <span className="fin-ob-sz">{fmtVol(lvl.sz)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function OrderBookPanel({ book }: { book: OrderBook }) {
    if (!book || !book.levels) return <div className="fin-ob-empty">Loading order book…</div>;
    const [bids, asks] = book.levels;
    const allSizes = [...bids, ...asks].map((l) => parseFloat(l.sz));
    const maxSize = Math.max(...allSizes, 1);
    return (
        <div className="fin-orderbook">
            <div className="fin-ob-header">
                <span>Price (USD)</span>
                <span>Size</span>
            </div>
            <OrderBookSide levels={asks.slice().reverse()} side="ask" maxSize={maxSize} />
            <div className="fin-ob-spread">
                Spread:{" "}
                {bids[0] && asks[0]
                    ? fmt(parseFloat(asks[0].px) - parseFloat(bids[0].px))
                    : "—"}
            </div>
            <OrderBookSide levels={bids} side="bid" maxSize={maxSize} />
        </div>
    );
}

function TradesPanel({ trades }: { trades: Trade[] }) {
    return (
        <div className="fin-trades">
            <div className="fin-trades-header">
                <span>Price</span>
                <span>Size</span>
                <span>Time</span>
            </div>
            <div className="fin-trades-list">
                {trades.map((t) => (
                    <div key={t.tid ?? t.hash} className={clsx("fin-trade-row", t.side === "B" ? "buy" : "sell")}>
                        <span className="fin-trade-px">{fmt(t.px)}</span>
                        <span className="fin-trade-sz">{fmtVol(t.sz)}</span>
                        <span className="fin-trade-time">{dayjs(t.time).format("HH:mm:ss")}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── main view ────────────────────────────────────────────────────────────────

interface FinstreamViewProps {
    model: FinstreamViewModel;
}

export function FinstreamView({ model }: FinstreamViewProps) {
    const symbol = useAtomValue(model.selectedSymbol);
    const symbols = useAtomValue(model.availableSymbols);
    const summary = useAtomValue(model.marketSummary);
    const book = useAtomValue(model.orderBook);
    const trades = useAtomValue(model.recentTrades);
    const candles = useAtomValue(model.priceHistory);
    const loading = useAtomValue(model.isLoading);
    const error = useAtomValue(model.errorMsg);
    const autoRefresh = useAtomValue(model.autoRefresh);

    const [containerWidth, setContainerWidth] = useState(600);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver((entries) => {
            for (const e of entries) {
                setContainerWidth(e.contentRect.width);
            }
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div className="finstream-view" ref={containerRef}>
            {/* ── toolbar ── */}
            <div className="fin-toolbar">
                <div className="fin-symbol-pills">
                    {symbols.map((s) => (
                        <button
                            key={s}
                            className={clsx("fin-pill", s === symbol && "active")}
                            onClick={() => model.setSymbol(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="fin-toolbar-actions">
                    <button
                        className={clsx("fin-pill", autoRefresh && "active")}
                        title="Toggle auto-refresh"
                        onClick={() => globalStore.set(model.autoRefresh, !autoRefresh)}
                    >
                        <i className="fa fa-rotate" /> Auto
                    </button>
                    <button
                        className="fin-pill"
                        title="Refresh now"
                        onClick={() => model.refresh()}
                    >
                        <i className={clsx("fa fa-sync", loading && "fa-spin")} />
                    </button>
                </div>
            </div>

            {error && <div className="fin-error">{error}</div>}

            {/* ── market header ── */}
            <MarketHeader summary={summary} />

            {/* ── chart ── */}
            <PriceChart candles={candles} width={containerWidth - 32} />

            {/* ── order book + trades ── */}
            <div className="fin-bottom-row">
                <OrderBookPanel book={book} />
                <TradesPanel trades={trades} />
            </div>
        </div>
    );
}
