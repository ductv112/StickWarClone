import React, { useState, useEffect, useRef } from 'react';

// --- Particle System ---
const createParticles = (x, y, color, count = 8, type = 'pixel') => {
  return Array.from({ length: count }).map(() => ({
    id: Math.random(),
    x, y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    life: 1.0,
    color,
    type
  }));
};

const StickWarGame = () => {
  // --- STATE ---
  const [gold, setGold] = useState(999995999); 
  const [enemyGold, setEnemyGold] = useState(5000);
  const [units, setUnits] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [baseHealth, setBaseHealth] = useState({ player: 5000, enemy: 5000 });
  const [gameOver, setGameOver] = useState(null);
  
  // Gold Mines State
  const [mines, setMines] = useState([
    { id: 1, x: window.innerWidth * 0.4, amount: 2000, initial: 2000 },
    { id: 2, x: window.innerWidth * 0.6, amount: 2000, initial: 2000 }
  ]);

  const [upgrades, setUpgrades] = useState({ swordDamage: 0, archidonRange: 0, minerEfficiency: 0, magicPower: 0 });
  const [cooldowns, setCooldowns] = useState({ arrowRain: 0, healAll: 0, meteor: 0 });

  const gameLoopRef = useRef();
  const GROUND_Y = 100; // Increased ground height to avoid UI overlap
  const PLAYER_BASE_X = 150;
  const ENEMY_BASE_X = window.innerWidth - 150;

  // --- CONFIGURATION ---
  const unitTypes = {
    miner: { name: 'Miner', cost: 150, health: 150, damage: 0, speed: 2.0, type: 'worker', range: 40, attackSpeed: 1000, color: '#facc15' },
    swordwrath: { name: 'Sword', cost: 125, health: 300, damage: 30, speed: 3.5, type: 'soldier', range: 50, attackSpeed: 600, color: '#60a5fa' },
    archidon: { name: 'Archidon', cost: 300, health: 200, damage: 20, speed: 2.8, type: 'soldier', range: 500, attackSpeed: 1600, color: '#fb923c' },
    magikill: { name: 'Magikill', cost: 900, health: 250, damage: 60, speed: 1.8, type: 'mage', range: 450, attackSpeed: 3500, color: '#c084fc' },
    giant: { name: 'Giant', cost: 2000, health: 3000, damage: 120, speed: 1.2, type: 'tank', range: 80, attackSpeed: 4000, color: '#94a3b8' }
  };

  const spawnUnit = (side, type) => {
    if (gameOver) return;
    const config = unitTypes[type];
    const currentGold = side === 'player' ? gold : enemyGold;
    
    if (currentGold >= config.cost) {
      if (side === 'player') setGold(prev => prev - config.cost);
      else setEnemyGold(prev => prev - config.cost);

      const newUnit = {
        id: Math.random().toString(36).substr(2, 9),
        ...config,
        currentHealth: config.health,
        x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
        y: 200 + (Math.random() * 60 - 30), // Balanced Y spawn
        side: side,
        state: 'moving', 
        lastAttack: 0,
        isAttacking: false,
        targetMineId: null
      };
      setUnits(prev => [...prev, newUnit]);
    }
  };

  // --- SPELLS ---
  const castMeteor = () => {
    if (cooldowns.meteor > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, meteor: 45 }));
    setProjectiles(prev => [...prev, { id: Math.random(), x: ENEMY_BASE_X - 200, y: window.innerHeight, vx: -2, vy: -10, damage: 500, side: 'player', isMeteor: true }]);
  };

  const castArrowRain = () => {
    if (cooldowns.arrowRain > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, arrowRain: 25 }));
    const newArrows = Array.from({ length: 20 }).map(() => ({ id: Math.random(), x: window.innerWidth/2 + (Math.random() * 800 - 400), y: window.innerHeight, vx: (Math.random() - 0.5) * 3, vy: -6, damage: 40, side: 'player', isSpell: true }));
    setProjectiles(prev => [...prev, ...newArrows]);
  };

  const castHealAll = () => {
    if (cooldowns.healAll > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, healAll: 40 }));
    setUnits(prev => prev.map(u => u.side === 'player' ? { ...u, currentHealth: Math.min(u.health, u.currentHealth + 200) } : u));
    setParticles(prev => [...prev, ...createParticles(PLAYER_BASE_X + 200, 200, '#4ade80', 40, 'glow')]);
  };

  const buyUpgrade = (type) => {
    const cost = (upgrades[type] + 1) * 1500;
    if (gold >= cost) {
      setGold(g => g - cost);
      setUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
    }
  };

  // --- AI ---
  useEffect(() => {
    if (gameOver) return;
    const aiInterval = setInterval(() => {
      const myGold = enemyGold;
      if (myGold > 2000) spawnUnit('enemy', 'giant');
      else if (myGold > 900 && Math.random() > 0.7) spawnUnit('enemy', 'magikill');
      else if (myGold > 150) spawnUnit('enemy', Math.random() > 0.5 ? 'swordwrath' : 'miner');
      setEnemyGold(prev => prev + 10); 
    }, 2500);
    return () => clearInterval(aiInterval);
  }, [enemyGold, gameOver]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => ({ arrowRain: Math.max(0, prev.arrowRain - 1), healAll: Math.max(0, prev.healAll - 1), meteor: Math.max(0, prev.meteor - 1) }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- GAME LOOP ---
  useEffect(() => {
    const update = () => {
      if (gameOver) return;
      const now = Date.now();

      setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.03 })).filter(p => p.life > 0));
      setProjectiles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy - (p.isMeteor ? 0.05 : 0.15) })).filter(p => p.y > 0 && p.x > 0 && p.x < window.innerWidth));

      setUnits(prevUnits => {
        const newUnits = prevUnits.map(unit => {
          let nextUnit = { ...unit };
          const enemies = prevUnits.filter(u => u.side !== unit.side);
          
          if (unit.type === 'worker') {
            // Find nearest non-empty mine
            const activeMines = mines.filter(m => m.amount > 0);
            let targetMine = activeMines.find(m => m.id === unit.targetMineId) || activeMines[0];
            
            if (!targetMine) { nextUnit.state = 'moving'; return nextUnit; }
            nextUnit.targetMineId = targetMine.id;

            const distToMine = Math.abs(unit.x - targetMine.x);
            const distToBase = Math.abs(unit.x - (unit.side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X));

            if (unit.state === 'returning') {
              if (distToBase < 50) {
                const amount = 30 + (unit.side === 'player' ? upgrades.minerEfficiency * 15 : 0);
                if (unit.side === 'player') setGold(g => g + amount);
                else setEnemyGold(eg => eg + amount);
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
                setProjectiles(prev => [...prev, { id: Math.random(), x: unit.x, y: 120, vx: (unit.side === 'player' ? 1 : -1) * 12, vy: 4, damage: unit.damage, side: unit.side }]);
              } else if (unit.name === 'Magikill') {
                const blastX = target ? target.x : (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X);
                setParticles(prev => [...prev, ...createParticles(blastX, 100, '#a855f7', 30, 'glow')]);
                if (target) target.currentHealth -= unit.damage;
                enemies.forEach(e => { if (Math.abs(e.x - blastX) < 80) e.currentHealth -= unit.damage / 2; });
              } else {
                if (target) { target.currentHealth -= unit.damage; setParticles(prev => [...prev, ...createParticles(target.x, 100, unit.side === 'player' ? '#3b82f6' : '#ef4444', 5)]); }
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
          projectiles.forEach(p => {
            if (p.side !== u.side && Math.abs(p.x - u.x) < 40 && Math.abs(p.y - 120) < 100) {
              updatedU.currentHealth -= p.damage;
              setParticles(prev => [...prev, ...createParticles(u.x, p.y, p.isMeteor ? '#f97316' : '#ffffff', 2)]);
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

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col select-none text-white font-sans">
      
      {/* --- REPOSITIONED TOP HUD --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-[100] bg-black/40 border-b border-white/5 backdrop-blur-md">
        <div className="flex flex-col gap-2">
           <div className="bg-black/60 px-4 py-2 rounded-lg border border-yellow-500/50">
              <span className="text-[10px] text-yellow-500 font-black uppercase block mb-1">Treasury</span>
              <span className="text-2xl font-mono font-black text-yellow-400">💰 {gold.toLocaleString()}</span>
           </div>
           {/* Upgrades moved here for better accessibility */}
           <div className="flex gap-1">
              <button onClick={() => buyUpgrade('swordDamage')} className="text-[8px] bg-blue-900/20 px-2 py-1 border border-blue-500/30 rounded hover:bg-blue-800 transition-colors">ATK LVL {upgrades.swordDamage}</button>
              <button onClick={() => buyUpgrade('magicPower')} className="text-[8px] bg-purple-900/20 px-2 py-1 border border-purple-500/30 rounded hover:bg-purple-800 transition-colors">MAG LVL {upgrades.magicPower}</button>
              <button onClick={() => buyUpgrade('minerEfficiency')} className="text-[8px] bg-yellow-900/20 px-2 py-1 border border-yellow-500/30 rounded hover:bg-yellow-800 transition-colors">GOLD LVL {upgrades.minerEfficiency}</button>
           </div>
        </div>

        <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
           {['ARROW RAIN', 'HEAL ALL', 'METEOR'].map((s, i) => (
             <button key={s} onClick={[castArrowRain, castHealAll, castMeteor][i]} className="flex flex-col items-center justify-center w-16 h-16 bg-slate-800 border-2 border-white/10 rounded-xl hover:bg-slate-700 transition-all">
                <span className="text-[8px] font-black">{s}</span>
                <span className="text-sm font-bold mt-1">[{['Q', 'W', 'E'][i]}]</span>
             </button>
           ))}
        </div>

        <div className="flex gap-6">
           <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Order Statue</span>
              <div className="w-40 h-3 bg-black rounded-full border border-blue-500/30 p-[2px]">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(baseHealth.player/5000)*100}%` }}></div>
              </div>
           </div>
           <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Chaos Gate</span>
              <div className="w-40 h-3 bg-black rounded-full border border-red-500/30 p-[2px]">
                <div className="h-full bg-red-600 rounded-full" style={{ width: `${(baseHealth.enemy/5000)*100}%` }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* --- BATTLEFIELD --- */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#0a0f1a]">
        {/* Parallax Stars */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e293b,_transparent)]"></div>
        
        {/* GOLD MINES - RANDOMIZED & DEPLETING */}
        {mines.map(mine => (
          <div key={mine.id} className="absolute bottom-40 w-32 h-32 flex flex-col items-center" style={{ left: mine.x, transform: 'translateX(-50%)', opacity: mine.amount > 0 ? 1 : 0.2 }}>
              <div className="relative w-24 h-14 bg-gradient-to-br from-yellow-500 via-yellow-700 to-yellow-900 rounded-lg shadow-2xl border-2 border-yellow-300 flex flex-col items-center justify-center">
                 <span className="text-yellow-100 text-[10px] font-black italic">GOLD MINE</span>
                 <div className="w-16 h-1.5 bg-black/50 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${(mine.amount/mine.initial)*100}%` }}></div>
                 </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-yellow-500">{mine.amount > 0 ? `${mine.amount} G` : 'DEPLETED'}</div>
          </div>
        ))}

        {/* Bases */}
        <div className="absolute left-0 bottom-40 w-40 h-[400px] border-l-[15px] border-blue-600/40 bg-gradient-to-r from-blue-600/5 to-transparent"></div>
        <div className="absolute right-0 bottom-40 w-40 h-[400px] border-r-[15px] border-red-600/40 bg-gradient-to-l from-red-600/5 to-transparent"></div>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-[100px] bg-zinc-950 border-t-4 border-zinc-900"></div>

        {/* VFX & Projectiles */}
        {particles.map(p => ( <div key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none" style={{ left: p.x, bottom: p.y, backgroundColor: p.color, opacity: p.life }}></div> ))}
        {projectiles.map(p => ( <div key={p.id} style={{ left: p.x, bottom: p.y }} className={`absolute shadow-[0_0_10px_white] rounded-full ${p.isMeteor ? 'w-16 h-16 bg-orange-600 blur-sm' : `w-10 h-[2px] ${p.side === 'player' ? 'bg-blue-300' : 'bg-red-500'}`}`}></div> ))}

        {/* Units Rendering - Adjusted Y and Scale */}
        {units.map(unit => (
          <div
            key={unit.id}
            style={{ 
              left: `${unit.x}px`, 
              bottom: `${GROUND_Y + (100 - (unit.y - 300))}px`, // Normalized Y to avoid floating
              zIndex: Math.floor(unit.y),
              transform: `scale(${unit.name === 'Giant' ? 1.8 : unit.name === 'Magikill' ? 1.1 : 0.9})`
            }}
            className="absolute transition-all duration-75 flex flex-col items-center"
          >
            {/* Health Bar */}
            <div className="w-10 h-1.5 bg-black/60 mb-1 rounded-full overflow-hidden border border-white/10">
               <div className={`h-full ${unit.side === 'player' ? 'bg-blue-400' : 'bg-red-500'}`} style={{ width: `${(unit.currentHealth/unit.health)*100}%` }}></div>
            </div>

            {/* Model */}
            <div className={`relative ${unit.side === 'enemy' ? 'scale-x-[-1]' : ''}`}>
               <div className={`w-4 h-4 rounded-full border-2 ${unit.side === 'player' ? 'bg-white border-blue-400 shadow-[0_0_8px_blue]' : 'bg-zinc-300 border-red-600 shadow-[0_0_8px_red]'}`}></div>
               <div className={`w-[2px] h-7 ${unit.side === 'player' ? 'bg-white' : 'bg-zinc-300'} mx-auto`}></div>
               <div className={`absolute top-4 h-[3px] bg-slate-200 origin-left ${unit.isAttacking ? 'scale-x-125' : ''} ${unit.name === 'Sword' ? 'w-8 rotate-[45deg]' : unit.name === 'Archidon' ? 'w-6 rotate-[-10deg]' : 'w-4'}`}></div>
               <div className="flex justify-center -mt-1 gap-1">
                  <div className="w-[2px] h-5 bg-white rotate-12"></div>
                  <div className="w-[2px] h-5 bg-white -rotate-12"></div>
               </div>
               {unit.state === 'mining' && <div className="absolute -top-6 text-yellow-400 animate-bounce">⛏️</div>}
            </div>
          </div>
        ))}
      </div>

      {/* --- NEW BOTTOM UNIT SPAWNER - MOVED TO SIDES TO AVOID BLOCKING VIEW --- */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[200]">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-black/40 p-1 rounded">Barracks</span>
          {Object.entries(unitTypes).slice(0, 3).map(([key, config]) => (
            <button key={key} onClick={() => spawnUnit('player', key)} disabled={gold < config.cost} className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 transition-all ${gold >= config.cost ? 'bg-blue-600 border-blue-300 hover:scale-110 shadow-lg' : 'bg-zinc-900 opacity-40'}`}>
              <div className="text-[9px] font-black uppercase">{config.name}</div>
              <div className="text-xs font-bold text-yellow-300">${config.cost}</div>
            </button>
          ))}
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[200]">
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-black/40 p-1 rounded text-right">Elite</span>
          {Object.entries(unitTypes).slice(3).map(([key, config]) => (
            <button key={key} onClick={() => spawnUnit('player', key)} disabled={gold < config.cost} className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 transition-all ${gold >= config.cost ? 'bg-purple-600 border-purple-300 hover:scale-110 shadow-lg' : 'bg-zinc-900 opacity-40'}`}>
              <div className="text-[9px] font-black uppercase">{config.name}</div>
              <div className="text-xs font-bold text-yellow-300">${config.cost}</div>
            </button>
          ))}
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center backdrop-blur-xl">
           <h1 className={`text-8xl font-black mb-10 ${gameOver.includes('ORDER') ? 'text-blue-500' : 'text-red-600'}`}>{gameOver}</h1>
           <button onClick={() => window.location.reload()} className="px-16 py-6 bg-white text-black font-black text-3xl rounded-full hover:bg-yellow-400 transition-all">PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
};

export default StickWarGame;
