// BTC race bot: trend-qualified dip buyer with a peak take-profit and a hard stop.
//
// Long-only, one position, full-equity buys, 100-bps slippage cap.
//
// Entry (on the latest close, filled at the next open):
//   - trend: the close is above the close of 75 minutes ago by more than 60 bps
//   - dip:   the close is at least 15 bps below the highest close of the prior 45 minutes
//   - cooldown: at least 10 bars since the last exit
// Exit:
//   - take-profit: the highest bar-high since entry is at least 90 bps above the entry close, or
//   - hard stop: the close is at least 100 bps below the entry close.
//
// Deterministic: every order follows from the bars alone; no clock, no environment,
// no randomness. Float64 bps ratios only, IEEE 754.

import { runBars } from './vendor/makefun-bars.ts';

const TREND_SPAN = 75;
const TREND_THR = 50.0;   // bps
const DIP_SPAN = 30;
const DIP_THR = 15.0;     // bps below the max of the prior DIP_SPAN closes
const STOP_BPS = 60.0;   // bps below entry close
const TP_BPS = 80.0;      // bps above entry close, on the peak bar-high since entry
const COOLDOWN = 10;      // bars after an exit before a new entry
const MAX_SLIP = 100;
const SYMBOL = 'CBBTC';

const closes: number[] = [];
const highs: number[] = [];
let entry = 0.0;
let peakHigh = 0.0;
let lastExit = -1000;

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      closes.push(Number(bar.c));
      highs.push(Number(bar.h));
    }
    const i = closes.length - 1;
    const held = state.positions.get(SYMBOL);
    const pos = held !== undefined && held.qty > 0n;
    const c = closes[i];
    if (pos) {
      if (highs[i] > peakHigh) peakHigh = highs[i];
      const stop = entry > 0 && ((entry - c) * 10000.0) / entry >= STOP_BPS;
      const take = entry > 0 && ((peakHigh - entry) * 10000.0) / entry >= TP_BPS;
      if (stop || take) {
        entry = 0.0;
        lastExit = i;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIP }];
      }
      return [];
    }
    if (i > DIP_SPAN && i - lastExit >= COOLDOWN && i > TREND_SPAN) {
      const prev = closes[i - TREND_SPAN];
      const trend = ((c - prev) * 10000.0) / prev;
      let ref = 0;
      for (let k = i - DIP_SPAN; k < i; k++) if (closes[k] > ref) ref = closes[k];
      const dip = ((ref - c) * 10000.0) / ref;
      if (dip >= DIP_THR && trend > TREND_THR) {
        entry = c;
        peakHigh = highs[i];
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIP }];
      }
    }
    return [];
  },
});
