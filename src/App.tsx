import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Chef } from './components/Chef';
import { DISHES, STATIONS, KITCHEN_SIZE, GAME_DURATION, ORDER_INTERVAL, STATION_ICONS } from './constants';
import { Order, StationType, GameState, Popup } from './types';
import { getDailySpecial, getMichelinReview } from './services/geminiService';
import { Trophy, RotateCcw, Play, Timer, Utensils, Heart, CheckCircle2, AlertTriangle, ChefHat, Star } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    orders: [],
    chefPos: { x: 2, y: 2 },
    isGameOver: false,
    timeLeft: GAME_DURATION,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [scoreKey, setScoreKey] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [chefDirection, setChefDirection] = useState<'left' | 'right'>('right');
  const [dailySpecial, setDailySpecial] = useState<string>('');
  const [review, setReview] = useState<string>('');
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [commentary, setCommentary] = useState("厨房へようこそ。せいぜい私の舌を満足させてくれたまえ。");
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const orderTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getDailySpecial().then(setDailySpecial);
  }, []);

  // --- ポップアップ演出の追加 ---
  const addPopup = useCallback((x: number, y: number, text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setPopups(prev => [...prev, { id, x, y, text }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  }, []);

  // マス目をタップした時、またはスワイプした時の移動処理
  const moveChef = (nx: number, ny: number) => {
    setGameState(prev => ({
      ...prev,
      chefPos: { 
        x: Math.max(0, Math.min(4, Math.round(nx))), 
        y: Math.max(0, Math.min(4, Math.round(ny))) 
      }
    }));
  };

  // --- ドラッグ終了時の座標スナップ処理 (2D) ---
  const handleDragEnd = (_: any, info: any) => {
    const cellSize = 64; // 320px / 5 cells
    
    // 現在のピクセル位置を計算し、最も近いセルにスナップさせる
    const currentPxX = gameState.chefPos.x * cellSize + info.offset.x;
    const currentPxY = gameState.chefPos.y * cellSize + info.offset.y;
    
    const newX = Math.max(0, Math.min(4, Math.round(currentPxX / cellSize)));
    const newY = Math.max(0, Math.min(4, Math.round(currentPxY / cellSize)));

    moveChef(newX, newY);
    
    if (Math.abs(info.offset.x) > 10) {
      setChefDirection(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  // --- 判定ロジックを useEffect で確実に回す ---
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) return;
    
    // 座標の誤差を排除するために Math.round を使用
    const x = Math.round(gameState.chefPos.x);
    const y = Math.round(gameState.chefPos.y);
    
    // 座標 (x, y) に対応するステーションを厳密に検索
    const stationEntry = Object.entries(STATIONS).find(([_, pos]) => 
      Math.round(pos.x) === x && Math.round(pos.y) === y
    );
    
    const currentStation = stationEntry ? (stationEntry[0] as StationType) : 'NONE';

    if (currentStation && currentStation !== 'NONE') {
      setGameState(prev => {
        let totalEarned = 0;
        let anyProgress = false;
        let completedCount = 0;

        const nextOrders = prev.orders.map(order => {
          // 重要：現在のオーダーが次に必要としているステップを取得
          const requiredStep = order.dish.steps[order.currentStepIndex];

          if (requiredStep === currentStation) {
            anyProgress = true;
            const nextIdx = order.currentStepIndex + 1;
            
            // 全工程終了判定
            if (nextIdx >= order.dish.steps.length) {
              const basePoints = Math.floor(order.dish.points * 0.7); // 基本スコアを30%カット
              totalEarned += basePoints;
              completedCount++;
              addPopup(x, y, `完成! +${basePoints}`);
              return null; // 完成した料理を削除
            }
            addPopup(x, y, "OK!");
            return { ...order, currentStepIndex: nextIdx }; // 次のステップへ
          }
          return order; // 条件に合わない場合はそのまま
        }).filter((o): o is Order => o !== null);

        if (anyProgress) {
          if (completedCount > 0) {
            setCommentary(["Parfait!", "悪くない動きだ。", "ほう、やるな。", "少しはマシになったようだな。"][Math.floor(Math.random() * 4)]);
            // コンボボーナス強化: 同時完成時の倍率をアップ (基本スコアの50% * 完成数)
            const bonus = completedCount > 1 ? Math.floor(totalEarned * 0.5 * completedCount) : 0;
            
            if (completedCount > 1) {
              setShowCombo(true);
              setTimeout(() => setShowCombo(false), 1000);
            }

            if (totalEarned > 0) {
              setScoreKey(prev => prev + 1);
            }

            return { 
              ...prev, 
              orders: nextOrders, 
              score: prev.score + totalEarned + bonus 
            };
          }
          // 進捗があったが完成していない場合
          return { ...prev, orders: nextOrders };
        }
        return prev;
      });
    }
  }, [gameState.chefPos, isPlaying, gameState.isGameOver, addPopup]);

  const generateOrder = useCallback(() => {
    setGameState(prev => {
      if (prev.orders.length >= 8) return prev;
      const baseDish = DISHES[Math.floor(Math.random() * DISHES.length)];
      const isVIP = Math.random() < 0.1;
      
      // VIPの場合は得点3倍、制限時間短縮
      const dish = { ...baseDish };
      if (isVIP) {
        dish.points *= 3;
      }

      const newOrder: Order = {
        id: Math.random().toString(36).substr(2, 9),
        dish,
        currentStepIndex: 0,
        startTime: Date.now(),
        limitTime: isVIP ? 9600 : 20000, // 制限時間を20%短縮 (12s->9.6s, 25s->20s)
        isVIP
      };
      return { ...prev, orders: [...prev.orders, newOrder] };
    });
  }, []);

  // --- オーダーのカウントダウンと期限切れ処理 ---
  useEffect(() => {
    if (!isPlaying || gameState.isGameOver) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        let penalty = 0;
        let expiredCount = 0;
        const nextOrders = prev.orders.map(order => {
          const newTime = order.limitTime - 1000;
          if (newTime <= 0) {
            penalty += 100; // 減点を-50から-100に引き上げ
            expiredCount++;
            return null;
          }
          return { ...order, limitTime: newTime };
        }).filter((o): o is Order => o !== null);

        if (expiredCount > 0) {
          addPopup(2, 2, `クレーム! -${penalty}`);
          return { 
            ...prev, 
            orders: nextOrders, 
            score: Math.max(0, prev.score - penalty) 
          };
        }
        return { ...prev, orders: nextOrders };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, gameState.isGameOver, addPopup]);

  // --- 料理完成・期限切れ時の即時補充トリガー ---
  useEffect(() => {
    if (isPlaying && !gameState.isGameOver && gameState.orders.length < 4) {
      generateOrder();
    }
  }, [gameState.orders.length, isPlaying, gameState.isGameOver, generateOrder]);

  const handleRestart = () => {
    setGameState({
      score: 0,
      orders: [],
      chefPos: { x: 2, y: 2 },
      isGameOver: false,
      timeLeft: GAME_DURATION,
    });
    setReview('');
    setCommentary("厨房へ戻ったか。次は期待しているぞ。");
    setIsPlaying(true);
    
    // 初回オーダーの生成
    const firstDish = DISHES[Math.floor(Math.random() * DISHES.length)];
    setGameState(prev => ({
      ...prev,
      orders: [{
        id: 'initial-order',
        dish: firstDish,
        currentStepIndex: 0,
        startTime: Date.now(),
        limitTime: 20000,
      }]
    }));

    // タイマーの再始動
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (orderTimerRef.current) clearInterval(orderTimerRef.current);
          return { ...prev, timeLeft: 0, isGameOver: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    if (orderTimerRef.current) clearInterval(orderTimerRef.current);
    orderTimerRef.current = setInterval(generateOrder, ORDER_INTERVAL);
  };

  const startGame = handleRestart;

  useEffect(() => {
    if (gameState.isGameOver) {
      setIsReviewLoading(true);
      getMichelinReview(gameState.score).then(setReview).finally(() => setIsReviewLoading(false));
    }
  }, [gameState.isGameOver, gameState.score]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (orderTimerRef.current) clearInterval(orderTimerRef.current);
    };
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden font-sans"
         style={{ background: 'linear-gradient(180deg, #0e0b08 0%, #1a130e 100%)' }}>

      {/* ── 毒舌コメント帯 ── */}
      <div className="z-50 text-center py-1 px-3"
           style={{ background: 'linear-gradient(90deg, #5a0000 0%, #900000 50%, #5a0000 100%)', borderBottom: '2px solid #c8820040' }}>
        <p className="text-[9px] italic text-white/90 leading-tight font-serif truncate">「{commentary}」</p>
      </div>

      {/* ── ゲームHUD ヘッダー ── */}
      <header className="z-40 px-3 py-2 flex justify-between items-center"
              style={{ background: 'linear-gradient(180deg, #1e1610 0%, #150f0a 100%)', borderBottom: '2px solid #c89030' }}>
        {/* タイトル */}
        <div className="flex flex-col leading-none">
          <span className="font-black uppercase tracking-tight text-base md:text-lg"
                style={{ color: '#e8c060', textShadow: '0 0 10px #c0800060, 1px 1px 0 #000' }}>
            Pocket Kitchen
          </span>
          <span className="text-[7px] font-bold tracking-widest"
                style={{ color: '#a07840' }}>
            ポケットキッチン
          </span>
        </div>

        {/* スコア＋タイマー */}
        <div className="flex gap-3 items-center">
          {/* スコア */}
          <div className="flex flex-col items-center px-3 py-1 rounded"
               style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #806030' }}>
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#a07840' }}>SCORE</span>
            <motion.span
              key={scoreKey}
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ duration: 0.18 }}
              className="text-lg font-black leading-none"
              style={{ color: '#ffe080', textShadow: '0 0 8px #ffb04080' }}
            >
              {gameState.score.toLocaleString()}
            </motion.span>
          </div>
          {/* タイマー */}
          <div className="flex flex-col items-center px-3 py-1 rounded"
               style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${gameState.timeLeft < 10 ? '#cc3030' : '#806030'}` }}>
            <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: '#a07840' }}>TIME</span>
            <span className={`text-lg font-black leading-none ${gameState.timeLeft < 10 ? 'animate-pulse' : ''}`}
                  style={{ color: gameState.timeLeft < 10 ? '#ff5040' : '#ffe080', textShadow: gameState.timeLeft < 10 ? '0 0 8px #ff303080' : '0 0 8px #ffb04080' }}>
              {gameState.timeLeft}
            </span>
          </div>
        </div>
      </header>

      {/* ── キッチンフィールド ── */}
      <main className="relative flex-1 flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0a0806 100%)' }}>

        {/* 上方からのスポットライト */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,200,80,0.08) 0%, transparent 60%)' }} />

        {/* ──────── キッチン本体 ──────── */}
        <div
          className="relative rounded"
          style={{
            width: 'min(92vw, 360px)',
            height: 'min(92vw, 360px)',
            // overflow: visible でシェフが端でクリップされないようにする
            overflow: 'visible',
            border: '3px solid #909898',
            outline: '3px solid #505858',
            boxShadow: [
              '0 0 0 1px #b0b8c040',
              '0 0 20px rgba(160,200,220,0.15)',
              '0 20px 60px rgba(0,0,0,0.8)',
            ].join(', '),
          }}
        >
          {/* 背景レイヤー（overflow-hidden でクリップ） */}
          <div
            className="absolute inset-0 rounded overflow-hidden pointer-events-none z-0"
            style={{
              // プロの厨房：清潔な白タイル床
              backgroundColor: '#f0f0ee',
              backgroundImage: [
                // タイル縦目地
                'repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(160,160,160,0.55) 35px, rgba(160,160,160,0.55) 36px)',
                // タイル横目地
                'repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(160,160,160,0.55) 35px, rgba(160,160,160,0.55) 36px)',
              ].join(', '),
            }}
          />

          {/* 奥の壁（上段22%）─ ステンレス */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-[1] overflow-hidden"
            style={{
              height: '22%',
              // ステンレス光沢グラデーション
              background: 'linear-gradient(180deg, #8898a8 0%, #b0c0cc 25%, #d8e4ec 55%, #c0ccd4 80%, #a0b0bc 100%)',
              backgroundImage: [
                // ブラッシュ横線（ヘアライン仕上げ）
                'repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)',
                // 中央の強い反射ハイライト
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 15%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 60%, rgba(255,255,255,0.0) 85%, transparent 100%)',
              ].join(', '),
              borderBottom: '3px solid #607080',
            }}
          >
            {/* レールライト（壁上部の照明ライン） */}
            <div style={{
              position: 'absolute', top: 4, left: '8%', right: '8%', height: 3,
              background: 'linear-gradient(90deg, transparent, rgba(255,240,180,0.7) 20%, rgba(255,240,180,0.9) 50%, rgba(255,240,180,0.7) 80%, transparent)',
              borderRadius: 2,
              boxShadow: '0 0 8px rgba(255,220,100,0.5)',
            }} />
          </div>

          {/* 壁→床の境界シャドウ */}
          <div className="absolute top-[22%] left-0 right-0 h-3 pointer-events-none z-[1]"
               style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)' }} />

          {/* 床タイル反射（下半分に光沢を追加） */}
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none z-[1]"
               style={{
                 top: '50%',
                 background: 'linear-gradient(180deg, transparent 0%, rgba(220,230,240,0.08) 100%)',
               }} />

          {/* 床グリッド（全面タップ可能） */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 z-[2]">
            {[...Array(25)].map((_, i) => {
              const gx = i % 5;
              const gy = Math.floor(i / 5);
              return (
                <div
                  key={i}
                  onClick={() => moveChef(gx, gy)}
                  className="cursor-pointer active:bg-white/20 transition-colors"
                  style={{ border: '0.5px solid rgba(80,40,0,0.25)' }}
                />
              );
            })}
          </div>

          {/* ═══════ 調理ステーション（全6台・3Dカウンター） ═══════ */}
          {Object.entries(STATIONS).map(([type, pos]) => {
            if (type === 'NONE') return null;
            const isActive =
              Math.round(gameState.chefPos.x) === Math.round(pos.x) &&
              Math.round(gameState.chefPos.y) === Math.round(pos.y);

            const FRONT_H = 7;
            const PAD = 3;

            // 各ステーション定義
            type StationDef = {
              top: string; front: string; border: string; highlight: string;
              label: string; glow: string; zLayer?: number;
              content: React.ReactNode;
            };

            const stationDefs: Record<string, StationDef> = {

              // ─── まな板 ─────────────────────────────────────────────
              PREP: {
                top: 'linear-gradient(170deg, #d4a060 0%, #a86828 100%)',
                front: '#6a3808', border: '#3a1800', highlight: 'rgba(255,200,100,0.5)',
                label: 'まな板', glow: 'rgba(255,200,80,0.45)', zLayer: 5,
                content: (
                  <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: 'repeating-linear-gradient(8deg, transparent, transparent 5px, rgba(60,20,0,0.22) 5px, rgba(60,20,0,0.22) 6px)',
                    }} />
                    <div className="absolute inset-[5px] rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(80,30,0,0.3)' }} />
                    <span style={{ fontSize: 22, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))', zIndex: 2, position: 'relative' }}>🔪</span>
                  </>
                ),
              },

              // ─── コンロ ─────────────────────────────────────────────
              STOVE: {
                top: 'linear-gradient(170deg, #686868 0%, #383838 100%)',
                front: '#181818', border: '#080808', highlight: 'rgba(150,150,150,0.4)',
                label: 'コンロ', glow: 'rgba(255,120,0,0.55)', zLayer: 5,
                content: (
                  <>
                    <div className="absolute top-[8px] left-0 right-0 h-px pointer-events-none" style={{ background: 'rgba(255,255,255,0.15)' }} />
                    <div className="relative z-10 flex items-center justify-center" style={{ width: 34, height: 34 }}>
                      <div className="absolute rounded-full border-[2.5px]" style={{ width: 34, height: 34, borderColor: '#aaa' }} />
                      <div className="absolute rounded-full border-2" style={{ width: 22, height: 22, borderColor: '#999' }} />
                      <div className="absolute rounded-full border" style={{ width: 12, height: 12, borderColor: '#888' }} />
                      <div className="absolute rounded-full" style={{ width: 5, height: 5, background: '#777' }} />
                    </div>
                    {isActive && (
                      <motion.div
                        className="absolute pointer-events-none rounded-full"
                        style={{ width: 32, height: 32, background: 'radial-gradient(circle, rgba(255,200,0,1) 0%, rgba(255,80,0,0.8) 40%, transparent 70%)' }}
                        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 0.3 }}
                      />
                    )}
                  </>
                ),
              },

              // ─── オーブン ───────────────────────────────────────────
              OVEN: {
                top: 'linear-gradient(170deg, #606060 0%, #343434 100%)',
                front: '#141414', border: '#060606', highlight: 'rgba(120,120,120,0.35)',
                label: 'オーブン', glow: 'rgba(255,140,0,0.5)', zLayer: 5,
                content: (
                  <>
                    <div className="relative z-10 flex items-center justify-center" style={{
                      width: '66%', height: '46%',
                      background: isActive ? 'rgba(80,30,0,0.9)' : 'rgba(8,8,8,0.95)',
                      border: '2px solid #606060',
                      borderRadius: 4,
                    }}>
                      {isActive ? (
                        <motion.div style={{
                          width: '70%', height: '70%', borderRadius: 3,
                          background: 'radial-gradient(circle, rgba(255,220,0,1) 0%, rgba(255,100,0,0.8) 50%, rgba(180,20,0,0.4) 80%, transparent 100%)',
                        }}
                          animate={{ opacity: [0.75, 1, 0.75] }}
                          transition={{ repeat: Infinity, duration: 0.35 }}
                        />
                      ) : (
                        <div style={{ width: '65%', height: '65%', border: '1px solid #444', borderRadius: 2 }} />
                      )}
                    </div>
                    <div className="z-10 flex gap-[5px] mt-[3px]" style={{ position: 'relative' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'radial-gradient(circle at 35% 30%, #d0d0d0, #707070)',
                          border: '1.5px solid #404040',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: 1.5, height: 3.5, background: '#404040', borderRadius: 1 }} />
                        </div>
                      ))}
                    </div>
                  </>
                ),
              },

              // ─── 揚場 ───────────────────────────────────────────────
              GARNISH: {
                top: 'linear-gradient(180deg, #504038 0%, #302820 100%)',
                front: '#181008', border: '#080400', highlight: 'rgba(130,100,50,0.4)',
                label: '揚場', glow: 'rgba(200,140,0,0.55)', zLayer: 5,
                content: (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
                      height: '40%',
                      background: 'linear-gradient(180deg, rgba(180,110,0,0.6) 0%, rgba(140,70,0,0.9) 100%)',
                    }} />
                    <div className="absolute pointer-events-none" style={{
                      bottom: '39%', left: '10%', right: '10%', height: 2,
                      background: 'linear-gradient(90deg, transparent, rgba(255,200,80,0.6), transparent)',
                    }} />
                    <div className="relative z-10" style={{
                      width: 34, height: 26,
                      border: '2.5px solid #909090',
                      borderRadius: '3px 3px 9px 9px',
                      background: [
                        'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(200,200,200,0.2) 4px, rgba(200,200,200,0.2) 5px)',
                        'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(200,200,200,0.2) 4px, rgba(200,200,200,0.2) 5px)',
                      ].join(', '),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
                      marginBottom: 3,
                    }}>
                      <span style={{ fontSize: 17, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.7))' }}>🍟</span>
                    </div>
                    <div className="absolute z-10" style={{
                      top: 4, left: '50%', marginLeft: -11,
                      width: 22, height: 8,
                      border: '2.5px solid #a0a0a0',
                      borderBottom: 'none',
                      borderRadius: '8px 8px 0 0',
                    }} />
                    {[0, 1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: 3 + (i % 2) * 2,
                          height: 3 + (i % 2) * 2,
                          background: `rgba(220,160,0,${isActive ? 0.95 : 0.5})`,
                          bottom: 5 + i * 3,
                          left: `${18 + i * 18}%`,
                        }}
                        animate={{ y: [0, -(8 + i * 3), 0], opacity: [1, 0.1, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: isActive ? 0.28 + i * 0.06 : 0.8 + i * 0.18,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </>
                ),
              },

              // ─── 中央作業台 ─────────────────────────────────────────
              TABLE: {
                top: 'linear-gradient(170deg, #f8f4f0 0%, #e8e0d8 100%)',
                front: '#c0b0a0', border: '#907060', highlight: 'rgba(255,255,255,0.6)',
                label: '作業台', glow: 'rgba(255,230,100,0.45)', zLayer: 10,
                content: (
                  <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: [
                        'repeating-linear-gradient(115deg, transparent, transparent 9px, rgba(150,130,110,0.18) 9px, rgba(150,130,110,0.18) 10px)',
                        'repeating-linear-gradient(65deg, transparent, transparent 16px, rgba(160,140,120,0.12) 16px, rgba(160,140,120,0.12) 17px)',
                      ].join(', '),
                    }} />
                    <div className="absolute inset-[4px] border rounded-sm pointer-events-none" style={{ borderColor: 'rgba(160,140,120,0.5)' }} />
                    <div className="absolute top-[28%] left-4 right-4 h-px pointer-events-none" style={{ background: 'rgba(150,130,110,0.4)' }} />
                    <span style={{ fontSize: 22, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))', zIndex: 2, position: 'relative' }}>🍽️</span>
                  </>
                ),
              },

              // ─── 盛りつけ台 ─────────────────────────────────────────
              SERVE: {
                top: 'linear-gradient(170deg, #fffff8 0%, #f0e8e0 100%)',
                front: '#c0a890', border: '#907060', highlight: 'rgba(255,255,240,0.6)',
                label: '盛り台', glow: 'rgba(255,240,160,0.5)', zLayer: 5,
                content: (
                  <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: 'repeating-linear-gradient(125deg, transparent, transparent 10px, rgba(200,180,160,0.15) 10px, rgba(200,180,160,0.15) 11px)',
                    }} />
                    <div className="absolute inset-[4px] rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(180,160,140,0.6)' }} />
                    <div className="absolute top-[20%] left-3 right-3 h-[1.5px] pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,160,60,0.5), transparent)' }} />
                    <span style={{ fontSize: 22, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))', zIndex: 2, position: 'relative' }}>🛎️</span>
                  </>
                ),
              },
            };

            const def = stationDefs[type];
            if (!def) return null;

            return (
              <div
                key={type}
                className="absolute pointer-events-none"
                style={{
                  left: `${pos.x * 20}%`,
                  top: `${pos.y * 20}%`,
                  width: '20%',
                  height: '20%',
                  padding: `${PAD}px ${PAD}px ${PAD + FRONT_H}px ${PAD}px`,
                  zIndex: def.zLayer ?? 5,
                }}
              >
                <motion.div
                  animate={isActive ? { scale: 1.07, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: def.top,
                    border: `2px solid ${def.border}`,
                    borderTop: `2px solid ${def.highlight}`,
                    borderRadius: '5px 5px 2px 2px',
                    boxShadow: [
                      `0 ${FRONT_H}px 0 0 ${def.front}`,
                      `0 ${FRONT_H + 4}px 0 0 rgba(0,0,0,0.5)`,
                      isActive
                        ? `0 0 0 2px ${def.glow}, 0 0 18px ${def.glow}`
                        : '0 3px 10px rgba(0,0,0,0.7)',
                    ].join(', '),
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {def.content}

                  {/* 共通ラベル */}
                  <div className="absolute bottom-[3px] px-[6px] py-[2px] rounded" style={{
                    background: 'rgba(0,0,0,0.75)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 20,
                  }}>
                    <span style={{ fontSize: '0.38rem', color: '#e8e0d0', fontWeight: 800, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{def.label}</span>
                  </div>

                  {/* アクティブグロー */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${def.glow} 0%, transparent 70%)` }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 0.45 }}
                    />
                  )}
                </motion.div>
              </div>
            );
          })}

          {/* ポップアップ表示 */}
          <AnimatePresence>
            {popups.map(popup => (
              <motion.div
                key={popup.id}
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, y: -40, opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ left: `${popup.x * 20 + 10}%`, top: `${popup.y * 20}%` }}
                className="absolute z-[70] pointer-events-none -translate-x-1/2"
              >
                <div className="bg-white text-[#800000] px-3 py-1 rounded-full font-black text-xs shadow-lg border-2 border-[#800000] whitespace-nowrap">
                  {popup.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* コンボ表示 */}
          <AnimatePresence>
            {showCombo && (
              <motion.div
                initial={{ scale: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1.5, y: -50, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none"
              >
                <div className="bg-[#d4af37] text-[#800000] px-6 py-2 rounded-full font-black text-2xl shadow-2xl border-4 border-[#800000] rotate-[-5deg]">
                  COMBO!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2Dシェフ */}
          <motion.div
            drag
            dragConstraints={{ 
              left: 0, 
              right: window.innerWidth < 768 ? 256 : 320, 
              top: 0, 
              bottom: window.innerWidth < 768 ? 256 : 320 
            }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
              setIsDragging(false);
              handleDragEnd(e, info);
            }}
            animate={{ 
              x: gameState.chefPos.x * (window.innerWidth < 768 ? 64 : 80), 
              y: gameState.chefPos.y * (window.innerWidth < 768 ? 64 : 80) 
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="absolute z-50 cursor-grab active:cursor-grabbing w-[20%] h-[20%] flex items-center justify-center"
            style={{ boxShadow: 'none', filter: 'none' }}
          >
            <div className="relative scale-125">
              <Chef direction={chefDirection} isMoving={isDragging} x={0} y={0} />
            </div>
          </motion.div>
        </div>
      </main>

      {/* オーダーエリア */}
      <footer className="h-36 p-2 flex gap-2 overflow-x-auto border-t-2 border-zinc-700 shadow-inner scrollbar-hide overflow-y-hidden"
              style={{ background: 'linear-gradient(180deg, #282018 0%, #1a1510 100%)' }}>
        <AnimatePresence mode="popLayout">
          {gameState.orders.map(order => {
            const maxTime = order.isVIP ? 9600 : 20000;
            const isDanger = order.limitTime < maxTime * 0.25;
            
            return (
              <motion.div 
                key={order.id} 
                layout 
                initial={{ x: 100, opacity: 0 }} 
                animate={{ 
                  x: isDanger ? [0, -2, 2, -2, 2, 0] : 0, 
                  opacity: 1,
                  backgroundColor: isDanger ? '#fff1f1' : '#ffffff',
                }} 
                exit={{ x: -200, opacity: 0, rotate: -10 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  x: isDanger ? { repeat: Infinity, duration: 0.2 } : { type: "spring" }
                }}
                className={`min-w-[140px] h-full p-2 rounded-sm border-l-4 shadow-xl flex flex-col justify-between transition-colors duration-300
                  ${order.isVIP ? 'border-yellow-500 bg-yellow-50' : 'border-[#800000] bg-white'}
                  ${isDanger ? 'border-red-600' : ''}
                `}
              >
                <div>
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center gap-1">
                      <p className={`text-[7px] font-bold tracking-widest uppercase ${order.isVIP ? 'text-yellow-700' : 'text-[#800000]'}`}>
                        {order.isVIP ? '⭐ VIP MENU' : 'MENU'}
                      </p>
                      {isDanger && <AlertTriangle size={8} className="text-red-600 animate-bounce" />}
                    </div>
                    <span className={`text-[8px] font-bold ${order.isVIP ? 'text-yellow-600' : 'text-gray-400'}`}>
                      +{order.dish.points}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{order.dish.icon}</span>
                    <p className="text-[10px] font-black tracking-tighter leading-none">{order.dish.name}</p>
                  </div>
                </div>
                
                <div className="mt-1">
                  <div className="flex justify-between text-[6px] font-bold text-gray-400 uppercase mb-1">
                    <span>工程進捗</span>
                    <span className={isDanger ? 'text-red-600 font-black' : ''}>
                      {Math.ceil(order.limitTime / 1000)}s
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {order.dish.steps.map((step, idx) => {
                      const isCompleted = idx < order.currentStepIndex;
                      const isCurrent = idx === order.currentStepIndex;
                      return (
                        <div 
                          key={idx} 
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-all duration-300
                            ${isCompleted ? 'bg-green-50 border-green-500 text-green-600' : 
                              isCurrent ? 'bg-yellow-50 border-yellow-500 text-yellow-600 animate-pulse' : 
                              'bg-gray-50 border-gray-100 text-gray-300 opacity-40'}`}
                        >
                          {isCompleted ? <CheckCircle2 size={10} /> : STATION_ICONS[step]}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-bold text-[#800000] uppercase">次:</span>
                    <div className={`px-1.5 py-0.5 rounded border ${isDanger ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <span className={`text-[10px] font-bold ${isDanger ? 'text-red-600' : ''}`}>
                        {STATION_ICONS[order.dish.steps[order.currentStepIndex]] || '完了'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {!isPlaying && !gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/95 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full rounded-lg bg-white p-12 text-center shadow-2xl border-4 border-[#d4af37]"
            >
              <div className="text-6xl mb-6">👨‍🍳</div>
              <h2 className="text-4xl font-black text-[#800000] uppercase tracking-widest mb-1">Pocket Kitchen</h2>
              <p className="text-xs text-[#d4af37] font-bold tracking-widest mb-6">ポケットキッチン</p>
              <p className="text-sm text-gray-600 mb-8 leading-relaxed italic">
                シェフをドラッグして調理ステーションを巡ろう！<br/>
                <span className="text-[10px] text-gray-500 not-italic block mt-2">
                  🔪まな板 → 🔥コンロ → 🍟揚場 → 🍽️作業台 → 🛎️盛り台
                </span>
              </p>
              <button
                onClick={startGame}
                className="w-full py-4 bg-[#800000] text-[#d4af37] font-bold uppercase tracking-[0.3em] rounded-sm shadow-xl hover:bg-[#600000] transition-colors"
              >
                開店する
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/98 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-lg bg-white p-12 text-center shadow-2xl border-4 border-[#d4af37]"
            >
              <div className="flex justify-center mb-4">
                <ChefHat size={64} className="text-[#800000]" />
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-[0.4em] text-[#800000] mb-2">サービス終了</h2>
              <div className="text-7xl font-bold text-[#1a1a1a] tracking-tighter mb-8">{gameState.score}</div>
              
              <div className="relative rounded-lg bg-[#f5f5f5] p-8 border-2 border-[#d4af37] mb-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#d4af37] px-6 py-1 rounded-full text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest">
                  評価
                </div>
                {isReviewLoading ? (
                  <div className="animate-pulse text-gray-400 italic">評価中...</div>
                ) : (
                  <p className="text-xl font-serif italic text-[#1a1a1a]">{review}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRestart}
                className="w-full py-4 bg-[#800000] text-[#d4af37] font-bold uppercase tracking-[0.2em] rounded-sm shadow-xl border-2 border-[#d4af37] hover:bg-[#600000] transition-colors"
              >
                厨房に戻る（再挑戦）
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
