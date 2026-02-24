import React, { useState, useEffect, useRef } from 'react';

// --- Improved Particle System (Glow & Fade) ---
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
  const [gold, setGold] = useState(999995999); 
  const [enemyGold, setEnemyGold] = useState(5000);
  const [units, setUnits] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [baseHealth, setBaseHealth] = useState({ player: 5000, enemy: 5000 });
  const [gameOver, setGameOver] = useState(null);
  const [mines, setMines] = useState([
    { id: 1, x: window.innerWidth * 0.4, amount: 5000, initial: 5000 },
    { id: 2, x: window.innerWidth * 0.6, amount: 5000, initial: 5000 }
  ]);
  const [upgrades, setUpgrades] = useState({ swordDamage: 0, archidonRange: 0, minerEfficiency: 0, magicPower: 0 });
  const [cooldowns, setCooldowns] = useState({ arrowRain: 0, healAll: 0, meteor: 0 });

  const gameLoopRef = useRef();
  const GROUND_Y = 100; 
  const PLAYER_BASE_X = 150;
  const ENEMY_BASE_X = window.innerWidth - 150;

  const unitTypes = {
    miner: { name: 'Miner', cost: 150, health: 150, damage: 0, speed: 2.0, type: 'worker', range: 40, attackSpeed: 1000, color: '#facc15' },
    swordwrath: { name: 'Sword', cost: 125, health: 300, damage: 30, speed: 3.5, type: 'soldier', range: 50, attackSpeed: 600, color: '#60a5fa' },
    archidon: { name: 'Archidon', cost: 300, health: 200, damage: 25, speed: 2.8, type: 'soldier', range: 550, attackSpeed: 1600, color: '#fb923c' },
    magikill: { name: 'Magikill', cost: 900, health: 250, damage: 70, speed: 1.8, type: 'mage', range: 450, attackSpeed: 3000, color: '#c084fc' },
    giant: { name: 'Giant', cost: 2000, health: 3000, damage: 120, speed: 1.2, type: 'tank', range: 80, attackSpeed: 4000, color: '#94a3b8' }
  };

  const spawnUnit = (side, type) => {
    if (gameOver) return;
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
        isAttacking: false,
        targetMineId: null
      }]);
    }
  };

  const castMeteor = () => {
    if (cooldowns.meteor > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, meteor: 45 }));
    setProjectiles(prev => [...prev, { id: Math.random(), x: ENEMY_BASE_X - 200, y: window.innerHeight, vx: -2, vy: -12, damage: 600, side: 'player', isMeteor: true, angle: 45 }]);
  };

  const castArrowRain = () => {
    if (cooldowns.arrowRain > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, arrowRain: 25 }));
    const rain = Array.from({ length: 25 }).map(() => ({
      id: Math.random(),
      x: window.innerWidth/2 + (Math.random() * 800 - 400),
      y: window.innerHeight,
      vx: (Math.random() - 0.5) * 4,
      vy: -8,
      damage: 40,
      side: 'player',
      isSpell: true,
      angle: 90
    }));
    setProjectiles(prev => [...prev, ...rain]);
  };

  const castHealAll = () => {
    if (cooldowns.healAll > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, healAll: 40 }));
    setUnits(prev => prev.map(u => u.side === 'player' ? { ...u, currentHealth: Math.min(u.health, u.currentHealth + 200) } : u));
    setParticles(prev => [...prev, ...createParticles(PLAYER_BASE_X + 200, 200, '#4ade80', 40)]);
  };

  useEffect(() => {
    const update = () => {
      if (gameOver) return;
      const now = Date.now();

      setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.04 })).filter(p => p.life > 0));
      
      setProjectiles(prev => prev.map(p => {
        const nextY = p.y + p.vy;
        const nextVy = p.vy - (p.isMeteor ? 0.05 : 0.2);
        const angle = Math.atan2(-nextVy, p.vx) * (180 / Math.PI);
        return { ...p, x: p.x + p.vx, y: nextY, vy: nextVy, angle };
      }).filter(p => p.y > 0 && p.x > 0 && p.x < window.innerWidth));

      setUnits(prevUnits => {
        const newUnits = prevUnits.map(unit => {
          let nextUnit = { ...unit };
          const enemies = prevUnits.filter(u => u.side !== unit.side);
          const unitVisualY = GROUND_Y + (150 - (unit.y - 300)); 

          if (unit.type === 'worker') {
            const activeMines = mines.filter(m => m.amount > 0);
            let targetMine = activeMines.find(m => m.id === unit.targetMineId) || activeMines[0];
            if (!targetMine) { nextUnit.state = 'moving'; return nextUnit; }
            nextUnit.targetMineId = targetMine.id;
            const distToMine = Math.abs(unit.x - targetMine.x);
            const distToBase = Math.abs(unit.x - (unit.side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X));

            if (unit.state === 'returning') {
              if (distToBase < 50) {
                if (unit.side === 'player') setGold(g => g + (30 + upgrades.minerEfficiency * 15));
                else setEnemyGold(eg => eg + 30);
                nextUnit.state = 'moving';
              } else { nextUnit.x += (unit.side === 'player' ? -1 : 1) * unit.speed; }
            } else if (distToMine < 25) {
              if (now - unit.lastAttack > 1000) { 
                nextUnit.state = 'returning'; 
                nextUnit.lastAttack = now;
                setMines(prev => prev.map(m => m.id === targetMine.id ? { ...m, amount: Math.max(0, m.amount - 20) } : m));
              }
              else { nextUnit.state = 'mining'; }
            } else { nextUnit.x += (unit.side === 'player' ? 1 : -1) * unit.speed; }
            return nextUnit;
          }

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
                  setParticles(prev => [...prev, ...createParticles(target.x, unitVisualY + 20, unit.side === 'player' ? '#60a5fa' : '#ef4444', 10)]); 
                }
                else if (isBaseInRange) {
                  setBaseHealth(prev => {
                    const next = { ...prev };
                    const sideToHit = unit.side === 'player' ? 'enemy' : 'player';
                    next[sideToHit] -= unit.damage;
                    if (next[sideToHit] <= 0) setGameOver(unit.side === 'player' ? 'ORDER WINS' : 'CHAOS WINS');
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

        const resolvedUnits = newUnits.map(u => {
          let updatedU = { ...u };
          const uY = GROUND_Y + (150 - (u.y - 300));
          projectiles.forEach(p => {
            if (p.side !== u.side && Math.abs(p.x - u.x) < 40 && Math.abs(p.y - (uY + 30)) < 50) {
              updatedU.currentHealth -= p.damage;
              setParticles(prev => [...prev, ...createParticles(u.x, p.y, p.isMeteor ? '#f97316' : '#ffffff', 5)]);
              if (!p.isMeteor) p.y = -2000; 
            }
          });
          return updatedU;
        });
        return resolvedUnits.filter(u => u.currentHealth > 0);
      });
      gameLoopRef.current = requestAnimationFrame(update);
    };
    gameLoopRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [projectiles, gameOver, upgrades, mines]);

  // AI Mastermind
  useEffect(() => {
    if (gameOver) return;
    const aiInterval = setInterval(() => {
      const myUnits = units.filter(u => u.side === 'enemy');
      const myMiners = myUnits.filter(u => u.type === 'worker').length;
      if (myMiners < 3 && enemyGold >= 150) spawnUnit('enemy', 'miner');
      else if (enemyGold >= 2000) spawnUnit('enemy', 'giant');
      else if (enemyGold >= 900 && Math.random() > 0.7) spawnUnit('enemy', 'magikill');
      else if (enemyGold >= 300) spawnUnit('enemy', Math.random() > 0.5 ? 'archidon' : 'swordwrath');
      setEnemyGold(prev => prev + 10); 
    }, 2500);
    return () => clearInterval(aiInterval);
  }, [enemyGold, units.length, gameOver]);

  // Cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => ({
        arrowRain: Math.max(0, prev.arrowRain - 1),
        healAll: Math.max(0, prev.healAll - 1),
        meteor: Math.max(0, prev.meteor - 1)
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex flex-col select-none text-white font-sans">
      
      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-[500] bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="flex flex-col gap-3">
           <div className="bg-slate-900/80 p-4 rounded-xl border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
              <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest block mb-1">Treasury</span>
              <span className="text-3xl font-mono font-black text-yellow-400">💰 {gold.toLocaleString()}</span>
           </div>
           <div className="flex gap-2">
              <button onClick={() => setUpgrades(p => ({...p, swordDamage: p.swordDamage+1}))} className="text-[9px] bg-blue-600/20 px-3 py-1.5 border border-blue-500/50 rounded-full hover:bg-blue-600/40 transition-all shadow-lg">ATK LVL {upgrades.swordDamage}</button>
              <button onClick={() => setUpgrades(p => ({...p, magicPower: p.magicPower+1}))} className="text-[9px] bg-purple-600/20 px-3 py-1.5 border border-purple-500/50 rounded-full hover:bg-purple-600/40 transition-all shadow-lg">MAG LVL {upgrades.magicPower}</button>
           </div>
        </div>

        <div className="flex gap-3 bg-black/40 p-3 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
           {[
             { n: 'ARROW RAIN', f: castArrowRain, k: 'Q', c: 'bg-blue-600' },
             { n: 'HEAL ALL', f: castHealAll, k: 'W', c: 'bg-green-600' },
             { n: 'METEOR', f: castMeteor, k: 'E', c: 'bg-orange-600' }
           ].map(s => (
             <button key={s.n} onClick={s.f} className={`flex flex-col items-center justify-center w-20 h-20 ${s.c} border-2 border-white/20 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                <span className="text-[9px] font-black">{s.n}</span>
                <span className="text-xl font-bold mt-1">[{s.k}]</span>
             </button>
           ))}
        </div>

        <div className="flex gap-10">
           <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Order Statue</span>
              <div className="w-48 h-4 bg-black rounded-full border border-blue-500/30 p-[2px] shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full shadow-[0_0_10px_#3b82f6]" style={{ width: `${(baseHealth.player/5000)*100}%` }}></div>
              </div>
           </div>
           <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Chaos Gate</span>
              <div className="w-48 h-4 bg-black rounded-full border border-red-500/30 p-[2px] shadow-inner">
                <div className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full shadow-[0_0_10px_#ef4444]" style={{ width: `${(baseHealth.enemy/5000)*100}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="relative flex-1 w-full bg-[#030712] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e1b4b,_transparent)]"></div>
        {mines.map(mine => (
          <div key={mine.id} className="absolute bottom-40 w-40 h-40 flex flex-col items-center" style={{ left: mine.x, transform: 'translateX(-50%)' }}>
              <div className={`relative w-32 h-20 bg-gradient-to-br from-yellow-500 via-yellow-700 to-yellow-900 rounded-2xl shadow-2xl border-2 border-yellow-300 flex flex-col items-center justify-center transition-opacity duration-1000 ${mine.amount <= 0 ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                 <span className="text-yellow-100 text-[11px] font-black italic drop-shadow-md">GOLD DEPOSIT</span>
                 <div className="w-20 h-2 bg-black/40 rounded-full mt-2 border border-yellow-400/30">
                    <div className="h-full bg-yellow-400 shadow-[0_0_10px_#facc15]" style={{ width: `${(mine.amount/mine.initial)*100}%` }}></div>
                 </div>
              </div>
              <div className="mt-3 text-sm font-black text-yellow-500 drop-shadow-lg">{mine.amount > 0 ? `${mine.amount} G` : 'EXHAUSTED'}</div>
          </div>
        ))}
        <div className="absolute left-0 bottom-40 w-56 h-[500px] border-l-[25px] border-blue-600/30 bg-gradient-to-r from-blue-600/10 to-transparent rounded-tr-full"></div>
        <div className="absolute right-0 bottom-40 w-56 h-[500px] border-r-[25px] border-red-600/30 bg-gradient-to-l from-red-600/10 to-transparent rounded-tl-full"></div>
        <div className="absolute bottom-0 w-full h-[100px] bg-zinc-950 border-t-4 border-zinc-900 shadow-[0_-50px_100px_rgba(0,0,0,0.9)]"></div>
        {particles.map(p => ( <div key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none blur-[1px] z-[1000]" style={{ left: p.x, bottom: p.y, backgroundColor: p.color, opacity: p.life }}></div> ))}
        {projectiles.map(p => ( 
          <div key={p.id} 
               style={{ left: p.x, bottom: p.y, transform: `rotate(${p.angle}deg)` }} 
               className={`absolute shadow-[0_0_20px_white] rounded-full z-[900] ${p.isMeteor ? 'w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 blur-sm shadow-[0_0_50px_orange]' : `w-14 h-[4px] ${p.side === 'player' ? 'bg-blue-300' : 'bg-red-500'}`}`}>
             {p.isMeteor && <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>}
          </div> 
        ))}
        {units.map(unit => (
          <div
            key={unit.id}
            style={{ 
              left: `${unit.x}px`, 
              bottom: `${GROUND_Y + (150 - (unit.y - 300))}px`,
              zIndex: Math.floor(unit.y),
              transform: `scale(${unit.name === 'Giant' ? 2.5 : unit.name === 'Magikill' ? 1.4 : 1.2})`
            }}
            className="absolute transition-all duration-75 flex flex-col items-center"
          >
            <div className="w-12 h-1.5 bg-black/80 mb-2 rounded-full overflow-hidden border border-white/20 shadow-lg">
               <div className={`h-full ${unit.side === 'player' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-gradient-to-r from-red-700 to-red-500'}`} style={{ width: `${(unit.currentHealth/unit.health)*100}%` }}></div>
            </div>
            <div className={`relative ${unit.side === 'enemy' ? 'scale-x-[-1]' : ''}`}>
               <div className={`w-5 h-5 rounded-full border-2 ${unit.side === 'player' ? 'bg-white border-blue-400 shadow-[0_0_10px_#3b82f6]' : 'bg-zinc-300 border-red-600 shadow-[0_0_10px_#ef4444]'}`}></div>
               <div className={`w-[3px] h-9 ${unit.side === 'player' ? 'bg-white' : 'bg-zinc-300'} mx-auto relative`}>
                  <div className={`absolute top-4 h-[4px] rounded-full origin-left transition-all ${unit.isAttacking ? 'scale-x-150 brightness-200' : ''} ${
                    unit.name === 'Sword' ? 'w-10 bg-slate-200 rotate-[45deg] border border-blue-300' : 
                    unit.name === 'Archidon' ? 'w-8 bg-orange-900 rotate-[-10deg]' :
                    unit.name === 'Magikill' ? 'w-14 bg-purple-600 rotate-[-45deg] shadow-[0_0_15px_purple]' :
                    unit.name === 'Giant' ? 'w-18 bg-zinc-700 rotate-[40deg] border-2 border-zinc-500' : 'w-5'
                  }`}></div>
               </div>
               <div className="flex justify-center -mt-1 gap-1.5">
                  <div className="w-[3px] h-6 bg-white rotate-[15deg] rounded-full"></div>
                  <div className="w-[3px] h-6 bg-white rotate-[-15deg] rounded-full"></div>
               </div>
               {unit.state === 'mining' && <div className="absolute -top-10 text-yellow-400 animate-bounce text-2xl">⛏️</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-6 flex flex-col gap-3 z-[600]">
          <div className="bg-blue-600/20 px-3 py-1 border border-blue-500/40 rounded text-[10px] font-black uppercase text-center backdrop-blur-md">Infantry</div>
          {Object.entries(unitTypes).slice(0, 3).map(([key, config]) => (
            <button key={key} onClick={() => spawnUnit('player', key)} className="group relative w-24 h-24 bg-slate-900/80 border-2 border-blue-500/50 rounded-2xl flex flex-col items-center justify-center hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all shadow-2xl">
              <span className="text-[10px] font-black uppercase group-hover:text-white">{config.name}</span>
              <span className="text-sm font-bold text-yellow-400 group-hover:text-white mt-1">${config.cost}</span>
            </button>
          ))}
      </div>
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[600]">
          <div className="bg-red-600/20 px-3 py-1 border border-red-500/40 rounded text-[10px] font-black uppercase text-center backdrop-blur-md">Elite Force</div>
          {Object.entries(unitTypes).slice(3).map(([key, config]) => (
            <button key={key} onClick={() => spawnUnit('player', key)} className="group relative w-24 h-24 bg-slate-900/80 border-2 border-red-500/50 rounded-2xl flex flex-col items-center justify-center hover:bg-red-600 hover:scale-110 active:scale-95 transition-all shadow-2xl">
              <span className="text-[10px] font-black uppercase group-hover:text-white">{config.name}</span>
              <span className="text-sm font-bold text-yellow-400 group-hover:text-white mt-1">${config.cost}</span>
            </button>
          ))}
      </div>

      <div className="h-12 bg-black/90 px-10 flex items-center justify-between border-t border-white/10 z-[700]">
         <div className="flex gap-10 text-[10px] font-mono text-white/30 tracking-widest uppercase italic">
            <span>Battle Units: {units.length}</span>
            <span>Physics Engine: Stable</span>
         </div>
         <span className="text-[10px] font-black text-white/50 tracking-[0.5em] italic">STICK WAR CLONE v0.8 HD</span>
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/95 z-[10000] flex flex-col items-center justify-center backdrop-blur-3xl">
           <h1 className={`text-9xl font-black mb-12 italic ${gameOver.includes('ORDER') ? 'text-blue-500 drop-shadow-[0_0_50px_#3b82f6]' : 'text-red-600'}`}>{gameOver}</h1>
           <button onClick={() => window.location.reload()} className="px-20 py-8 bg-white text-black font-black text-3xl rounded-full hover:bg-yellow-400 transition-all hover:scale-105">NEW WAR</button>
        </div>
      )}
    </div>
  );
};

export default StickWarGame;
