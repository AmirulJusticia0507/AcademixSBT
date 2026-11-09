# AGENTS.md — AcademixSBT

> File ini adalah instruksi wajib untuk semua AI agent / contributor yang bekerja di repository ini.
> Setiap task harus dijalankan secara **autonomous**: selesai satu task → langsung commit & push → lanjut task berikutnya **tanpa menunggu notifikasi / konfirmasi dari user**.

---

## 1. Aturan Utama (Wajib)

1. **Setiap task yang selesai WAJIB langsung `git commit` dan `git push`** — jangan berhenti hanya dengan mengubah file lokal.
2. **Setelah push, langsung lanjutkan (`continue`) ke task berikutnya** tanpa menunggu perintah "lanjut" dari user.
3. Jangan menanyakan "apakah saya lanjut / commit?" di tengah task yang sudah jelas. Lanjutkan sampai todo list selesai atau benar-benar diblokir (butuh kredensial, keputusan desain yang ambigu, atau perintah user yang bertentangan).
4. Jika ada error yang bisa diperbaiki sendiri (build gagal, test gagal, lint, typo), perbaiki, ulangi, lalu commit & push lagi.
5. Satu task = satu commit yang fokus. Jangan mencampur perubahan tidak terkait dalam satu commit.
6. Jangan pernah commit file rahasia: `.env`, private key, `PINATA_SECRET_KEY`, dump database, `node_modules/`, artefak build.

## 2. Workflow per Task

```bash
# 1. Cek status & branch
git status
git branch --show-current

# 2. Kerjakan task dari TODO.md (urutan P0 -> P1 -> P2, lalu M1 -> M5)
#    - Baca file terkait dulu sebelum mengubah.
#    - Ikuti struktur, naming, dan pola kode yang sudah ada.

# 3. Verifikasi sebelum commit
#    - Jalankan test / build / lint yang relevan (jika ada).
#    - Pastikan tidak ada file rahasia ikut ter-commit.

# 4. Commit & push (WAJIB, langsung)
git add <file-yang-berubah>
git commit -m "<type>(<scope>): <deskripsi singkat>"
git push

# 5. Lanjut otomatis
#    - Centang item di TODO.md pada commit yang sama jika task selesai.
#    - Ambil task berikutnya dari TODO.md dan ulangi dari langkah 1.
```

## 3. Format Commit Message

Gunakan format konvensional berikut:

```text
<type>(<scope>): <deskripsi singkat dalam bahasa Indonesia/Inggris konsisten>

- <detail perubahan>
- <detail perubahan>
```

| Type | Kapan dipakai |
|---|---|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `docs` | README, TODO, AGENTS, dokumentasi |
| `refactor` | Refactor tanpa mengubah perilaku |
| `test` | Tambah/perbaiki test |
| `chore` | Konfigurasi, dependencies, tooling |
| `style` | Format/whitespace (tanpa mengubah logika) |

Contoh:

```text
docs(todo): pisahkan todo list ke TODO.md

- Pindahkan roadmap detail dari README ke TODO.md
- Tambahkan prioritas P0/P1/P2 dan milestone M1-M5
```

## 4. Branch & Push

- Bekerja di branch utama (`main`) kecuali user meminta branch/worktree tertentu.
- Push ke remote yang sama (`origin`) setelah setiap commit sukses.
- Jika push gagal karena remote berubah, lakukan `git pull --rebase` lalu `git push` lagi — jangan gunakan `--force` tanpa persetujuan eksplisit user.
- Jangan menghapus branch, rewrite history (`rebase -i`, `reset --hard`), atau menghapus file tanpa memastikan itu bagian dari task.

## 5. Kriteria "Task Selesai"

Task dianggap selesai jika **semua** terpenuhi:

- [ ] Perubahan kode/dokumen sudah dibuat.
- [ ] Test/build/lint relevan sudah dijalankan (atau dicatat tidak ada test untuk task tersebut).
- [ ] Item terkait di `TODO.md` sudah dicentang (`- [x]`).
- [ ] Sudah `git commit` dan `git push` berhasil.
- [ ] Task berikutnya sudah dimulai (continue) tanpa menunggu user.

Laporkan di akhir sesi hanya ringkasan: apa yang dikerjakan, commit apa yang di-push, dan task apa yang sedang/akan dilanjutkan.

## 6. Jika Terblokir

Berhenti dan laporkan **hanya** jika:

- Butuh kredensial/rahasia yang tidak tersedia (mis. private key deployer, API key Pinata).
- Ada keputusan desain yang benar-benar ambigu dan tidak dapat disimpulkan dari README/TODO.
- Perintah user bertentangan langsung dengan aturan di file ini.

Selain kondisi di atas, **jangan berhenti untuk bertanya — selesaikan dan lanjutkan.**
