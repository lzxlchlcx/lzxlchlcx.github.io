/* A layered star field, cached nebula, aurora curtains, drifting dust and quiet meteors. */
(() => {
  'use strict';
  window.createAtmosphere = (canvas, options = {}) => {
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!ctx) return null;
    const lowPower = !!options.lowPower;
    let reduced = !!options.reducedMotion, active = options.active !== false, destroyed = false;
    let width = 1, height = 1, stars = [], dust = [], nebula = null;
    let frame = 0, last = 0, time = 0, pointer = { x: 0, y: 0 };
    let seed = 9471;
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const smooth = t => t * t * (3 - 2 * t);
    const hash = (x, y) => { let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; };
    function noise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y), u = smooth(x - ix), v = smooth(y - iy);
      const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
    }
    function cloud(x, y) {
      let value = 0, amount = .52;
      for (let i = 0; i < 5; i++) { value += noise(x, y) * amount; x = x * 2.03 + 11; y = y * 2.03 + 7; amount *= .49; }
      return value;
    }
    function cacheNebula() {
      const texture = document.createElement('canvas');
      texture.width = lowPower ? 240 : 400; texture.height = Math.round(texture.width * .7);
      const context = texture.getContext('2d');
      const pixels = context.createImageData(texture.width, texture.height);
      for (let y = 0; y < texture.height; y++) for (let x = 0; x < texture.width; x++) {
        const u = x / texture.width, v = y / texture.height;
        const warp = noise(u * 4 + 7, v * 4 + 9);
        const n = cloud(u * 5 + warp * 1.8, v * 5 - warp * .8);
        const ridge = Math.pow(Math.max(0, 1 - Math.abs(n - .48) * 3.7), 3);
        const envelope = Math.exp(-((u - .57) ** 2 / .2 + (v - .44) ** 2 / .14));
        const violet = Math.max(0, .48 - u) * 1.8;
        const index = (y * texture.width + x) * 4;
        pixels.data[index] = 33 + violet * 82;
        pixels.data[index + 1] = 105 + ridge * 35 - violet * 39;
        pixels.data[index + 2] = 151 + ridge * 24;
        pixels.data[index + 3] = Math.round(ridge * envelope * 112);
      }
      context.putImageData(pixels, 0, 0); return texture;
    }
    function glow(x, y, radius, rgba) {
      const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
      light.addColorStop(0, rgba); light.addColorStop(1, 'rgba(106,199,235,0)');
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    function resize() {
      if (destroyed) return;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.75);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed = 9471;
      const count = Math.min(lowPower ? 220 : 630, Math.max(125, Math.round(width * height / 2050)));
      stars = Array.from({ length: count }, (_, i) => ({
        x: random() * width, y: random() * height, size: .32 + random() ** 3 * 1.65,
        phase: random() * Math.PI * 2, speed: .14 + random() * .38,
        depth: .18 + random() * .82, color: i % 8 === 0 ? '175,157,232' : i % 9 === 0 ? '199,230,207' : '158,212,238', flare: i % 47 === 0
      }));
      dust = Array.from({ length: lowPower ? 12 : 34 }, () => ({ x: random() * width, y: random() * height, depth: random(), phase: random() * 6, size: .9 + random() * .9 }));
      if (!nebula) nebula = cacheNebula();
      draw(time);
    }
    function drawAurora(t) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const lines = lowPower ? 10 : 22;
      for (let i = 0; i < lines; i++) {
        const p = i / lines;
        ctx.beginPath();
        for (let j = 0; j <= 65; j++) {
          const u = j / 65;
          const x = u * width;
          const y = height * (.20 + .12 * Math.sin(u * 7 + t * .018) + .075 * Math.sin(u * 3.6 - t * .024)) + p * height * .12;
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const ribbon = ctx.createLinearGradient(0, 0, width, 0);
        const alpha = Math.sin(p * Math.PI) * .035;
        ribbon.addColorStop(0, 'rgba(49,169,185,0)');
        ribbon.addColorStop(.25, `rgba(45,155,174,${alpha})`);
        ribbon.addColorStop(.62, `rgba(102,218,219,${alpha * 1.7})`);
        ribbon.addColorStop(.83, `rgba(94,138,214,${alpha * .6})`);
        ribbon.addColorStop(1, 'rgba(68,150,204,0)');
        ctx.strokeStyle = ribbon; ctx.lineWidth = height * .006;
        ctx.shadowBlur = lowPower ? 0 : 13; ctx.shadowColor = '#51b8cd22'; ctx.stroke();
      }
      ctx.restore();
    }
    function draw(milliseconds) {
      const t = reduced ? 0 : milliseconds / 1000;
      ctx.clearRect(0, 0, width, height);
      if (nebula) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = .62 + .08 * Math.sin(t * .1);
        ctx.drawImage(nebula, -width * .08 + Math.sin(t * .023) * width * .02 - pointer.x * 5, -height * .09 + Math.cos(t * .019) * height * .02, width * 1.16, height * 1.16);
        ctx.restore();
      }
      drawAurora(t);
      stars.forEach(star => {
        const drift = t * star.depth * .44;
        const x = ((star.x + drift - pointer.x * star.depth * 6) % width + width) % width;
        const y = ((star.y - drift * .32 - pointer.y * star.depth * 4) % height + height) % height;
        const alpha = reduced ? .64 : .48 + .27 * Math.sin(t * star.speed + star.phase);
        ctx.fillStyle = `rgba(${star.color},${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, star.size, 0, Math.PI * 2); ctx.fill();
        if (star.flare) {
          const reach = 4.5 + 2 * Math.sin(t * .19 + star.phase);
          glow(x, y, 10, `rgba(117,193,233,${alpha * .17})`);
          const flare = ctx.createLinearGradient(x - reach, y, x + reach, y);
          flare.addColorStop(0, 'rgba(182,229,252,0)'); flare.addColorStop(.5, `rgba(202,243,255,${alpha * .8})`); flare.addColorStop(1, 'rgba(182,229,252,0)');
          ctx.strokeStyle = flare; ctx.lineWidth = .6;
          ctx.beginPath(); ctx.moveTo(x - reach, y); ctx.lineTo(x + reach, y); ctx.stroke();
          ctx.strokeStyle = `rgba(192,239,255,${alpha * .45})`;
          ctx.beginPath(); ctx.moveTo(x, y - reach * .72); ctx.lineTo(x, y + reach * .72); ctx.stroke();
        }
      });
      dust.forEach(p => {
        const x = ((p.x + t * (.8 + p.depth) + Math.sin(t * .08 + p.phase) * 8 - pointer.x * 12) % width + width) % width;
        const y = ((p.y - t * (.3 + p.depth * .4) - pointer.y * 7) % height + height) % height;
        const opacity = .10 + .07 * Math.sin(t * .35 + p.phase);
        glow(x, y, 4 + p.size, `rgba(115,214,229,${opacity})`);
        ctx.fillStyle = `rgba(163,228,239,${opacity * 1.4})`;
        ctx.beginPath(); ctx.arc(x, y, p.size * .5, 0, Math.PI * 2); ctx.fill();
      });
      // A single soft streak occasionally crosses the distance; no flashing bursts.
      const cycle = (t + 8) % 22;
      if (!reduced && !lowPower && cycle < 2.8) {
        const n = cycle / 2.8, alpha = Math.sin(n * Math.PI) * .34;
        const x = width * (.13 + n * .24), y = height * (.16 + n * .13);
        const length = Math.min(110, width * .1);
        const trail = ctx.createLinearGradient(x - length, y - length * .39, x, y);
        trail.addColorStop(0, 'rgba(108,214,238,0)'); trail.addColorStop(1, `rgba(192,244,255,${alpha})`);
        ctx.strokeStyle = trail; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(x - length, y - length * .39); ctx.lineTo(x, y); ctx.stroke();
        glow(x, y, 5, `rgba(192,244,255,${alpha * .5})`);
      }
    }
    function animate(now) {
      frame = 0;
      if (destroyed || !active || reduced || document.hidden) return;
      const elapsed = now - last;
      if (elapsed > (lowPower ? 65 : 40)) { time += Math.min(elapsed, 110); last = now; draw(time); }
      frame = requestAnimationFrame(animate);
    }
    function start() { if (!frame && !destroyed && active && !reduced && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(animate); } }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function visibility() { if (document.hidden) stop(); else start(); }
    document.addEventListener('visibilitychange', visibility);
    resize(); start();
    return {
      resize,
      setActive(value) {
        if (destroyed) return;
        const next = !!value;
        if (next === active) return;
        active = next;
        if (active) start(); else stop();
      },
      setPointer(x, y) { pointer = { x: reduced ? 0 : x, y: reduced ? 0 : y }; },
      setReducedMotion(value) { reduced = !!value; if (reduced) { stop(); pointer = { x: 0, y: 0 }; draw(0); } else start(); },
      destroy() { destroyed = true; stop(); document.removeEventListener('visibilitychange', visibility); }
    };
  };
})();
