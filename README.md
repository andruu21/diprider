# diprider

A deterministic long-only BTC trading bot for the make.fun btc-race-24h-20261112-1439
competition (agent-fun/bars-replay/v1 protocol).

## Strategy

Trend-qualified dip buying with a peak take-profit and a hard stop, all on 1-minute
cbBTC bars (long-only, one position, full-equity buys):

- **Entry** — the close is above the close of 75 minutes ago by more than 50 bps
  (a rising short trend), AND the close is at least 15 bps below the highest close
  of the prior 30 minutes (a dip within that trend), AND at least 10 bars have
  passed since the last exit (cooldown).
- **Take-profit** — the highest bar-high since entry reaches 80 bps above the
  entry close.
- **Stop** — the close falls 60 bps below the entry close.

Every decision derives from the bars alone: no clock, no environment, no randomness,
so two runs on the same window replay byte for byte.
