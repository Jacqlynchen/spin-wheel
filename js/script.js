/* =========================================================
   Spin Wheel Undian
   - Luas irisan = prob / total prob
   - Pemenang = irisan yang berada di bawah penunjuk saat roda berhenti
   ========================================================= */

const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const rad = d => d * Math.PI / 180;
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Geometri kanvas (800 x 800)
const W = 800, R = 370, CX = 400, TOP = 50;
const CY = TOP + R;      // pusat roda pada mode penuh
const HALF = 11.25;      // setengah dari 22,5 derajat = 1/16 lingkaran
const K = 2;             // pembesaran pada mode 1/16
const COLORS = ["#7ec4e8", "#8fd5a6", "#c9a4e6", "#f2d577", "#f2a28c", "#8ad8d8"];

// State
// Daftar peserta yang bisa diubah dari halaman (disimpan di browser lewat localStorage).
// Pertama kali dibuka, isinya diambil dari PARTICIPANTS di data.js.
const STORE = "spinwheel-peserta";
let nextId = 1;
const mk = (name, prob) => ({ id: nextId++, name, prob });
function loadMaster() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(s)) return s.map(p => mk(String(p.name), Number(p.prob) || 1));
  } catch (e) { /* abaikan */ }
  return PARTICIPANTS.map(p => mk(p.name, p.prob));
}
function saveMaster() {
  try { localStorage.setItem(STORE, JSON.stringify(master.map(({ name, prob }) => ({ name, prob })))); } catch (e) { /* abaikan */ }
}
let master = loadMaster();
let left = master.map(p => ({ ...p }));
let winners = [];
let rot = 0;             // sudut putaran roda (derajat)
let anim = null;         // animasi yang sedang berjalan
let pending = null;      // pemenang yang popup-nya sedang tampil
let focusManual = false;
let focus = master.length > 50; // peserta banyak -> default mode 1/16

const total = () => left.reduce((s, p) => s + p.prob, 0);

/* ---------------- Gambar roda ---------------- */
function draw() {
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  if (focus) {
    ctx.translate(CX, TOP); ctx.scale(K, K); ctx.translate(-CX, -TOP);
    ctx.beginPath(); ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R + 16, rad(-90 - HALF), rad(-90 + HALF)); ctx.closePath(); ctx.clip();
  }

  if (!left.length) {
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fillStyle = "#e5e7ef"; ctx.fill();
  } else {
    const tot = total();
    let s = 0;
    left.forEach((p, i) => {
      const a = p.prob / tot * 360, st = s + rot; s += a;
      if (focus) { // lewati irisan di luar jendela agar ringan
        const rel = (((st + a / 2) % 360) + 360) % 360, d = rel > 180 ? rel - 360 : rel;
        if (Math.abs(d) > HALF + a / 2) return;
      }
      ctx.beginPath(); ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, rad(-90 + st), rad(-90 + st + a)); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5; ctx.stroke();

      // nama peserta (memanjang dari tepi ke pusat)
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(rad(-90 + st + a / 2));
      let fs = Math.min(focus ? 18 : 30, Math.max(7, rad(a) * R * 0.5));
      ctx.font = `600 ${fs}px "Segoe UI", sans-serif`;
      const maxW = R - 62 - 26, w = ctx.measureText(p.name).width;
      if (w > maxW) { fs *= maxW / w; ctx.font = `600 ${fs}px "Segoe UI", sans-serif`; }
      ctx.fillStyle = "#1d2136"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(p.name, R - 18, 0);
      ctx.restore();
    });
  }

  // tepi roda + hub tengah
  ctx.beginPath(); ctx.arc(CX, CY, R + 7, 0, Math.PI * 2);
  ctx.strokeStyle = "#2d3250"; ctx.lineWidth = 14; ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 58, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.restore();

  // penunjuk (selalu di atas, tidak ikut diperbesar)
  ctx.beginPath(); ctx.moveTo(CX - 20, 6); ctx.lineTo(CX + 20, 6); ctx.lineTo(CX, 72); ctx.closePath();
  ctx.fillStyle = "#e8c547"; ctx.fill();
  ctx.strokeStyle = "#7a5f0f"; ctx.lineWidth = 3; ctx.stroke();
}

/* ---------------- Logika pemenang ---------------- */
function winnerAt(r) {
  const tot = total(), pt = (((-r) % 360) + 360) % 360;
  let s = 0;
  for (const p of left) { s += p.prob / tot * 360; if (pt < s) return p; }
  return left[left.length - 1];
}

/* ---------------- Animasi putar ---------------- */
function run(totalDeg, dur, stopping) {
  anim = { a0: rot, totalDeg, dur, t0: performance.now(), stopping };
  requestAnimationFrame(tick);
}
function tick(now) {
  if (!anim) return;
  const x = Math.min(1, (now - anim.t0) / 1000 / anim.dur);
  rot = anim.a0 + anim.totalDeg * (1 - Math.pow(1 - x, 3)); // ease-out
  draw();
  if (x < 1) requestAnimationFrame(tick); else finish();
}
function start() {
  if (anim || pending || !left.length) return;
  const raw = +$("dur").value;
  const dur = Math.min(120, Math.max(1, raw || 10));
  if (raw !== dur) notify("info", "Durasi disesuaikan menjadi " + dur + " detik (batas 1–120).");
  $("dur").value = dur;
  run(360 * (dur * 1.2 + Math.random() * 3) + Math.random() * 360, dur, false);
  updateButton();
}
function stop() { // stop manual: melambat halus dari kecepatan saat ini
  if (!anim || anim.stopping) return;
  const now = performance.now(), x = Math.min(1, (now - anim.t0) / 1000 / anim.dur);
  const v = anim.totalDeg * 3 * Math.pow(1 - x, 2) / anim.dur, T = 2.5;
  run(Math.max(v * T / 3, 20), T, true);
  updateButton();
}
function finish() {
  anim = null;
  pending = winnerAt(rot);
  winners.push(pending);
  renderLists(); switchTab("results");
  $("mName").textContent = pending.name;
  $("modal").hidden = false;
  fireConfetti();
  updateButton();
}
function closeModal() {
  if ($("modal").hidden) return;
  $("modal").hidden = true;
  stopConfetti();
  if (pending) { left = left.filter(p => p !== pending); pending = null; } // pemenang keluar dari roda
  renderLists(); draw(); updateButton();
}
function reset() {
  anim = null; pending = null; $("modal").hidden = true; stopConfetti();
  left = master.map(p => ({ ...p })); winners = []; rot = 0;
  renderLists(); switchTab("entries"); draw(); updateButton();
}

/* ---------------- Confetti (confetti-js) ---------------- */
let confetti = null;
function fireConfetti() {
  if (typeof ConfettiGenerator === "undefined") return; // library belum termuat (tidak ada internet)
  stopConfetti();
  confetti = new ConfettiGenerator({
    target: "confetti",
    max: 160,
    size: 1.3,
    animate: true,
    respawn: true,
    clock: 40,
    width: window.innerWidth,
    height: window.innerHeight,
    colors: [[126, 196, 232], [143, 213, 166], [201, 164, 230], [242, 213, 119], [242, 162, 140]],
  });
  confetti.render();
}
function stopConfetti() {
  if (confetti) { confetti.clear(); confetti = null; }
}

/* ---------------- Kelola peserta ---------------- */
// Format per baris: "Nama" atau "Nama, 2" (angka = bobot peluang)
function parseLines(text) {
  const out = [];
  text.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line) return;
    const m = line.match(/^(.*?)[,;\t]\s*(\d+(?:\.\d+)?)$/);
    const name = (m ? m[1] : line).trim(), prob = m ? parseFloat(m[2]) : 1;
    if (name && prob > 0) out.push({ name: name.slice(0, 40), prob });
  });
  return out;
}
/* ---------------- Notifikasi (SweetAlert2) ---------------- */
// Notifikasi kecil di pojok kanan atas. icon: success | error | warning | info
function notify(icon, text) {
  if (typeof Swal === "undefined") { console.log(text); return; }
  Swal.fire({
    toast: true, position: "top-end", icon, title: text,
    showConfirmButton: false, timer: 2500, timerProgressBar: true,
  });
}
// Dialog konfirmasi; hasilnya true kalau pengguna menekan tombol konfirmasi.
async function confirmBox(title, text, okText) {
  if (typeof Swal === "undefined") return confirm(title);
  const r = await Swal.fire({
    title, text, icon: "warning", showCancelButton: true, reverseButtons: true,
    confirmButtonText: okText, cancelButtonText: "Batal",
    confirmButtonColor: "#5b5bd6", cancelButtonColor: "#8a90a6",
  });
  return r.isConfirmed;
}
function busy() {
  if (anim || pending) { notify("warning", "Tunggu undian selesai dulu."); return true; }
  return false;
}
function afterChange() {
  saveMaster();
  if (!focusManual) { focus = master.length > 50; $("fz").checked = focus; layout(); }
  renderLists(); draw(); updateButton();
}
function addNames() {
  if (busy()) return;
  const items = parseLines($("newNames").value);
  if (!items.length) { notify("warning", "Tulis minimal satu nama dulu."); return; }
  items.forEach(it => { const p = mk(it.name, it.prob); master.push(p); left.push({ ...p }); });
  $("newNames").value = "";
  notify("success", items.length + " nama ditambahkan.");
  afterChange();
}
async function removeName(id) {
  if (busy()) return;
  const gone = master.find(p => p.id === id);
  if (!gone) return;
  if (!(await confirmBox("Hapus " + gone.name + "?", "Peserta ini akan dikeluarkan dari roda.", "Ya, hapus"))) return;
  master = master.filter(p => p.id !== id);
  left = left.filter(p => p.id !== id);
  afterChange();
  if (gone) notify("info", gone.name + " dihapus.");
}
async function clearAll() {
  if (busy()) return;
  if (!master.length) { notify("info", "Daftar peserta sudah kosong."); return; }
  if (!(await confirmBox("Hapus semua peserta?", "Roda akan dikosongkan.", "Ya, hapus semua"))) return;
  master = []; left = [];
  afterChange();
  notify("success", "Semua peserta dihapus.");
}
async function loadDefault() {
  if (busy()) return;
  if (!(await confirmBox("Kembalikan ke data awal?", "Daftar peserta akan diganti dengan isi data.js. Perubahan Anda akan hilang.", "Ya, kembalikan"))) return;
  master = PARTICIPANTS.map(p => mk(p.name, p.prob));
  left = master.map(p => ({ ...p })); winners = [];
  afterChange();
  notify("success", "Data awal dimuat (" + master.length + " peserta).");
}
async function onReset() {
  if ((anim || winners.length) &&
      !(await confirmBox("Reset undian?", "Daftar pemenang dikosongkan dan semua peserta kembali ke roda.", "Ya, reset"))) return;
  reset();
  notify("success", "Undian sudah di-reset.");
}

/* ---------------- UI ---------------- */
function updateButton() {
  const b = $("go");
  if (anim) { b.textContent = "STOP"; b.className = "stop"; b.disabled = !!anim.stopping; }
  else { b.textContent = "PUTAR"; b.className = ""; b.disabled = !!pending || !left.length; }
}
function layout() {
  $("go").style.top = focus ? (TOP + K * R) / W * 100 + "%" : CY / W * 100 + "%";
  $("wheel").style.marginBottom = focus ? "48px" : "0";
}
function renderLists() {
  $("cEntries").textContent = left.length;
  $("cResults").textContent = winners.length;
  $("lEntries").innerHTML = left.length
    ? left.map(p => `<li><span>${esc(p.name)}</span><span class="r"><small>prob ${p.prob}</small><button class="del" data-id="${p.id}" title="Hapus">✕</button></span></li>`).join("")
    : '<li class="none">Belum ada peserta.</li>';
  $("lResults").innerHTML = winners.map((w, i) => `<li data-no="${i + 1}">${esc(w.name)}</li>`).join("");
  $("emptyResults").hidden = winners.length > 0 || $("lResults").hidden;
}
function switchTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  $("entryTools").hidden = name !== "entries";
  $("lEntries").hidden = name !== "entries";
  $("lResults").hidden = name !== "results";
  $("emptyResults").hidden = name !== "results" || winners.length > 0;
}

/* ---------------- Event & inisialisasi ---------------- */
$("go").onclick = () => (anim ? stop() : start());
$("reset").onclick = onReset;
$("close").onclick = closeModal;
$("modal").onclick = e => { if (e.target === $("modal")) closeModal(); };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
document.querySelectorAll(".tab").forEach(t => t.onclick = () => switchTab(t.dataset.tab));
$("fz").checked = focus;
$("fz").onchange = e => { focusManual = true; focus = e.target.checked; layout(); draw(); };
$("addBtn").onclick = addNames;
$("clearBtn").onclick = clearAll;
$("defaultBtn").onclick = loadDefault;
$("lEntries").onclick = e => { const b = e.target.closest(".del"); if (b) removeName(+b.dataset.id); };

layout(); renderLists(); switchTab("entries"); draw(); updateButton();