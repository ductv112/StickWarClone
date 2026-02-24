import React, { useState, useEffect, useRef } from 'react';

// --- Particle System for Effects ---
const createParticles = (x, y, color, count = 5) => {
  return Array.from({ length: count }).map(() => ({
    id: Math.random(),
    x, y,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    life: 1.0,
    color
  }));
};

const StickWarGame = () => {
  // --- STATE ---
  const [gold, setGold] = useState(5000); // TĂNG VÀNG KHỞI ĐẦU ĐỂ TEST
  const [enemyGold, setEnemyGold] = useState(5000);
  const [units, setUnits] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [baseHealth, setBaseHealth] = useState({ player: 5000, enemy: 5000 });
  const [gameOver, setGameOver] = useState(null);
  
  // Upgrade levels
  const [upgrades, setUpgrades] = useState({
    swordDamage: 0,
    archidonRange: 0,
    minerEfficiency: 0,
    baseDefense: 0
  });

  // Spells Cooldown
  const [cooldowns, setCooldowns] = useState({ arrowRain: 0, healAll: 0 });

  const gameLoopRef = useRef();
  const GROUND_Y = 60;
  const PLAYER_BASE_X = 150;
  const ENEMY_BASE_X = window.innerWidth - 150;
  const GOLD_MINE_X = window.innerWidth / 2;

  // --- CONFIGURATION ---
  const unitTypes = {
    miner: { name: 'Miner', cost: 150, health: 150, damage: 0, speed: 2.0, type: 'worker', range: 40, attackSpeed: 1500 },
    swordwrath: { name: 'Sword', cost: 125, health: 300, damage: 25, speed: 3.5, type: 'soldier', range: 50, attackSpeed: 700 },
    archidon: { name: 'Archidon', cost: 300, health: 180, damage: 20, speed: 2.8, type: 'soldier', range: 500, attackSpeed: 1800 },
    magikill: { name: 'Magikill', cost: 800, health: 250, damage: 50, speed: 1.5, type: 'mage', range: 400, attackSpeed: 3000 },
    giant: { name: 'Giant', cost: 1500, health: 2500, damage: 80, speed: 1.2, type: 'tank', range: 80, attackSpeed: 3500 }
  };

  const spawnUnit = (side, type) => {
    if (gameOver) return;
    const config = unitTypes[type];
    const currentGold = side === 'player' ? gold : enemyGold;
    
    if (currentGold >= config.cost) {
      if (side === 'player') setGold(prev => prev - config.cost);
      else setEnemyGold(prev => prev - config.cost);

      // Apply Upgrades
      let finalHealth = config.health;
      let finalDamage = config.damage;
      if (side === 'player') {
        if (type === 'swordwrath') finalDamage += upgrades.swordDamage * 10;
        if (type === 'miner') /* speed boost? */ {};
      }

      const newUnit = {
        id: Math.random().toString(36).substr(2, 9),
        ...config,
        health: finalHealth,
        damage: finalDamage,
        currentHealth: finalHealth,
        x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
        y: 350 + (Math.random() * 80 - 40),
        side: side,
        state: 'moving', 
        lastAttack: 0,
        isAttacking: false,
        isBurning: false // For Magikill effects
      };
      setUnits(prev => [...prev, newUnit]);
    }
  };

  // --- SPELLS ---
  const castArrowRain = () => {
    if (cooldowns.arrowRain > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, arrowRain: 20 }));
    
    // Create many projectiles from sky
    const newArrows = Array.from({ length: 20 }).map(() => ({
      id: Math.random(),
      x: GOLD_MINE_X + (Math.random() * 600 - 300),
      y: window.innerHeight,
      vx: (Math.random() - 0.5) * 2,
      vy: -5,
      damage: 40,
      side: 'player',
      isSpell: true
    }));
    setProjectiles(prev => [...prev, ...newArrows]);
  };

  const castHealAll = () => {
    if (cooldowns.healAll > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, healAll: 30 }));
    setUnits(prev => prev.map(u => u.side === 'player' ? { ...u, currentHealth: Math.min(u.health, u.currentHealth + 100) } : u));
    // Particle effect
    setParticles(prev => [...prev, ...createParticles(PLAYER_BASE_X, 200, '#4ade80', 20)]);
  };

  // --- UPGRADES ---
  const buyUpgrade = (type) => {
    const cost = (upgrades[type] + 1) * 1000;
    if (gold >= cost) {
      setGold(g => g - cost);
      setUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));
    }
  };

  // --- AI MASTER ---
  useEffect(() => {
    if (gameOver) return;
    const aiInterval = setInterval(() => {
      const myGold = enemyGold;
      if (myGold > 1500) spawnUnit('enemy', 'giant');
      else if (myGold > 800 && Math.random() > 0.7) spawnUnit('enemy', 'magikill');
      else if (myGold > 300) spawnUnit('enemy', Math.random() > 0.5 ? 'archidon' : 'swordwrath');
      else if (myGold > 150) spawnUnit('enemy', 'miner');
      
      setEnemyGold(prev => prev + 10); 
    }, 2000);
    return () => clearInterval(aiInterval);
  }, [enemyGold, gameOver]);

  // Cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns(prev => ({
        arrowRain: Math.max(0, prev.arrowRain - 1),
        healAll: Math.max(0, prev.healAll - 1)
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- GAME LOOP ---
  useEffect(() => {
    const update = () => {
      if (gameOver) return;
      const now = Date.now();

      setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.04 })).filter(p => p.life > 0));
      
      setProjectiles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy - (p.isSpell ? 0.05 : 0.15) 
      })).filter(p => p.y > 0 && p.x > 0 && p.x < window.innerWidth));

      setUnits(prevUnits => {
        const newUnits = prevUnits.map(unit => {
          let nextUnit = { ...unit };
          const enemies = prevUnits.filter(u => u.side !== unit.side);
          
          if (unit.type === 'worker') {
            const distToMine = Math.abs(unit.x - GOLD_MINE_X);
            const distToBase = Math.abs(unit.x - (unit.side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X));
            if (unit.state === 'returning') {
              if (distToBase < 40) {
                const amount = 30 + (unit.side === 'player' ? upgrades.minerEfficiency * 15 : 0);
                if (unit.side === 'player') setGold(g => g + amount);
                else setEnemyGold(eg => eg + amount);
                nextUnit.state = 'moving';
              } else {
                nextUnit.x += (unit.side === 'player' ? -1 : 1) * unit.speed;
              }
            } else if (distToMine < 20) {
              if (now - unit.lastAttack > 1200) {
                nextUnit.state = 'returning';
                nextUnit.lastAttack = now;
              } else { nextUnit.state = 'mining'; }
            } else {
              nextUnit.x += (unit.side === 'player' ? 1 : -1) * unit.speed;
            }
            return nextUnit;
          }

          let target = null;
          let minDist = Infinity;
          enemies.forEach(e => {
            const d = Math.abs(e.x - unit.x);
            if (d < minDist) { minDist = d; target = e; }
          });

          const distToEnemyBase = Math.abs(unit.x - (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X));
          const isBaseInRange = distToEnemyBase <= unit.range;

          if (isBaseInRange || (target && minDist <= unit.range)) {
            nextUnit.state = 'attacking';
            nextUnit.isAttacking = true;

            if (now - unit.lastAttack > unit.attackSpeed) {
              nextUnit.lastAttack = now;
              
              if (unit.name === 'Archidon') {
                setProjectiles(prev => [...prev, {
                  id: Math.random(), x: unit.x, y: 40 + (350 - unit.y) + 35,
                  vx: (unit.side === 'player' ? 1 : -1) * 12, vy: 4,
                  damage: unit.damage, side: unit.side
                }]);
              } else if (unit.name === 'Magikill') {
                // AoE Explosion at target
                const blastX = target ? target.x : (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X);
                setParticles(prev => [...prev, ...createParticles(blastX, 100, '#f97316', 30)]);
                // Sát thương lan sẽ được xử lý ở bước sau hoặc đơn giản hóa ở đây
                if (target) target.currentHealth -= unit.damage;
              } else {
                if (target && minDist <= unit.range) {
                  target.currentHealth -= unit.damage;
                  setParticles(prev => [...prev, ...createParticles(target.x, 100, unit.side === 'player' ? '#60a5fa' : '#f87171')]);
                } else if (isBaseInRange) {
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
            nextUnit.state = 'moving';
            nextUnit.isAttacking = false;
            nextUnit.x += unit.speed * (unit.side === 'player' ? 1 : -1);
          }
          return nextUnit;
        });

        // Arrow Collisions
        const resolvedUnits = newUnits.map(u => {
          let updatedU = { ...u };
          projectiles.forEach(p => {
            if (p.side !== u.side && Math.abs(p.x - u.x) < 30 && Math.abs(p.y - (100)) < 150) {
              updatedU.currentHealth -= p.damage;
              setParticles(prev => [...prev, ...createParticles(u.x, 100, '#ffffff', 2)]);
              p.y = -1000; 
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
  }, [projectiles, gameOver, upgrades]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col select-none text-white font-sans">
      
      {/* --- TOP UI: RESOURCES & SPELLS --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Treasury</span>
            <span className="text-3xl font-mono font-black text-yellow-400">💰 {gold}</span>
          </div>

          <div className="flex gap-2">
             <button onClick={castArrowRain} className={`p-2 rounded-lg border-2 transition-all ${cooldowns.arrowRain > 0 ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-orange-600 border-orange-400 hover:scale-110'}`}>
                <div className="text-[10px] font-bold">ARROW RAIN</div>
                <div className="text-xs">{cooldowns.arrowRain > 0 ? cooldowns.arrowRain : 'READY'}</div>
             </button>
             <button onClick={castHealAll} className={`p-2 rounded-lg border-2 transition-all ${cooldowns.healAll > 0 ? 'bg-gray-800 border-gray-600 opacity-50' : 'bg-green-600 border-green-400 hover:scale-110'}`}>
                <div className="text-[10px] font-bold">HEAL ALL</div>
                <div className="text-xs">{cooldowns.healAll > 0 ? cooldowns.healAll : 'READY'}</div>
             </button>
          </div>
        </div>

        {/* Upgrade Center */}
        <div className="flex gap-2 bg-white/5 p-2 rounded-xl">
           <button onClick={() => buyUpgrade('swordDamage')} className="text-[9px] bg-blue-900/40 p-1 border border-blue-500 rounded hover:bg-blue-800">
              UP SWORD (+{upgrades.swordDamage})<br/>${(upgrades.swordDamage+1)*1000}
           </button>
           <button onClick={() => buyUpgrade('minerEfficiency')} className="text-[9px] bg-yellow-900/40 p-1 border border-yellow-500 rounded hover:bg-yellow-800">
              UP MINER (+{upgrades.minerEfficiency})<br/>${(upgrades.minerEfficiency+1)*1000}
           </button>
        </div>

        <div className="flex flex-col items-end gap-1">
           <div className="flex gap-4 mb-1">
              <div className="text-right">
                <div className="text-[9px] text-blue-400 font-bold uppercase">Our Statue</div>
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden border border-blue-500/30">
                  <div className="h-full bg-blue-500" style={{ width: `${(baseHealth.player/5000)*100}%` }}></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-red-400 font-bold uppercase">Enemy Statue</div>
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden border border-red-500/30">
                  <div className="h-full bg-red-600" style={{ width: `${(baseHealth.enemy/5000)*100}%` }}></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* --- UNIT SPAWNER BAR --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-[100] p-3 bg-black/80 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
          {Object.entries(unitTypes).map(([key, config]) => (
            <button
              key={key}
              onClick={() => spawnUnit('player', key)}
              disabled={gold < config.cost}
              className={`group relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all border-2 ${
                gold >= config.cost 
                ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300 shadow-lg hover:-translate-y-2' 
                : 'bg-zinc-900 border-white/5 opacity-40'
              }`}
            >
              <div className="text-[10px] font-black uppercase">{config.name}</div>
              <div className="text-sm font-bold text-yellow-300">${config.cost}</div>
            </button>
          ))}
      </div>

      {/* --- BATTLEFIELD --- */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#080808]">
        {/* Environment */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e293b,_transparent)]"></div>
        
        {/* Gold Mine */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-40 w-48 h-48 flex flex-col items-center">
            <div className="w-40 h-40 bg-yellow-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="relative w-32 h-20 bg-gradient-to-br from-yellow-500 to-yellow-800 rounded-xl shadow-2xl skew-x-12 border-4 border-yellow-300 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-white/20 -translate-y-full hover:translate-y-0 transition-transform"></div>
               <span className="text-yellow-100 text-xl font-black italic drop-shadow-md tracking-tighter">GOLD</span>
            </div>
        </div>

        {/* Bases */}
        <div className="absolute left-0 bottom-40 w-64 h-[500px] flex flex-col items-start justify-end p-10 bg-gradient-to-r from-blue-600/10 to-transparent">
           <div className="w-20 h-full bg-blue-500/20 border-l-[20px] border-blue-500 rounded-tr-full"></div>
        </div>
        <div className="absolute right-0 bottom-40 w-64 h-[500px] flex flex-col items-end justify-end p-10 bg-gradient-to-l from-red-600/10 to-transparent">
           <div className="w-20 h-full bg-red-500/20 border-r-[20px] border-red-500 rounded-tl-full"></div>
        </div>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-40 bg-zinc-950 border-t-4 border-zinc-800 shadow-[0_-50px_100px_rgba(0,0,0,0.8)]"></div>

        {/* VFX Layer */}
        {particles.map(p => (
          <div key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none blur-[1px]" style={{ left: p.x, bottom: p.y, backgroundColor: p.color, opacity: p.life }}></div>
        ))}
        {projectiles.map(p => (
          <div key={p.id} style={{ left: p.x, bottom: p.y }} className={`absolute w-8 h-[3px] shadow-[0_0_15px_white] rounded-full ${p.side === 'player' ? 'bg-blue-300' : 'bg-red-500'}`}></div>
        ))}

        {/* Units Layer */}
        {units.map(unit => (
          <div
            key={unit.id}
            style={{ 
              left: `${unit.x}px`, 
              bottom: `${GROUND_Y + (350 - unit.y)}px`,
              zIndex: Math.floor(unit.y),
              transform: `scale(${unit.name === 'Giant' ? 3 : unit.name === 'Magikill' ? 1.4 : 1.2})`
            }}
            className="absolute transition-all duration-75 flex flex-col items-center"
          >
            {/* Unit Health */}
            <div className="w-12 h-1.5 bg-black/60 mb-2 rounded-full overflow-hidden border border-white/10 shadow-lg">
               <div className={`h-full ${unit.side === 'player' ? 'bg-blue-400' : 'bg-red-500'} transition-all`} style={{ width: `${(unit.currentHealth/unit.health)*100}%` }}></div>
            </div>

            {/* Model */}
            <div className={`relative ${unit.side === 'enemy' ? 'scale-x-[-1]' : ''}`}>
               <div className={`w-4 h-4 rounded-full border-2 ${unit.side === 'player' ? 'bg-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-zinc-300 border-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
               <div className={`w-[3px] h-8 ${unit.side === 'player' ? 'bg-white' : 'bg-zinc-300'} mx-auto`}></div>
               
               {/* Weaponry */}
               <div className={`absolute top-4 h-[4px] rounded-full origin-left transition-all ${
                 unit.isAttacking ? 'scale-x-150 brightness-150' : ''
               } ${
                 unit.name === 'Sword' ? 'w-10 bg-slate-200 rotate-[35deg] border border-blue-300' : 
                 unit.name === 'Archidon' ? 'w-8 bg-orange-900 rotate-[-15deg] border-l-4 border-orange-500' :
                 unit.name === 'Magikill' ? 'w-12 bg-purple-600 rotate-[-45deg] shadow-[0_0_15px_purple]' :
                 unit.name === 'Giant' ? 'w-16 bg-zinc-700 rotate-[40deg] border-2 border-zinc-500' : 'w-4'
               }`}></div>

               {/* Movement */}
               <div className="flex justify-center -mt-1">
                  <div className={`w-[3px] h-6 bg-white ${unit.state === 'moving' ? 'animate-pulse rotate-[20deg]' : 'rotate-12'}`}></div>
                  <div className={`w-[3px] h-6 bg-white ${unit.state === 'moving' ? 'animate-pulse rotate-[-20deg]' : '-rotate-12'}`}></div>
               </div>

               {/* Special Icons */}
               {unit.state === 'mining' && <div className="absolute -top-8 text-yellow-400 animate-bounce text-xl font-bold">⛏️</div>}
               {unit.name === 'Magikill' && unit.isAttacking && <div className="absolute -top-10 text-purple-400 animate-ping text-xl">🔥</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Win/Loss Screen */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/95 z-[2000] flex flex-col items-center justify-center p-20 text-center backdrop-blur-3xl">
           <h1 className={`text-9xl font-black mb-10 italic tracking-tighter ${gameOver.includes('ORDER') ? 'text-blue-500 drop-shadow-[0_0_50px_rgba(59,130,246,0.5)]' : 'text-red-600 drop-shadow-[0_0_50px_rgba(220,38,38,0.5)]'}`}>
              {gameOver}
           </h1>
           <p className="text-white/40 text-2xl mb-12 uppercase tracking-[1em]">The war has ended</p>
           <button onClick={() => window.location.reload()} className="px-20 py-6 bg-white text-black font-black text-3xl rounded-full hover:bg-yellow-400 transition-all hover:scale-110 active:scale-95 shadow-2xl">
              RESTART CAMPAIGN
           </button>
        </div>
      )}
    </div>
  );
};

export default StickWarGame;
