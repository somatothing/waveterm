# Wave Terminal – Financial Solutions System
## Comprehensive Implementation Plan: Episodes, Epochs & Agent Sessions

> **Scope:** 0 → 500 Copilot agent sessions  
> **Target stack:** Wave Terminal (Electron + React + Go) + Hyperliquid API + Arbitrum DeFi + GROQ AI  
> **Infrastructure:** PostgreSQL 16 · Redis 7 · Docker Compose · ORM (sqlc/pgx) · WebSockets

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Wave Terminal (Electron)                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │  finstream     │  │  portfolio     │  │   waveai (GROQ)    │ │
│  │  view block    │  │  view block    │  │   chat block       │ │
│  └───────┬────────┘  └───────┬────────┘  └────────┬───────────┘ │
│          │  WSH RPC           │  WSH RPC            │ RPC        │
│  ┌───────▼────────────────────▼────────────────────▼──────────┐ │
│  │                  Go Backend (waveserver)                    │ │
│  │   BlockController · WPS PubSub · WSH Router · WaveStore    │ │
│  └───────┬──────────────────────────────────────────┬─────────┘ │
└──────────┼──────────────────────────────────────────┼───────────┘
           │                                          │
   ┌───────▼─────────┐                    ┌───────────▼──────────┐
   │  Hyperliquid    │                    │  Arbitrum RPC Node   │
   │  REST + WS API  │                    │  (DeFi / Arb)        │
   └─────────────────┘                    └──────────────────────┘
           │
   ┌───────▼──────────────────────────────────────────────────────┐
   │                   Local Infrastructure                        │
   │  PostgreSQL (market data, positions, ML features, sessions)  │
   │  Redis (L1 cache, pub/sub bus, rate limiter, session store)  │
   └──────────────────────────────────────────────────────────────┘
```

---

## Episode & Epoch Framework

| Term | Definition |
|------|-----------|
| **Session** | One Copilot agent interaction (0-500 numbered) |
| **Epoch** | A cluster of 10 sessions with a coherent theme |
| **Episode** | A cluster of 5 epochs (50 sessions) delivering a shippable milestone |

---

## Episode 0 – Foundation (Sessions 0–49 / Epochs 0–4)

### Epoch 0: Infrastructure Bootstrapping (Sessions 0–9)
- [x] **S0** – Repository exploration, plan creation, finstream/portfolio view scaffolding
- [ ] **S1** – Docker Compose setup: Postgres + Redis + Adminer + RedisInsight
- [ ] **S2** – DB migration 001: market_snapshots, candles, trades, positions, ml_features
- [ ] **S3** – Go `finsvc` package skeleton: interfaces, connection pooling (pgx/sqlc)
- [ ] **S4** – Redis cache layer: price cache TTL 1s, order book cache TTL 250ms
- [ ] **S5** – Hyperliquid REST poller: allMids, metaAndAssetCtxs, l2Book, recentTrades
- [ ] **S6** – WebSocket streamer: Hyperliquid WS API (ticker, trades, userFills)
- [ ] **S7** – WPS event bridge: publish `fin:market:update` and `fin:trade:update` events
- [ ] **S8** – finstream view: consume WPS events for real-time updates (no polling)
- [ ] **S9** – Unit tests: poller, cache, event bridge

### Epoch 1: finstream View Complete (Sessions 10–19)
- [ ] **S10** – Candlestick chart (true OHLCV bars via Observable Plot rect marks)
- [ ] **S11** – Volume histogram overlay on price chart
- [ ] **S12** – Funding rate + open interest sparklines
- [ ] **S13** – Symbol search / autocomplete (fuzzy match all HL assets)
- [ ] **S14** – Settings integration: read `finstream:defaultsymbol`, `finstream:refreshms`
- [ ] **S15** – Block meta overrides: per-block symbol/interval via `SetMeta`
- [ ] **S16** – Keyboard shortcuts: `r` = refresh, `1-9` = timeframe select, `/` = search
- [ ] **S17** – Context menu: "Open in Web", "Copy price", "Set as watchlist"
- [ ] **S18** – Persist symbol selection in block metadata
- [ ] **S19** – E2E test: finstream renders with live data

### Epoch 2: portfolio View Complete (Sessions 20–29)
- [ ] **S20** – Portfolio address stored in block metadata (not input each time)
- [ ] **S21** – Equity curve chart: account value over time from DB
- [ ] **S22** – P&L breakdown by position (stacked bar chart)
- [ ] **S23** – Order form UI (read-only display for now, no order submission)
- [ ] **S24** – Historical positions from DB (not just current snapshot)
- [ ] **S25** – Multi-wallet support: add/remove wallets, switch in header
- [ ] **S26** – Export to CSV: positions, orders, equity curve
- [ ] **S27** – Alerts: set price alerts via GROQ AI natural language ("alert me when BTC > 100k")
- [ ] **S28** – Settings: `portfolio:defaultwallet`, `portfolio:refreshms`
- [ ] **S29** – Tests: portfolio model, data fetching, multi-wallet

### Epoch 3: GROQ AI Integration (Sessions 30–39)
- [ ] **S30** – GROQ preset in AI presets: llama3-70b-8192 + mixtral-8x7b-32768
- [ ] **S31** – WaveAI system prompt for financial context (market data, positions injected)
- [ ] **S32** – `/fin` slash command in WaveAI: queries current portfolio + market context
- [ ] **S33** – Natural language alerts: "alert BTC > 100k" → creates alert in DB
- [ ] **S34** – GROQ streaming chat integration (verify token auth flow)
- [ ] **S35** – AI price analysis: "analyze BTC trend" → fetches candles, sends to GROQ
- [ ] **S36** – AI arb scanner: "find arbitrage" → queries HL + Arbitrum prices via GROQ
- [ ] **S37** – Context-aware suggestions: GROQ suggests hedges based on open positions
- [ ] **S38** – Chat history persistence in Postgres `agent_sessions` table
- [ ] **S39** – Tests: GROQ integration, prompt injection safety, context building

### Epoch 4: ML Feature Store (Sessions 40–49)
- [ ] **S40** – Feature engineering: RSI, MACD, Bollinger Bands, VWAP from candle data
- [ ] **S41** – Feature storage pipeline: hourly batch → `ml_features` table
- [ ] **S42** – Label generation: future 1h/4h/24h returns for supervised learning
- [ ] **S43** – Simple ML model (logistic regression in Go): buy/sell/hold signal
- [ ] **S44** – Prediction storage: `ml_predictions` table, signal display in finstream
- [ ] **S45** – Model retraining task: `task fin:ml:train`
- [ ] **S46** – Backtest framework: replay historical features, compute Sharpe/drawdown
- [ ] **S47** – Backtest results displayed in portfolio view "Backtest" tab
- [ ] **S48** – Model confidence overlay on price chart
- [ ] **S49** – Tests: feature engineering, model training, backtest correctness

---

## Episode 1 – Arbitrage & DeFi (Sessions 50–99 / Epochs 5–9)

### Epoch 5: Arbitrum RPC Integration (Sessions 50–59)
- [ ] **S50** – Arbitrum RPC client in Go (ethclient wrapper)
- [ ] **S51** – Price feeds: Chainlink oracle reads on Arbitrum
- [ ] **S52** – Uniswap V3 pool price reader (sqrt price → human price)
- [ ] **S53** – GMX price / funding rate reader on Arbitrum
- [ ] **S54** – Cross-venue spread monitor: HL mark price vs Uniswap spot
- [ ] **S55** – `arb_opportunities` table population: store detected spreads
- [ ] **S56** – Real-time arb scanner WPS event: `fin:arb:opportunity`
- [ ] **S57** – finstream arb overlay: highlight coins with arb > threshold
- [ ] **S58** – Arb opportunities dashboard tab in portfolio view
- [ ] **S59** – Alert: notify when arb spread > user-defined threshold

### Epoch 6: DeFi Portfolio Tracking (Sessions 60–69)
- [ ] **S60** – Arbitrum wallet balance reader (ERC-20 token balances)
- [ ] **S61** – Uniswap V3 LP position tracker
- [ ] **S62** – GMX position tracker on Arbitrum
- [ ] **S63** – Aave/Compound lending position reader
- [ ] **S64** – DeFi portfolio aggregator: combined TVL, yield, IL
- [ ] **S65** – DeFi view tab in portfolio: shows on-chain positions alongside HL
- [ ] **S66** – Impermanent loss calculator for LP positions
- [ ] **S67** – Yield farming APR tracker: pull from DeFiLlama API
- [ ] **S68** – Gas fee estimator: show estimated tx costs for rebalancing
- [ ] **S69** – Tests: Arbitrum RPC, DeFi position reading

### Epoch 7: Trading Automation Framework (Sessions 70–79)
- [ ] **S70** – Agent session framework: start/stop trading agents from UI
- [ ] **S71** – Grid trading agent: configurable grid on HL perps
- [ ] **S72** – Mean reversion agent: Z-score based entries/exits
- [ ] **S73** – Trend following agent: EMA crossover + ATR stops
- [ ] **S74** – Agent state machine: idle → scanning → in-trade → stopped
- [ ] **S75** – Agent session persistence in `agent_sessions` table
- [ ] **S76** – Agent P&L tracking: real-time equity updates per agent
- [ ] **S77** – Risk management: max drawdown stop, position size limits
- [ ] **S78** – Agent control UI in portfolio view: start/stop/configure
- [ ] **S79** – Tests: agent state machine, risk limits

### Epoch 8: Advanced ML Models (Sessions 80–89)
- [ ] **S80** – Time series forecasting: LSTM-style feature preparation
- [ ] **S81** – Gradient boosting model (via Go ONNX runtime)
- [ ] **S82** – Ensemble model: combine logistic + GBM signals
- [ ] **S83** – Walk-forward validation: rolling window backtests
- [ ] **S84** – Feature importance visualization in portfolio view
- [ ] **S85** – Online learning: model updates on new data without full retrain
- [ ] **S86** – Anomaly detection: flag unusual market conditions
- [ ] **S87** – Regime detection: bull/bear/sideways market classifier
- [ ] **S88** – Model serving: lightweight HTTP endpoint for external tools
- [ ] **S89** – Tests: model accuracy metrics, edge cases

### Epoch 9: Runtime VM & IDE Features (Sessions 90–99)
- [ ] **S90** – Code block for fin scripts: execute Python/Go snippets against live data
- [ ] **S91** – Jupyter-like cell execution in Wave Terminal code editor
- [ ] **S92** – Live data variable injection: `${BTC_PRICE}` in scripts
- [ ] **S93** – Strategy backtester UI: write + run backtest in-terminal
- [ ] **S94** – Package manager integration: install Python fin packages (pandas, ta-lib)
- [ ] **S95** – VirtualEnv isolation per finstream session
- [ ] **S96** – Script scheduler: cron-style execution of fin scripts
- [ ] **S97** – Script output visualization: auto-detect and render charts/tables
- [ ] **S98** – Collaboration: share strategy scripts via Wave workspace
- [ ] **S99** – Tests: script execution, injection safety, scheduler

---

## Episode 2 – Production Hardening (Sessions 100–149 / Epochs 10–14)

### Epoch 10: Security & Key Management (Sessions 100–109)
- [ ] **S100** – Wallet private key storage: OS keychain integration (electron-keytar)
- [ ] **S101** – API key manager: encrypted storage for HL API + GROQ tokens
- [ ] **S102** – Connection profile per wallet: read-only vs trading mode
- [ ] **S103** – IP allowlist for HL API tokens
- [ ] **S104** – Audit log: all trading actions logged to Postgres
- [ ] **S105** – Session token rotation
- [ ] **S106** – Rate limiting: per-user per-endpoint limits in Redis
- [ ] **S107** – CORS + CSP hardening for WebView-based DeFi views
- [ ] **S108** – CodeQL scan pass for new financial code paths
- [ ] **S109** – Security review: all externally-reachable inputs

### Epoch 11: Performance & Observability (Sessions 110–119)
- [ ] **S110** – Prometheus metrics: tick latency, DB write throughput, cache hit rate
- [ ] **S111** – Grafana dashboard config (docker-compose.fin.yml addition)
- [ ] **S112** – Trace ID propagation: correlate UI events → DB writes
- [ ] **S113** – DB query analyzer: EXPLAIN plans for slow queries
- [ ] **S114** – TimescaleDB migration: convert candles + market_snapshots to hypertables
- [ ] **S115** – Connection pooling tuning: PgBouncer sidecar
- [ ] **S116** – Redis pipeline batching for high-frequency tick writes
- [ ] **S117** – Memory profiling: identify leaks in long-running market feed
- [ ] **S118** – CPU profile: optimize feature computation hot path
- [ ] **S119** – Load test: 100 concurrent HL market streams

### Epoch 12–14: Advanced DeFi, Cross-Chain, Final Polish (Sessions 120–149)
> Detailed planning for these epochs will be created during S120 based on
> learnings from Episodes 0-1.

---

## Episode 3–9 (Sessions 150–499): Placeholder Roadmap

| Episode | Sessions | Theme |
|---------|----------|-------|
| 3 | 150–199 | Cross-chain expansion: Solana, Base, Optimism |
| 4 | 200–249 | HFT / co-location experiments, FPGA exploration |
| 5 | 250–299 | Social trading: copy-trading, strategy marketplace |
| 6 | 300–349 | Options & structured products: HL options, DeFi vaults |
| 7 | 350–399 | Institutional features: multi-sig, compliance reporting |
| 8 | 400–449 | AI agent autonomy: fully automated strategy execution |
| 9 | 450–499 | Public release, documentation, community features |

---

## Quick Start

```bash
# 1. Start infrastructure
task fin:infra:up

# 2. Configure secrets (do NOT commit these)
export GROQ_API_KEY=gsk_...
export HL_API_KEY=...          # optional - for trading
export HL_API_SECRET=...       # optional - for trading

# 3. Start Wave Terminal dev build
npm run dev

# 4. Create a FinStream block
#    In Wave Terminal: press Ctrl+N → type "finstream" → Enter
#    Or via wsh: wsh view finstream

# 5. Create a Portfolio block
#    wsh view portfolio
```

---

## Settings Reference

| Key | Default | Description |
|-----|---------|-------------|
| `finstream:defaultsymbol` | `BTC` | Default trading pair in FinStream |
| `finstream:refreshms` | `5000` | Auto-refresh interval (ms) |
| `finstream:apiurl` | `https://api.hyperliquid.xyz/info` | Hyperliquid API base URL |
| `finstream:autorefresh` | `true` | Enable auto-refresh |
| `portfolio:defaultwallet` | *(empty)* | Default Hyperliquid wallet address |
| `portfolio:apiurl` | `https://api.hyperliquid.xyz/info` | Hyperliquid API base URL |
| `portfolio:refreshms` | `10000` | Portfolio refresh interval (ms) |
| `groq:apitoken` | *(empty)* | GROQ Cloud API token |
| `groq:model` | `llama3-70b-8192` | Default GROQ model |

Add to `~/.config/waveterm/settings.json`:
```json
{
    "finstream:defaultsymbol": "ETH",
    "groq:apitoken": "gsk_YOUR_TOKEN_HERE",
    "portfolio:defaultwallet": "0xYOUR_WALLET_ADDRESS"
}
```

---

## Data Flow

```
Hyperliquid REST/WS
        │
        ▼
  Go finsvc poller (pkg/finsvc/)
        │
   ┌────┴─────────────────┐
   │                      │
   ▼                      ▼
Redis cache           PostgreSQL
(hot data, TTL)     (historical data)
   │                      │
   ▼                      ▼
WPS Events           DB queries
(fin:market:*)       (candles, positions)
   │                      │
   └────────┬─────────────┘
            ▼
     finstream / portfolio
       React views
            │
            ▼
     Observable Plot
     + Table components
```
