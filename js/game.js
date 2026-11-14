/* Laundry Day Disaster */
(function () {
  "use strict";

  const SETTINGS_KEY = "ldd-settings-v1";
  const MAX_COMBO = 10;
  const TIMED_SECONDS = 60;
  const ENDLESS_STRIKES = 3;

  const images = {};
  const IMAGE_LIST = {
    determined: "assets/images/tammy-determined.png",
    shocked: "assets/images/tammy-shocked.png",
    laughing: "assets/images/tammy-laughing.png",
    portrait: "assets/images/tammy-portrait-circle.png",
    hamper: "assets/images/hamper.png"
  };

  const settings = {
    sound: true,
    reduceMotion: false,
    largeText: false
  };

  const state = {
    screen: "title",
    mode: "timed",
    running: false,
    paused: false,
    timeLeft: TIMED_SECONDS,
    elapsed: 0,
    score: 0,
    combo: 1,
    comboHits: 0,
    bestCombo: 1,
    caught: 0,
    missed: 0,
    stinksCaught: 0,
    strikes: 0,
    items: [],
    particles: [],
    spawnAcc: 0,
    spawnEvery: 1.1,
    playerX: 0.5,
    facing: 1,
    pose: "determined",
    poseUntil: 0,
    keys: { left: false, right: false },
    pointerId: null,
    lastTs: 0,
    raf: 0,
    lastTickSec: -1
  };

  const els = {};
  let canvas, ctx, stage;
  let worldW = 390;
  let worldH = 844;

  function $(id) { return document.getElementById(id); }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (err) { /* ignore unavailable storage */ }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (!localStorage.getItem(SETTINGS_KEY)) settings.reduceMotion = true;
    }
    applySettings();
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (err) { /* ignore */ }
  }

  function applySettings() {
    document.body.classList.toggle("large-text", settings.largeText);
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
    if (window.LDDAudio) window.LDDAudio.setMuted(!settings.sound);
    syncToggle("tog-sound", settings.sound);
    syncToggle("tog-motion", settings.reduceMotion);
    syncToggle("tog-large", settings.largeText);
  }

  function syncToggle(id, on) {
    const b = $(id);
    if (!b) return;
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-checked", on ? "true" : "false");
  }

  function announce(msg) {
    const live = $("live");
    if (live) live.textContent = msg;
  }

  function showScreen(name) {
    state.screen = name;
    ["title", "how", "settings", "game", "results"].forEach(function (n) {
      const el = $("screen-" + n);
      if (!el) return;
      const on = n === name;
      el.classList.toggle("active", on);
      if (on) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
    const focusMap = {
      title: "btn-timed",
      how: "btn-how-back",
      settings: "tog-sound",
      game: "btn-pause",
      results: "btn-again"
    };
    const fid = focusMap[name];
    if (fid && $(fid)) {
      setTimeout(function () { $(fid).focus(); }, 40);
    }
  }

  function loadImages() {
    const jobs = Object.keys(IMAGE_LIST).map(function (key) {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () { images[key] = img; resolve(); };
        img.onerror = function () { reject(new Error("Failed to load " + IMAGE_LIST[key])); };
        img.src = IMAGE_LIST[key];
      });
    });
    return Promise.all(jobs);
  }

  function layout() {
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    worldW = Math.max(280, rect.width);
    worldH = Math.max(400, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(worldW * dpr);
    canvas.height = Math.round(worldH * dpr);
    canvas.style.width = worldW + "px";
    canvas.style.height = worldH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function playerSize() {
    const h = Math.min(worldH * 0.46, 340);
    const img = images.determined;
    const ratio = img ? (img.width / img.height) : 0.48;
    return { w: h * ratio, h: h };
  }

  /* Basket sits in the upper mid of the full-body sprite. */
  function basketBox() {
    const ps = playerSize();
    const x = state.playerX * worldW;
    const y = worldH - ps.h - Math.max(8, worldH * 0.012);
    return {
      x: x - ps.w / 2 + ps.w * 0.02,
      y: y + ps.h * 0.29,
      w: ps.w * 0.66,
      h: ps.h * 0.22
    };
  }

  function playerDrawBox() {
    const ps = playerSize();
    return {
      x: state.playerX * worldW - ps.w / 2,
      y: worldH - ps.h - Math.max(8, worldH * 0.012),
      w: ps.w,
      h: ps.h
    };
  }

  function hamperBox() {
    const w = Math.min(180, worldW * 0.42);
    return { x: (worldW - w) / 2, y: 58, w: w, h: w * 1.08 };
  }

  function resetRound(mode) {
    state.mode = mode;
    state.running = false;
    state.paused = false;
    state.timeLeft = TIMED_SECONDS;
    state.elapsed = 0;
    state.score = 0;
    state.combo = 1;
    state.comboHits = 0;
    state.bestCombo = 1;
    state.caught = 0;
    state.missed = 0;
    state.stinksCaught = 0;
    state.strikes = 0;
    state.items = [];
    state.particles = [];
    state.spawnAcc = 0;
    state.spawnEvery = 1.15;
    state.playerX = 0.5;
    state.facing = 1;
    state.pose = "determined";
    state.poseUntil = 0;
    state.lastTs = 0;
    state.lastTickSec = -1;
    $("pause-overlay").classList.remove("active");
    updateHud();
    $("meter-label").textContent = mode === "timed" ? "Time" : "Chances";
    $("val-meter").textContent = mode === "timed" ? String(TIMED_SECONDS) : String(ENDLESS_STRIKES);
  }

  function startRound(mode) {
    resetRound(mode);
    showScreen("game");
    layout();
    announce(mode === "timed" ? "60-second rush. Get ready." : "Endless mode. Three chances. Get ready.");
    runCountdown(function () {
      state.running = true;
      state.lastTs = 0;
      if (window.LDDAudio) window.LDDAudio.start();
      loop(0);
    });
  }

  function runCountdown(done) {
    const box = $("countdown");
    const num = $("count-num");
    let n = 3;
    box.classList.add("active");
    num.textContent = "3";
    announce("3");
    const step = function () {
      n -= 1;
      if (n <= 0) {
        box.classList.remove("active");
        done();
        return;
      }
      num.textContent = String(n);
      announce(String(n));
      setTimeout(step, settings.reduceMotion ? 400 : 650);
    };
    setTimeout(step, settings.reduceMotion ? 400 : 650);
  }

  function pause(on) {
    if (!state.running && !state.paused) return;
    state.paused = on;
    state.running = !on;
    $("pause-overlay").classList.toggle("active", on);
    $("btn-pause").setAttribute("aria-label", on ? "Game paused" : "Pause the game");
    if (on) {
      if (window.LDDAudio) window.LDDAudio.pause();
      announce("Paused");
      $("btn-resume").focus();
    } else {
      state.lastTs = 0;
      loop(0);
      announce("Resumed");
      $("btn-pause").focus();
    }
  }

  function quitToTitle() {
    state.running = false;
    state.paused = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    $("pause-overlay").classList.remove("active");
    showScreen("title");
    announce("Back at the title screen.");
  }

  function spawnItem() {
    const stinkChance = Math.min(0.16 + state.elapsed * 0.004, 0.28);
    const type = window.LDDSprites.randomType(stinkChance);
    const ham = hamperBox();
    const size = type === "stink" ? 64 : 58 + Math.random() * 10;
    const speed = (160 + state.elapsed * 4 + Math.random() * 40) * (type === "holey" ? 1.15 : 1);
    state.items.push({
      type: type,
      x: ham.x + ham.w * (0.25 + Math.random() * 0.5),
      y: ham.y + ham.h * 0.45,
      vy: speed,
      vx: (Math.random() - 0.5) * 40,
      size: size,
      rot: (Math.random() - 0.5) * 0.6,
      spin: settings.reduceMotion ? 0 : (Math.random() - 0.5) * 1.8,
      born: state.elapsed
    });
    if (window.LDDAudio) window.LDDAudio.whoosh();
  }

  function setPose(name, seconds) {
    state.pose = name;
    state.poseUntil = state.elapsed + seconds;
  }

  function floatMsg(text) {
    const el = $("float-msg");
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 800);
  }

  function addScore(base) {
    const gain = base * state.combo;
    state.score += gain;
    return gain;
  }

  function bumpCombo() {
    state.comboHits += 1;
    if (state.comboHits >= 1 && state.combo < MAX_COMBO) {
      state.combo = Math.min(MAX_COMBO, state.combo + 1);
    }
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    if (state.combo === 5 || state.combo === 8 || state.combo === 10) {
      if (window.LDDAudio) window.LDDAudio.combo();
      const shouts = { 5: "On a roll!", 8: "Hamper heat!", 10: "Laundry Legend pace!" };
      floatMsg(shouts[state.combo]);
    }
  }

  function resetCombo() {
    state.combo = 1;
    state.comboHits = 0;
  }

  function catchItem(item, idx) {
    state.items.splice(idx, 1);
    const info = window.LDDSprites.TYPES[item.type];
    if (item.type === "stink") {
      state.stinksCaught += 1;
      state.strikes += 1;
      resetCombo();
      setPose("shocked", 0.8);
      if (window.LDDAudio) window.LDDAudio.stink();
      floatMsg("Stink bomb! Phew!");
      announce("Stink bomb. Combo reset.");
      burst(item.x, item.y, "#6b3aa0", 10);
      if (state.mode === "endless" && state.strikes >= ENDLESS_STRIKES) endRound();
      updateHud();
      return;
    }
    state.caught += 1;
    const gain = addScore(info.points);
    bumpCombo();
    setPose("laughing", 0.5);
    if (window.LDDAudio) window.LDDAudio.catch(state.combo);
    if (item.type === "holey") floatMsg("Holey bonus! +" + gain);
    else if (state.combo >= 3 && Math.random() < 0.35) floatMsg("Fresh catch! +" + gain);
    announce("Caught " + info.label + ". Plus " + gain + ". Combo " + state.combo);
    burst(item.x, item.y, "#f0b429", 8);
    updateHud();
  }

  function missItem(item, idx) {
    state.items.splice(idx, 1);
    if (item.type === "stink") {
      burst(item.x, worldH - 12, "#7aa85a", 6);
      return;
    }
    state.missed += 1;
    state.strikes += 1;
    resetCombo();
    setPose("shocked", 0.6);
    if (window.LDDAudio) window.LDDAudio.miss();
    floatMsg("It hit the tiles!");
    announce("Missed. Combo reset.");
    burst(item.x, worldH - 8, "#e85d4c", 7);
    if (state.mode === "endless" && state.strikes >= ENDLESS_STRIKES) endRound();
    updateHud();
  }

  function burst(x, y, color, n) {
    if (settings.reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
      const sp = 60 + Math.random() * 90;
      state.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: 0.45 + Math.random() * 0.2, age: 0, color: color, r: 3 + Math.random() * 3
      });
    }
  }

  function updateHud() {
    $("val-score").textContent = String(state.score);
    $("val-combo").textContent = "x" + state.combo;
    $("combo-fill").style.width = ((state.combo - 1) / (MAX_COMBO - 1) * 100) + "%";
    if (state.mode === "timed") {
      $("val-meter").textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    } else {
      $("val-meter").textContent = String(Math.max(0, ENDLESS_STRIKES - state.strikes));
    }
  }

  function ranksFor(score, mode) {
    const rows = [
      { min: 0, title: "Needs Another Wash", blurb: "The floor got most of it. One more load ought to do it." },
      { min: 120, title: "Lint Roller Rookie", blurb: "A solid start. The hamper is still smirking, though." },
      { min: 280, title: "Suds Apprentice", blurb: "You are getting the hang of this laundry emergency." },
      { min: 450, title: "Hamper Hero", blurb: "The runaways never stood a chance." },
      { min: 700, title: "Spin Cycle Star", blurb: "Smooth moves and a very full basket." },
      { min: 950, title: "Bubble Boss", blurb: "That was a clinic in basket work." },
      { min: 1200, title: "Laundry Legend", blurb: "The hamper has officially surrendered." }
    ];
    let pick = rows[0];
    rows.forEach(function (r) { if (score >= r.min) pick = r; });
    if (mode === "endless" && state.caught >= 40 && score >= 700) {
      return { title: "Hamper Hero", blurb: "You kept going until the last stink bomb. Impressive stamina." };
    }
    return pick;
  }

  function endRound() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    const rank = ranksFor(state.score, state.mode);
    $("rank-title").textContent = rank.title;
    $("result-score").textContent = String(state.score);
    $("result-blurb").textContent = rank.blurb;
    $("stat-caught").textContent = String(state.caught);
    $("stat-missed").textContent = String(state.missed);
    $("stat-combo").textContent = "x" + state.bestCombo;
    const img = $("result-portrait");
    img.src = "assets/images/tammy-portrait-circle.png";
    img.alt = "Portrait of the player character, a smiling woman in her 50s with wavy brown hair, a silver streak, round glasses, and a white Smiles 2322 T-shirt, holding a laundry basket";
    showScreen("results");
    if (window.LDDAudio) {
      if (state.score >= 450) window.LDDAudio.win();
      else window.LDDAudio.lose();
    }
    announce(rank.title + ". Score " + state.score + ". Caught " + state.caught + ", missed " + state.missed + ".");
  }

  function step(dt) {
    state.elapsed += dt;
    if (state.poseUntil && state.elapsed > state.poseUntil) {
      state.pose = "determined";
      state.poseUntil = 0;
    }

    const speed = 1.15; // fraction of width per second
    let dir = 0;
    if (state.keys.left) dir -= 1;
    if (state.keys.right) dir += 1;
    if (dir !== 0) {
      state.facing = dir < 0 ? -1 : 1;
      state.playerX += dir * speed * dt;
    }
    const ps = playerSize();
    const minX = (ps.w / 2) / worldW;
    const maxX = 1 - minX;
    state.playerX = Math.max(minX, Math.min(maxX, state.playerX));

    if (state.mode === "timed") {
      state.timeLeft -= dt;
      const sec = Math.ceil(Math.max(0, state.timeLeft));
      if (sec <= 5 && sec !== state.lastTickSec && sec > 0) {
        state.lastTickSec = sec;
        if (window.LDDAudio) window.LDDAudio.tick();
        announce(sec + " seconds left");
      }
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateHud();
        endRound();
        return;
      }
    }

    state.spawnEvery = Math.max(0.42, 1.15 - state.elapsed * 0.012);
    state.spawnAcc += dt;
    while (state.spawnAcc >= state.spawnEvery) {
      state.spawnAcc -= state.spawnEvery;
      spawnItem();
    }

    const basket = basketBox();
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.vy += 40 * dt;
      it.y += it.vy * dt;
      it.x += it.vx * dt;
      it.rot += it.spin * dt;
      if (it.x < 20) { it.x = 20; it.vx *= -0.6; }
      if (it.x > worldW - 20) { it.x = worldW - 20; it.vx *= -0.6; }

      const hw = it.size * 0.38;
      const hh = it.size * 0.34;
      const overlaps =
        it.x + hw > basket.x &&
        it.x - hw < basket.x + basket.w &&
        it.y + hh > basket.y &&
        it.y - hh < basket.y + basket.h;
      if (overlaps && it.y > basket.y - 8) {
        catchItem(it, i);
        continue;
      }
      if (it.y - it.size * 0.3 > worldH - 6) {
        missItem(it, i);
      }
    }

    for (let p = state.particles.length - 1; p >= 0; p--) {
      const pt = state.particles[p];
      pt.age += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 180 * dt;
      if (pt.age >= pt.life) state.particles.splice(p, 1);
    }
    updateHud();
  }

  function draw() {
    ctx.clearRect(0, 0, worldW, worldH);

    // Soft floor shadow near the tiles
    ctx.fillStyle = "rgba(28,42,46,0.10)";
    ctx.beginPath();
    ctx.ellipse(worldW / 2, worldH - 6, worldW * 0.42, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const ham = hamperBox();
    if (images.hamper) {
      ctx.drawImage(images.hamper, ham.x, ham.y, ham.w, ham.h);
    }

    // Falling items
    state.items.forEach(function (it) {
      const spr = window.LDDSprites.get(it.type);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      const s = it.size;
      const aspect = spr && spr.height && spr.width ? (spr.height / spr.width) : 1.05;
      ctx.drawImage(spr, -s / 2, -(s * aspect) / 2, s, s * aspect);
      ctx.restore();
    });

    // Player
    const box = playerDrawBox();
    const poseImg = images[state.pose] || images.determined;
    if (poseImg) {
      // foot shadow
      ctx.fillStyle = "rgba(28,42,46,0.22)";
      ctx.beginPath();
      ctx.ellipse(box.x + box.w / 2, box.y + box.h - 4, box.w * 0.32, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(poseImg, box.x, box.y, box.w, box.h);
    }

    // Particles
    state.particles.forEach(function (pt) {
      const a = 1 - pt.age / pt.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function loop(ts) {
    if (!state.running) return;
    if (!state.lastTs) state.lastTs = ts;
    let dt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    step(dt);
    draw();
    if (state.running) state.raf = requestAnimationFrame(loop);
  }

  function pointerToPlayer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const ps = playerSize();
    const minX = (ps.w / 2) / worldW;
    const maxX = 1 - minX;
    const next = Math.max(minX, Math.min(maxX, x));
    if (next > state.playerX + 0.01) state.facing = 1;
    else if (next < state.playerX - 0.01) state.facing = -1;
    state.playerX = next;
  }

  function bindInput() {
    const keysDown = function (e) {
      if (e.repeat && (e.key === " " || e.key === "Spacebar")) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        state.keys.left = true;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        state.keys.right = true;
        e.preventDefault();
      } else if (e.key === "p" || e.key === "P" || e.key === " ") {
        if (state.screen === "game") {
          e.preventDefault();
          pause(!state.paused);
        }
      } else if (e.key === "Escape") {
        if (state.screen === "game") {
          e.preventDefault();
          if (state.paused) quitToTitle();
          else pause(true);
        } else if (state.screen === "how" || state.screen === "settings" || state.screen === "results") {
          showScreen("title");
        }
      }
    };
    const keysUp = function (e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") state.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") state.keys.right = false;
    };
    window.addEventListener("keydown", keysDown);
    window.addEventListener("keyup", keysUp);

    canvas.addEventListener("pointerdown", function (e) {
      if (!state.running) return;
      canvas.setPointerCapture(e.pointerId);
      state.pointerId = e.pointerId;
      pointerToPlayer(e.clientX);
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (state.pointerId !== e.pointerId) return;
      pointerToPlayer(e.clientX);
      e.preventDefault();
    });
    const endPtr = function (e) {
      if (state.pointerId === e.pointerId) state.pointerId = null;
    };
    canvas.addEventListener("pointerup", endPtr);
    canvas.addEventListener("pointercancel", endPtr);
  }

  function bindUi() {
    $("btn-timed").addEventListener("click", function () {
      if (window.LDDAudio) window.LDDAudio.unlock();
      startRound("timed");
    });
    $("btn-endless").addEventListener("click", function () {
      if (window.LDDAudio) window.LDDAudio.unlock();
      startRound("endless");
    });
    $("btn-how").addEventListener("click", function () { showScreen("how"); });
    $("btn-settings").addEventListener("click", function () { showScreen("settings"); });
    $("btn-how-back").addEventListener("click", function () { showScreen("title"); });
    $("btn-set-back").addEventListener("click", function () { showScreen("title"); });
    $("btn-pause").addEventListener("click", function () { pause(true); });
    $("btn-resume").addEventListener("click", function () { pause(false); });
    $("btn-quit").addEventListener("click", function () { quitToTitle(); });
    $("btn-again").addEventListener("click", function () { startRound(state.mode); });
    $("btn-results-home").addEventListener("click", function () { showScreen("title"); });

    $("tog-sound").addEventListener("click", function () {
      settings.sound = !settings.sound;
      if (settings.sound && window.LDDAudio) window.LDDAudio.unlock();
      applySettings();
      saveSettings();
    });
    $("tog-motion").addEventListener("click", function () {
      settings.reduceMotion = !settings.reduceMotion;
      applySettings();
      saveSettings();
    });
    $("tog-large").addEventListener("click", function () {
      settings.largeText = !settings.largeText;
      applySettings();
      saveSettings();
    });

    document.addEventListener("pointerdown", function once() {
      if (window.LDDAudio) window.LDDAudio.unlock();
    }, { once: true });
  }

  function init() {
    canvas = $("game");
    ctx = canvas.getContext("2d");
    stage = $("stage");
    loadSettings();
    bindUi();
    bindInput();
    window.addEventListener("resize", function () {
      layout();
      if (!state.running) draw();
    });
    const spriteReady = window.LDDSprites ? window.LDDSprites.warmup() : Promise.resolve();
    Promise.all([loadImages(), spriteReady]).then(function () {
      layout();
    }).catch(function (err) {
      console.error(err);
    });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline optional */ });
    }

    // Test hook used by Playwright. Not shown in the UI.
    window.LDD = {
      start: startRound,
      endNow: endRound,
      pause: pause,
      show: showScreen,
      state: state,
      settings: settings,
      spawn: function (type) {
        const ham = hamperBox();
        state.items.push({
          type: type || "boxers",
          x: state.playerX * worldW,
          y: ham.y + ham.h,
          vy: 200,
          vx: 0,
          size: 60,
          rot: 0,
          spin: 0,
          born: state.elapsed
        });
      },
      setTime: function (t) { state.timeLeft = t; },
      layout: layout,
      images: images
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
