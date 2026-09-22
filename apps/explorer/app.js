const canvas = document.querySelector('#field');
const ctx = canvas.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let width = 0;
let height = 0;
let particles = [];

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  width = innerWidth;
  height = innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(90, Math.max(32, Math.floor((width * height) / 18000)));
  particles = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - .5) * .09,
    vy: (Math.random() - .5) * .09,
    r: i % 17 === 0 ? 2.2 : Math.random() * 1.2 + .35
  }));
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    if (!reduceMotion) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -5) p.x = width + 5;
      if (p.x > width + 5) p.x = -5;
      if (p.y < -5) p.y = height + 5;
      if (p.y > height + 5) p.y = -5;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.r > 2 ? 'rgba(255,255,255,.68)' : 'rgba(210,210,222,.24)';
    ctx.fill();
  }
  if (!reduceMotion) requestAnimationFrame(draw);
}

addEventListener('resize', resize, { passive: true });
resize();
draw();
