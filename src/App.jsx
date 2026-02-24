import React, { useState, useEffect, useRef } from 'react';

// --- Particle System ---
const createParticles = (x, y, color, count = 8) => {
  return Array.from({ length: count }).map(() => ({
    id: Math.random(),
    x, y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    life: 1.0,
    color
  }));
};

const StickWarGame = () => {
  const [gold, setGold] = useState(999999999); 
  const [enemyGold, setEnemyGold] = useState(999999999);
  const [units, setUnits] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [baseHealth, setBaseHealth] = useState({ player: 3000000, enemy: 3000000 });
  const [gameOver, setGameOver] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [cooldowns, setCooldowns] = useState({ arrowRain: 0, healAll: 0, meteor: 0 });

  const gameLoopRef = useRef();
  const GROUND_Y = 100; 
  const PLAYER_BASE_X = 150;
  const ENEMY_BASE_X = window.innerWidth - 150;
  const UNIT_LIMIT = 10;
  const MAX_BASE_HEALTH = 3000000;

  const unitTypes = {
    swordwrath: { name: 'Sword', cost: 125, health: 300, damage: 30, speed: 3.5, type: 'soldier', range: 50, attackSpeed: 600, color: '#60a5fa' },
    archidon: { name: 'Archidon', cost: 300, health: 200, damage: 25, speed: 2.8, type: 'soldier', range: 550, attackSpeed: 1600, color: '#fb923c' },
    magikill: { name: 'Magikill', cost: 900, health: 250, damage: 70, speed: 1.8, type: 'mage', range: 450, attackSpeed: 3000, color: '#c084fc' },
    giant: { name: 'Giant', cost: 2000, health: 3000, damage: 120, speed: 1.2, type: 'tank', range: 80, attackSpeed: 4000, color: '#94a3b8' }
  };

  const spawnUnit = (side, type) => {
    if (gameOver) return;
    const currentSideUnits = units.filter(u => u.side === side).length;
    if (currentSideUnits >= UNIT_LIMIT) return;
    const config = unitTypes[type];
    const currentGold = side === 'player' ? gold : enemyGold;
    if (currentGold >= config.cost) {
      if (side === 'player') setGold(prev => prev - config.cost);
      else setEnemyGold(prev => prev - config.cost);
      setUnits(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        ...config,
        currentHealth: config.health,
        x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
        y: 350 + (Math.random() * 40 - 20),
        side: side,
        state: 'moving', 
        lastAttack: 0,
        isAttacking: false
      }]);
    }
  };

  const castMeteor = () => {
    if (gameOver || cooldowns.meteor > 0) return;
    setCooldowns(prev => ({ ...prev, meteor: 20 }));
    setProjectiles(prev => [...prev, { id: Math.random(), x: ENEMY_BASE_X - 200, y: window.innerHeight, vx: -4, vy: -15, damage: 1000, side: 'player', isMeteor: true, angle: 45 }]);
  };

  const castArrowRain = () => {
    if (gameOver || cooldowns.arrowRain > 0) return;
    setCooldowns(prev => ({ ...prev, arrowRain: 15 }));
    const rain = Array.from({ length: 30 }).map(() => ({
      id: Math.random(),
      x: window.innerWidth/2 + (Math.random() * 1000 - 500),
      y: window.innerHeight,
      vx: (Math.random() - 0.5) * 4,
      vy: -10 - Math.random() * 5,
      damage: 50,
      side: 'player',
      isSpell: true,
      angle: 90
    }));
    setProjectiles(prev => [...prev, ...rain]);
  };

  const castHealAll = () => {
    if (gameOver || cooldowns.healAll > 0) return;
    setCooldowns(prev => ({ ...prev, healAll: 10 }));
    setUnits(prev => prev.map(u => u.side === 'player' ? { ...u, currentHealth: Math.min(u.health, u.currentHealth + 300) } : u));
    setParticles(prev => [...prev, ...createParticles(PLAYER_BASE_X + 200, 200, '#4ade80', 50)]);
  };

  // Cooldown timer & Passive Income
  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setCooldowns(prev => ({
        arrowRain: Math.max(0, prev.arrowRain - 1),
        healAll: Math.max(0, prev.healAll - 1),
        meteor: Math.max(0, prev.meteor - 1)
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const incomeTimer = setInterval(() => {
      setGold(prev => prev + 10);
      setEnemyGold(prev => prev + 10);
    }, 10000);
    return () => clearInterval(incomeTimer);
  }, [gameOver]);

  useEffect(() => {
    const update = () => {
      if (gameOver) return;
      const now = Date.now();

      // Leaves
      if (Math.random() > 0.98) {
        setLeaves(prev => [...prev, { id: Math.random(), x: Math.random() * window.innerWidth, y: window.innerHeight + 50, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, rotation: Math.random() * 360, vRot: (Math.random() - 0.5) * 5 }]);
      }
      setLeaves(prev => prev.map(l => ({ ...l, x: l.x + l.vx + Math.sin(now / 1000) * 1, y: l.y + l.vy, rotation: l.rotation + l.vRot })).filter(l => l.y > -50));

      setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.03 })).filter(p => p.life > 0));
      
      setProjectiles(prev => {
        let activeProjectiles = prev.map(p => {
            const nextY = p.y + p.vy;
            const nextVy = p.vy - (p.isMeteor ? 0.05 : 0.2);
            const angle = Math.atan2(-nextVy, p.vx) * (180 / Math.PI);
            return { ...p, x: p.x + p.vx, y: nextY, vy: nextVy, angle };
        });
        return activeProjectiles.filter(p => p.y > -100 && p.x > -100 && p.x < window.innerWidth + 100);
      });

      // Tower Auto-Attack
      if (now % 2000 < 20) {
         const playerUnitsNearEnemy = units.filter(u => u.side === 'player' && u.x > ENEMY_BASE_X - 600);
         if (playerUnitsNearEnemy.length > 0 && baseHealth.enemy > 0) {
            setProjectiles(prev => [...prev, { id: Math.random(), x: ENEMY_BASE_X, y: GROUND_Y + 150, vx: -12, vy: 5, damage: 40, side: 'enemy', angle: 0 }]);
         }
         const enemyUnitsNearPlayer = units.filter(u => u.side === 'enemy' && u.x < PLAYER_BASE_X + 600);
         if (enemyUnitsNearPlayer.length > 0 && baseHealth.player > 0) {
            setProjectiles(prev => [...prev, { id: Math.random(), x: PLAYER_BASE_X, y: GROUND_Y + 150, vx: 12, vy: 5, damage: 40, side: 'player', angle: 0 }]);
         }
      }

      setUnits(prevUnits => {
        const newUnits = prevUnits.map(unit => {
          let nextUnit = { ...unit };
          const enemies = prevUnits.filter(u => u.side !== unit.side);
          const unitVisualY = GROUND_Y + (150 - (unit.y - 300)); 

          projectiles.forEach(p => {
             if (p.side !== unit.side) {
                const dist = Math.sqrt(Math.pow(p.x - unit.x, 2) + Math.pow(p.y - unitVisualY, 2));
                if (dist < (unit.name === 'Giant' ? 80 : 40)) {
                   nextUnit.currentHealth -= p.damage;
                   setParticles(prev => [...prev, ...createParticles(unit.x, unitVisualY, p.isMeteor ? '#f97316' : '#ef4444', 10)]);
                   if (!p.isMeteor) p.y = -5000;
                }
             }
          });

          let target = null; let minDist = Infinity;
          enemies.forEach(e => { const d = Math.abs(e.x - unit.x); if (d < minDist) { minDist = d; target = e; } });
          const distToEnemyBase = Math.abs(unit.x - (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X));
          const isBaseInRange = distToEnemyBase <= unit.range;

          if (isBaseInRange || (target && minDist <= unit.range)) {
            nextUnit.state = 'attacking'; nextUnit.isAttacking = true;
            if (now - unit.lastAttack > unit.attackSpeed) {
              nextUnit.lastAttack = now;
              if (unit.name === 'Archidon') {
                setProjectiles(prev => [...prev, { id: Math.random(), x: unit.x, y: unitVisualY + 30, vx: (unit.side === 'player' ? 1 : -1) * 15, vy: 5, damage: unit.damage, side: unit.side, angle: 0 }]);
              } else if (unit.name === 'Magikill') {
                const blastX = target ? target.x : (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X);
                setParticles(prev => [...prev, ...createParticles(blastX, unitVisualY + 20, '#a855f7', 30)]);
                if (target) target.currentHealth -= unit.damage;
                enemies.forEach(e => { if (Math.abs(e.x - blastX) < 100) e.currentHealth -= unit.damage / 2; });
              } else {
                if (target) { 
                  target.currentHealth -= unit.damage; 
                  setParticles(prev => [...prev, ...createParticles(target.x, unitVisualY + 20, '#ef4444', 8)]); 
                }
                else if (isBaseInRange) {
                  setBaseHealth(prev => {
                    const next = { ...prev };
                    const sideToHit = unit.side === 'player' ? 'enemy' : 'player';
                    next[sideToHit] -= unit.damage;
                    return next;
                  });
                }
              }
            }
          } else {
            nextUnit.state = 'moving'; nextUnit.isAttacking = false;
            nextUnit.x += unit.speed * (unit.side === 'player' ? 1 : -1);
          }
          return nextUnit;
        });
        return newUnits.filter(u => u.currentHealth > 0);
      });

      if (baseHealth.enemy <= 0 && !gameOver) setGameOver('ORDER WINS');
      if (baseHealth.player <= 0 && !gameOver) setGameOver('CHAOS WINS');

      projectiles.forEach(p => {
         if (p.side === 'player' && Math.abs(p.x - ENEMY_BASE_X) < 100 && p.y < GROUND_Y + 200) {
            setBaseHealth(prev => ({...prev, enemy: Math.max(0, prev.enemy - p.damage / 2)}));
            setParticles(prev => [...prev, ...createParticles(p.x, p.y, '#f97316', 20)]);
            p.y = -5000;
         }
      });

      gameLoopRef.current = requestAnimationFrame(update);
    };
    gameLoopRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [projectiles, gameOver, units, baseHealth]);

  // AI
  useEffect(() => {
    if (gameOver) return;
    const aiInterval = setInterval(() => {
      const currentEnemyUnits = units.filter(u => u.side === 'enemy').length;
      if (currentEnemyUnits >= UNIT_LIMIT) return;
      const types = ['giant', 'magikill', 'archidon', 'swordwrath'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      if (enemyGold >= unitTypes[randomType].cost) spawnUnit('enemy', randomType);
    }, 2500);
    return () => clearInterval(aiInterval);
  }, [gameOver, enemyGold, units.length]);

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex flex-col select-none text-white font-sans">
      
      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-[500] bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex flex-col gap-2">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-yellow-500/50">
                <span className="text-3xl font-mono font-black text-yellow-400">💰 {gold.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-red-500/50 flex justify-between items-center gap-4">
                <span className="text-sm font-mono font-black text-red-400">ENEMY: {enemyGold.toLocaleString()}</span>
                <span className="text-[10px] font-bold bg-red-500/20 px-2 py-0.5 rounded text-red-300">POP: {units.filter(u=>u.side==='enemy').length}/{UNIT_LIMIT}</span>
            </div>
        </div>

        <div className="flex gap-3 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
           {[
             { id: 'arrowRain', n: 'ARROW RAIN', f: castArrowRain, k: 'Q', c: 'bg-blue-600', cd: 15 },
             { id: 'healAll', n: 'HEAL ALL', f: castHealAll, k: 'W', c: 'bg-green-600', cd: 10 },
             { id: 'meteor', n: 'METEOR', f: castMeteor, k: 'E', c: 'bg-orange-600', cd: 20 }
           ].map(s => (
             <button key={s.n} onClick={s.f} disabled={cooldowns[s.id] > 0} className={`relative flex flex-col items-center justify-center w-20 h-20 ${s.c} border-2 border-white/20 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:grayscale disabled:opacity-50 disabled:scale-100`}>
                <span className="text-[9px] font-black">{s.n}</span>
                <span className="text-xl font-bold mt-1">[{s.k}]</span>
                {cooldowns[s.id] > 0 && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center border-2 border-white/40">
                    <span className="text-2xl font-black">{cooldowns[s.id]}</span>
                  </div>
                )}
             </button>
           ))}
        </div>

        <div className="flex gap-10">
           <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Player Outpost</span>
              <div className="w-48 h-4 bg-black rounded-full border border-blue-500/30 p-[2px]">
                <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full" style={{ width: `${(baseHealth.player/MAX_BASE_HEALTH)*100}%` }}></div>
              </div>
              <span className="text-[9px] font-bold text-blue-300">POPULATION: {units.filter(u=>u.side==='player').length}/{UNIT_LIMIT}</span>
           </div>
           <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Enemy Outpost</span>
              <div className="w-48 h-4 bg-black rounded-full border border-red-500/30 p-[2px]">
                <div className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full" style={{ width: `${(baseHealth.enemy/MAX_BASE_HEALTH)*100}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="relative flex-1 w-full bg-[#030712] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e1b4b,_transparent)]"></div>
        {leaves.map(leaf => ( <div key={leaf.id} className="absolute pointer-events-none z-[450] text-green-900/40" style={{ left: leaf.x, bottom: leaf.y, transform: `rotate(${leaf.rotation}deg)` }}>🍂</div> ))}
        <div className="absolute left-[20%] bottom-40 text-7xl opacity-40 grayscale pointer-events-none">🌳</div>
        <div className="absolute right-[25%] bottom-40 text-7xl opacity-40 grayscale pointer-events-none">🌳</div>
        
        {/* Player Outpost */}
        <div className="absolute left-0 bottom-40 w-64 h-80 flex flex-col items-center justify-end">
           <div className={`w-48 h-64 bg-slate-800 border-x-8 border-t-8 border-blue-500/50 rounded-t-3xl relative ${baseHealth.player <= 0 ? 'opacity-20' : ''}`}>
              {baseHealth.player > 0 && <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl">🏹</div>}
           </div>
        </div>

        {/* Enemy Outpost */}
        <div className="absolute right-0 bottom-40 w-64 h-80 flex flex-col items-center justify-end">
           <div className={`w-48 h-64 bg-zinc-800 border-x-8 border-t-8 border-red-600/50 rounded-t-3xl relative ${baseHealth.enemy <= 0 ? 'opacity-20' : ''}`}>
              {baseHealth.enemy > 0 && <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl">🏹</div>}
           </div>
        </div>

        <div className="absolute bottom-0 w-full h-[100px] bg-gradient-to-b from-zinc-900 to-black border-t-4 border-zinc-800"></div>
        {particles.map(p => ( <div key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none blur-[1px] z-[1000]" style={{ left: p.x, bottom: p.y, backgroundColor: p.color, opacity: p.life }}></div> ))}
        {projectiles.map(p => ( 
          <div key={p.id} style={{ left: p.x, bottom: p.y, transform: `rotate(${p.angle}deg)` }} 
               className={`absolute shadow-[0_0_20px_white] rounded-full z-[900] ${p.isMeteor ? 'w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 blur-sm' : `w-14 h-[4px] ${p.side === 'player' ? 'bg-blue-300' : 'bg-red-500'}`}`}>
          </div> 
        ))}
        {units.map(unit => (
          <div key={unit.id} style={{ left: `${unit.x}px`, bottom: `${GROUND_Y + (150 - (unit.y - 300))}px`, zIndex: Math.floor(unit.y), transform: `scale(${unit.name === 'Giant' ? 2.5 : 1.2})` }} className="absolute transition-all duration-75 flex flex-col items-center">
            <div className="w-12 h-1.5 bg-black/80 mb-2 rounded-full overflow-hidden border border-white/20">
               <div className={`h-full ${unit.side === 'player' ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${(unit.currentHealth/unit.health)*100}%` }}></div>
            </div>
            <div className={`relative ${unit.side === 'enemy' ? 'scale-x-[-1]' : ''}`}>
               <div className={`w-5 h-5 rounded-full border-2 ${unit.side === 'player' ? 'bg-white border-blue-400' : 'bg-zinc-300 border-red-600'}`}></div>
               <div className={`w-[3px] h-9 ${unit.side === 'player' ? 'bg-white' : 'bg-zinc-300'} mx-auto relative`}>
                  <div className={`absolute top-4 h-[4px] rounded-full origin-left transition-all ${unit.isAttacking ? 'scale-x-150 brightness-200' : ''} ${
                    unit.name === 'Sword' ? 'w-10 bg-slate-200 rotate-[45deg]' : 
                    unit.name === 'Archidon' ? 'w-8 bg-orange-900 rotate-[-10deg]' :
                    unit.name === 'Magikill' ? 'w-14 bg-purple-600 rotate-[-45deg]' :
                    unit.name === 'Giant' ? 'w-18 bg-zinc-700 rotate-[40deg]' : 'w-5'
                  }`}></div>
               </div>
               <div className="flex justify-center -mt-1 gap-1.5">
                  <div className="w-[3px] h-6 bg-white rotate-[15deg] rounded-full"></div>
                  <div className="w-[3px] h-6 bg-white rotate-[-15deg] rounded-full"></div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Menu Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 p-4 bg-slate-900/90 backdrop-blur-2xl border-2 border-white/10 rounded-3xl z-[1000]">
          {Object.entries(unitTypes).map(([key, config]) => (
            <button key={key} onClick={() => spawnUnit('player', key)} disabled={units.filter(u=>u.side==='player').length >= UNIT_LIMIT} className="group relative w-20 h-20 bg-black/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100">
              <span className="text-[9px] font-black uppercase text-white/70 group-hover:text-white">{config.name}</span>
              <span className="text-xs font-bold text-yellow-400 group-hover:text-white mt-1">${config.cost}</span>
            </button>
          ))}
      </div>

      <div className="h-12 bg-black/90 px-10 flex items-center justify-between border-t border-white/10 z-[700]">
         <span className="text-[10px] font-black text-white/50 tracking-[0.5em] italic">STICK WAR CLONE v1.6 COOLDOWN</span>
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/95 z-[10000] flex flex-col items-center justify-center backdrop-blur-3xl">
           <h1 className={`text-9xl font-black mb-12 italic ${gameOver.includes('ORDER') ? 'text-blue-500' : 'text-red-600'}`}>{gameOver}</h1>
           <button onClick={() => window.location.reload()} className="px-20 py-8 bg-white text-black font-black text-3xl rounded-full hover:bg-yellow-400 transition-all">NEW WAR</button>
        </div>
      )}
    </div>
  );
};

export default StickWarGame;
