import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/game/types";
import { playSfx } from "@/game/sfx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  state: GameState;
  onRestart: () => void;
}

const GRADE_STYLE: Record<string, string> = {
  S: "text-amber-500 border-amber-500 bg-amber-50",
  A: "text-emerald-600 border-emerald-500 bg-emerald-50",
  B: "text-sky-600 border-sky-500 bg-sky-50",
  C: "text-slate-500 border-slate-400 bg-slate-50",
  D: "text-orange-500 border-orange-500 bg-orange-50",
  F: "text-rose-600 border-rose-500 bg-rose-50",
};

const GRADE_COLOR: Record<string, string> = {
  S: "#f59e0b", A: "#10b981", B: "#0ea5e9", C: "#64748b", D: "#f97316", F: "#e11d48",
};

const PLAY_URL = "https://reallywong.github.io/founders-journey-v3/";

function shareText(state: GameState): string {
  const e = state.ending!;
  const months = `${Math.floor(state.month / 12)} 年 ${state.month % 12} 个月`;
  return `【创业人生】${state.name} 在 ${state.region.name} 创业（${state.industry.name}），${months}后迎来结局「${e.title}」，评级 ${e.grade}。\n创业人生似下棋，快来体验吧！👇\n${PLAY_URL}`;
}

// 用 canvas 绘制分享战报卡（1080×1440），返回 dataURL
function drawShareCard(state: GameState): string {
  const e = state.ending!;
  const gradeColor = GRADE_COLOR[e.grade] ?? "#64748b";
  const W = 1080, H = 1440;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;

  // 背景：暖色渐变 + 棋盘格暗纹
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fffbeb"); bg.addColorStop(0.5, "#ffffff"); bg.addColorStop(1, "#f0f9ff");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.05; ctx.fillStyle = "#0f172a";
  const cell = 90;
  for (let y = 0; y < H / cell; y++) for (let x = 0; x < W / cell; x++)
    if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
  ctx.globalAlpha = 1;

  const cx = W / 2;
  ctx.textAlign = "center";

  // 顶部标题
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 44px 'Microsoft YaHei', sans-serif";
  ctx.fillText("创 业 人 生", cx, 110);
  ctx.fillStyle = "#64748b";
  ctx.font = "26px 'Microsoft YaHei', sans-serif";
  ctx.fillText("Founder's Journey · 我的创业战报", cx, 155);

  // 评级徽章
  ctx.beginPath(); ctx.arc(cx, 320, 105, 0, Math.PI * 2);
  ctx.fillStyle = gradeColor + "22"; ctx.fill();
  ctx.lineWidth = 10; ctx.strokeStyle = gradeColor; ctx.stroke();
  ctx.fillStyle = gradeColor;
  ctx.font = "bold 130px 'Arial Black', sans-serif";
  ctx.fillText(e.grade, cx, 365);

  // 结局标题
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 64px 'Microsoft YaHei', sans-serif";
  ctx.fillText(e.title.replace(/^\S+\s/, ""), cx, 530);

  // 身份行
  ctx.fillStyle = "#475569";
  ctx.font = "34px 'Microsoft YaHei', sans-serif";
  ctx.fillText(`${state.name} · ${state.region.flag} ${state.region.name} · ${state.industry.icon} ${state.industry.name}`, cx, 600);

  // 数据卡（2 列）
  const stats = e.stats.slice(0, 6);
  const cardW = 440, cardH = 110, gap = 40;
  stats.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = cx - cardW - gap / 2 + col * (cardW + gap);
    const y = 680 + row * (cardH + 30);
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2;
    const r = 20;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, r);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'Microsoft YaHei', sans-serif";
    ctx.fillText(s.label, x + cardW / 2, y + 42);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 34px 'Microsoft YaHei', sans-serif";
    ctx.fillText(s.value, x + cardW / 2, y + 86);
  });

  // 底部标语 + 二维码占位文字
  ctx.fillStyle = gradeColor;
  ctx.font = "bold 40px 'Microsoft YaHei', sans-serif";
  ctx.fillText("创业人生似下棋，快来体验吧！", cx, 1230);
  ctx.fillStyle = "#64748b";
  ctx.font = "26px 'Microsoft YaHei', sans-serif";
  ctx.fillText(PLAY_URL, cx, 1290);
  ctx.font = "22px 'Microsoft YaHei', sans-serif";
  ctx.fillText(`随机种子 #${state.rngSeed}${state.tournamentCode ? ` · 比拼码 ${state.tournamentCode}` : ""}`, cx, 1340);

  return cv.toDataURL("image/png");
}

export default function EndingScreen({ state, onRestart }: Props) {
  const e = state.ending!;
  const [copied, setCopied] = useState(false);
  const cardUrl = useRef<string | null>(null);
  // 结局音效：S 敲钟 / A 到账 / D、F 低沉失败音
  useEffect(() => {
    if (e.grade === "S") playSfx("ipo-bell");
    else if (e.grade === "A") playSfx("cash");
    else if (e.grade === "D" || e.grade === "F") playSfx("fail");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doShare = async () => {
    const text = shareText(state);
    // 1) 优先系统分享
    if (navigator.share) {
      try { await navigator.share({ title: "创业人生 · 战报", text }); return; } catch { /* 用户取消则走下载 */ }
    }
    // 2) 生成战报卡下载 + 文本复制
    try {
      if (!cardUrl.current) cardUrl.current = drawShareCard(state);
      const a = document.createElement("a");
      a.href = cardUrl.current;
      a.download = `创业人生战报-${state.name}-${e.grade}.png`;
      a.click();
    } catch { /* canvas 失败则只复制文本 */ }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50 text-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white border-slate-200 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className={`inline-flex mx-auto items-center justify-center w-20 h-20 rounded-full border-4 text-4xl font-black ${GRADE_STYLE[e.grade]}`}>
            {e.grade}
          </div>
          <CardTitle className="text-3xl text-slate-900">{e.title}</CardTitle>
          <p className="text-slate-500 text-sm">
            {state.name} · {state.region.flag} {state.region.name} · {state.industry.icon} {state.industry.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{e.narrative}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {e.stats.map((s) => (
              <div key={s.label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</div>
                <div className="text-sm font-bold text-slate-800">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <div className="text-amber-800 font-semibold text-sm mb-1">📖 最后一课</div>
            <p className="text-sm text-amber-900/80 leading-relaxed">{e.lesson}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 py-6 text-slate-700 border-slate-300" onClick={doShare}>
              {copied ? "✅ 战报文本已复制，图片已下载！" : "📤 分享战报（生成海报图）"}
            </Button>
            <Button className="flex-1 text-lg py-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500" onClick={onRestart}>
              🔄 再创业一次（这次会更强）
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
