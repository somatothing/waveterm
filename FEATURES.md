# Wave Terminal — Running Commands & Feature Guide

This guide explains how to start the application, what each widget does, and
which live data sources power every screen.

---

## 1. Start the Preview Server (no Electron, no backend)

```bash
# Install Node dependencies (once)
npm install

# Launch the component preview at http://localhost:7007
task preview
```

> **Do NOT** use `npm run dev`, `npm run start`, or plain `npx vite` from the
> repo root — they all launch the full Electron application.

Navigate to **http://localhost:7007** in your browser.
The index page lists all available previews as clickable links.

---

## 2. Available Preview Pages

| URL | What you see |
|-----|-------------|
| `http://localhost:7007/` | Index — links to all previews |
| `http://localhost:7007/?preview=defi-widgets` | All 10 DeFi / platform widgets stacked |
| `http://localhost:7007/?preview=widgets` | Widget-bar scenarios (compact / resizable) |
| `http://localhost:7007/?preview=sysinfo` | System-info CPU / memory charts |
| `http://localhost:7007/?preview=waveai` | Wave AI chat panel |
| `http://localhost:7007/?preview=web` | Embedded web browser |
| `http://localhost:7007/?preview=tab` | Tab component |
| `http://localhost:7007/?preview=tabbar` | Tab bar |
| `http://localhost:7007/?preview=vtabbar` | Vertical tab bar |
| `http://localhost:7007/?preview=treeview` | File tree view |
| `http://localhost:7007/?preview=onboarding` | Onboarding flow |
| `http://localhost:7007/?preview=modal-about` | About modal |
| `http://localhost:7007/?preview=aifilediff` | AI file-diff view |

---

## 3. DeFi / Platform Widgets

Open `http://localhost:7007/?preview=defi-widgets` to see all widgets in a
single scrollable page.  Each widget renders as a full-height block with its
own header, tab bar, buttons, and charts.

### 3.1 Trading Algobot — Hyperliquid + ONNX/Joblib ML

**What it shows**

- Candlestick / price-history chart with buy/sell signal overlays
- Active positions table (symbol, side, size, entry price, PnL, leverage)
- ML trade-signal log (ONNX or Joblib model type, confidence %, features)
- Performance metrics panel (win rate, Sharpe, max drawdown, total PnL)
- Symbol selector and bot start/stop toggle

**Live data sources**

| Source | Endpoint | What is fetched |
|--------|----------|-----------------|
| Hyperliquid REST | `POST https://api.hyperliquid.xyz/info` `{"type":"allMids"}` | Real-time mid prices for all perps |
| Hyperliquid REST | `POST https://api.hyperliquid.xyz/info` `{"type":"candleSnapshot","req":{…}}` | OHLCV candles (1 m resolution, last 60 bars) |
| Hyperliquid REST | `POST https://api.hyperliquid.xyz/info` `{"type":"meta"}` | Full list of tradable perp assets |

**curl examples**

```bash
# Mid prices for all perps
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H 'Content-Type: application/json' \
  -d '{"type":"allMids"}' | python3 -m json.tool | head -20

# Last 60 1-minute BTC-PERP candles
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H 'Content-Type: application/json' \
  -d '{
    "type":"candleSnapshot",
    "req":{
      "coin":"BTC",
      "resolution":"1m",
      "startTime":'$(($(date +%s%3N) - 3600000))',
      "endTime":'$(date +%s%3N)'
    }
  }' | python3 -m json.tool | head -40

# Available perp assets
curl -s -X POST https://api.hyperliquid.xyz/info \
  -H 'Content-Type: application/json' \
  -d '{"type":"meta"}' | python3 -m json.tool | head -30
```

---

### 3.2 Arbitrage Bot — Triangular Arb on Arbitrum + ML

**What it shows**

- Live arbitrage-opportunity scanner with profit / gas / net-profit columns
- DEX price comparison table (Uniswap V3, GMX V1, Balancer, Hop AMM)
- Token-graph visualiser showing detected circular paths
- ML scoring panel (profitability score, risk score, features)
- Opportunity status pipeline (pending → executing → completed / failed)

**Live data sources**

| Source | Endpoint | What is fetched |
|--------|----------|-----------------|
| Hyperliquid REST | `POST https://api.hyperliquid.xyz/info` `{"type":"allMids"}` | Reference mid prices for all tokens |
| Arbitrum RPC (JSON-RPC) | `POST https://arb1.arbitrum.io/rpc` | GMX V1 vault min/max prices via `eth_call` |
| Arbitrum RPC (JSON-RPC) | `POST https://arb1.arbitrum.io/rpc` | Uniswap V2 / DFYN pair reserves via `getReserves()` |
| Arbitrum RPC (JSON-RPC) | `POST https://arb1.arbitrum.io/rpc` | Balancer V2 pool tokens + balances via `getPoolTokens()` |
| Balancer REST | `GET https://api.balancer.fi/pools/arbitrum` | Top Arbitrum pools (TVL, volume, APR) |

**curl examples**

```bash
# GMX V1 vault — min price for WETH on Arbitrum
WETH_ARB="0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
GMX_VAULT="0x489ee077994B6658eAfA855C308275EAd8097C4E"
# getMinPrice(address) selector = 0x02d05d3f
CALL_DATA="0x02d05d3f000000000000000000000000${WETH_ARB:2}"
curl -s -X POST https://arb1.arbitrum.io/rpc \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$GMX_VAULT\",\"data\":\"$CALL_DATA\"},\"latest\"]}"

# Balancer Arbitrum pools
curl -s https://api.balancer.fi/pools/arbitrum | python3 -m json.tool | head -60
```

---

### 3.3 DeFi Lending — Supply / Borrow / Collateral Swap Repay + ML

**What it shows**

- Lending market table (supply APY, borrow APY, utilisation, LTV, liquidation threshold)
- User position panel (supplied, borrowed, health factor, net APY)
- ML-predicted APY overlay vs. actual APY
- Collateral-swap / flash-repay stepper (step-by-step tx simulator)
- APY / utilisation history sparklines

**Live data sources**

| Source | Endpoint | What is fetched |
|--------|----------|-----------------|
| Morpho Blue GraphQL | `POST https://blue-api.morpho.org/graphql` | Top 20 lending markets (supply/borrow APY, TVL, utilisation) |
| CoinGecko REST | `GET https://api.coingecko.com/api/v3/simple/price` | USD prices for USDC, ETH, WBTC, ARB, DAI, USDT |

**curl examples**

```bash
# Top 20 Morpho Blue markets sorted by TVL
curl -s -X POST https://blue-api.morpho.org/graphql \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "{
      markets(first:20, orderBy:TotalSupplyUsd, orderDirection:Desc) {
        items {
          uniqueKey
          loanAsset { symbol address }
          collateralAsset { symbol address }
          lltv
          state {
            supplyApy borrowApy
            supplyAssetsUsd borrowAssetsUsd
            utilization
          }
          morphoBlue { chain { id } }
        }
      }
    }"
  }' | python3 -m json.tool | head -80

# CoinGecko USD prices for ETH, BTC, USDC, ARB
curl -s 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,usd-coin,arbitrum&vs_currencies=usd&include_24hr_change=true' \
  | python3 -m json.tool
```

---

### 3.4 Flash Loan — Arbitrage Portfolio Rebalancer

**What it shows**

- Strategy library (Aave flash + Uniswap rebalance, Balancer flash + Curve swap, etc.)
- Portfolio allocation pie chart (current vs. target weights)
- Single-transaction simulation trace log
- Profit / gas / net-profit projections per strategy
- One-click "Simulate" and "Execute" buttons

**Live data sources**

| Source | Endpoint | What is fetched |
|--------|----------|-----------------|
| CoinGecko REST | `GET https://api.coingecko.com/api/v3/simple/price` | USD prices for portfolio assets (ETH, BTC, USDC, ARB, etc.) |

**curl example**

```bash
# Portfolio token prices in one request
curl -s 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,wrapped-bitcoin,usd-coin,arbitrum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true' \
  | python3 -m json.tool
```

---

### 3.5 AMM Liquidity Pools — Uniswap V3 / Camelot / Curve / Balancer

**What it shows**

- Pool table: TVL, 24 h volume, APY, swap fee, token pair
- User LP position panel (IL, fees earned, value USD, entry price)
- Price-impact calculator (input amount → output with price impact %)
- Protocol filter tabs (Uniswap V3, Camelot, Curve, Balancer)
- Add / Remove liquidity modal with range selector

**Live data sources**

| Source | Endpoint | What is fetched |
|--------|----------|-----------------|
| Balancer REST | `GET https://api.balancer.fi/pools/arbitrum` | Top Arbitrum pools (TVL, APR, tokens) |
| CoinGecko REST | `GET https://api.coingecko.com/api/v3/coins/markets` | Token icon URLs + market cap data |
| CoinGecko REST | `GET https://api.coingecko.com/api/v3/simple/price` | Token USD prices for IL calculation |

**curl examples**

```bash
# Balancer Arbitrum pools (first 5 fields of first pool)
curl -s https://api.balancer.fi/pools/arbitrum \
  | python3 -c "import sys,json; pools=json.load(sys.stdin); [print(json.dumps({k:p.get(k) for k in ['id','name','poolType','totalLiquidity','swapFee']},indent=2)) for p in pools[:3]]"

# CoinGecko market data for DeFi tokens (icon URLs, market cap, 24 h change)
curl -s 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum,wrapped-bitcoin,usd-coin,arbitrum,uniswap,curve-dao-token,balancer&order=market_cap_desc&per_page=10&page=1&sparkline=false' \
  | python3 -m json.tool | head -80
```

---

### 3.6 Code Editor — AI-Assisted, Multi-Language + Autocompletion

**What it shows**

- Monaco editor with syntax highlighting for TypeScript, Python, Solidity, Go, Rust, etc.
- AI chat side panel (ask questions about the open file)
- Language selector and theme toggle
- Autocompletion powered by Monaco's built-in language services
- File save / load actions

**Live data sources** — none (editor is fully local; AI calls go through the
Wave AI backend when running the full Electron application).

---

### 3.7 Containers — Docker/K8s Manager with Logs, Metrics, Shell Exec

**What it shows**

- Container / pod list with status badges (running, stopped, error)
- Per-container CPU and memory sparkline metrics
- Log stream panel (last N lines, auto-scroll, search filter)
- Shell exec panel (run commands inside a container)
- Kubernetes namespace / context switcher

**Live data sources** — connects to the local Docker daemon or a configured
kubeconfig when running inside the full Electron application.  In preview mode
all data is mocked.

---

### 3.8 Shell Workflows — Programmable Button-Triggered Pipelines

**What it shows**

- Workflow library (named multi-step shell pipelines)
- Per-step status indicator (pending / running / done / error)
- Stdout / stderr output log per step
- Variable editor (inject env vars before running)
- Schedule trigger toggle (run on interval)

**Live data sources** — executes real shell commands via the Wave backend when
running the full Electron application.  In preview mode steps are simulated.

---

### 3.9 ML Model — Training / Eval / Retrain (GBM, LR, NN, RF, NumpyLogistics) + ONNX/Joblib

**What it shows**

- Model registry table (algorithm, version, accuracy, F1, last trained)
- Training progress bar with live loss / accuracy charts
- Confusion matrix heatmap
- Feature importance bar chart
- Export to ONNX / Joblib buttons

**Live data sources** — training data and model artefacts are loaded from the
local filesystem via the Wave backend.  Real-time training metrics stream
through the WPS event bus in the full application.

---

### 3.10 Widget Builder — AI Chat + Storage + DB Query + HTTP Station

**What it shows**

- Four tabs: AI Chat, Storage, DB Query, HTTP Station
- AI Chat: multi-turn conversation with code-generation capability
- Storage: key-value store browser (read / write / delete entries)
- DB Query: SQL editor with result table (SQLite or PostgreSQL)
- HTTP Station: Postman-like request builder (method, URL, headers, body, response)

**Live data sources** — AI calls go through the Wave AI backend; DB and HTTP
requests are proxied through the Wave backend in the full application.

---

## 4. Real-Time Data & Auto-Refresh

The following widgets poll live APIs automatically on mount and then refresh on
a timer (intervals shown below).  All widgets fall back to demo/mock data if
the API is unreachable.

| Widget | Refresh interval | Endpoint(s) polled |
|--------|-----------------|-------------------|
| Trading Algobot | 30 s | Hyperliquid allMids + candleSnapshot |
| Arbitrage Bot | 15 s | Hyperliquid allMids + Arbitrum RPC eth_call |
| DeFi Lending | 60 s | Morpho Blue GraphQL + CoinGecko prices |
| Flash Loan | 60 s | CoinGecko prices |
| AMM Liquidity | 60 s | Balancer REST + CoinGecko markets |

The header of each widget shows `● LIVE` (green) when data arrived from the
real API, or `● DEMO` (amber) when running on mock data.

---

## 5. Build the Full Electron Application

```bash
# Install all dependencies
npm install

# Build the Go backend (requires Go 1.22+)
task build:backend

# Launch with Vite hot-reload (developer mode)
task electron:dev

# Or build a production bundle
npm run build
```

See [BUILD.md](BUILD.md) for full build prerequisites and platform notes.

---

## 6. Run the Infrastructure Services (optional)

A Docker Compose file is provided for the PostgreSQL + Redis services used by
the finstream and portfolio views:

```bash
docker compose -f docker-compose.fin.yml up -d
```

---

## 7. Data Source Reference

| API | Base URL | Auth required | Rate limit |
|-----|---------|--------------|-----------|
| Hyperliquid Info | `https://api.hyperliquid.xyz/info` | None | ~unlimited (public) |
| CoinGecko (free) | `https://api.coingecko.com/api/v3` | None | ~30 req/min |
| Morpho Blue GraphQL | `https://blue-api.morpho.org/graphql` | None | ~30 req/min |
| Balancer REST | `https://api.balancer.fi/pools/{chain}` | None | ~30 req/min |
| Curve Finance | `https://api.curve.fi/v1/getPools/{chain}/main` | None | ~30 req/min |
| Arbitrum RPC | `https://arb1.arbitrum.io/rpc` | None | ~100 req/min |
| Polygon RPC | `https://polygon-rpc.com` | None | ~100 req/min |
