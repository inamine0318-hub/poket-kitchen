import { readFileSync, writeFileSync } from 'fs';

const filepath = 'src/App.tsx';
const content = readFileSync(filepath, 'utf8');
const lines = content.split('\n');

// Lines 383-714 (1-indexed) = indices 382-713 (0-indexed)
// Line 383 is the stations section start, line 714 is last line before popup
const sectionStart = 382; // 0-indexed (line 383)
const sectionEnd = 714;   // 0-indexed exclusive (line 715 = popup section start)

const before = lines.slice(0, sectionStart).join('\n');
const after  = lines.slice(sectionEnd).join('\n');

const newSection = `          {/* ═══════ 調理ステーション（全6台・3Dカウンター） ═══════ */}
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
                          background: \`rgba(220,160,0,\${isActive ? 0.95 : 0.5})\`,
                          bottom: 5 + i * 3,
                          left: \`\${18 + i * 18}%\`,
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
                  left: \`\${pos.x * 20}%\`,
                  top: \`\${pos.y * 20}%\`,
                  width: '20%',
                  height: '20%',
                  padding: \`\${PAD}px \${PAD}px \${PAD + FRONT_H}px \${PAD}px\`,
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
                    border: \`2px solid \${def.border}\`,
                    borderTop: \`2px solid \${def.highlight}\`,
                    borderRadius: '5px 5px 2px 2px',
                    boxShadow: [
                      \`0 \${FRONT_H}px 0 0 \${def.front}\`,
                      \`0 \${FRONT_H + 4}px 0 0 rgba(0,0,0,0.5)\`,
                      isActive
                        ? \`0 0 0 2px \${def.glow}, 0 0 18px \${def.glow}\`
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
                      style={{ background: \`radial-gradient(circle, \${def.glow} 0%, transparent 70%)\` }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 0.45 }}
                    />
                  )}
                </motion.div>
              </div>
            );
          })}`;

const newContent = before + '\n' + newSection + '\n\n';
writeFileSync(filepath, newContent + after, 'utf8');
console.log('Done! Total lines:', (newContent + after).split('\n').length);
