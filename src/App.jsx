import React, { useState, useEffect, useRef } from 'react';

// --- Particle System for High-End Effects ---
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
  const [gold, setGold] = useState(99999); // CHẾ ĐỘ "BẤT TỬ" VÀNG CHO TRẦN ĐỨC
  const [enemyGold, setEnemyGold] = useState(1000); // GIẢM KINH TẾ ĐỊCH
  const [units, setUnits] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [baseHealth, setBaseHealth] = useState({ player: 50000, enemy: 5000 }); // MÁU NHÀ TA VÔ ĐỐI
  const [gameOver, setGameOver] = useState(null);
  
  const [upgrades, setUpgrades] = useState({
    swordDamage: 10, // TẶNG SẴN 10 CẤP SÁT THƯƠNG
    archidonRange: 10,
    minerEfficiency: 10,
    magicPower: 10
  });

  const [cooldowns, setCooldowns] = useState({ arrowRain: 0, healAll: 0, meteor: 0 });

  const gameLoopRef = useRef();
  const GROUND_Y = 60;
  const PLAYER_BASE_X = 180;
  const ENEMY_BASE_X = window.innerWidth - 180;
  const GOLD_MINE_X = window.innerWidth / 2;

  // --- CONFIGURATION ---
  const unitTypes = {
    miner: { name: 'Miner', cost: 150, health: 200, damage: 0, speed: 2.2, type: 'worker', range: 45, attackSpeed: 1200, color: '#facc15' },
    swordwrath: { name: 'Sword', cost: 125, health: 1000, damage: 100, speed: 4.5, type: 'soldier', range: 55, attackSpeed: 400, color: '#60a5fa' },
    archidon: { name: 'Archidon', cost: 300, health: 500, damage: 80, speed: 3.5, type: 'soldier', range: 700, attackSpeed: 1000, color: '#fb923c' },
    magikill: { name: 'Magikill', cost: 900, health: 800, damage: 200, speed: 2.2, type: 'mage', range: 500, attackSpeed: 2000, color: '#c084fc' },
    giant: { name: 'Giant', cost: 2000, health: 9999, damage: 500, speed: 1.8, type: 'tank', range: 100, attackSpeed: 3000, color: '#94a3b8' }
  };

  const spawnUnit = (side, type) => {
    if (gameOver) return;
    const config = unitTypes[type];
    const currentGold = side === 'player' ? gold : enemyGold;
    
    if (currentGold >= config.cost) {
      if (side === 'player') setGold(prev => prev - config.cost);
      else setEnemyGold(prev => prev - config.cost);

      let finalDamage = config.damage;
      if (side === 'player') {
        if (type === 'swordwrath') finalDamage += upgrades.swordDamage * 15;
        if (type === 'magikill') finalDamage += upgrades.magicPower * 25;
      }

      const newUnit = {
        id: Math.random().toString(36).substr(2, 9),
        ...config,
        damage: finalDamage,
        currentHealth: config.health,
        x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
        y: 350 + (Math.random() * 100 - 50),
        side: side,
        state: 'moving', 
        lastAttack: 0,
        isAttacking: false,
        animFrame: 0
      };
      setUnits(prev => [...prev, newUnit]);
    }
  };

  // --- SPELLS ---
  const castMeteor = () => {
    if (cooldowns.meteor > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, meteor: 45 }));
    
    setProjectiles(prev => [...prev, {
      id: Math.random(),
      x: ENEMY_BASE_X - 200,
      y: window.innerHeight,
      vx: -2,
      vy: -10,
      damage: 500,
      side: 'player',
      isMeteor: true
    }]);
  };

  const castArrowRain = () => {
    if (cooldowns.arrowRain > 0 || gameOver) return;
    setCooldowns(prev => ({ ...prev, arrowRain: 25 }));
    const newArrows = Array.from({ length: 25 }).map(() => ({
      id: Math.random(),
      x: GOLD_MINE_X + (Math.random() * 800 - 400),
      y: window.innerHeight,
      vx: (Math.random() - 0.5) * 3,
      vy: -6,
      damage: 45,
      side: 'player',
      isSpell: true
    }));
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
      else if (myGold > 900 && Math.random() > 0.6) spawnUnit('enemy', 'magikill');
      else if (myGold > 300) spawnUnit('enemy', Math.random() > 0.4 ? 'archidon' : 'swordwrath');
      else if (myGold > 150) spawnUnit('enemy', 'miner');
      setEnemyGold(prev => prev + 15); 
    }, 1800);
    return () => clearInterval(aiInterval);
  }, [enemyGold, gameOver]);

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

  // --- GAME LOOP ---
  useEffect(() => {
    const update = () => {
      if (gameOver) return;
      const now = Date.now();

      setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.03 })).filter(p => p.life > 0));
      
      setProjectiles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy - (p.isMeteor ? 0.05 : p.isSpell ? 0.08 : 0.18) 
      })).filter(p => p.y > 0 && p.x > 0 && p.x < window.innerWidth));

      setUnits(prevUnits => {
        const newUnits = prevUnits.map(unit => {
          let nextUnit = { ...unit };
          nextUnit.animFrame = (nextUnit.animFrame + 0.1) % 10;
          const enemies = prevUnits.filter(u => u.side !== unit.side);
          
          if (unit.type === 'worker') {
            const distToMine = Math.abs(unit.x - GOLD_MINE_X);
            const distToBase = Math.abs(unit.x - (unit.side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X));
            if (unit.state === 'returning') {
              if (distToBase < 50) {
                const amount = 40 + (unit.side === 'player' ? upgrades.minerEfficiency * 20 : 0);
                if (unit.side === 'player') setGold(g => g + amount);
                else setEnemyGold(eg => eg + amount);
                nextUnit.state = 'moving';
              } else { nextUnit.x += (unit.side === 'player' ? -1 : 1) * unit.speed; }
            } else if (distToMine < 25) {
              if (now - unit.lastAttack > 1000) { nextUnit.state = 'returning'; nextUnit.lastAttack = now; }
              else { nextUnit.state = 'mining'; }
            } else { nextUnit.x += (unit.side === 'player' ? 1 : -1) * unit.speed; }
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
                  id: Math.random(), x: unit.x, y: 150,
                  vx: (unit.side === 'player' ? 1 : -1) * 14, vy: 4,
                  damage: unit.damage, side: unit.side
                }]);
              } else if (unit.name === 'Magikill') {
                const blastX = target ? target.x : (unit.side === 'player' ? ENEMY_BASE_X : PLAYER_BASE_X);
                setParticles(prev => [...prev, ...createParticles(blastX, 100, '#a855f7', 40, 'glow')]);
                if (target) target.currentHealth -= unit.damage;
                // Splash damage
                enemies.forEach(e => { if (Math.abs(e.x - blastX) < 100) e.currentHealth -= unit.damage / 2; });
              } else {
                if (target) {
                   target.currentHealth -= unit.damage;
                   setParticles(prev => [...prev, ...createParticles(target.x, 100, unit.side === 'player' ? '#3b82f6' : '#ef4444', 10)]);
                } else if (isBaseInRange) {
                  setBaseHealth(prev => {
                    const next = { ...prev };
                    const sideToHit = unit.side === 'player' ? 'enemy' : 'player';
                    next[sideToHit] -= unit.damage;
                    if (next[sideToHit] <= 0) setGameOver(unit.side === 'player' ? 'ORDER DOMINATION' : 'CHAOS DOMINATION');
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

        const resolvedUnits = newUnits.map(u => {
          let updatedU = { ...u };
          projectiles.forEach(p => {
            const hitX = Math.abs(p.x - u.x) < 40;
            const hitY = Math.abs(p.y - 120) < 100;
            if (p.side !== u.side && hitX && hitY) {
              updatedU.currentHealth -= p.damage;
              setParticles(prev => [...prev, ...createParticles(u.x, p.y, p.isMeteor ? '#f97316' : '#ffffff', p.isMeteor ? 50 : 3)]);
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
  }, [projectiles, gameOver, upgrades]);

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex flex-col select-none text-white font-sans">
      
      {/* --- PREMIUM HUD --- */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-[100] bg-black/40 border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-black px-6 py-2 rounded-lg border border-yellow-500/50 flex flex-col items-center">
              <span className="text-[10px] text-yellow-500/80 font-black uppercase tracking-[0.2em]">Gold Reserves</span>
              <span className="text-3xl font-mono font-black text-yellow-400">💰 {gold.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-3">
             {[
               { name: 'ARROW RAIN', cd: cooldowns.arrowRain, fn: castArrowRain, color: 'bg-blue-600', key: 'Q' },
               { name: 'HEAL ALL', cd: cooldowns.healAll, fn: castHealAll, color: 'bg-green-600', key: 'W' },
               { name: 'METEOR', cd: cooldowns.meteor, fn: castMeteor, color: 'bg-orange-700', key: 'E' }
             ].map(spell => (
               <button key={spell.name} onClick={spell.fn} className={`relative overflow-hidden w-20 h-20 rounded-xl border-2 transition-all shadow-2xl ${spell.cd > 0 ? 'bg-gray-900 border-gray-700' : `${spell.color} border-white/20 hover:scale-110 active:scale-95`}`}>
                  <div className="text-[10px] font-black mt-2">{spell.name}</div>
                  <div className="text-xl font-bold mt-1">{spell.cd > 0 ? spell.cd : spell.key}</div>
                  {spell.cd > 0 && <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all" style={{ width: `${(spell.cd/30)*100}%` }}></div>}
               </button>
             ))}
          </div>
        </div>

        <div className="flex gap-4">
           {[
             { id: 'swordDamage', label: 'ATTACK', icon: '⚔️', color: 'blue' },
             { id: 'magicPower', label: 'MAGIC', icon: '🔮', color: 'purple' },
             { id: 'minerEfficiency', label: 'GOLD', icon: '⚒️', color: 'yellow' }
           ].map(upg => (
             <button key={upg.id} onClick={() => buyUpgrade(upg.id)} className={`flex flex-col items-center p-2 rounded-lg border border-${upg.color}-500/30 bg-${upg.color}-950/20 hover:bg-${upg.color}-900/40 transition-colors`}>
                <span className="text-xs">{upg.icon} {upg.label}</span>
                <span className="text-[10px] font-bold text-gray-400">LVL {upgrades[upg.id]}</span>
                <span className="text-[9px] text-yellow-500 font-black mt-1">${((upgrades[upg.id]+1)*1500).toLocaleString()}</span>
             </button>
           ))}
        </div>

        <div className="flex gap-8">
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase italic">Order Fortress</span>
               <div className="w-56 h-4 bg-gray-950 rounded-full border border-blue-500/30 p-1">
                  <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${(baseHealth.player/10000)*100}%` }}></div>
               </div>
            </div>
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] font-black text-red-500 tracking-widest uppercase italic">Chaos Gate</span>
               <div className="w-56 h-4 bg-gray-950 rounded-full border border-red-500/30 p-1">
                  <div className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)]" style={{ width: `${(baseHealth.enemy/10000)*100}%` }}></div>
               </div>
            </div>
        </div>
      </div>

      {/* --- SPAWNER --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-[100] p-4 bg-slate-900/60 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {Object.entries(unitTypes).map(([key, config]) => (
            <button
              key={key}
              onClick={() => spawnUnit('player', key)}
              disabled={gold < config.cost}
              className={`group relative flex flex-col items-center justify-center w-24 h-24 rounded-3xl transition-all border-2 ${
                gold >= config.cost 
                ? 'bg-gradient-to-b from-slate-800 to-slate-950 border-white/20 shadow-xl hover:-translate-y-4 hover:border-blue-400 hover:shadow-blue-500/20' 
                : 'bg-black/40 border-white/5 opacity-30'
              }`}
            >
              <div className="text-[10px] font-black tracking-tighter text-gray-300 group-hover:text-white uppercase">{config.name}</div>
              <div className="text-lg font-black text-yellow-400 group-hover:scale-110 transition-transform">${config.cost}</div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${gold >= config.cost ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            </button>
          ))}
      </div>

      {/* --- WORLD --- */}
      <div className="relative flex-1 w-full bg-[#030712]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e1b4b,_transparent)]"></div>
        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        
        {/* Environment - Gold */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-40 flex flex-col items-center">
            <div className="w-64 h-64 bg-yellow-500/5 rounded-full blur-[120px] animate-pulse"></div>
            <div className="relative w-48 h-28 bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-900 rounded-3xl shadow-[0_0_80px_rgba(234,179,8,0.3)] border-4 border-yellow-200/50 flex flex-col items-center justify-center -skew-x-6">
               <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="w-full h-full bg-white/10 rotate-45 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
               </div>
               <span className="text-yellow-100 text-3xl font-black italic tracking-tighter drop-shadow-2xl">MINE</span>
               <div className="flex gap-1 mt-2">
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-yellow-300 rounded-full animate-ping delay-75"></div>
               </div>
            </div>
        </div>

        {/* Fortress Graphics */}
        <div className="absolute left-0 bottom-40 w-80 h-[600px] border-l-[30px] border-blue-900/40 rounded-tr-[200px] bg-gradient-to-r from-blue-900/10 to-transparent">
           <div className="absolute top-20 left-10 text-blue-500/20 font-black text-9xl -rotate-90 select-none">ORDER</div>
        </div>
        <div className="absolute right-0 bottom-40 w-80 h-[600px] border-r-[30px] border-red-900/40 rounded-tl-[200px] bg-gradient-to-l from-red-900/10 to-transparent">
           <div className="absolute top-20 right-10 text-red-500/20 font-black text-9xl rotate-90 select-none">CHAOS</div>
        </div>

        {/* Ground with Texture */}
        <div className="absolute bottom-0 w-full h-40 bg-zinc-950 border-t-[6px] border-zinc-900 shadow-[0_-100px_150px_rgba(0,0,0,0.9)] overflow-hidden">
           <div className="w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
           <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>

        {/* VFX Layer */}
        {particles.map(p => (
          <div key={p.id} className={`absolute rounded-full pointer-events-none ${p.type === 'glow' ? 'blur-[4px] w-4 h-4' : 'w-2 h-2 blur-[1px]'}`} 
               style={{ left: p.x, bottom: p.y, backgroundColor: p.color, opacity: p.life }}></div>
        ))}
        {projectiles.map(p => (
          <div key={p.id} style={{ left: p.x, bottom: p.y, transform: `rotate(${p.vx > 0 ? -20 : 20}deg)` }} 
               className={`absolute shadow-[0_0_20px_white] rounded-full transition-transform ${p.isMeteor ? 'w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 blur-[2px]' : `w-12 h-[3px] ${p.side === 'player' ? 'bg-blue-300' : 'bg-red-500'}`}`}>
             {p.isMeteor && <div className="absolute inset-0 animate-ping bg-orange-500/50 rounded-full"></div>}
          </div>
        ))}

        {/* Units Layer - HIGH DETAIL STICKMEN */}
        {units.map(unit => (
          <div
            key={unit.id}
            style={{ 
              left: `${unit.x}px`, 
              bottom: `${GROUND_Y + (350 - unit.y)}px`,
              zIndex: Math.floor(unit.y),
              transform: `scale(${unit.name === 'Giant' ? 4 : unit.name === 'Magikill' ? 1.6 : 1.4})`
            }}
            className="absolute transition-all duration-100 flex flex-col items-center"
          >
            {/* Health UI */}
            <div className="w-14 h-2 bg-black/80 mb-3 rounded-full overflow-hidden border border-white/20 shadow-2xl p-[2px]">
               <div className={`h-full ${unit.side === 'player' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-gradient-to-r from-red-700 to-red-400'} transition-all duration-300 rounded-full`} 
                    style={{ width: `${(unit.currentHealth/unit.health)*100}%` }}></div>
            </div>

            {/* Premium Stickman Model */}
            <div className={`relative ${unit.side === 'enemy' ? 'scale-x-[-1]' : ''}`}>
               {/* Head with Glow */}
               <div className={`w-5 h-5 rounded-full border-2 relative z-10 ${
                 unit.side === 'player' ? 'bg-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'bg-zinc-300 border-red-600 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
               }`}>
                  {/* Eyes for personality */}
                  <div className="absolute top-1 right-1 w-1 h-1 bg-black rounded-full opacity-50"></div>
               </div>

               {/* Body Armor / Clothes */}
               <div className={`w-[4px] h-10 ${unit.side === 'player' ? 'bg-white shadow-[0_0_10px_white]' : 'bg-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]'} mx-auto relative`}>
                  {unit.name === 'Sword' && <div className="absolute top-1 left-[-4px] w-3 h-4 bg-blue-500/30 rounded-sm"></div>}
               </div>
               
               {/* Weaponry - Refined Visuals */}
               <div className={`absolute top-5 h-[5px] rounded-full origin-left transition-all ${
                 unit.isAttacking ? 'scale-x-125 brightness-200 rotate-[20deg]' : ''
               } ${
                 unit.name === 'Sword' ? 'w-12 bg-gradient-to-r from-slate-400 to-white rotate-[40deg] border border-blue-200' : 
                 unit.name === 'Archidon' ? 'w-10 bg-gradient-to-r from-orange-900 to-orange-500 rotate-[-10deg]' :
                 unit.name === 'Magikill' ? 'w-16 bg-purple-600 rotate-[-45deg] shadow-[0_0_25px_#a855f7] border-l-8 border-purple-400' :
                 unit.name === 'Giant' ? 'w-24 bg-gradient-to-r from-zinc-800 to-zinc-500 rotate-[35deg] border-2 border-zinc-400' : 'w-5 bg-zinc-400'
               }`}>
                 {unit.name === 'Magikill' && <div className="absolute right-0 w-4 h-4 bg-white rounded-full blur-sm animate-pulse"></div>}
               </div>

               {/* Legs with better animation */}
               <div className="flex justify-center -mt-1 gap-2">
                  <div className={`w-[4px] h-7 bg-white rounded-full ${unit.state === 'moving' ? 'animate-bounce origin-top rotate-[25deg]' : 'rotate-12'}`}></div>
                  <div className={`w-[4px] h-7 bg-white rounded-full ${unit.state === 'moving' ? 'animate-bounce origin-top rotate-[-25deg] delay-100' : '-rotate-12'}`}></div>
               </div>

               {/* State Effects */}
               {unit.state === 'mining' && (
                 <div className="absolute -top-12 left-0 flex flex-col items-center">
                    <span className="text-2xl animate-bounce">⛏️</span>
                    <span className="text-[10px] text-yellow-400 font-black tracking-widest">+GOLD</span>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* WIN/LOSS OVERLAY */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/95 z-[2000] flex flex-col items-center justify-center p-20 text-center backdrop-blur-3xl">
           <div className="relative mb-20">
              <div className={`absolute -inset-20 blur-[100px] opacity-40 rounded-full ${gameOver.includes('ORDER') ? 'bg-blue-500' : 'bg-red-600'}`}></div>
              <h1 className={`relative text-[12rem] font-black leading-none italic tracking-tighter ${
                gameOver.includes('ORDER') ? 'text-blue-500 drop-shadow-[0_0_100px_#3b82f6]' : 'text-red-600 drop-shadow-[0_0_100px_#ef4444]'
              }`}>
                 {gameOver}
              </h1>
           </div>
           <button onClick={() => window.location.reload()} 
                   className="group relative px-24 py-8 bg-white text-black font-black text-4xl rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.3)]">
              <div className="absolute inset-0 bg-yellow-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 uppercase tracking-widest">Restart War</span>
           </button>
        </div>
      )}

      {/* BATTLE FOOTER */}
      <div className="h-14 bg-black flex items-center justify-between px-10 border-t border-white/10">
         <div className="flex gap-8 text-[10px] font-mono text-white/40 tracking-widest">
            <span>UNITS_ON_FIELD: {units.length.toString().padStart(3, '0')}</span>
            <span>SIMULATION_ACTIVE: TRUE</span>
            <span>RENDER_QUALITY: ULTRA</span>
         </div>
         <div className="flex gap-6 items-center">
            <div className="h-2 w-40 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 animate-pulse w-3/4"></div>
            </div>
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.5em] italic">Stick War Clone v0.6 Ultra</span>
         </div>
      </div>
    </div>
  );
};

export default StickWarGame;
