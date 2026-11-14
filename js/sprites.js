/* Cartoon undie and stink-bomb sprites, drawn to offscreen canvases. */
(function (global) {
  "use strict";

  const TYPES = {
    boxers: { label: "striped boxers", points: 10, rare: false },
    briefs: { label: "plain briefs", points: 10, rare: false },
    granny: { label: "floral granny panties", points: 15, rare: false },
    polka: { label: "polka-dot undies", points: 12, rare: false },
    holey: { label: "holey undies", points: 20, rare: true },
    stink: { label: "stink bomb", points: 0, rare: false, hazard: true }
  };

  const cache = {};
  const imageCache = {};
  const IMAGE_SRC = {
    boxers: "assets/images/item-boxers.png",
    briefs: "assets/images/item-briefs.png",
    granny: "assets/images/item-granny.png",
    polka: "assets/images/item-polka.png",
    holey: "assets/images/item-holey.png",
    stink: "assets/images/item-stink.png"
  };

  function loadImages() {
    const keys = Object.keys(IMAGE_SRC);
    return Promise.all(keys.map(function (key) {
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () { imageCache[key] = img; resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = IMAGE_SRC[key];
      });
    }));
  }


  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    return { c: c, ctx: ctx };
  }

  function face(ctx, x, y, kind) {
    ctx.save();
    ctx.fillStyle = "#1c2a2e";
    if (kind === "happy") {
      ctx.beginPath();
      ctx.arc(x - 10, y - 4, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 10, y - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "#1c2a2e";
      ctx.arc(x, y + 4, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (kind === "wink") {
      ctx.beginPath();
      ctx.arc(x - 10, y - 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "#1c2a2e";
      ctx.moveTo(x + 6, y - 4);
      ctx.quadraticCurveTo(x + 10, y - 8, x + 14, y - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + 4, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (kind === "dizzy") {
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#1c2a2e";
      spiral(ctx, x - 11, y - 2, 5);
      spiral(ctx, x + 11, y - 2, 5);
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 8);
      ctx.quadraticCurveTo(x, y + 3, x + 6, y + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function spiral(ctx, x, y, r) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
      const p = (a / (Math.PI * 3.2)) * r;
      const px = x + Math.cos(a) * p;
      const py = y + Math.sin(a) * p;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function outlineFill(ctx, pathFn, fill, stroke, width) {
    ctx.beginPath();
    pathFn();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width || 5;
    ctx.strokeStyle = stroke || "#1c2a2e";
    ctx.stroke();
  }

  function drawBoxers(ctx, w, h) {
    const path = function () {
      ctx.moveTo(18, 28);
      ctx.quadraticCurveTo(w / 2, 16, w - 18, 28);
      ctx.lineTo(w - 14, 78);
      ctx.quadraticCurveTo(w - 28, 96, w / 2 + 8, 80);
      ctx.lineTo(w / 2, 76);
      ctx.lineTo(w / 2 - 8, 80);
      ctx.quadraticCurveTo(28, 96, 14, 78);
      ctx.closePath();
    };
    outlineFill(ctx, path, "#3aa0d8");
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.fillStyle = "#f7fbff";
    for (let y = 30; y < 90; y += 12) {
      ctx.fillRect(0, y, w, 6);
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(12, 24, w - 24, 14);
    ctx.restore();
    ctx.beginPath();
    path();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c2a2e";
    ctx.stroke();
    face(ctx, w / 2, 52, "happy");
  }

  function drawBriefs(ctx, w, h) {
    const path = function () {
      ctx.moveTo(16, 30);
      ctx.quadraticCurveTo(w / 2, 18, w - 16, 30);
      ctx.lineTo(w - 18, 62);
      ctx.quadraticCurveTo(w - 8, 92, w / 2, 86);
      ctx.quadraticCurveTo(8, 92, 18, 62);
      ctx.closePath();
    };
    outlineFill(ctx, path, "#2f8f7b");
    ctx.fillStyle = "#e8fff6";
    ctx.fillRect(16, 26, w - 32, 14);
    ctx.beginPath();
    path();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c2a2e";
    ctx.stroke();
    face(ctx, w / 2, 54, "happy");
  }

  function drawGranny(ctx, w, h) {
    const path = function () {
      ctx.moveTo(14, 22);
      ctx.quadraticCurveTo(w / 2, 10, w - 14, 22);
      ctx.lineTo(w - 12, 70);
      ctx.quadraticCurveTo(w - 6, 98, w / 2, 92);
      ctx.quadraticCurveTo(6, 98, 12, 70);
      ctx.closePath();
    };
    outlineFill(ctx, path, "#f3e2c4");
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.fillStyle = "#e0709a";
    for (let i = 0; i < 8; i++) {
      const fx = 22 + (i % 4) * 22;
      const fy = 36 + Math.floor(i / 4) * 28;
      flower(ctx, fx, fy, 6);
    }
    ctx.restore();
    ctx.fillStyle = "#fff6ea";
    ctx.fillRect(14, 18, w - 28, 12);
    ctx.beginPath();
    path();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c2a2e";
    ctx.stroke();
    face(ctx, w / 2, 56, "wink");
  }

  function flower(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = "#f6d15c";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0709a";
  }

  function drawPolka(ctx, w, h) {
    const path = function () {
      ctx.moveTo(16, 32);
      ctx.quadraticCurveTo(w / 2, 18, w - 16, 32);
      ctx.lineTo(w - 16, 64);
      ctx.quadraticCurveTo(w - 8, 94, w / 2, 88);
      ctx.quadraticCurveTo(8, 94, 16, 64);
      ctx.closePath();
    };
    outlineFill(ctx, path, "#f0c63a");
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.fillStyle = "#fffaf0";
    const dots = [
      [28, 48], [52, 42], [74, 50], [40, 68], [66, 70], [52, 78]
    ];
    dots.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 5.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = "#fffaf0";
    ctx.fillRect(16, 26, w - 32, 12);
    // tiny bow, decorative only
    ctx.fillStyle = "#e85d4c";
    ctx.beginPath();
    ctx.moveTo(w / 2, 24);
    ctx.lineTo(w / 2 - 10, 16);
    ctx.lineTo(w / 2 - 10, 28);
    ctx.closePath();
    ctx.moveTo(w / 2, 24);
    ctx.lineTo(w / 2 + 10, 16);
    ctx.lineTo(w / 2 + 10, 28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w / 2, 24, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    path();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c2a2e";
    ctx.stroke();
    face(ctx, w / 2, 56, "happy");
  }

  function drawHoley(ctx, w, h) {
    const path = function () {
      ctx.moveTo(18, 30);
      ctx.quadraticCurveTo(w / 2, 16, w - 18, 30);
      ctx.lineTo(w - 20, 66);
      ctx.quadraticCurveTo(w - 10, 94, w / 2, 88);
      ctx.quadraticCurveTo(10, 94, 20, 66);
      ctx.closePath();
    };
    outlineFill(ctx, path, "#f4f1ea");
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.globalCompositeOperation = "destination-out";
    [[30, 50, 7], [70, 58, 8], [48, 78, 6], [62, 42, 5]].forEach(function (h) {
      ctx.beginPath();
      ctx.arc(h[0], h[1], h[2], 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    // draw hole rims
    ctx.strokeStyle = "#1c2a2e";
    ctx.lineWidth = 2.5;
    [[30, 50, 7], [70, 58, 8], [48, 78, 6], [62, 42, 5]].forEach(function (hh) {
      ctx.beginPath();
      ctx.arc(hh[0], hh[1], hh[2], 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = "#d9d3c7";
    ctx.fillRect(18, 26, w - 36, 12);
    ctx.beginPath();
    path();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c2a2e";
    ctx.stroke();
    face(ctx, w / 2 - 2, 54, "wink");
  }

  function drawStink(ctx, w, h) {
    // stink squiggles
    ctx.strokeStyle = "#6b3aa0";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const sx = 28 + i * 22;
      ctx.moveTo(sx, 14);
      ctx.bezierCurveTo(sx + 8, 22, sx - 8, 28, sx + 4, 38);
      ctx.stroke();
    }
    // bomb body
    outlineFill(ctx, function () {
      ctx.arc(w / 2, 70, 32, 0, Math.PI * 2);
    }, "#5d9a3c");
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(w / 2 - 10, 58, 8, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // fuse
    ctx.strokeStyle = "#1c2a2e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2 + 16, 44);
    ctx.quadraticCurveTo(w / 2 + 28, 30, w / 2 + 22, 20);
    ctx.stroke();
    ctx.fillStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(w / 2 + 22, 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    face(ctx, w / 2, 72, "dizzy");
  }

  const drawers = {
    boxers: drawBoxers,
    briefs: drawBriefs,
    granny: drawGranny,
    polka: drawPolka,
    holey: drawHoley,
    stink: drawStink
  };

  function get(type) {
    if (imageCache[type]) return imageCache[type];
    if (cache[type]) return cache[type];
    const w = 100;
    const h = 110;
    const sheet = makeCanvas(w, h);
    drawers[type](sheet.ctx, w, h);
    cache[type] = sheet.c;
    return sheet.c;
  }

  function warmup() {
    Object.keys(drawers).forEach(get);
    return loadImages();
  }

  function randomType(stinkChance) {
    if (Math.random() < (stinkChance || 0.18)) return "stink";
    if (Math.random() < 0.12) return "holey";
    const bag = ["boxers", "briefs", "granny", "polka"];
    return bag[Math.floor(Math.random() * bag.length)];
  }

  global.LDDSprites = {
    TYPES: TYPES,
    get: get,
    warmup: warmup,
    loadImages: loadImages,
    randomType: randomType
  };
})(window);
