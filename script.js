const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const song = $('#song');
const intro = $('#intro');
const site = $('#site');
const player = $('#player');

/* ---------- photos: show a placeholder if a file is missing ---------- */
document.querySelectorAll('.photo img').forEach((img) => {
  const markEmpty = () => img.parentElement.classList.add('empty');
  if (img.complete && img.naturalWidth === 0) markEmpty();
  img.addEventListener('error', markEmpty);
});

/* ---------- intro: press play ---------- */
$('#playBtn').addEventListener('click', () => {
  intro.classList.add('playing');
  $('#introHint').textContent = 'now playing…';
  song.volume = 0.85;
  song.play().catch(() => {}); // if the mp3 is missing the site still opens

  setTimeout(() => {
    intro.classList.add('gone');
    site.inert = false;
    document.body.classList.remove('locked');
    player.hidden = false;
    setTimeout(() => intro.remove(), 1000);
  }, reduceMotion ? 300 : 1700);
}, { once: true });

/* ---------- floating player ---------- */
const syncPlayer = () => {
  const paused = song.paused;
  player.classList.toggle('paused', paused);
  player.setAttribute('aria-label', paused ? 'Play music' : 'Pause music');
};
song.addEventListener('play', syncPlayer);
song.addEventListener('pause', syncPlayer);
player.addEventListener('click', () => {
  if (song.paused) song.play().catch(() => {});
  else song.pause();
});

/* ---------- countdown to Oct 17, 2026 (her local time) ---------- */
const target = new Date(2026, 9, 17);
const dayAfter = new Date(2026, 9, 18);
const pad = (n) => String(n).padStart(2, '0');
function tickCountdown() {
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) {
    $('#countdown').hidden = true;
    $('#cdNote').textContent = now < dayAfter
      ? "It's today!! Happy birthday, Bhie 🎂"
      : 'The best show of the year 💙';
    clearInterval(countdownTimer);
    return;
  }
  const s = Math.floor(diff / 1000);
  $('#cd-d').textContent = Math.floor(s / 86400);
  $('#cd-h').textContent = pad(Math.floor((s % 86400) / 3600));
  $('#cd-m').textContent = pad(Math.floor((s % 3600) / 60));
  $('#cd-s').textContent = pad(s % 60);
}
const countdownTimer = setInterval(tickCountdown, 1000);
tickCountdown();

/* ---------- reveal on scroll ---------- */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

/* ---------- why you: flip the picks ---------- */
const pickCards = [...document.querySelectorAll('.pick-card')];
const flipped = new Set();
pickCards.forEach((card) => {
  card.addEventListener('click', () => {
    const on = card.getAttribute('aria-pressed') !== 'true';
    card.setAttribute('aria-pressed', String(on));
    if (on) flipped.add(card);
    const n = flipped.size;
    $('#picksCount').textContent = n === pickCards.length
      ? "all 8 — and that's just the short list 💙"
      : `${n} / ${pickCards.length} flipped`;
    if (on && n === pickCards.length && !card.dataset.cheered) {
      card.dataset.cheered = '1';
      confetti(50);
    }
  });
});

/* ---------- lightbox ---------- */
const lightbox = $('#lightbox');
const lbImg = $('#lbImg');
const lbCap = $('#lbCap');
document.querySelectorAll('.polaroids .polaroid, .encore-photo').forEach((fig) => {
  const img = fig.querySelector('img');
  fig.tabIndex = 0;
  fig.setAttribute('role', 'button');
  fig.setAttribute('aria-label', `View photo: ${fig.querySelector('figcaption').textContent}`);
  const open = () => {
    if (fig.querySelector('.photo.empty')) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = fig.querySelector('figcaption').textContent;
    lightbox.showModal();
  };
  fig.addEventListener('click', open);
  fig.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
});
lightbox.addEventListener('click', () => lightbox.close());
$('#lbClose').addEventListener('click', () => lightbox.close());

/* ---------- the question ---------- */
const arena = $('#arena');
const yesBtn = $('#yesBtn');
const noBtn = $('#noBtn');
const taunt = $('#taunt');
const taunts = [
  'nice try 😏',
  'nope, wrong button',
  "that button's broken, sorry",
  "c'mon Bhie…",
  'the blue one, babe ↑',
  'you know you want to',
  "error 404: 'no' not found",
  "it's literally your birthday",
];
let dodges = 0;

function dodge(e) {
  if (e) e.preventDefault();
  const a = arena.getBoundingClientRect();
  const n = noBtn.getBoundingClientRect();
  const y = yesBtn.getBoundingClientRect();
  const maxX = a.width - n.width;
  const maxY = a.height - n.height;
  let x, top, tries = 0;
  do {
    x = Math.random() * maxX;
    top = Math.random() * maxY;
    tries++;
  } while (tries < 30 && overlaps(x + a.left, top + a.top, n.width, n.height, y, 16));
  noBtn.classList.add('loose');
  noBtn.style.left = `${x}px`;
  noBtn.style.top = `${top}px`;
  taunt.textContent = taunts[dodges % taunts.length];
  dodges++;
  yesBtn.style.setProperty('--grow', Math.min(1 + dodges * 0.08, 1.6));
}
function overlaps(x, y, w, h, r, pad) {
  return x < r.right + pad && x + w > r.left - pad && y < r.bottom + pad && y + h > r.top - pad;
}
noBtn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') dodge(e); });
noBtn.addEventListener('pointerdown', dodge);
noBtn.addEventListener('click', (e) => { e.preventDefault(); if (e.detail === 0) dodge(); }); // keyboard

yesBtn.addEventListener('click', () => {
  $('#qTitle').innerHTML = 'YAY!! It’s a date. 💙';
  arena.hidden = true;
  taunt.textContent = dodges ? `(it only took ${dodges} ${dodges === 1 ? 'try' : 'tries'} 😌)` : '';
  $('#afterYes').hidden = false;
  confetti(110);
  setTimeout(() => $('#tour').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 1100);
}, { once: true });

/* ---------- setlist picks ---------- */
const picks = { ride: null, meals: [] };
const lockBtn = $('#lockBtn');

document.querySelectorAll('.choices').forEach((group) => {
  group.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const chips = [...group.querySelectorAll('.chip')];
    if (group.dataset.mode === 'single') {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    } else {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    }
    const chosen = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.value);
    picks[group.dataset.group] = group.dataset.mode === 'single' ? chosen[0] || null : chosen;
    lockBtn.disabled = !(picks.ride && picks.meals.length);
  });
});

const ticketWrap = $('#ticketWrap');
lockBtn.addEventListener('click', () => {
  $('#tRide').textContent = picks.ride;
  $('#tMeals').textContent = picks.meals.join(' + ');
  ticketWrap.hidden = false;
  $('.lock-row').hidden = true;
  confetti(60);
  ticketWrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
});

$('#editBtn').addEventListener('click', () => {
  ticketWrap.hidden = true;
  $('.lock-row').hidden = false;
  $('#tour').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

const shareBtn = $('#shareBtn');
shareBtn.addEventListener('click', async () => {
  const text = [
    "🎸 Bhie's Birthday Tour — Sat, Oct 17, 2026",
    `🏍️ Ride: ${picks.ride}`,
    `🍽️ Food: ${picks.meals.join(' + ')}`,
    '👕 Dress code: Casual',
    'See you there 💙',
  ].join('\n');
  if (navigator.share) {
    try { await navigator.share({ title: "Bhie's Birthday Tour", text }); } catch { /* cancelled */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = 'Copied! Paste it to him 💙';
  } catch {
    shareBtn.textContent = 'Screenshot it & send 📸';
  }
});

/* ---------- confetti: hearts, stars, guitar picks ---------- */
function confetti(count) {
  if (reduceMotion) return;
  const colors = ['#2d6bff', '#4f9dff', '#8fe3ff', '#d7e6ff', '#ffffff'];
  const glyphs = ['♥', '★', '♥', '✦'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    const color = colors[Math.floor(Math.random() * colors.length)];
    if (Math.random() < 0.3) {
      el.className = 'confetti pick';
      el.style.setProperty('--c', color);
    } else {
      el.className = 'confetti';
      el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      el.style.color = color;
      el.style.fontSize = `${14 + Math.random() * 18}px`;
    }
    el.style.left = `${Math.random() * 100}vw`;
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 900}deg`);
    el.style.setProperty('--dur', `${2.4 + Math.random() * 2.2}s`);
    el.style.animationDelay = `${Math.random() * 0.6}s`;
    el.addEventListener('animationend', () => el.remove());
    document.body.appendChild(el);
  }
}
