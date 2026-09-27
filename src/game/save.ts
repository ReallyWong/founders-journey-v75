// ─── 对局存档 / 读档 ─────────────────────────────────────────────────────────
// 仅存 localStorage（本机）。任何 state 变化时若 alive 则自动保存；
// 通关（alive=false）或开启新局时清除。读档时强制 speed=0 防止时间意外推进。
import type { GameState } from "./types";

const KEY = "fj_save";

export function saveGame(s: GameState): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, speed: 0 })); } catch { /* 空间不足等场景静默 */ }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (!s || s.alive !== true || !s.region?.id || !s.industry?.id || typeof s.month !== "number") return null;
    return { ...s, speed: 0 };
  } catch { return null; }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
