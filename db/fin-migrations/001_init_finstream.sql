-- Wave Terminal Financial Solutions System
-- Initial schema: market data, positions, orders, ML features
-- Migration: 001_init_finstream.sql

-- ── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Market Snapshots ────────────────────────────────────────────────────────
-- Stores periodic snapshots of mark prices and 24h stats for all assets.

CREATE TABLE IF NOT EXISTS market_snapshots (
    id          BIGSERIAL PRIMARY KEY,
    ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    coin        TEXT        NOT NULL,
    mark_px     NUMERIC(24, 8) NOT NULL,
    mid_px      NUMERIC(24, 8),
    prev_day_px NUMERIC(24, 8),
    day_ntl_vlm NUMERIC(32, 4),
    open_interest NUMERIC(32, 4),
    oracle_px   NUMERIC(24, 8),
    funding_rate NUMERIC(20, 10),
    UNIQUE (ts, coin)
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_coin_ts ON market_snapshots (coin, ts DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_ts      ON market_snapshots (ts DESC);

-- ── OHLCV Candles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS candles (
    id       BIGSERIAL PRIMARY KEY,
    coin     TEXT        NOT NULL,
    interval TEXT        NOT NULL,  -- '1m','5m','15m','1h','4h','1d'
    ts       TIMESTAMPTZ NOT NULL,
    open     NUMERIC(24, 8) NOT NULL,
    high     NUMERIC(24, 8) NOT NULL,
    low      NUMERIC(24, 8) NOT NULL,
    close    NUMERIC(24, 8) NOT NULL,
    volume   NUMERIC(32, 4) NOT NULL,
    UNIQUE (coin, interval, ts)
);

CREATE INDEX IF NOT EXISTS idx_candles_coin_interval_ts ON candles (coin, interval, ts DESC);

-- ── Trades ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trades (
    id       BIGSERIAL PRIMARY KEY,
    coin     TEXT        NOT NULL,
    side     CHAR(1)     NOT NULL CHECK (side IN ('B','A')),
    price    NUMERIC(24, 8) NOT NULL,
    size     NUMERIC(24, 8) NOT NULL,
    ts       TIMESTAMPTZ NOT NULL,
    hash     TEXT        NOT NULL,
    tid      BIGINT      NOT NULL,
    UNIQUE (coin, tid)
);

CREATE INDEX IF NOT EXISTS idx_trades_coin_ts ON trades (coin, ts DESC);

-- ── Portfolio Positions (historical snapshots) ────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_positions (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_ts     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    wallet_address  TEXT        NOT NULL,
    coin            TEXT        NOT NULL,
    size            NUMERIC(24, 8) NOT NULL,
    entry_px        NUMERIC(24, 8),
    position_value  NUMERIC(32, 4),
    unrealized_pnl  NUMERIC(32, 4),
    leverage        INTEGER,
    leverage_type   TEXT
);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_wallet_ts ON portfolio_positions (wallet_address, snapshot_ts DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_coin      ON portfolio_positions (coin);

-- ── Portfolio Equity Curve ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_equity (
    id              BIGSERIAL PRIMARY KEY,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    wallet_address  TEXT        NOT NULL,
    account_value   NUMERIC(32, 4) NOT NULL,
    total_pnl       NUMERIC(32, 4),
    margin_used     NUMERIC(32, 4),
    withdrawable    NUMERIC(32, 4)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_equity_wallet_ts ON portfolio_equity (wallet_address, ts DESC);

-- ── ML Feature Store ─────────────────────────────────────────────────────────
-- Stores pre-computed features for ML models (used by trading agents)

CREATE TABLE IF NOT EXISTS ml_features (
    id       BIGSERIAL PRIMARY KEY,
    ts       TIMESTAMPTZ NOT NULL,
    coin     TEXT        NOT NULL,
    features JSONB       NOT NULL,
    model_id TEXT        NOT NULL,
    label    NUMERIC(8, 6),  -- future return label for supervised training
    UNIQUE (ts, coin, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_features_coin_ts    ON ml_features (coin, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ml_features_model_id   ON ml_features (model_id);
CREATE INDEX IF NOT EXISTS idx_ml_features_features   ON ml_features USING gin (features);

-- ── ML Model Predictions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ml_predictions (
    id          BIGSERIAL PRIMARY KEY,
    ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    coin        TEXT        NOT NULL,
    model_id    TEXT        NOT NULL,
    signal      TEXT        NOT NULL,  -- 'buy','sell','hold'
    confidence  NUMERIC(5, 4),
    predicted_return NUMERIC(10, 6),
    metadata    JSONB
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_coin_ts    ON ml_predictions (coin, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_id   ON ml_predictions (model_id, ts DESC);

-- ── Agent Sessions (Episodes / Epochs) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_sessions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode      INTEGER     NOT NULL,
    epoch        INTEGER     NOT NULL,
    agent_type   TEXT        NOT NULL,  -- 'trading','arbitrage','defi','portfolio'
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at     TIMESTAMPTZ,
    status       TEXT        NOT NULL DEFAULT 'running',  -- 'running','completed','failed'
    config       JSONB,
    results      JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_episode_epoch ON agent_sessions (episode, epoch);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type    ON agent_sessions (agent_type, started_at DESC);

-- ── DeFi / Arbitrage Opportunities ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arb_opportunities (
    id              BIGSERIAL PRIMARY KEY,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    strategy        TEXT        NOT NULL,  -- 'hl_arb','arb_defi','cross_exchange'
    asset           TEXT        NOT NULL,
    buy_venue       TEXT        NOT NULL,
    sell_venue      TEXT        NOT NULL,
    buy_px          NUMERIC(24, 8),
    sell_px         NUMERIC(24, 8),
    spread_pct      NUMERIC(10, 6),
    est_profit_usd  NUMERIC(20, 4),
    executed        BOOLEAN     NOT NULL DEFAULT FALSE,
    execution_tx    TEXT
);

CREATE INDEX IF NOT EXISTS idx_arb_opportunities_ts ON arb_opportunities (ts DESC);
CREATE INDEX IF NOT EXISTS idx_arb_opportunities_strategy ON arb_opportunities (strategy, ts DESC);

-- ── Grants ───────────────────────────────────────────────────────────────────

-- Grant all permissions to the app user (already owner, but explicit for replicas)
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO finstream;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO finstream;
