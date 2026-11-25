// Daftar peserta (hardcode).
// name = nama peserta, prob = bobot peluang -> menentukan luas irisan di roda.
const PARTICIPANTS = [
  { name: "Andi Pratama", prob: 1 },
  { name: "Budi Santoso", prob: 2 },
  { name: "Citra Dewi", prob: 1 },
  { name: "Dimas Wijaya", prob: 3 },
  { name: "Eka Putri", prob: 1 },
  { name: "Fajar Nugroho", prob: 2 },
  { name: "Gita Lestari", prob: 1 },
  { name: "Hadi Saputra", prob: 2 },
  { name: "Indah Kusuma", prob: 1 },
  { name: "Joko Hidayat", prob: 3 },
];

// Data dummy tambahan untuk uji coba 150+ peserta. Hapus blok ini kalau tidak dipakai.

(() => {
  const depan = ["Andi", "Budi", "Citra", "Dimas", "Eka"];   // 5 nama depan
  const belakang = ["Pratama", "Santoso"];                    // 2 nama belakang
  const bobot = [1, 2, 3];
  let k = 0;
  belakang.forEach(b => depan.forEach(d => PARTICIPANTS.push({ name: d + " " + b, prob: bobot[k++ % 3] })));
})();