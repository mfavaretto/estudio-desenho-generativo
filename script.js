const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height, cx, cy;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  cx = width / 2;
  cy = height / 2;
}
resize();
window.addEventListener('resize', resize);

// --- Controls ---
const segmentsInput = document.getElementById('segments');
const brushInput = document.getElementById('brush');
const speedInput = document.getElementById('speed');
const trailInput = document.getElementById('trail');
const particlesInput = document.getElementById('particles');
const mirrorVerticalInput = document.getElementById('mirrorVertical');
const segmentsVal = document.getElementById('segmentsVal');
const brushVal = document.getElementById('brushVal');
const speedVal = document.getElementById('speedVal');
const trailVal = document.getElementById('trailVal');

function syncLabels() {
  segmentsVal.textContent = segmentsInput.value;
  brushVal.textContent = brushInput.value;
  speedVal.textContent = speedInput.value;
  trailVal.textContent = trailInput.value;
}
[segmentsInput, brushInput, speedInput, trailInput].forEach(el => {
  el.addEventListener('input', syncLabels);
});
syncLabels();

document.getElementById('toggleUi').addEventListener('click', () => {
  document.getElementById('panel').classList.toggle('hidden');
});

document.getElementById('clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, width, height);
});

document.getElementById('save').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `caleidoscopio-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// initial background
ctx.fillStyle = '#05050a';
ctx.fillRect(0, 0, width, height);

// --- Drawing state ---
let hue = 260;
let drawing = false;
let lastX = null, lastY = null;
let particles = [];

function getPos(e) {
  if (e.touches && e.touches.length) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function fadeCanvas() {
  const trail = Number(trailInput.value);
  const alpha = 1 - trail / 100 * 0.98 - 0.005;
  ctx.fillStyle = `rgba(5,5,10,${Math.max(alpha, 0.02)})`;
  ctx.fillRect(0, 0, width, height);
}

function drawSegment(x0, y0, x1, y1, color, lineWidth) {
  const segments = Number(segmentsInput.value);
  const mirrorV = mirrorVerticalInput.checked;
  const angleStep = (Math.PI * 2) / segments;

  const relX0 = x0 - cx, relY0 = y0 - cy;
  const relX1 = x1 - cx, relY1 = y1 - cy;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = lineWidth * 1.5;

  for (let i = 0; i < segments; i++) {
    const angle = angleStep * i;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);

    const variants = mirrorV ? [1, -1] : [1];
    for (const flip of variants) {
      // rotate
      let rx0 = relX0 * cosA - relY0 * sinA;
      let ry0 = relX0 * sinA + relY0 * cosA;
      let rx1 = relX1 * cosA - relY1 * sinA;
      let ry1 = relX1 * sinA + relY1 * cosA;

      // mirror vertically (flip y) as an extra reflected copy
      ry0 *= flip;
      ry1 *= flip;

      ctx.beginPath();
      ctx.moveTo(cx + rx0, cy + ry0);
      ctx.lineTo(cx + rx1, cy + ry1);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
}

function spawnParticles(x, y, color) {
  if (!particlesInput.checked) return;
  for (let i = 0; i < 2; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 1,
      color
    });
  }
  if (particles.length > 400) particles.splice(0, particles.length - 400);
}

function updateParticles() {
  const segments = Number(segmentsInput.value);
  const mirrorV = mirrorVerticalInput.checked;
  const angleStep = (Math.PI * 2) / segments;

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
  });
  particles = particles.filter(p => p.life > 0);

  particles.forEach(p => {
    const relX = p.x - cx, relY = p.y - cy;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(p.life, 0);

    for (let i = 0; i < segments; i++) {
      const angle = angleStep * i;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const variants = mirrorV ? [1, -1] : [1];
      for (const flip of variants) {
        let rx = relX * cosA - relY * sinA;
        let ry = relX * sinA + relY * cosA;
        ry *= flip;
        ctx.beginPath();
        ctx.arc(cx + rx, cy + ry, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  ctx.globalAlpha = 1;
}

function animate() {
  fadeCanvas();
  updateParticles();
  hue = (hue + Number(speedInput.value) * 0.3) % 360;
  requestAnimationFrame(animate);
}
animate();

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  e.preventDefault();
}

function moveDraw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  const color = `hsl(${hue}, 90%, 60%)`;
  const lineWidth = Number(brushInput.value);

  drawSegment(lastX, lastY, pos.x, pos.y, color, lineWidth);
  spawnParticles(pos.x, pos.y, color);

  lastX = pos.x;
  lastY = pos.y;
  e.preventDefault();
}

function endDraw() {
  drawing = false;
  lastX = null;
  lastY = null;
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', moveDraw);
window.addEventListener('mouseup', endDraw);

canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', moveDraw, { passive: false });
window.addEventListener('touchend', endDraw);
