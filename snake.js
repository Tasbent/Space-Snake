/* Snake game - lightweight, no build step. */

(function () {
  "use strict";

  /**
   * Game constants
   */
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlaySubtitle = document.getElementById("overlay-subtitle");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const resumeButton = document.getElementById("resume-button");
  const pauseButton = document.getElementById("pause-button");
  const scoreValueEl = document.getElementById("score-value");
  const highScoreValueEl = document.getElementById("high-score-value");
  const levelValueEl = document.getElementById("level-value");
  const nextLevelButton = document.getElementById("next-level-button");
  const starsValueEl = document.getElementById("stars-value");
  const loadoutEl = document.getElementById("loadout");
  const intermissionActions = document.getElementById("intermission-actions");
  const openShopButton = document.getElementById("open-shop-button");
  const continueButton = document.getElementById("continue-button");
  const intermissionShop = document.getElementById("intermission-shop");
  const buyShieldIm = document.getElementById("buy-shield-im");
  const buyMagnetIm = document.getElementById("buy-magnet-im");
  const buySlowmoIm = document.getElementById("buy-slowmo-im");
  const buyPhaseIm = document.getElementById("buy-phase-im");
  const buyWarpIm = document.getElementById("buy-warp-im");
  const buyStasisIm = document.getElementById("buy-stasis-im");
  const buyDroneIm = document.getElementById("buy-drone-im");
  const buyFuelIm = document.getElementById("buy-fuel-im");
  const shopToggle = null; // removed
  const shopEl = document.getElementById("shop");
  const buyShield = document.getElementById("buy-shield");
  const buyMagnet = document.getElementById("buy-magnet");
  const buySlowmo = document.getElementById("buy-slowmo");
  const buyPhaseBtn = document.getElementById("buy-phase");
  const buyWarpBtn = document.getElementById("buy-warp");
  const buyStasisBtn = document.getElementById("buy-stasis");
  const buyDroneBtn = document.getElementById("buy-drone");
  const buyFuelBtn = document.getElementById("buy-fuel");
  const levelsToggle = document.getElementById("levels-toggle");
  const leaderboardToggle = null; // removed button
  const levelsPanel = document.getElementById("levels");
  const levelsList = document.getElementById("levels-list");
  const leaderboardPanel = document.getElementById("leaderboard");
  const leaderboardList = document.getElementById("leaderboard-list");
  const wrapModeSelect = document.getElementById("wrap-mode-select");
  const obstaclesToggle = document.getElementById("obstacles-toggle");
  const soundToggle = document.getElementById("sound-toggle");
  const gridSelect = document.getElementById("grid-select");
  const difficultySelect = document.getElementById("difficulty-select");
  const momentumToggle = document.getElementById("momentum-toggle");
  const modeSelect = document.getElementById("mode-select");
  const multiplierValueEl = document.getElementById("multiplier-value");
  const timerWrap = document.getElementById("timer-wrap");
  const timerValueEl = document.getElementById("timer-value");
  const toastContainer = document.getElementById("toast-container");
  // combo removed
  const objectiveWrap = document.getElementById("objective-wrap");
  const objectiveLabel = document.getElementById("objective-label");
  const objectiveFill = document.getElementById("objective-fill");

  // Debug: surface runtime errors visibly in the UI
  window.addEventListener("error", (e) => {
    if (!overlay) return;
    try {
      overlayTitle.textContent = "Error";
      overlaySubtitle.textContent = String(e.message || e.error || "Script error");
      resumeButton.classList.add("u-hidden");
      overlay.classList.remove("hidden");
    } catch (_) {}
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (!overlay) return;
    try {
      overlayTitle.textContent = "Error";
      overlaySubtitle.textContent = String(e.reason || "Unhandled rejection");
      resumeButton.classList.add("u-hidden");
      overlay.classList.remove("hidden");
    } catch (_) {}
  });

  // removed header title mutation (header title element no longer present)

  let GRID_SIZE = 20;
  let CELL_PX = canvas.width / GRID_SIZE;
  let BASE_MOVE_INTERVAL_MS = 120;
  const MIN_MOVE_INTERVAL_MS = 60;
  const HIGH_SCORE_KEY = "snakeHighScoreV1";
  const MAX_OBSTACLES = 20;
  const PREFS_KEY = {
    wrap: "snakeWrapV1",
    obstacles: "snakeObstaclesV1",
    sound: "snakeSoundV1",
    mode: "snakeModeV1",
    theme: "snakeThemeV1",
    grid: "snakeGridV1",
    difficulty: "snakeDiffV1",
    momentum: "snakeMomentumV1",
  };

  // Feature gates must be defined BEFORE any functions that may reference them are called
  // Defaults are disabled; levels enable selectively via applyLevelConfig
  let enableBonusFood = false;
  let enableExtraFoods = false;
  let enablePlanets = false;
  let enableWarpGates = false;
  let enableMeteors = false;
  let enableBlackHoles = false;
  let enableComet = false;

  // Seeded RNG (for Daily Run)
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let useSeededRng = false;
  let seededRand = null;
  function rand() {
    return useSeededRng && seededRand ? seededRand() : Math.random();
  }

  /**
   * Game state
   */
  let snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  let direction = { x: 1, y: 0 }; // moving right
  let queuedDirection = { x: 1, y: 0 };
  let obstacles = [];
  let food = spawnFood();
  let score = 0;
  let lastMoveAt = 0;
  let running = true;
  let gameOver = false;
  let moveIntervalMs = BASE_MOVE_INTERVAL_MS;
  let highScore = 0;
  let lastTouchStart = null;
  let wrapWalls = true;
  let wrapMode = "wrap"; // none | wrap | portals
  let obstaclesEnabled = true;
  let soundEnabled = true;
  let particles = [];
  let bonusFood = null; // {x,y,expiresAt}
  let wideStar = null; // {x,y} spans (x,y) and (x+1,y)
  let blinkStar = null; // {x,y}
  let ringStar = null; // {x,y}
  let novaCore = null; // {x,y}
  let quantumPair = null; // {a:{x,y}, b:{x,y}, first?:'a'|'b', expiresAt?:number}
  let constellation = null; // {points:[{x,y}], nextIndex:number}
  // Power-star collectibles (activate immediately on pickup)
  let powerStars = []; // [{x,y,kind}]
  let screenShakeMs = 0;
  let trailDots = [];
  let ambientSparkles = [];
  let textPops = [];
  let prevLevel = 1;
  let foodPulseAt = performance.now();
  let comet = null; // {x,y,dx,dy,expiresAt}
  let lastCometMoveAt = 0;
  const COMET_MOVE_INTERVAL_MS = 100;
  let invincibleUntil = 0; // ms timestamp
  // Space events
  let meteors = []; // {x,y}
  let meteorShowerUntil = 0;
  let nextMeteorShowerAt = performance.now() + 20000;
  let lastMeteorSpawnAt = 0;
  let blackHoles = []; // {x,y,expiresAt}
  let nextBlackHoleAt = performance.now() + 25000;
  let planets = []; // {x,y,radius}
  let warpGates = []; // [{x,y},{x,y}]
  let oneWayGates = []; // [{from:{x,y}, to:{x,y}}]
  let antiGravityBubbles = []; // [{x,y,radius}]
  let solarWinds = []; // [{x1,y1,x2,y2,dx,dy,strength}]
  let timeFields = []; // [{x1,y1,x2,y2,factor}] // factor>1 faster world; <1 slower
  let asteroidBelts = []; // [{row:number, dir:1|-1, speedMs:number, lastMove:number, gaps:number[] }]
  let radiationZones = []; // [{x1,y1,x2,y2,drainPerTick:number}]
  let spaceMines = []; // [{x,y}]
  let nebulaFog = false;
  // combo removed
  let mode = "classic"; // classic | zen | rush | hardcore
  const themeSelect = null; // removed in space-only mode
  let theme = "space"; // force space theme
  let rushTimerMs = 60000; // 60 seconds
  let foods = []; // extra foods
  // Campaign with natural progression and gated features
  const CAMPAIGN = [
    {
      theme: "space",
      target: 10,
      grid: 16,
      baseSpeed: 170,
      wrap: "none",
      obstacles: false,
      features: { bonusFood: false, extraFoods: false, planets: false, warpGates: false, meteors: false, blackHoles: false, comet: false },
      intro: "Welcome! Small map, slow speed, no obstacles.",
    },
    {
      theme: "space",
      target: 12,
      grid: 18,
      baseSpeed: 150,
      wrap: "wrap",
      obstacles: false,
      features: { bonusFood: true, extraFoods: false, planets: false, warpGates: false, meteors: false, blackHoles: false, comet: false },
      intro: "Wrap unlocked. Bonus stars may appear.",
    },
    {
      theme: "space",
      target: 14,
      grid: 20,
      baseSpeed: 135,
      wrap: "wrap",
      obstacles: true,
      features: { bonusFood: true, extraFoods: true, planets: true, warpGates: false, meteors: false, blackHoles: false, comet: false },
      intro: "Obstacles appear and gravity wells tug lightly.",
    },
    {
      theme: "space",
      target: 16,
      grid: 20,
      baseSpeed: 120,
      wrap: "wrap",
      obstacles: true,
      features: { bonusFood: true, extraFoods: true, planets: true, warpGates: true, meteors: false, blackHoles: false, comet: true },
      intro: "Warp gates and comets join the fun.",
    },
    {
      theme: "space",
      target: 18,
      grid: 22,
      baseSpeed: 110,
      wrap: "wrap",
      obstacles: true,
      features: { bonusFood: true, extraFoods: true, planets: true, warpGates: true, meteors: true, blackHoles: false, comet: true },
      intro: "Meteor showers incoming!",
    },
    {
      theme: "space",
      target: 20,
      grid: 24,
      baseSpeed: 100,
      wrap: "wrap",
      obstacles: true,
      features: { bonusFood: true, extraFoods: true, planets: true, warpGates: true, meteors: true, blackHoles: true, comet: true },
      intro: "Black holes and everything at once.",
    },
  ];
  let levelIndex = 0;
  let objective = { type: "collect", target: CAMPAIGN[0].target, progress: 0 };
  theme = CAMPAIGN[0].theme;
  if (themeSelect) themeSelect.value = theme;
  let starsCurrency = 0;
  let hasShield = false;
  let magnetUntil = 0;
  let slowmoUntil = 0;

  // Feature gates are declared earlier; no re-declaration here.
  // Additional feature toggles
  let enableAntiGravity = false;
  let enableSolarWinds = false;
  let enableTimeFields = false;
  let enableOneWayGates = false;
  let enableAsteroidBelts = false;
  let enableRadiation = false;
  let enableMines = false;
  let enableNebula = false;
  let enableNovaCore = false;
  let enableQuantumPair = false;
  let enableConstellation = false;

  // Power-up timers
  let phaseShiftUntil = 0;
  let stasisUntil = 0;
  let droneUntil = 0;
  let speedBoostUntil = 0;
  let warpCharges = 0;
  let doubleScoreUntil = 0;
  let chainUntil = 0;
  let enabledPowerKinds = [];

  // Power-star metadata for UI lists
  const POWER_META = {
    shield: { emoji: "🛡️", title: "Shield", desc: "Blocks one hit", star: "🟡" },
    magnet: { emoji: "🧲", title: "Magnet", desc: "Attract stars 8s", star: "🔵" },
    slowmo: { emoji: "🐢", title: "Slow‑mo", desc: "Slow time 6s", star: "🟢" },
    phase: { emoji: "🌀", title: "Phase", desc: "Pass through self 5s", star: "🟣" },
    warp: { emoji: "⚡", title: "Warp", desc: "+1 blink (F)", star: "⚪" },
    stasis: { emoji: "🧊", title: "Stasis", desc: "Freeze hazards 2.5s", star: "🔷" },
    drone: { emoji: "🤖", title: "Drone", desc: "Auto‑collect 6s", star: "🔶" },
    fuel: { emoji: "⛽", title: "Fuel Boost", desc: "Speed burst 4s", star: "🟠" },
    doublescore: { emoji: "✖️2", title: "Double Score", desc: "2× points 8s", star: "⭐" },
    chain: { emoji: "⛓️", title: "Chain", desc: "Bonus for quick grabs", star: "✨" },
  };

  function renderPowerListHTML(kinds) {
    return kinds.map((k) => {
      const i = POWER_META[k] || { emoji: "★", title: k, desc: "", star: "★" };
      return `<div class="intermission-item"><div class="icon">${i.emoji}</div><div class="star">${i.star}</div><div class="meta"><div class="title">${i.title}</div><div class="desc">${i.desc}</div></div></div>`;
    }).join("");
  }

  function applyLevelConfig(index, announce = false) {
    const cfg = CAMPAIGN[index] || CAMPAIGN[0];
    theme = cfg.theme || "space";
    if (themeSelect) themeSelect.value = theme;
    GRID_SIZE = cfg.grid || GRID_SIZE;
    CELL_PX = canvas.width / GRID_SIZE;
    BASE_MOVE_INTERVAL_MS = cfg.baseSpeed || BASE_MOVE_INTERVAL_MS;
    // Force wrap on across all levels per requirement
    wrapMode = "wrap";
    wrapWalls = true;
    obstaclesEnabled = !!cfg.obstacles;
    enableBonusFood = !!(cfg.features && cfg.features.bonusFood);
    enableExtraFoods = !!(cfg.features && cfg.features.extraFoods);
    enablePlanets = false; // disabled per request: remove items that alter direction
    enableWarpGates = !!(cfg.features && cfg.features.warpGates);
    enableMeteors = !!(cfg.features && cfg.features.meteors);
    enableBlackHoles = !!(cfg.features && cfg.features.blackHoles);
    enableComet = !!(cfg.features && cfg.features.comet);
    // Progressive unlocks by world index
    enableAntiGravity = false; // disabled per request
    enableSolarWinds = false;  // disabled per request
    enableTimeFields = index >= 3;
    enableOneWayGates = index >= 3;
    enableAsteroidBelts = index >= 1;
    enableRadiation = index >= 4;
    enableMines = index >= 4;
    enableNebula = index >= 5;
    enableNovaCore = index >= 3;
    enableQuantumPair = index >= 4;
    enableConstellation = index >= 5;
    // Configure which power-star kinds unlock by level (no shop)
    enabledPowerKinds = [
      index >= 0 ? ["shield","slowmo"] : [],
      index >= 1 ? ["magnet","fuel"] : [],
      index >= 2 ? ["phase"] : [],
      index >= 3 ? ["stasis"] : [],
      index >= 4 ? ["drone"] : [],
      index >= 5 ? ["warp","doublescore","chain"] : [],
    ].flat();
    if (announce) {
      if (overlay && overlayTitle && overlaySubtitle) {
        overlay.classList.remove("hidden");
        overlay.setAttribute("aria-hidden", "false");
        overlayTitle.textContent = `Level ${index + 1}`;
        const startList = document.getElementById("start-list");
        const kinds = enabledPowerKinds;
        if (index === 0) {
          overlaySubtitle.textContent = `Goal: Collect ${cfg.target} stars.\nUse Arrows or WASD to move. You wrap at the edges.`;
          if (startList) {
            startList.classList.remove("u-hidden");
            startList.innerHTML = renderPowerListHTML(kinds);
          }
          if (startButton) startButton.classList.remove("u-hidden");
        } else {
          overlaySubtitle.textContent = `Goal: Collect ${cfg.target} stars. Power-stars available this level:`;
          if (startList) {
            startList.classList.remove("u-hidden");
            startList.innerHTML = renderPowerListHTML(kinds);
          }
          if (startButton) startButton.classList.add("u-hidden");
        }
      }
    }
  }

  // Load high score
  try {
    highScore = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10);
  } catch (_) {
    highScore = 0;
  }
  highScoreValueEl.textContent = String(highScore);
  // Load and apply preferences
  try {
    wrapWalls = localStorage.getItem(PREFS_KEY.wrap) !== "0";
    wrapMode = wrapWalls ? (localStorage.getItem(PREFS_KEY.wrap) === "portals" ? "portals" : "wrap") : "none";
    obstaclesEnabled = localStorage.getItem(PREFS_KEY.obstacles) !== "0"; // default on
    soundEnabled = localStorage.getItem(PREFS_KEY.sound) !== "0"; // default on
    mode = localStorage.getItem(PREFS_KEY.mode) || mode;
    theme = "space";
    GRID_SIZE = parseInt(localStorage.getItem(PREFS_KEY.grid) || "20", 10);
    BASE_MOVE_INTERVAL_MS = { gentle: 150, standard: 120, brutal: 95 }[localStorage.getItem(PREFS_KEY.difficulty) || "standard"];
    CELL_PX = canvas.width / GRID_SIZE;
    if (localStorage.getItem(PREFS_KEY.momentum)) momentumToggle && (momentumToggle.checked = localStorage.getItem(PREFS_KEY.momentum) === "1");
  } catch (_) {}
  if (wrapModeSelect) wrapModeSelect.value = wrapMode;
  if (obstaclesToggle) obstaclesToggle.checked = obstaclesEnabled;
  if (soundToggle) soundToggle.checked = soundEnabled;
  if (modeSelect) modeSelect.value = mode;
  
  if (gridSelect) gridSelect.value = String(GRID_SIZE);
  if (difficultySelect) difficultySelect.value = (localStorage.getItem(PREFS_KEY.difficulty) || "standard");

  // HUD helpers
  function refreshHUD() {
    if (scoreValueEl) scoreValueEl.textContent = String(score);
    const level = levelIndex + 1;
    if (levelValueEl) levelValueEl.textContent = String(level);
    if (multiplierValueEl) multiplierValueEl.textContent = "";
    if (timerWrap) timerWrap.classList.toggle("u-hidden", mode !== "rush");
    if (mode === "rush" && timerValueEl) timerValueEl.textContent = String(Math.max(0, Math.ceil(rushTimerMs / 1000)));
    // combo removed
    // objective HUD
    if (objectiveWrap) {
      if (objective.type === "collect") {
        if (objectiveLabel) objectiveLabel.textContent = `Objective: Collect ${objective.target} stars (${objective.progress}/${objective.target})`;
        if (objectiveFill) objectiveFill.style.width = `${Math.min(100, (objective.progress / objective.target) * 100)}%`;
      }
      objectiveWrap.classList.toggle("u-hidden", !objective || !objective.type);
    }
    if (starsValueEl) starsValueEl.textContent = String(starsCurrency);
    // Render loadout badges
    if (loadoutEl) {
      const items = [];
      if (hasShield) items.push({ icon: "🛡️", label: "Shield" });
      if (performance.now() < magnetUntil) items.push({ icon: "🧲", label: "Magnet" });
      if (performance.now() < slowmoUntil) items.push({ icon: "🐢", label: "Slow‑mo" });
      if (performance.now() < phaseShiftUntil) items.push({ icon: "🌀", label: "Phase" });
      if (warpCharges > 0) items.push({ icon: "⚡", label: `Warp x${warpCharges}` });
      if (performance.now() < stasisUntil) items.push({ icon: "🧊", label: "Stasis" });
      if (performance.now() < droneUntil) items.push({ icon: "🤖", label: "Drone" });
      if (performance.now() < speedBoostUntil) items.push({ icon: "⛽", label: "Fuel" });
      if (performance.now() < doubleScoreUntil) items.push({ icon: "✖️2", label: "2x" });
      if (performance.now() < chainUntil) items.push({ icon: "⛓️", label: "Chain" });
      loadoutEl.innerHTML = items.map(i => `<span class="badge"><span>${i.icon}</span>${i.label}</span>`).join("");
    }
  }
  refreshHUD();

  /**
   * Helpers
   */
  function spawnFood() {
    while (true) {
      const x = Math.floor(rand() * GRID_SIZE);
      const y = Math.floor(rand() * GRID_SIZE);
      const onSnake = snake.some((s) => s.x === x && s.y === y);
      const onObstacle = obstacles.some((o) => o.x === x && o.y === y);
      if (enablePlanets) {
        const onPlanet = planets.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= p.radius);
        if (onPlanet) { continue; }
      }
      if (enableWarpGates) {
        const onGate = warpGates.some((g) => g.x === x && g.y === y);
        if (onGate) { continue; }
      }
      if (!onSnake && !onObstacle) return { x, y };
    }
  }

  function drawCell(x, y, color1, color2) {
    const px = x * CELL_PX;
    const py = y * CELL_PX;

    // Cell base
    const grad = ctx.createLinearGradient(px, py, px, py + CELL_PX);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(px + 1, py + 1, CELL_PX - 2, CELL_PX - 2);

    // subtle outline to increase contrast between adjacent cells
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, CELL_PX - 1, CELL_PX - 1);
  }

  // New: wide star (spans 2 cells horizontally) requiring angled approach
  function drawWideStar(leftX, y, color = "#ffe066") {
    const px = leftX * CELL_PX;
    const py = y * CELL_PX;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    const w = CELL_PX * 2;
    const h = CELL_PX - 2;
    const cx = px + w / 2;
    const cy = py + CELL_PX / 2;
    // pill body
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 2);
    ctx.lineTo(px + w - 4, py + 2);
    ctx.quadraticCurveTo(px + w + 2, cy, px + w - 4, py + h);
    ctx.lineTo(px + 4, py + h);
    ctx.quadraticCurveTo(px - 2, cy, px + 4, py + 2);
    ctx.closePath();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    // small star emboss
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    for (let i = 1; i < 10; i += 1) {
      const ang = (Math.PI / 5) * i;
      const r = i % 2 ? 4 : 2;
      ctx.lineTo(cx + Math.sin(ang) * r, cy - Math.cos(ang) * r);
    }
    ctx.closePath();
    ctx.fillStyle = "#fffbe6";
    ctx.fill();
    ctx.restore();
  }

  function drawBoardBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (theme === "space") {
      // Deep space gradient
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, "#0b1020");
      g.addColorStop(1, "#030712");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Random starfield each frame (subtle twinkle)
      for (let i = 0; i < 80; i += 1) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const a = Math.random() * 0.4 + 0.15;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
      // faint grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_PX + 0.5, 0);
        ctx.lineTo(i * CELL_PX + 0.5, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_PX + 0.5);
        ctx.lineTo(canvas.width, i * CELL_PX + 0.5);
        ctx.stroke();
      }
    } else {
      for (let y = 0; y < GRID_SIZE; y += 1) {
        for (let x = 0; x < GRID_SIZE; x += 1) {
          const isDark = (x + y) % 2 === 0;
          ctx.fillStyle = isDark ? "#14284f" : "#0f2143";
          ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
        }
      }
      // grid lines for extra contrast
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i += 1) {
        // vertical
        ctx.beginPath();
        ctx.moveTo(i * CELL_PX + 0.5, 0);
        ctx.lineTo(i * CELL_PX + 0.5, canvas.height);
        ctx.stroke();
        // horizontal
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_PX + 0.5);
        ctx.lineTo(canvas.width, i * CELL_PX + 0.5);
        ctx.stroke();
      }
    }
  }

  function drawObstacles() {
    for (const obs of obstacles) {
      if (theme === "space") {
        // draw as small asteroids
        const cx = obs.x * CELL_PX + CELL_PX / 2;
        const cy = obs.y * CELL_PX + CELL_PX / 2;
        const r = Math.max(5, CELL_PX * 0.35);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(((obs.x + obs.y) * 13 + performance.now() * 0.0006) % (Math.PI * 2));
        ctx.fillStyle = "#6b7280";
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const ang = (Math.PI * 2 * i) / 6;
          const rad = r * (0.8 + Math.random() * 0.25);
          const x = Math.cos(ang) * rad;
          const y = Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.shadowColor = "#94a3b8";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      } else {
        let c1 = "#64748b", c2 = "#334155";
        if (theme === "neon") { c1 = "#7dd3fc"; c2 = "#0ea5e9"; }
        else if (theme === "retro") { c1 = "#cbd5e1"; c2 = "#94a3b8"; }
        else if (theme === "contrast") { c1 = "#aaaaaa"; c2 = "#666666"; }
        drawCell(obs.x, obs.y, c1, c2);
      }
    }
  }

  function spawnObstacle() {
    let attempts = 0;
    while (attempts < 200) {
      attempts += 1;
      const x = Math.floor(rand() * GRID_SIZE);
      const y = Math.floor(rand() * GRID_SIZE);
      const onSnake = snake.some((s) => s.x === x && s.y === y);
      const onFood = food.x === x && food.y === y;
      const onObstacle = obstacles.some((o) => o.x === x && o.y === y);
      if (!onSnake && !onFood && !onObstacle) {
        obstacles.push({ x, y });
        return;
      }
    }
  }

  function desiredObstacleCountForScore(s) {
    return Math.min(MAX_OBSTACLES, Math.floor(s / 4));
  }

  function gameReset() {
    // Apply current level config FIRST so grid/features are correct for spawns
    applyLevelConfig(levelIndex);
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    refreshHUD();
    gameOver = false;
    running = true;
    overlay.classList.add("hidden");
    lastMoveAt = performance.now();
    moveIntervalMs = BASE_MOVE_INTERVAL_MS;
    obstacles = [];
    if (obstaclesEnabled) {
      const target = desiredObstacleCountForScore(score);
      while (obstacles.length < target) spawnObstacle();
    }
    bonusFood = null;
    screenShakeMs = 0;
    // combo removed
    foods = [];
    trailDots = [];
    ambientSparkles = [];
    textPops = [];
    prevLevel = 1;
    foodPulseAt = performance.now();
    // Reset per-level power-ups
    comet = null;
    invincibleUntil = 0;
    hasShield = false;
    magnetUntil = 0;
    slowmoUntil = 0;
    // Reset new power-ups per level
    phaseShiftUntil = 0;
    stasisUntil = 0;
    droneUntil = 0;
    speedBoostUntil = 0;
    warpCharges = 0;
    meteors = [];
    nextMeteorShowerAt = performance.now() + 20000;
    meteorShowerUntil = 0;
    blackHoles = [];
    nextBlackHoleAt = performance.now() + 25000;
    // space objects gated by level features
    planets = [];
    if (enablePlanets) {
      const planetCount = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < planetCount; i += 1) {
        const p = spawnFood();
        planets.push({ x: p.x, y: p.y, radius: 2 + Math.floor(rand() * 2) });
      }
    }
    warpGates = [];
    if (enableWarpGates && rand() < 0.9) {
      const a = spawnFood();
      const b = spawnFood();
      warpGates = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
    }
    oneWayGates = [];
    if (enableOneWayGates && rand() < 0.5) {
      const a = spawnFood();
      const b = spawnFood();
      oneWayGates.push({ from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y } });
    }
    antiGravityBubbles = enableAntiGravity ? [{ x: Math.floor(rand()*GRID_SIZE), y: Math.floor(rand()*GRID_SIZE), radius: 3 }] : [];
    solarWinds = enableSolarWinds ? [{ x1: 0, y1: Math.floor(GRID_SIZE/3), x2: GRID_SIZE-1, y2: Math.floor(GRID_SIZE/3)+1, dx: 1, dy: 0, strength: 0.25 }] : [];
    timeFields = enableTimeFields ? [{ x1: Math.floor(GRID_SIZE/2)-2, y1: Math.floor(GRID_SIZE/2)-2, x2: Math.floor(GRID_SIZE/2)+2, y2: Math.floor(GRID_SIZE/2)+2, factor: 0.6 }] : [];
    asteroidBelts = enableAsteroidBelts ? [{ row: Math.floor(GRID_SIZE*0.6), dir: -1, speedMs: 240, lastMove: 0, gaps: [2,6,10,14] }] : [];
    radiationZones = enableRadiation ? [{ x1: Math.floor(GRID_SIZE*0.2), y1: Math.floor(GRID_SIZE*0.2), x2: Math.floor(GRID_SIZE*0.5), y2: Math.floor(GRID_SIZE*0.5), drainPerTick: 0.1 }] : [];
    spaceMines = enableMines ? [{ x: Math.floor(rand()*GRID_SIZE), y: Math.floor(rand()*GRID_SIZE) }] : [];
    nebulaFog = !!enableNebula;
    novaCore = null;
    quantumPair = null;
    constellation = null;
    // Spawn food AFTER features/obstacles are placed so it never lands on them
    food = spawnFood();
    if (mode === "rush") rushTimerMs = 60000;
    // Keep high score
  }

  function setGameOver(message) {
    running = false;
    gameOver = true;
    overlayTitle.textContent = "Level Complete";
    overlaySubtitle.textContent = `Collected ${objective.target} stars!`;
    resumeButton.classList.add("u-hidden");
    restartButton.classList.remove("u-hidden");
    overlay.classList.remove("hidden");
    playSound("gameover");
    triggerHaptic();
    screenShakeMs = 400;
    submitScore(score);
  }

  function setPaused(paused) {
    if (gameOver) return;
    running = !paused;
    if (paused) {
      overlayTitle.textContent = "Paused";
      overlaySubtitle.textContent = "Press P or tap Resume to continue";
      resumeButton.classList.remove("u-hidden");
      restartButton.classList.add("u-hidden");
      if (nextLevelButton) nextLevelButton.classList.add("u-hidden");
      if (intermissionActions) intermissionActions.classList.add("u-hidden");
      if (intermissionShop) intermissionShop.classList.add("u-hidden");
      overlay.classList.remove("hidden");
      overlay.setAttribute("aria-hidden", "false");
    } else {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function startNextLevel() {
    levelIndex += 1;
    if (levelIndex >= CAMPAIGN.length) levelIndex = CAMPAIGN.length - 1;
    const cfg = CAMPAIGN[levelIndex];
    objective = { type: "collect", target: cfg.target, progress: 0 };
    applyLevelConfig(levelIndex, true);
    // Reset transient state for new level
    obstacles = [];
    if (obstaclesEnabled) {
      const target = desiredObstacleCountForScore(0) + 2;
      while (obstacles.length < target) spawnObstacle();
    }
    if (intermissionActions) intermissionActions.classList.add("u-hidden");
    if (intermissionShop) intermissionShop.classList.add("u-hidden");
    overlay.classList.add("hidden");
    running = true;
    refreshHUD();
  }

  /**
   * Input
   */
  function handleDirectionChange(nx, ny) {
    // momentum mode allows buffered turns but blocks immediate reversal
    const isOpposite = nx === -direction.x && ny === -direction.y;
    if (isOpposite) return;
    if (momentumToggle && momentumToggle.checked) {
      // queue up to 2 steps ahead (simple buffer)
      queuedDirection = { x: nx, y: ny };
    } else {
      queuedDirection = { x: nx, y: ny };
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") handleDirectionChange(0, -1);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") handleDirectionChange(0, 1);
    else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") handleDirectionChange(-1, 0);
    else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") handleDirectionChange(1, 0);
    else if (e.key === "p" || e.key === "P") setPaused(running);
    else if (e.key === "r" || e.key === "R") gameReset();
    else if (e.key === "f" || e.key === "F") {
      if (warpCharges > 0 && running && !gameOver) {
        const head = snake[0];
        const nx = (head.x + direction.x * 3 + GRID_SIZE) % GRID_SIZE;
        const ny = (head.y + direction.y * 3 + GRID_SIZE) % GRID_SIZE;
        const candidates = [
          { x: nx, y: ny },
          { x: (head.x + direction.x * 2 + GRID_SIZE) % GRID_SIZE, y: (head.y + direction.y * 2 + GRID_SIZE) % GRID_SIZE },
          { x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE, y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE },
        ];
        let target = candidates.find(c => !obstacles.some(o=>o.x===c.x&&o.y===c.y));
        if (!target) target = { x: head.x, y: head.y };
        snake[0] = target;
        warpCharges -= 1;
        invincibleUntil = Math.max(invincibleUntil, performance.now() + 600);
        spawnTextPop("WARP", target.x, target.y, "#93c5fd");
        playSound("buy");
      }
    }
    unlockAudio();
  });

  restartButton.addEventListener("click", gameReset);
  resumeButton.addEventListener("click", () => setPaused(false));
  // removed pause button UI
  if (pauseButton) pauseButton.addEventListener("click", () => setPaused(running));
  if (nextLevelButton) nextLevelButton.addEventListener("click", () => { startNextLevel(); setPaused(false); });
  // removed openShopButton (no separate shop in intermission)
  if (continueButton) continueButton.addEventListener("click", () => {
    if (intermissionActions) intermissionActions.classList.add("u-hidden");
    if (intermissionShop) intermissionShop.classList.add("u-hidden");
    startNextLevel();
  });
  // Populate intermission list with power-stars for next level
  const intermissionList = document.getElementById("intermission-list");
  // disable buy buttons (no-op)
  const disableBtn = (el) => { if (!el) return; el.disabled = true; el.classList.add("u-hidden"); };
  disableBtn(buyShieldIm); disableBtn(buyMagnetIm); disableBtn(buySlowmoIm);
  disableBtn(buyPhaseIm); disableBtn(buyWarpIm); disableBtn(buyStasisIm);
  disableBtn(buyDroneIm); disableBtn(buyFuelIm);
  overlay.addEventListener("click", () => {
    if (!gameOver && !running) {
      if (intermissionActions && !intermissionActions.classList.contains("u-hidden")) return;
      setPaused(false);
    }
  });
  // Click to restart on game over
  canvas.addEventListener("click", () => {
    if (gameOver) gameReset();
  });
  // Settings toggles
  if (wrapModeSelect) {
    // lock to wrap visually
    wrapModeSelect.value = "wrap";
    wrapModeSelect.disabled = true;
  }
  if (obstaclesToggle) {
    obstaclesToggle.addEventListener("change", () => {
      obstaclesEnabled = obstaclesToggle.checked;
      try { localStorage.setItem(PREFS_KEY.obstacles, obstaclesEnabled ? "1" : "0"); } catch (_) {}
      if (!obstaclesEnabled) {
        obstacles = [];
      } else {
        const target = desiredObstacleCountForScore(score);
        while (obstacles.length < target) spawnObstacle();
      }
    });
  }
  if (soundToggle) {
    soundToggle.addEventListener("change", () => {
      soundEnabled = soundToggle.checked;
      try { localStorage.setItem(PREFS_KEY.sound, soundEnabled ? "1" : "0"); } catch (_) {}
      unlockAudio();
    });
  }
  if (gridSelect) {
    gridSelect.addEventListener("change", () => {
      GRID_SIZE = parseInt(gridSelect.value, 10);
      CELL_PX = canvas.width / GRID_SIZE;
      gameReset();
      try { localStorage.setItem(PREFS_KEY.grid, String(GRID_SIZE)); } catch (_) {}
    });
  }
  if (difficultySelect) {
    difficultySelect.addEventListener("change", () => {
      const diff = difficultySelect.value;
      try { localStorage.setItem(PREFS_KEY.difficulty, diff); } catch (_) {}
      BASE_MOVE_INTERVAL_MS = { gentle: 150, standard: 120, brutal: 95 }[diff];
      moveIntervalMs = BASE_MOVE_INTERVAL_MS;
    });
  }
  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      mode = modeSelect.value;
      if (mode === "daily") {
        const today = new Date();
        const seed = Number(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`);
        seededRand = mulberry32(seed);
        useSeededRng = true;
        toast("Daily Run seed set");
      } else {
        useSeededRng = false;
      }
      try { localStorage.setItem(PREFS_KEY.mode, mode); } catch (_) {}
      toast(`Mode: ${mode}`);
      gameReset();
      refreshHUD();
    });
  }
  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      theme = themeSelect.value;
      try { localStorage.setItem(PREFS_KEY.theme, theme); } catch (_) {}
      toast(`Theme: ${theme}`);
      refreshHUD();
    });
  }
  // shop removed: ignore buy buttons if present
  // remove quick-buy hotkeys

  // Levels UI
  if (levelsToggle && levelsPanel && levelsList) {
    levelsToggle.addEventListener("click", () => {
      const open = levelsPanel.classList.contains("u-hidden");
      levelsPanel.classList.toggle("u-hidden", !open);
      if (open) {
        levelsList.innerHTML = "";
        CAMPAIGN.forEach((cfg, idx) => {
          const btn = document.createElement("button");
          btn.className = "btn btn-small";
          btn.textContent = `Level ${idx + 1} (${cfg.theme}) - ${cfg.target} stars`;
          btn.addEventListener("click", () => {
            levelIndex = idx;
            theme = cfg.theme;
            if (themeSelect) themeSelect.value = theme;
            objective = { type: "collect", target: cfg.target, progress: 0 };
            levelsPanel.classList.add("u-hidden");
            gameReset();
          });
          levelsList.appendChild(btn);
        });
      }
    });
  }

  // Leaderboard (local-only for now)
  const LB_KEY = "snakeLocalLbV1";
  function readLeaderboard() { try { return JSON.parse(localStorage.getItem(LB_KEY) || "[]"); } catch { return []; } }
  function writeLeaderboard(list) { try { localStorage.setItem(LB_KEY, JSON.stringify(list.slice(0, 10))); } catch {} }
  function submitScore(score) {
    const entry = { score, mode, theme, date: new Date().toISOString().slice(0,10) };
    const list = readLeaderboard();
    list.push(entry);
    list.sort((a,b)=> b.score - a.score);
    writeLeaderboard(list);
  }
  // leaderboard button removed; panel remains for future use
  function renderLeaderboard() {
    const list = readLeaderboard();
    leaderboardList.innerHTML = "";
    list.slice(0,10).forEach((e, i) => {
      const div = document.createElement("div");
      div.textContent = `${i+1}. ${e.score} — ${e.mode}/${e.theme} (${e.date})`;
      leaderboardList.appendChild(div);
    });
  }

  // Swipe controls on canvas
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1) return;
      const t = e.touches[0];
      lastTouchStart = { x: t.clientX, y: t.clientY, at: performance.now() };
      unlockAudio();
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!lastTouchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - lastTouchStart.x;
      const dy = t.clientY - lastTouchStart.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const min = 20;
      if (Math.max(adx, ady) < min) return;
      if (adx > ady) {
        handleDirectionChange(dx > 0 ? 1 : -1, 0);
      } else {
        handleDirectionChange(0, dy > 0 ? 1 : -1);
      }
    },
    { passive: true }
  );

  // Auto-pause on tab blur/visibility change
  window.addEventListener("blur", () => setPaused(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });

  /**
   * Game update
   */
  function update() {
    if (!running || gameOver) return;
    const now = performance.now();
    if (now - lastMoveAt < moveIntervalMs) return;
    lastMoveAt = now;

    // apply queued direction
    direction = queuedDirection;

    // Phase Shift: temporarily ignore self-collision
    const inPhase = now < phaseShiftUntil;

    // compute new head
    const head = snake[0];
    let newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // Time fields affect update cadence
    if (timeFields.length) {
      for (const tf of timeFields) {
        if (newHead.x >= tf.x1 && newHead.x <= tf.x2 && newHead.y >= tf.y1 && newHead.y <= tf.y2) {
          moveIntervalMs = Math.max(MIN_MOVE_INTERVAL_MS, BASE_MOVE_INTERVAL_MS * tf.factor);
          break;
        } else {
          moveIntervalMs = Math.max(MIN_MOVE_INTERVAL_MS, BASE_MOVE_INTERVAL_MS - Math.min(80, score * 1.5));
        }
      }
    }

    // wall behavior
    if (wrapMode === "wrap") {
      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      if (newHead.x >= GRID_SIZE) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      if (newHead.y >= GRID_SIZE) newHead.y = 0;
    } else if (wrapMode === "portals") {
      const exitedLeft = newHead.x < 0;
      const exitedRight = newHead.x >= GRID_SIZE;
      const exitedTop = newHead.y < 0;
      const exitedBottom = newHead.y >= GRID_SIZE;
      if (exitedLeft || exitedRight || exitedTop || exitedBottom) {
        const safe = spawnFood();
        newHead.x = safe.x;
        newHead.y = safe.y;
        invincibleUntil = now + 600; // portal grace
      }
    } else {
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        if (hasShield) {
          consumeShieldAt(Math.max(0, Math.min(GRID_SIZE-1,newHead.x)), Math.max(0, Math.min(GRID_SIZE-1,newHead.y)), performance.now());
          // push inside and continue
          newHead.x = Math.max(0, Math.min(GRID_SIZE-1,newHead.x));
          newHead.y = Math.max(0, Math.min(GRID_SIZE-1,newHead.y));
        } else {
          setGameOver("You hit a wall");
          return;
        }
      }
    }

    // obstacle collision
    const nowTs = performance.now();
    let invincible = nowTs < invincibleUntil;
    const hitObstacleRaw = obstaclesEnabled && obstacles.some((o) => o.x === newHead.x && o.y === newHead.y);
    if (hitObstacleRaw && !invincible) {
      if (hasShield) {
        consumeShieldAt(newHead.x, newHead.y, nowTs);
      } else {
        setGameOver("You hit an obstacle");
        return;
      }
    }

    // self collision (exclude the last tail cell because it moves)
    invincible = performance.now() < invincibleUntil;
    const selfHit = !inPhase && snake.slice(0, -1).some((s) => s.x === newHead.x && s.y === newHead.y);
    if (selfHit && !invincible) {
      if (hasShield) {
        consumeShieldAt(newHead.x, newHead.y, performance.now());
      } else {
        setGameOver("You bit yourself");
        return;
      }
    }

    // move snake
    snake.unshift(newHead);
    // leave a faint trail dot
    trailDots.push({ x: newHead.x, y: newHead.y, createdAt: now, lifeMs: 450 });
    if (trailDots.length > 400) trailDots.splice(0, trailDots.length - 400);

    // Apply physics fields after moving
    if (antiGravityBubbles.length) {
      for (const b of antiGravityBubbles) {
        const dx = newHead.x - b.x;
        const dy = newHead.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 <= (b.radius*b.radius)) {
          // push away one step with small chance
          if (rand() < 0.35) {
            newHead.x += Math.sign(dx);
            newHead.y += Math.sign(dy);
          }
        }
      }
    }
    if (solarWinds.length) {
      for (const w of solarWinds) {
        // simple horizontal wind band
        if (newHead.y >= w.y1 && newHead.y <= w.y2) {
          if (rand() < w.strength) newHead.x += w.dx;
        }
      }
    }

    // Drone Buddy: auto-collect nearest star within radius
    if (now < droneUntil) {
      const radius = 2;
      const targets = [food, ...(bonusFood ? [bonusFood] : []), ...foods];
      let best = null;
      let bestDist = 9999;
      for (const t of targets) {
        const d = Math.abs(t.x - newHead.x) + Math.abs(t.y - newHead.y);
        if (d <= radius && d < bestDist) { best = t; bestDist = d; }
      }
      if (best) {
        // pull it instantly
        if (best === food) { newHead.x = food.x; newHead.y = food.y; }
        else if (bonusFood && best === bonusFood) { newHead.x = bonusFood.x; newHead.y = bonusFood.y; }
        else {
          const idx = foods.findIndex(f=>f===best);
          if (idx>=0) { newHead.x = foods[idx].x; newHead.y = foods[idx].y; foods.splice(idx,1); }
        }
        spawnTextPop("DRONE", newHead.x, newHead.y, "#fbbf24");
      }
    }

    // food
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 1;
      starsCurrency += 1; // 1 star collected = 1 currency
      const mult = performance.now() < doubleScoreUntil ? 2 : 1;
      spawnTextPop(mult > 1 ? "★★" : "★", food.x, food.y, "#fde68a");
      // objective progress (collect stars)
      if (objective.type === "collect") {
        objective.progress += 1;
        if (objective.progress >= objective.target) {
          // Complete level → show intermission actions (shop + continue)
          overlayTitle.textContent = "Level Complete";
          overlaySubtitle.textContent = `Collected ${objective.target} stars!`;
          resumeButton.classList.add("u-hidden");
          restartButton.classList.add("u-hidden");
          if (nextLevelButton) nextLevelButton.classList.add("u-hidden");
          if (intermissionActions) intermissionActions.classList.remove("u-hidden");
          if (intermissionShop) {
            intermissionShop.classList.remove("u-hidden");
            // Build list of power-stars available next level
            const nextIdx = Math.min(levelIndex + 1, CAMPAIGN.length - 1);
            applyLevelConfig(nextIdx);
            const kinds = enabledPowerKinds;
            intermissionShop.innerHTML = renderPowerListHTML(kinds);
            // restore current level config after preview
            applyLevelConfig(levelIndex);
          }
          overlay.classList.remove("hidden");
          running = false;
          toast("Level complete! Review next level's power-stars");
        }
      }
      refreshHUD();
      spawnTextPop("+1", food.x, food.y, "#ffffff");
      emitParticles(food.x, food.y, "#ef4444");
      food = spawnFood();
      // occasionally spawn a wide star collectible (unlocks Level 3+)
      if (levelIndex >= 2 && !wideStar && Math.random() < 0.18) {
        const pos = spawnFood();
        // ensure second cell is free
        if (pos.x < GRID_SIZE - 1 && !snake.some(s=>s.x===pos.x+1&&s.y===pos.y) && !obstacles.some(o=>o.x===pos.x+1&&o.y===pos.y)) {
          wideStar = { x: pos.x, y: pos.y };
        }
      }
      // blink star (Level 4+)
      if (levelIndex >= 3 && !blinkStar && Math.random() < 0.12) {
        blinkStar = spawnFood();
      }
      // ring star (Level 6)
      if (levelIndex >= 5 && !ringStar && Math.random() < 0.08) {
        ringStar = spawnFood();
      }
      // Occasionally spawn bonus food with a short timer (if enabled)
      // Nova Core (Level 4+)
      if (enableNovaCore && !novaCore && Math.random() < 0.08) {
        novaCore = spawnFood();
      }
      // Quantum Pair (Level 5+)
      if (enableQuantumPair && !quantumPair && Math.random() < 0.06) {
        const a = spawnFood();
        const b = spawnFood();
        quantumPair = { a, b };
      }
      // Constellation Shards (Level 6)
      if (enableConstellation && !constellation && Math.random() < 0.05) {
        const p1 = spawnFood();
        const p2 = spawnFood();
        const p3 = spawnFood();
        constellation = { points: [p1, p2, p3], nextIndex: 0 };
      }
      if (enableBonusFood && Math.random() < 0.25 && !bonusFood) {
        bonusFood = spawnFood();
        bonusFood.expiresAt = performance.now() + 3500; // 3.5s
      }
      // Spawn a power-star sometimes
      if (enabledPowerKinds.length && Math.random() < 0.2 && powerStars.length < 2) {
        const kind = enabledPowerKinds[Math.floor(Math.random() * enabledPowerKinds.length)];
        const p = spawnFood();
        powerStars.push({ x: p.x, y: p.y, kind });
      }
      // combo removed
      refreshHUD();

    // High score
    if (score > highScore) {
      highScore = score;
      highScoreValueEl.textContent = String(highScore);
      try { localStorage.setItem(HIGH_SCORE_KEY, String(highScore)); } catch (_) {}
    }

    // Speed ramp + Fuel Boost handling
    const baseSpeed = Math.max(MIN_MOVE_INTERVAL_MS, BASE_MOVE_INTERVAL_MS - Math.min(80, score * 1.5));
    moveIntervalMs = baseSpeed;
    if (now < speedBoostUntil) {
      moveIntervalMs = Math.max(MIN_MOVE_INTERVAL_MS, baseSpeed * 0.6);
    }

       // Obstacles growth
      if (obstaclesEnabled) {
        const target = desiredObstacleCountForScore(score);
        while (obstacles.length < target) spawnObstacle();
      }

      playSound("eat");
      triggerHaptic();
    } else {
      snake.pop();
    }

    // Bonus food handling
    if (bonusFood) {
      if (newHead.x === bonusFood.x && newHead.y === bonusFood.y) {
        const bonus = (performance.now() < doubleScoreUntil) ? 10 : 5;
        score += bonus;
        starsCurrency += 5; // bonus star worth 5 currency
        spawnTextPop("★★★★★", bonusFood.x, bonusFood.y, "#fde68a");
        refreshHUD();
        emitParticles(bonusFood.x, bonusFood.y, "#f59e0b");
        spawnTextPop("+5", bonusFood.x, bonusFood.y, "#fde68a");
        bonusFood = null;
        // Keep bonus-speed nudge but soften slightly
        moveIntervalMs = Math.max(MIN_MOVE_INTERVAL_MS, moveIntervalMs - 3);
        if (obstaclesEnabled) {
          const target = desiredObstacleCountForScore(score);
          while (obstacles.length < target) spawnObstacle();
        }
        playSound("eat");
        triggerHaptic();
      } else if (performance.now() > bonusFood.expiresAt) {
        bonusFood = null;
      }
    }

    // Chain effect: small extra point when collecting stars in quick succession
    if (performance.now() < chainUntil) {
      // chain handled implicitly by increased collection frequency; optionally could add more here
    }

    // Wide star collection: must occupy either of the two cells; only counts if entering from a non-parallel direction
    if (wideStar) {
      const hitLeft = newHead.x === wideStar.x && newHead.y === wideStar.y;
      const hitRight = newHead.x === wideStar.x + 1 && newHead.y === wideStar.y;
      if (hitLeft || hitRight) {
        // Require angled approach: previous head not aligned horizontally across the piece
        const prev = head; // previous head position
        const approachedFromTopOrBottom = prev.y !== wideStar.y;
        if (approachedFromTopOrBottom) {
          score += 2;
          starsCurrency += 2;
          spawnTextPop("★★", wideStar.x + 0.5, wideStar.y, "#fff59d");
          emitParticles(wideStar.x + 1, wideStar.y, "#fde68a");
          wideStar = null;
          refreshHUD();
          playSound("eat");
        }
      }
    }

    // Power-star collection
    if (powerStars.length) {
      const remain = [];
      for (const ps of powerStars) {
        if (ps.x === newHead.x && ps.y === newHead.y) {
          // Activate
          const nowT = performance.now();
          if (ps.kind === "shield") { hasShield = true; spawnTextPop("🛡️", ps.x, ps.y, "#93c5fd"); }
          else if (ps.kind === "magnet") { magnetUntil = nowT + 8000; spawnTextPop("🧲", ps.x, ps.y, "#60a5fa"); }
          else if (ps.kind === "slowmo") { slowmoUntil = nowT + 6000; spawnTextPop("🐢", ps.x, ps.y, "#a7f3d0"); }
          else if (ps.kind === "phase") { phaseShiftUntil = nowT + 5000; spawnTextPop("🌀", ps.x, ps.y, "#93c5fd"); }
          else if (ps.kind === "warp") { warpCharges += 1; spawnTextPop("⚡+1", ps.x, ps.y, "#93c5fd"); }
          else if (ps.kind === "stasis") { stasisUntil = nowT + 2500; spawnTextPop("🧊", ps.x, ps.y, "#93c5fd"); }
          else if (ps.kind === "drone") { droneUntil = nowT + 6000; spawnTextPop("🤖", ps.x, ps.y, "#93c5fd"); }
          else if (ps.kind === "fuel") { speedBoostUntil = nowT + 4000; spawnTextPop("⛽", ps.x, ps.y, "#fbbf24"); }
          else if (ps.kind === "doublescore") { doubleScoreUntil = nowT + 8000; spawnTextPop("2x", ps.x, ps.y, "#fde68a"); }
          else if (ps.kind === "chain") { chainUntil = nowT + 6000; spawnTextPop("Chain", ps.x, ps.y, "#fde68a"); }
        } else remain.push(ps);
      }
      powerStars = remain;
      refreshHUD();
    }

    // Blink star collection
    if (blinkStar && newHead.x === blinkStar.x && newHead.y === blinkStar.y) {
      // Only collect when visible
      const visible = Math.floor(performance.now() / 400) % 2 === 0;
      if (visible) {
        score += 3;
        starsCurrency += 3;
        spawnTextPop("★★★", blinkStar.x, blinkStar.y, "#fff59d");
        emitParticles(blinkStar.x, blinkStar.y, "#fde68a");
        blinkStar = null;
        refreshHUD();
        playSound("eat");
      }
    }

    // Ring star collection (+4)
    if (ringStar && newHead.x === ringStar.x && newHead.y === ringStar.y) {
      score += 4;
      starsCurrency += 4;
      spawnTextPop("★★★★", ringStar.x, ringStar.y, "#bbf7d0");
      emitParticles(ringStar.x, ringStar.y, "#86efac");
      ringStar = null;
      refreshHUD();
      playSound("eat");
    }

    // Nova Core (+5) — clears nearby hazards
    if (novaCore && newHead.x === novaCore.x && newHead.y === novaCore.y) {
      score += 5; starsCurrency += 5; refreshHUD();
      emitParticles(novaCore.x, novaCore.y, "#fcd34d");
      // clear nearby asteroids/mines in 2-cell radius
      obstacles = obstacles.filter(o => Math.abs(o.x - novaCore.x) + Math.abs(o.y - novaCore.y) > 2);
      spaceMines = spaceMines.filter(m => Math.abs(m.x - novaCore.x) + Math.abs(m.y - novaCore.y) > 2);
      novaCore = null; playSound("eat");
    }

    // Quantum Pair: must collect both within 2s
    if (quantumPair) {
      const hitA = newHead.x === quantumPair.a.x && newHead.y === quantumPair.a.y;
      const hitB = newHead.x === quantumPair.b.x && newHead.y === quantumPair.b.y;
      if (hitA || hitB) {
        if (!quantumPair.first) {
          quantumPair.first = hitA ? 'a' : 'b';
          quantumPair.expiresAt = performance.now() + 2000;
          spawnTextPop("Pair!", newHead.x, newHead.y, "#a5b4fc");
        } else {
          score += 4; starsCurrency += 4; refreshHUD();
          quantumPair = null; playSound("eat");
        }
      }
      if (quantumPair && quantumPair.expiresAt && performance.now() > quantumPair.expiresAt) quantumPair = null;
    }

    // Constellation sequence
    if (constellation) {
      const idx = constellation.nextIndex;
      const p = constellation.points[idx];
      if (newHead.x === p.x && newHead.y === p.y) {
        constellation.nextIndex += 1;
        spawnTextPop(`${idx+1}/${constellation.points.length}`, p.x, p.y, "#93c5fd");
        if (constellation.nextIndex >= constellation.points.length) {
          score += 6; starsCurrency += 6; playSound("eat"); refreshHUD();
          constellation = null; spawnConfetti();
        }
      }
    }

    // Rush timer and combo/multiplier scheduling
    if (mode === "rush") {
      rushTimerMs -= moveIntervalMs;
      if (rushTimerMs <= 0) {
        setGameOver("Time's up!");
      }
      refreshHUD();
    }

    // Occasionally spawn extra foods (max 2 active)
    if (enableExtraFoods && foods.length < 2 && Math.random() < 0.1) {
      const nf = spawnFood();
      foods.push(nf);
    }

    // Level confetti check
    const currentLevel = Math.floor(score / 10) + 1;
    if (currentLevel > prevLevel) {
      spawnConfetti();
      prevLevel = currentLevel;
      toast(`Level ${currentLevel}!`);
    }

    // Space theme special: moving comet power-up
    if (theme === "space") {
      // gravity wells pull the head lightly
      if (enablePlanets) for (const p of planets) {
        const dx = p.x - newHead.x;
        const dy = p.y - newHead.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > 0 && dist2 < (p.radius * p.radius) * 9) {
          // nudge 1 cell towards planet occasionally
          if (rand() < 0.25) {
            newHead.x += Math.sign(dx);
            newHead.y += Math.sign(dy);
          }
        }
      }
      // warp gates
      if (enableWarpGates && warpGates.length === 2) {
        const a = warpGates[0];
        const b = warpGates[1];
        if (newHead.x === a.x && newHead.y === a.y) {
          newHead.x = b.x; newHead.y = b.y; invincibleUntil = now + 600; spawnTextPop("Warp", a.x, a.y, "#93c5fd");
        } else if (newHead.x === b.x && newHead.y === b.y) {
          newHead.x = a.x; newHead.y = a.y; invincibleUntil = now + 600; spawnTextPop("Warp", b.x, b.y, "#93c5fd");
        }
      }
      // meteor shower schedule
      if (enableMeteors && meteorShowerUntil === 0 && now > nextMeteorShowerAt) {
        meteorShowerUntil = now + 6000; // 6s shower
        lastMeteorSpawnAt = 0;
        nextMeteorShowerAt = now + 22000 + rand() * 8000;
        toast("Meteor shower!");
      }
      if (enableMeteors && meteorShowerUntil > now) {
        if (now - lastMeteorSpawnAt > 200) {
          lastMeteorSpawnAt = now;
          const col = Math.floor(rand() * GRID_SIZE);
          meteors.push({ x: col, y: 0 });
        }
        // move meteors down
        if (now >= stasisUntil) {
          const keep = [];
          for (const m of meteors) {
            m.y += 1;
            if (m.y < GRID_SIZE) keep.push(m);
          }
          meteors = keep;
        }
      } else if (enableMeteors) {
        meteors = [];
      }

      // black holes appear occasionally
      if (enableBlackHoles && now > nextBlackHoleAt) {
        const bh = spawnFood();
        blackHoles.push({ x: bh.x, y: bh.y, expiresAt: now + 10000 });
        nextBlackHoleAt = now + 25000 + rand() * 10000;
      }
      blackHoles = enableBlackHoles ? blackHoles.filter((b) => now < b.expiresAt) : [];

      // meteor collision (meteors kill unless invincible)
      if (enableMeteors && meteors.some((m) => m.x === newHead.x && m.y === newHead.y)) {
        if (performance.now() < invincibleUntil) {
          // pass through
        } else if (hasShield) {
          consumeShieldAt(newHead.x, newHead.y, performance.now());
        } else {
          setGameOver("Struck by a meteor");
          return;
        }
      }
      // black hole warp
      for (const b of blackHoles) {
        if (b.x === newHead.x && b.y === newHead.y) {
          const w = spawnFood();
          newHead.x = w.x;
          newHead.y = w.y;
          invincibleUntil = now + 800; // brief grace after warp
          spawnTextPop("Warp!", b.x, b.y, "#a78bfa");
          break;
        }
      }

      if (enableComet && !comet && Math.random() < 0.04) {
        comet = {
          x: Math.floor(rand() * GRID_SIZE),
          y: Math.floor(rand() * GRID_SIZE),
          dx: Math.random() < 0.5 ? 1 : -1,
          dy: Math.random() < 0.5 ? 1 : -1,
          expiresAt: now + 8000,
        };
      }
      // move comet
      if (enableComet && comet && now - lastCometMoveAt >= COMET_MOVE_INTERVAL_MS) {
        lastCometMoveAt = now;
        if (now >= stasisUntil) {
          comet.x += comet.dx;
          comet.y += comet.dy;
        }
        if (wrapWalls) {
          if (comet.x < 0) comet.x = GRID_SIZE - 1;
          if (comet.x >= GRID_SIZE) comet.x = 0;
          if (comet.y < 0) comet.y = GRID_SIZE - 1;
          if (comet.y >= GRID_SIZE) comet.y = 0;
        } else {
          if (comet.x < 0 || comet.x >= GRID_SIZE) comet.dx *= -1;
          if (comet.y < 0 || comet.y >= GRID_SIZE) comet.dy *= -1;
          comet.x = Math.max(0, Math.min(GRID_SIZE - 1, comet.x));
          comet.y = Math.max(0, Math.min(GRID_SIZE - 1, comet.y));
        }
      }
      // collect comet grants short invincibility and score
      if (enableComet && comet && newHead.x === comet.x && newHead.y === comet.y) {
        score += 3;
        invincibleUntil = now + 4000; // 4s
        spawnTextPop("COMET!", comet.x, comet.y, "#93c5fd");
        emitParticles(comet.x, comet.y, "#60a5fa");
        playSound("eat");
        comet = null;
        refreshHUD();
      }
      if (enableComet && comet && now > comet.expiresAt) comet = null;
    }
  }

  /**
   * Render
   */
  function render() {
    ctx.save();
    if (screenShakeMs > 0) {
      const intensity = Math.min(1, screenShakeMs / 400);
      const mag = 4 * intensity;
      const dx = (Math.random() * 2 - 1) * mag;
      const dy = (Math.random() * 2 - 1) * mag;
      ctx.translate(dx, dy);
      screenShakeMs = Math.max(0, screenShakeMs - 16);
    }

    drawBoardBackground();
    drawObstacles();
    renderAmbientSparkles();
    // meteors
    if (theme === "space") {
      for (const m of meteors) {
        ctx.fillStyle = "#fca5a5";
        ctx.fillRect(m.x * CELL_PX + 6, m.y * CELL_PX + 2, CELL_PX - 12, CELL_PX - 4);
      }
      for (const b of blackHoles) {
        const cx = b.x * CELL_PX + CELL_PX / 2;
        const cy = b.y * CELL_PX + CELL_PX / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, CELL_PX * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#111827";
        ctx.fill();
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // planets
      for (const p of planets) {
        const cx = p.x * CELL_PX + CELL_PX / 2;
        const cy = p.y * CELL_PX + CELL_PX / 2;
        ctx.beginPath();
        // vary color per level to give each level a distinct feel
        const planetColors = ["#64748b", "#7dd3fc", "#f59e0b", "#a78bfa", "#22c55e", "#ef4444"];
        const pc = planetColors[(levelIndex) % planetColors.length];
        ctx.arc(cx, cy, CELL_PX * (0.3 + p.radius * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = pc;
        ctx.shadowColor = "#94a3b8";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // warp gates (color by level)
      if (warpGates.length === 2) {
        for (const g of warpGates) {
          const cx = g.x * CELL_PX + CELL_PX / 2;
          const cy = g.y * CELL_PX + CELL_PX / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL_PX * 0.35, 0, Math.PI * 2);
          const ringColors = ["#60a5fa", "#34d399", "#f472b6", "#f59e0b", "#a78bfa", "#fb7185"];
          ctx.strokeStyle = ringColors[(levelIndex) % ringColors.length];
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // draw food and variants
    renderFoodPulse();
    if (theme === "space") {
      drawStar(food.x, food.y, "#ffd54a");
    } else {
      drawCell(food.x, food.y, "#ef4444", "#b91c1c");
    }
    if (bonusFood) {
      if (theme === "space") drawStar(bonusFood.x, bonusFood.y, "#a5b4fc"); else drawCell(bonusFood.x, bonusFood.y, "#fbbf24", "#f59e0b");
    }
    for (const f of foods) {
      if (theme === "space") drawStar(f.x, f.y, "#60a5fa"); else drawCell(f.x, f.y, "#fb7185", "#e11d48");
    }
    // Render power-stars
    if (powerStars.length) {
      for (const ps of powerStars) {
        const colorMap = {
          shield: "#93c5fd", magnet: "#60a5fa", slowmo: "#a7f3d0",
          phase: "#c4b5fd", warp: "#93c5fd", stasis: "#93c5fd",
          drone: "#86efac", fuel: "#fbbf24", doublescore: "#fde68a", chain: "#fde68a"
        };
        drawStar(ps.x, ps.y, colorMap[ps.kind] || "#ffffff");
      }
    }
    if (wideStar) {
      drawWideStar(wideStar.x, wideStar.y, "#ffda6a");
    }
    // Blink star (if present)
    if (blinkStar) {
      const visible = Math.floor(performance.now() / 400) % 2 === 0;
      if (visible) drawStar(blinkStar.x, blinkStar.y, "#fff176");
    }
    // Ring star (outer ring graphic)
    if (ringStar) {
      const c = ringStar;
      const cx = c.x * CELL_PX + CELL_PX / 2;
      const cy = c.y * CELL_PX + CELL_PX / 2;
      ctx.save();
      ctx.strokeStyle = "#a7f3d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_PX * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawStar(c.x, c.y, "#34d399");
    }
    if (novaCore) {
      drawStar(novaCore.x, novaCore.y, "#fde68a");
    }
    if (quantumPair) {
      drawStar(quantumPair.a.x, quantumPair.a.y, "#c4b5fd");
      drawStar(quantumPair.b.x, quantumPair.b.y, "#c4b5fd");
    }
    if (constellation) {
      ctx.strokeStyle = "#93c5fd";
      ctx.beginPath();
      for (let i = 0; i < constellation.points.length; i += 1) {
        const p = constellation.points[i];
        const cx = p.x * CELL_PX + CELL_PX/2;
        const cy = p.y * CELL_PX + CELL_PX/2;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        drawStar(p.x, p.y, i < constellation.nextIndex ? "#93c5fd" : "#64748b");
      }
      ctx.stroke();
    }

    // comet render
    if (theme === "space" && comet) {
      drawStar(comet.x, comet.y, "#93c5fd");
    }

    // Hazards/fields visualization (lightweight)
    if (asteroidBelts.length) {
      for (const belt of asteroidBelts) {
        ctx.fillStyle = "#6b7280";
        for (let c = 0; c < GRID_SIZE; c += 2) {
          if (belt.gaps.includes(c)) continue;
          ctx.fillRect(c * CELL_PX + 4, belt.row * CELL_PX + 4, CELL_PX - 8, CELL_PX - 8);
        }
      }
    }
    if (antiGravityBubbles.length) {
      for (const b of antiGravityBubbles) {
        ctx.strokeStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(b.x * CELL_PX + CELL_PX/2, b.y * CELL_PX + CELL_PX/2, CELL_PX * (b.radius+0.5), 0, Math.PI*2);
        ctx.stroke();
      }
    }
    if (solarWinds.length) {
      ctx.strokeStyle = "rgba(148,163,184,0.3)";
      for (const w of solarWinds) {
        ctx.beginPath();
        ctx.moveTo(w.x1 * CELL_PX, w.y1 * CELL_PX);
        ctx.lineTo(w.x2 * CELL_PX, w.y2 * CELL_PX);
        ctx.stroke();
      }
    }

    renderTrail();

    // draw snake
    for (let i = 0; i < snake.length; i += 1) {
      const segment = snake[i];
      const isHead = i === 0;
      // draw segments as solid bright squares for maximum visibility
      const sx = segment.x * CELL_PX;
      const sy = segment.y * CELL_PX;
      if (theme === "neon" || theme === "space") {
        ctx.shadowColor = isHead ? "#22d3ee" : "#14b8a6";
        ctx.shadowBlur = isHead ? 12 : 6;
      } else {
        ctx.shadowBlur = 0;
      }
      // flash when invincible; removed multiplier color logic
      const flashing = theme === "space" && isHead && performance.now() < invincibleUntil && Math.floor(performance.now() / 150) % 2 === 0;
      ctx.fillStyle = flashing ? "#93c5fd" : (isHead ? "#00ff9a" : "#00d38d");
      ctx.fillRect(sx + 1, sy + 1, CELL_PX - 2, CELL_PX - 2);

      if (isHead) {
        // small eyes for fun
        const cx = segment.x * CELL_PX + CELL_PX / 2;
        const cy = segment.y * CELL_PX + CELL_PX / 2;
        ctx.fillStyle = "#0b1020";
        const eyeOffset = 5;
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, cy - 4, 2, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, cy - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        // outline head to guarantee visibility
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(segment.x * CELL_PX + 1, segment.y * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
      }
    }
    renderParticles();
    renderTextPops();
    ctx.restore();
  }

  function loop() {
    // apply slowmo by reducing update frequency
    const inSlowmo = performance.now() < slowmoUntil;
    if (!inSlowmo) update();
    else if (Math.random() < 0.5) update();
    render();
    pollGamepad(performance.now());
    requestAnimationFrame(loop);
  }

  // Kick off: prepare level, then show intro overlay before running
  gameReset();
  running = false;
  // announce within applyLevelConfig is already handled during gameReset call above
  applyLevelConfig(levelIndex, true);
  requestAnimationFrame(loop);

  /**
   * Simple sound effects (WebAudio)
   */
  let audioContext = null;
  function getAudioContext() {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioContext = new Ctx();
    }
    return audioContext;
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "running") {
      ctx.resume();
    }
  }

  function playSound(kind) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== "running") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    gain.gain.value = 0.03;
    if (kind === "eat") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } else if (kind === "buy") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (kind === "gameover") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.31);
    }
  }

  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  // Gamepad support (basic)
  let lastGamepadPoll = 0;
  function pollGamepad(ts) {
    if (ts - lastGamepadPoll < 70) return; // ~14Hz
    lastGamepadPoll = ts;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return;
    const axX = gp.axes[0] || 0;
    const axY = gp.axes[1] || 0;
    const btnUp = gp.buttons[12] && gp.buttons[12].pressed;
    const btnDown = gp.buttons[13] && gp.buttons[13].pressed;
    const btnLeft = gp.buttons[14] && gp.buttons[14].pressed;
    const btnRight = gp.buttons[15] && gp.buttons[15].pressed;
    if (btnUp || axY < -0.5) handleDirectionChange(0, -1);
    else if (btnDown || axY > 0.5) handleDirectionChange(0, 1);
    else if (btnLeft || axX < -0.5) handleDirectionChange(-1, 0);
    else if (btnRight || axX > 0.5) handleDirectionChange(1, 0);
  }

  function triggerHaptic() {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(15); } catch (_) {}
    }
  }

  /**
   * Particles: simple fade-and-move effect for eating
   */
  function emitParticles(cellX, cellY, color) {
    const count = 10;
    const baseX = cellX * CELL_PX + CELL_PX / 2;
    const baseY = cellY * CELL_PX + CELL_PX / 2;
    const now = performance.now();
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 40 + Math.random() * 80; // px/s
      particles.push({
        x: baseX,
        y: baseY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        createdAt: now,
        lifeMs: 400 + Math.random() * 300,
        color,
      });
    }
  }

  function renderParticles() {
    const now = performance.now();
    const remain = [];
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const age = now - p.createdAt;
      if (age > p.lifeMs) continue;
      const t = age / p.lifeMs;
      // Integrate simple motion
      const dt = 1 / 60; // approximate
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // draw
      const alpha = 1 - t;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.globalAlpha = 1;
      remain.push(p);
    }
    particles = remain;
  }

  function renderTrail() {
    const now = performance.now();
    const remain = [];
    for (const d of trailDots) {
      const age = now - d.createdAt;
      if (age > d.lifeMs) continue;
      const t = 1 - age / d.lifeMs;
      ctx.globalAlpha = 0.15 * t;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(d.x * CELL_PX + 2, d.y * CELL_PX + 2, CELL_PX - 4, CELL_PX - 4);
      ctx.globalAlpha = 1;
      remain.push(d);
    }
    trailDots = remain;
  }

  function renderFoodPulse() {
    const now = performance.now();
    const cx = food.x * CELL_PX + CELL_PX / 2;
    const cy = food.y * CELL_PX + CELL_PX / 2;
    for (let i = 0; i < 3; i += 1) {
      const start = foodPulseAt + i * 400;
      const age = now - start;
      if (age < 0 || age > 1200) continue;
      const p = age / 1200;
      const radius = 4 + p * (CELL_PX * 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,80,${1 - p})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function renderAmbientSparkles() {
    const now = performance.now();
    if (ambientSparkles.length < 60 && Math.random() < 0.06) {
      ambientSparkles.push({ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE), createdAt: now, lifeMs: 1400 });
    }
    const keep = [];
    for (const s of ambientSparkles) {
      const age = now - s.createdAt;
      if (age > s.lifeMs) continue;
      const t = age / s.lifeMs;
      const alpha = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
      ctx.globalAlpha = 0.25 * alpha;
      ctx.fillStyle = theme === "neon" ? "#22d3ee" : "#ffffff";
      ctx.fillRect(s.x * CELL_PX + CELL_PX / 2 - 1, s.y * CELL_PX + CELL_PX / 2 - 1, 2, 2);
      ctx.globalAlpha = 1;
      keep.push(s);
    }
    ambientSparkles = keep;
  }

  function spawnTextPop(text, cellX, cellY, color) {
    textPops.push({ text, x: cellX * CELL_PX + CELL_PX / 2, y: cellY * CELL_PX + CELL_PX / 2, createdAt: performance.now(), lifeMs: 700, color });
  }

  function renderTextPops() {
    const now = performance.now();
    const keep = [];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px system-ui, -apple-system, Segoe UI, Roboto";
    for (const tp of textPops) {
      const age = now - tp.createdAt;
      if (age > tp.lifeMs) continue;
      const t = age / tp.lifeMs;
      const dy = -18 * t;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = tp.color || "#fff";
      ctx.fillText(tp.text, tp.x, tp.y + dy);
      ctx.globalAlpha = 1;
      keep.push(tp);
    }
    textPops = keep;
  }
  
  // Consume shield: breaks shield and grants brief invincibility
  function consumeShieldAt(cellX, cellY, now) {
    if (!hasShield) return false;
    hasShield = false;
    invincibleUntil = Math.max(invincibleUntil, now + 800);
    try { toast("Shield broke!"); } catch (_) {}
    spawnTextPop("🛡️", cellX, cellY, "#93c5fd");
    return true;
  }

  function drawStar(cxCell, cyCell, color) {
    const cx = cxCell * CELL_PX + CELL_PX / 2;
    const cy = cyCell * CELL_PX + CELL_PX / 2;
    const r = Math.max(4, CELL_PX * 0.28);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((performance.now() / 600) % (Math.PI * 2));
    ctx.fillStyle = color || "#ffd54a";
    ctx.beginPath();
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i += 1) {
      const angle = (Math.PI / spikes) * i;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.shadowColor = color || "#ffd54a";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  function spawnConfetti() {
    const centerX = (GRID_SIZE * CELL_PX) / 2;
    const centerY = (GRID_SIZE * CELL_PX) / 2;
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];
    const now = performance.now();
    for (let i = 0; i < 60; i += 1) {
      const angle = (Math.PI * 2 * i) / 60;
      const speed = 60 + Math.random() * 120;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        createdAt: now,
        lifeMs: 900 + Math.random() * 700,
        color: colors[i % colors.length],
      });
    }
  }

  // Purchase removed (no shop). Power-ups are granted by collecting power-stars.

  // Toast notifications
  function toast(message, ms = 2000) {
    if (!toastContainer) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 180ms ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 200);
    }, ms);
  }
})();


