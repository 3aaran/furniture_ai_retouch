// 该脚本用于生成勋港官网首页的 PSD 分层预览文件，方便在 Photoshop 或 Photopea 中继续编辑视觉方案。
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
require('ag-psd/initialize-canvas');
const { writePsdBuffer } = require('ag-psd');

const OUT_DIR = __dirname;
const W = 1600;
const H = 1200;

const colors = {
  bg: '#070808',
  panel: '#121414',
  panel2: '#191918',
  line: 'rgba(232,206,128,0.18)',
  lineSoft: 'rgba(255,255,255,0.09)',
  text: '#f7f4ea',
  muted: '#a9a497',
  gold: '#e5c76f',
  gold2: '#f5dda2',
  green: '#5bd48d',
  brown: '#3d2519',
};

function c(width, height) {
  return createCanvas(Math.ceil(width), Math.ceil(height));
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRound(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  roundedRect(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function textLayer(name, x, y, w, h, text, size, color = colors.text, weight = 700, lineHeight = 1.18) {
  return layer(name, x, y, w, h, (ctx) => {
    drawWrappedText(ctx, text, 0, 0, w, size, lineHeight, color, weight);
  });
}

function editableTextLayer(name, x, y, text, size, color = { r: 247, g: 244, b: 234 }) {
  return {
    name,
    hidden: true,
    text: {
      text,
      transform: [1, 0, 0, 1, x, y],
      style: {
        font: { name: 'MicrosoftYaHei' },
        fontSize: size,
        fillColor: color,
      },
    },
  };
}

function drawWrappedText(ctx, text, x, y, maxWidth, size, lineHeight, color, weight = 400) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Microsoft YaHei", Arial, sans-serif`;
  ctx.textBaseline = 'top';
  const paragraphs = String(text).split('\n');
  let cursorY = y;
  for (const paragraph of paragraphs) {
    let line = '';
    for (const char of paragraph) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        cursorY += size * lineHeight;
        line = char;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cursorY);
    cursorY += size * lineHeight;
  }
}

function layer(name, x, y, width, height, draw, opacity = 1) {
  const canvas = c(width, height);
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas);
  return {
    name,
    left: Math.round(x),
    top: Math.round(y),
    right: Math.round(x + width),
    bottom: Math.round(y + height),
    opacity,
    canvas,
  };
}

function group(name, children, opened = true, hidden = false) {
  return { name, opened, hidden, children: [...children].reverse() };
}

function drawLogo(ctx, x, y, size) {
  const s = size / 96;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const gold = ctx.createLinearGradient(20, 10, 82, 86);
  gold.addColorStop(0, '#f8e6b0');
  gold.addColorStop(0.55, '#d5a941');
  gold.addColorStop(1, '#8a6925');
  const dark = ctx.createLinearGradient(18, 16, 70, 80);
  dark.addColorStop(0, '#202323');
  dark.addColorStop(1, '#070808');
  fillRound(ctx, 5, 5, 86, 86, 25, dark, gold, 4);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.strokeStyle = gold;
  ctx.beginPath();
  ctx.moveTo(25, 31);
  ctx.bezierCurveTo(31, 22, 42, 18, 54, 21);
  ctx.bezierCurveTo(65, 24, 73, 32, 76, 43);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 64);
  ctx.bezierCurveTo(30, 75, 45, 80, 59, 74);
  ctx.bezierCurveTo(70, 69, 76, 59, 76, 48);
  ctx.stroke();
  ctx.strokeStyle = '#f8e6b0';
  ctx.beginPath();
  ctx.moveTo(32, 61);
  ctx.lineTo(62, 31);
  ctx.stroke();
  ctx.strokeStyle = '#d5a941';
  ctx.beginPath();
  ctx.moveTo(34, 32);
  ctx.lineTo(65, 63);
  ctx.stroke();
  ctx.fillStyle = '#080908';
  ctx.beginPath();
  ctx.arc(48, 48, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f8e6b0';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawChair(ctx, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineWidth = 7;
  ctx.strokeStyle = colors.brown;
  ctx.fillStyle = '#b7c0c3';
  roundedRect(ctx, -58, -126, 116, 92, 25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cdd6d9';
  for (let i = -42; i <= 42; i += 12) {
    ctx.fillRect(i, -118, 5, 76);
  }
  ctx.fillStyle = '#b7c0c3';
  roundedRect(ctx, -58, -12, 116, 70, 22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cdd6d9';
  for (let i = -42; i <= 42; i += 12) {
    ctx.fillRect(i, -4, 5, 54);
  }
  ctx.strokeStyle = colors.brown;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-88, -28);
  ctx.lineTo(-45, -16);
  ctx.moveTo(88, -28);
  ctx.lineTo(45, -16);
  ctx.moveTo(-36, 48);
  ctx.lineTo(-36, 122);
  ctx.moveTo(36, 48);
  ctx.lineTo(36, 122);
  ctx.stroke();
  ctx.restore();
}

function drawPill(ctx, x, y, text, width, primary = false) {
  fillRound(ctx, x, y, width, 46, 23, primary ? '#e5c76f' : 'rgba(229,199,111,0.08)', primary ? null : 'rgba(229,199,111,0.5)', 1);
  ctx.font = '800 17px "Microsoft YaHei", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = primary ? '#111' : colors.gold2;
  ctx.fillText(text, x + width / 2, y + 23);
  ctx.textAlign = 'left';
}

const background = group('06 背景', [
  layer('背景底色', 0, 0, W, H, (ctx) => {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
  }),
  layer('背景网格线', 0, 0, W, H, (ctx) => {
    ctx.strokeStyle = 'rgba(229,199,111,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }),
]);

const header = group('05 顶部导航', [
  layer('导航底色', 0, 0, W, 88, (ctx) => {
    ctx.fillStyle = 'rgba(13,14,14,0.95)';
    ctx.fillRect(0, 0, W, 88);
    ctx.strokeStyle = colors.lineSoft;
    ctx.beginPath();
    ctx.moveTo(0, 87);
    ctx.lineTo(W, 87);
    ctx.stroke();
  }),
  layer('导航 Logo 图形', 56, 18, 56, 56, (ctx) => drawLogo(ctx, 0, 0, 56)),
  textLayer('导航品牌名 - 勋港', 126, 19, 110, 32, '勋港', 26, colors.text, 900),
  textLayer('导航副标题', 126, 53, 240, 24, 'AI 商品图与视觉内容生产平台', 13, colors.muted, 400),
  textLayer('导航菜单 - 核心能力', 640, 38, 90, 22, '核心能力', 15, colors.text, 700),
  textLayer('导航菜单 - 适用场景', 740, 38, 90, 22, '适用场景', 15, colors.text, 700),
  textLayer('导航菜单 - 品牌方案', 840, 38, 90, 22, '品牌方案', 15, colors.text, 700),
  textLayer('导航菜单 - 套餐权益', 940, 38, 90, 22, '套餐权益', 15, colors.text, 700),
  layer('按钮 - 登录', 1338, 22, 74, 46, (ctx) => drawPill(ctx, 0, 0, '登录', 74, false)),
  layer('按钮 - 进入工作台', 1428, 22, 126, 46, (ctx) => drawPill(ctx, 0, 0, '进入工作台', 126, true)),
]);

const heroCopy = group('04 首屏文案区', [
  layer('绿色提示胶囊', 90, 170, 225, 36, (ctx) => {
    fillRound(ctx, 0, 0, 225, 36, 18, 'rgba(229,199,111,0.08)', 'rgba(229,199,111,0.28)', 1);
    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.arc(17, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '800 14px "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = colors.gold2;
    ctx.textBaseline = 'middle';
    ctx.fillText('面向商家的 AI 视觉生产系统', 32, 18);
  }),
  textLayer('主标题文字', 90, 232, 590, 210, '让商品图、场景图和宣传素材更快完成。', 68, colors.text, 900, 1.06),
  textLayer('副标题文字', 90, 476, 590, 70, '勋港帮助商家从原始拍摄图快速生成可用于展示、上架和传播的视觉内容，统一保存图片资产、生成记录、门店额度和团队协作数据。', 18, colors.text, 400, 1.75),
  layer('按钮 - 开始生成', 90, 570, 104, 46, (ctx) => drawPill(ctx, 0, 0, '开始生成', 104, true)),
  layer('按钮 - 查看能力', 210, 570, 104, 46, (ctx) => drawPill(ctx, 0, 0, '查看能力', 104, false)),
  layer('指标卡 - 6 项能力', 90, 664, 190, 122, (ctx) => {
    fillRound(ctx, 0, 0, 190, 122, 8, 'rgba(18,20,20,0.72)', colors.lineSoft, 1);
    drawWrappedText(ctx, '6', 22, 22, 120, 30, 1.1, colors.gold2, 900);
    drawWrappedText(ctx, '项目图片处理能力', 22, 64, 140, 13, 1.4, colors.text, 400);
  }),
  layer('指标卡 - 多门店', 296, 664, 190, 122, (ctx) => {
    fillRound(ctx, 0, 0, 190, 122, 8, 'rgba(18,20,20,0.72)', colors.lineSoft, 1);
    drawWrappedText(ctx, '多门店', 22, 22, 130, 30, 1.1, colors.gold2, 900);
    drawWrappedText(ctx, '账号、额度、权限统一管理', 22, 64, 132, 13, 1.4, colors.text, 400);
  }),
  layer('指标卡 - 可扩展', 502, 664, 190, 122, (ctx) => {
    fillRound(ctx, 0, 0, 190, 122, 8, 'rgba(18,20,20,0.72)', colors.lineSoft, 1);
    drawWrappedText(ctx, '可扩展', 22, 22, 130, 30, 1.1, colors.gold2, 900);
    drawWrappedText(ctx, '后续接入短视频与会员套餐', 22, 64, 132, 13, 1.4, colors.text, 400);
  }),
]);

const visual = group('03 右侧工作台预览', [
  layer('工作台面板底色', 746, 162, 662, 624, (ctx) => {
    fillRound(ctx, 0, 0, 662, 624, 8, '#151616', 'rgba(229,199,111,0.34)', 1);
    ctx.fillStyle = '#1c1d1d';
    ctx.fillRect(1, 1, 660, 62);
    ctx.strokeStyle = colors.lineSoft;
    ctx.beginPath();
    ctx.moveTo(0, 62);
    ctx.lineTo(662, 62);
    ctx.stroke();
    ctx.fillStyle = '#3f4240';
    [28, 46, 64].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 31, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }),
  textLayer('工作台标题', 1316, 184, 90, 26, 'AI 工作台', 18, colors.gold2, 900),
  layer('左侧原图卡片', 774, 252, 346, 364, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 346, 364);
    grad.addColorStop(0, '#b69f7f');
    grad.addColorStop(0.55, '#c6b08d');
    grad.addColorStop(1, '#f1e6d4');
    fillRound(ctx, 0, 0, 346, 364, 8, grad, null);
    fillRound(ctx, 18, 18, 78, 32, 16, 'rgba(0,0,0,0.58)', null);
    drawWrappedText(ctx, '产品原图', 29, 25, 70, 13, 1, '#fff', 800);
    drawChair(ctx, 173, 210, 1.45);
  }),
  layer('右侧结果卡片', 1136, 252, 244, 364, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 244, 150);
    ctx.fillStyle = '#f5f1e9';
    ctx.fillRect(0, 150, 244, 214);
    fillRound(ctx, 0, 0, 244, 364, 8, null, 'rgba(255,255,255,0.1)', 1);
    fillRound(ctx, 18, 18, 78, 32, 16, 'rgba(0,0,0,0.58)', null);
    drawWrappedText(ctx, '生成结果', 29, 25, 70, 13, 1, '#fff', 800);
    drawChair(ctx, 122, 210, 1.45);
  }),
  layer('能力卡 - 背景净化', 774, 646, 230, 112, (ctx) => {
    fillRound(ctx, 0, 0, 230, 112, 8, 'rgba(255,255,255,0.035)', colors.lineSoft, 1);
    drawWrappedText(ctx, '背景净化', 20, 20, 120, 18, 1.2, colors.text, 900);
    drawWrappedText(ctx, '清理杂乱背景，保留商品主体。', 20, 54, 170, 13, 1.6, colors.text, 400);
  }),
  layer('能力卡 - 场景融合', 1014, 646, 230, 112, (ctx) => {
    fillRound(ctx, 0, 0, 230, 112, 8, 'rgba(255,255,255,0.035)', colors.lineSoft, 1);
    drawWrappedText(ctx, '场景融合', 20, 20, 120, 18, 1.2, colors.text, 900);
    drawWrappedText(ctx, '为商品生成统一展示场景。', 20, 54, 170, 13, 1.6, colors.text, 400);
  }),
  layer('能力卡 - 材质替换', 1254, 646, 130, 112, (ctx) => {
    fillRound(ctx, 0, 0, 130, 112, 8, 'rgba(255,255,255,0.035)', colors.lineSoft, 1);
    drawWrappedText(ctx, '材质替换', 18, 20, 100, 18, 1.2, colors.text, 900);
    drawWrappedText(ctx, '快速预览不同材质。', 18, 54, 90, 13, 1.6, colors.text, 400);
  }),
]);

const features = group('02 核心能力区', [
  textLayer('核心能力标题', 90, 910, 180, 44, '核心能力', 34, colors.text, 900),
  textLayer('核心能力说明', 930, 898, 440, 60, '先围绕商品图生产闭环打磨能力，后续可以扩展到更多商品行业、短视频生成、批量处理和企业协作。', 16, colors.text, 400, 1.6),
  ...[
    ['材', '材质替换', '替换表面材质，快速查看 SKU 效果。'],
    ['景', '场景融合', '生成更适合展示和传播的场景图。'],
    ['3D', '背景净化', '清理背景并保留产品主体结构。'],
    ['摄', '摄影增强', '提升画面清晰度、光影和质感。'],
    ['线', '线稿图', '输出适合沟通和设计参考的线稿。'],
    ['视', '多角度视图', '扩展商品展示角度和视觉素材。'],
  ].map(([icon, title, desc], i) => layer(`功能卡 - ${title}`, 90 + i * 240, 966, 224, 164, (ctx) => {
    fillRound(ctx, 0, 0, 224, 164, 8, 'rgba(18,20,20,0.75)', colors.lineSoft, 1);
    ctx.fillStyle = colors.gold;
    ctx.beginPath();
    ctx.arc(34, 36, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = '900 16px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 34, 36);
    ctx.textAlign = 'left';
    drawWrappedText(ctx, title, 20, 76, 130, 18, 1.2, colors.text, 900);
    drawWrappedText(ctx, desc, 20, 110, 174, 13, 1.55, colors.text, 400);
  })),
]);

const editableTextBackup = group('00 可编辑文字备份（隐藏，Photoshop 可尝试转为文字层）', [
  editableTextLayer('文字备份 - 主标题', 90, 300, '让商品图、场景图和宣传素材更快完成。', 68),
  editableTextLayer('文字备份 - 副标题', 90, 520, '勋港帮助商家从原始拍摄图快速生成可用于展示、上架和传播的视觉内容。', 18),
  editableTextLayer('文字备份 - 品牌名', 126, 46, '勋港', 26),
], false, true);

const children = [
  editableTextBackup,
  features,
  visual,
  heroCopy,
  header,
  background,
];

function renderComposite(children) {
  const canvas = c(W, H);
  const ctx = canvas.getContext('2d');
  drawChildren(ctx, children);
  return canvas;
}

function drawChildren(ctx, children) {
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const item = children[i];
    if (item.hidden) continue;
    if (item.children) {
      drawChildren(ctx, item.children);
    } else if (item.canvas) {
      ctx.save();
      ctx.globalAlpha = item.opacity ?? 1;
      ctx.drawImage(item.canvas, item.left || 0, item.top || 0);
      ctx.restore();
    }
  }
}

const composite = renderComposite(children);
const psd = {
  width: W,
  height: H,
  children,
  canvas: composite,
};

const psdPath = path.join(OUT_DIR, 'xungang-homepage-layered.psd');
const pngPath = path.join(OUT_DIR, 'xungang-homepage-layered-preview.png');
fs.writeFileSync(psdPath, writePsdBuffer(psd, { generateThumbnail: true, noBackground: true }));
fs.writeFileSync(pngPath, composite.toBuffer('image/png'));

console.log(JSON.stringify({ psdPath, pngPath }, null, 2));
