import { Dish, StationType, Position } from './types';

export const DISHES: Dish[] = [
  // ─── シンプル（2〜3ステップ） ───
  {
    id: 'potage',
    name: 'ポタージュ',
    icon: '🍲',
    steps: ['PREP', 'STOVE', 'SERVE'],
    points: 70,
    color: '#FFD6A5',
  },
  {
    id: 'escargot',
    name: 'エスカルゴ',
    icon: '🐌',
    steps: ['PREP', 'OVEN', 'SERVE'],
    points: 90,
    color: '#CAFFBF',
  },
  {
    id: 'fries',
    name: 'フリット',
    icon: '🍟',
    steps: ['PREP', 'GARNISH', 'SERVE'],
    points: 80,
    color: '#FDFFB6',
  },
  // ─── 標準（4ステップ） ───
  {
    id: 'crepe',
    name: 'クレープ',
    icon: '🥞',
    // クレープはフライパンで焼く→作業台でフルーツ等を盛る→提供
    steps: ['PREP', 'STOVE', 'TABLE', 'SERVE'],
    points: 100,
    color: '#9BF6FF',
  },
  {
    id: 'terrine',
    name: 'テリーヌ',
    icon: '🫕',
    steps: ['PREP', 'OVEN', 'TABLE', 'SERVE'],
    points: 110,
    color: '#DDA0DD',
  },
  {
    id: 'ratatouille',
    name: 'ラタトゥイユ',
    icon: '🥘',
    steps: ['PREP', 'STOVE', 'TABLE', 'SERVE'],
    points: 120,
    color: '#FFADAD',
  },
  {
    id: 'tempura',
    name: '天ぷら盛り',
    icon: '🍤',
    // 天ぷらは揚げて→作業台で盛り付け→提供
    steps: ['PREP', 'GARNISH', 'TABLE', 'SERVE'],
    points: 130,
    color: '#FFA07A',
  },
  {
    id: 'gratin',
    name: 'グラタン',
    icon: '🧀',
    // グラタンはソースをコンロで作り→オーブンで焼く→提供
    steps: ['PREP', 'STOVE', 'OVEN', 'SERVE'],
    points: 140,
    color: '#FFE4B5',
  },
  // ─── 高難度（5ステップ） ───
  {
    id: 'souffle',
    name: 'スフレ',
    icon: '🧁',
    steps: ['PREP', 'STOVE', 'OVEN', 'TABLE', 'SERVE'],
    points: 160,
    color: '#B5EAD7',
  },
  {
    id: 'duck_confit',
    name: '鴨のコンフィ',
    icon: '🍗',
    steps: ['PREP', 'STOVE', 'OVEN', 'TABLE', 'SERVE'],
    points: 190,
    color: '#C7CEEA',
  },
  // ─── 超高難度（コースメニュー・6ステップ） ───
  {
    id: 'full_course',
    name: 'フルコース',
    icon: '👑',
    steps: ['PREP', 'STOVE', 'OVEN', 'TABLE', 'GARNISH', 'SERVE'],
    points: 400,
    color: '#FFD700',
  },
  {
    id: 'degustation',
    name: 'デギュスタシオン',
    icon: '🥂',
    steps: ['PREP', 'GARNISH', 'STOVE', 'OVEN', 'TABLE', 'SERVE'],
    points: 500,
    color: '#C9A84C',
  },
];

export const STATION_ICONS: Record<StationType, string> = {
  PREP:    '🔪',
  STOVE:   '🍳',
  OVEN:    '♨️',
  GARNISH: '🍟',
  TABLE:   '🍽️',
  SERVE:   '🛎️',
  NONE:    '',
};

export const KITCHEN_SIZE = 5; // 5×5 グリッド

// ステーション配置：角4台＋中央1台＋上中央1台
export const STATIONS: Record<StationType, Position> = {
  PREP:    { x: 0, y: 0 }, // 左上：まな板
  STOVE:   { x: 4, y: 0 }, // 右上：コンロ
  OVEN:    { x: 2, y: 0 }, // 上中央：オーブン
  GARNISH: { x: 0, y: 4 }, // 左下：揚場
  SERVE:   { x: 4, y: 4 }, // 右下：盛りつけ台
  TABLE:   { x: 2, y: 2 }, // 中央：作業台
  NONE:    { x: -1, y: -1 },
};

export const GAME_DURATION = 90;
export const ORDER_INTERVAL = 2500;

export const REGULAR_CUSTOMERS = [
  { id: 'tanaka',  name: '田中さん',   emoji: '👴', dishId: 'potage',      message: 'いつものポタージュを頼む'   },
  { id: 'yamada',  name: '山田マダム', emoji: '👩‍🦳', dishId: 'terrine',     message: 'テリーヌを今日も一つ'       },
  { id: 'sato',    name: '佐藤部長',   emoji: '👨‍💼', dishId: 'ratatouille', message: 'ラタトゥイユを頼む'         },
  { id: 'suzuki',  name: '鈴木さん',   emoji: '🧑', dishId: 'crepe',       message: 'クレープをお願いします'     },
  { id: 'miyamoto',name: '宮本シェフ', emoji: '🧑‍🍳', dishId: 'gratin',      message: 'グラタン、いつも通りに'     },
];
