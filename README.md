# 🎮 Phantom Breach

**Phantom Breach** adalah game multiplayer berbasis web dengan konsep pertempuran battle ship secara real-time. Pemain akan menempatkan battle ship pada board masing-masing, lalu bergantian menyerang board lawan hingga seluruh battle ship musuh berhasil dihancurkan.

Project ini menggunakan **Phaser** sebagai game engine, **Vite** sebagai frontend development server, serta **Node.js, Express, Socket.IO, Redis, dan Socket.IO Redis Adapter** untuk backend multiplayer real-time.

---

## 📌 Table of Contents

* [Requirements](#-requirements)
* [Installation](#-installation)
* [Setup Redis Windows](#-setup-redis-windows)
* [Setup Environment](#-setup-environment)
* [Running Game](#-running-game)
* [Build](#-build)
* [Project Structure](#-project-structure)
* [Dependencies](#-dependencies)
* [Troubleshooting](#-troubleshooting)
* [Notes](#-notes)
* [Fitur Utama Game](#-fitur-utama-game)
* [Flow Data](#-flow-data)
* [Flow Aplikasi](#-flow-aplikasi)
* [Text / Informasi Game](#-text--informasi-game)
* [Arsitektur Sistem](#-arsitektur-sistem)
* [Deployment](#-deployment)

---

## 💻 Requirements

Sebelum menjalankan game, pastikan laptop/PC sudah menginstall software berikut:

| Software           | Fungsi                                                       |
| ------------------ | ------------------------------------------------------------ |
| **Node.js**        | Menjalankan frontend dan backend JavaScript                  |
| **npm**            | Menginstall dependency project                               |
| **Git**            | Clone repository project                                     |
| **Docker Desktop** | Menjalankan Redis Server di Windows                          |
| **Redis Server**   | Menyimpan data room sementara dan mendukung sistem reconnect |
| **Browser Modern** | Menjalankan game, seperti Chrome, Edge, atau Firefox         |

Cek Node.js dan npm:

```bash
node -v
npm -v
```

Cek Git:

```bash
git --version
```

Cek Docker:

```bash
docker --version
```

---

## ⚙️ Installation

Clone repository project:

```bash
git clone <repository-url>
cd Phantom-Breach
```

---

### 1. Install Dependency Frontend

Jalankan perintah berikut pada folder utama project:

```bash
npm install
```

Jika dependency frontend belum tersedia, install manual:

```bash
npm install phaser socket.io-client axios
```

Dependency frontend yang digunakan:

| Dependency           | Fungsi                                                        |
| -------------------- | ------------------------------------------------------------- |
| **phaser**           | Game engine untuk scene, board, sprite, asset, dan gameplay   |
| **socket.io-client** | Menghubungkan client game ke backend Socket.IO                |
| **axios**            | Mengambil konfigurasi game dan mengirim hasil score/session   |
| **vite**             | Menjalankan frontend secara lokal dan melakukan build project |

---

### 2. Install Dependency Backend

Masuk ke folder server:

```bash
cd server
npm install
```

Jika dependency backend belum tersedia, install manual:

```bash
npm install express socket.io redis @socket.io/redis-adapter cors
```

Dependency backend yang digunakan:

| Dependency                   | Fungsi                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| **express**                  | Membuat backend HTTP server                                 |
| **socket.io**                | Mengatur komunikasi real-time antar player                  |
| **redis**                    | Library Node.js untuk menghubungkan backend ke Redis Server |
| **@socket.io/redis-adapter** | Menghubungkan Socket.IO dengan Redis                        |
| **cors**                     | Mengatur akses request dari frontend ke backend             |

> Catatan penting: `npm install redis` hanya menginstall library Redis untuk Node.js, bukan Redis Server. Redis Server tetap harus dijalankan secara terpisah menggunakan Docker Desktop di Windows.

---

## 🟥 Setup Redis Windows

Pada Windows, Redis dijalankan menggunakan **Docker Desktop**.

> Nama container Redis bebas. Pada dokumentasi ini digunakan contoh nama `phantom-redis`. Jika menggunakan nama lain, misalnya `phantom-branch`, kode game tidak perlu diubah selama port Redis tetap menggunakan `6379`.

---

### 1. Pastikan Docker Desktop Aktif

Buka aplikasi **Docker Desktop**, lalu pastikan Docker sudah running.

Cek melalui terminal PowerShell atau CMD:

```bash
docker --version
```

---

### 2. Download Image Redis

Jalankan perintah berikut:

```bash
docker pull redis
```

---

### 3. Jalankan Redis Container

Jalankan Redis pada port default `6379`:

```bash
docker run --name phantom-redis -p 6379:6379 -d redis
```

Jika ingin menggunakan nama container lain, contoh:

```bash
docker run --name phantom-branch -p 6379:6379 -d redis
```

Yang paling penting adalah bagian port berikut tetap sama:

```bash
-p 6379:6379
```

Selama port tersebut tidak berubah, backend tetap dapat terhubung ke Redis melalui:

```bash
redis://127.0.0.1:6379
```

Keterangan command:

| Bagian Command         | Fungsi                                            |
| ---------------------- | ------------------------------------------------- |
| `docker run`           | Menjalankan container baru                        |
| `--name phantom-redis` | Memberi nama container Redis                      |
| `-p 6379:6379`         | Menghubungkan port Redis container ke port laptop |
| `-d`                   | Menjalankan container di background               |
| `redis`                | Image Redis yang digunakan                        |

---

### 4. Cek Redis Berjalan

Cek container yang sedang aktif:

```bash
docker ps
```

Jika Redis berhasil berjalan, akan muncul container Redis yang sedang aktif.

---

### 5. Tes Koneksi Redis

Jika menggunakan nama container `phantom-redis`:

```bash
docker exec -it phantom-redis redis-cli ping
```

Jika menggunakan nama container lain, misalnya `phantom-branch`:

```bash
docker exec -it phantom-branch redis-cli ping
```

Jika berhasil, output-nya:

```bash
PONG
```

Jika sudah muncul `PONG`, berarti Redis sudah aktif dan siap digunakan oleh backend game.

---

### 6. Menjalankan Redis Kembali

Jika laptop direstart atau Docker dimatikan, Redis bisa dijalankan kembali dengan:

```bash
docker start phantom-redis
```

Jika nama container berbeda, sesuaikan nama containernya:

```bash
docker start phantom-branch
```

Cek ulang koneksi Redis:

```bash
docker exec -it phantom-redis redis-cli ping
```

Output yang benar:

```bash
PONG
```

---

### 7. Menghentikan Redis

Jika ingin menghentikan Redis:

```bash
docker stop phantom-redis
```

Jika nama container berbeda, sesuaikan nama containernya:

```bash
docker stop phantom-branch
```

---

## 🔧 Setup Environment

Pada folder utama project, pastikan terdapat file `.env`.

Contoh konfigurasi jika backend berjalan di laptop yang sama:

```env
VITE_SERVER_URL=http://localhost:3000
```

Jika backend berjalan menggunakan IP tertentu, sesuaikan nilainya, contoh:

```env
VITE_SERVER_URL=http://172.31.128.1:3000
```

Backend game menggunakan Redis default:

```bash
redis://127.0.0.1:6379
```

Artinya backend akan mencari Redis pada:

```bash
Host: 127.0.0.1
Port: 6379
```

Sebelum menjalankan backend, pastikan Redis Docker sudah aktif dan menghasilkan output:

```bash
PONG
```

---

## 🚀 Running Game

Untuk menjalankan game, gunakan tiga terminal berbeda:

1. Terminal Redis
2. Terminal Backend
3. Terminal Frontend

---

### 1. Jalankan Redis

Buka Docker Desktop terlebih dahulu, lalu jalankan Redis:

```bash
docker start phantom-redis
```

Cek koneksi Redis:

```bash
docker exec -it phantom-redis redis-cli ping
```

Output yang benar:

```bash
PONG
```

---

### 2. Jalankan Backend Server

Buka terminal baru:

```bash
cd server
node server.js
```

Jika berhasil, backend akan berjalan pada:

```bash
http://localhost:3000
```

Backend harus menampilkan log bahwa Redis berhasil terhubung, misalnya:

```bash
Redis connected
SERVER RUNNING ON 3000
```

---

### 3. Jalankan Frontend Game

Buka terminal baru pada folder utama project:

```bash
npm run dev
```

Pada project ini, frontend berjalan pada:

```bash
http://localhost:8080
```

Jika terminal Vite menampilkan port yang berbeda, gunakan alamat yang muncul pada bagian `Local`.

Contoh output Vite:

```bash
Local: http://localhost:8080/
```

---

### 4. Buka Game di Browser

Untuk testing lokal, buka game dengan parameter session:

```bash
http://localhost:8080/?session_id=dev-player-1&session_token=dev-token-1&api_base_url=http://localhost:8000&event_slug=local-event&expires_at=2099-12-31T23:59:59Z
```

Untuk testing multiplayer, buka browser kedua atau incognito dengan `session_id` berbeda:

```bash
http://localhost:8080/?session_id=dev-player-2&session_token=dev-token-2&api_base_url=http://localhost:8000&event_slug=local-event&expires_at=2099-12-31T23:59:59Z
```

> Catatan: `api_base_url=http://localhost:8000` digunakan untuk koneksi ke CMS/API lokal. Jika CMS/API belum berjalan, game masih dapat terbuka, tetapi konfigurasi atau submit score ke CMS dapat gagal.

---

## 🛠 Build

Build game untuk production:

```bash
npm run build
```

Preview hasil build:

```bash
npm run preview
```

Hasil build akan berada pada folder:

```bash
dist/
```

---

## 📂 Project Structure

```bash
Phantom Breach/
├── public/
│   ├── assets/
│   │   ├── sound/
│   │   ├── spaceship1.png
│   │   ├── spaceship2.png
│   │   ├── spaceship3.png
│   │   ├── spaceship4.png
│   │   ├── hit.png
│   │   ├── miss.png
│   │   ├── bomb.png
│   │   ├── target.png
│   │   ├── tile_water.png
│   │   └── asset game lainnya
│   ├── fonts/
│   ├── config.json
│   ├── test.json
│   ├── style.css
│   └── favicon.png
│
├── src/
│   ├── game/
│   │   ├── config/
│   │   │   ├── defaultConfig.ts
│   │   │   ├── loadConfig.ts
│   │   │   └── mergeConfig.ts
│   │   ├── scenes/
│   │   │   ├── Boot.ts
│   │   │   ├── Preloader.ts
│   │   │   ├── MainMenu.ts
│   │   │   ├── Placement.ts
│   │   │   ├── Game.ts
│   │   │   └── Result.ts
│   │   ├── services/
│   │   │   └── configService.js
│   │   ├── utils/
│   │   │   └── SoundManager.ts
│   │   ├── main.ts
│   │   └── socket.ts
│   │
│   ├── session/
│   │   ├── endSession.ts
│   │   ├── sessionManager.ts
│   │   └── submitScore.ts
│   │
│   ├── main.ts
│   └── vite-env.d.ts
│
├── server/
│   ├── server.js
│   ├── roomManager.js
│   ├── testClient.js
│   ├── package.json
│   └── package-lock.json
│
├── vite/
│   ├── config.dev.mjs
│   └── config.prod.mjs
│
├── .env
├── index.html
├── log.js
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

## 🧩 Dependencies

### Frontend

| Package              | Keterangan                                |
| -------------------- | ----------------------------------------- |
| **phaser**           | Engine utama untuk menjalankan game       |
| **socket.io-client** | Koneksi real-time dari client ke backend  |
| **axios**            | Request konfigurasi game dan submit score |
| **vite**             | Development server dan build frontend     |

---

### Backend

| Package                      | Keterangan                                          |
| ---------------------------- | --------------------------------------------------- |
| **express**                  | Server HTTP backend                                 |
| **socket.io**                | Server komunikasi real-time                         |
| **redis**                    | Library untuk menghubungkan Node.js ke Redis Server |
| **@socket.io/redis-adapter** | Adapter agar Socket.IO dapat menggunakan Redis      |
| **cors**                     | Mengatur akses request dari frontend ke backend     |

---

### External Service

| Service          | Keterangan                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Redis Server** | Service eksternal yang wajib aktif agar backend dapat menyimpan state room sementara                   |
| **CMS/API**      | Digunakan untuk mengambil konfigurasi game dan mengirim score jika project dihubungkan ke sistem utama |

---

## ❗ Troubleshooting

### 1. Docker tidak dikenali

Jika muncul error:

```bash
'docker' is not recognized
```

Artinya Docker Desktop belum terinstall atau belum berjalan.

Solusi:

1. Install Docker Desktop.
2. Buka Docker Desktop.
3. Tunggu sampai status Docker aktif.
4. Jalankan ulang command:

```bash
docker --version
```

---

### 2. Redis container belum dibuat

Jika command ini gagal:

```bash
docker start phantom-redis
```

Berarti container Redis belum dibuat.

Buat Redis container dengan:

```bash
docker run --name phantom-redis -p 6379:6379 -d redis
```

---

### 3. Nama container Redis sudah digunakan

Jika muncul error bahwa nama `phantom-redis` sudah digunakan, jalankan saja container yang sudah ada:

```bash
docker start phantom-redis
```

Jika ingin membuat ulang dari awal:

```bash
docker rm -f phantom-redis
docker run --name phantom-redis -p 6379:6379 -d redis
```

---

### 4. Redis connection refused

Jika backend gagal connect ke Redis, cek apakah Redis aktif:

```bash
docker ps
```

Lalu tes Redis:

```bash
docker exec -it phantom-redis redis-cli ping
```

Output harus:

```bash
PONG
```

Jika belum aktif, jalankan:

```bash
docker start phantom-redis
```

---

### 5. Module backend tidak ditemukan

Jika muncul error seperti:

```bash
Cannot find module 'express'
Cannot find module 'socket.io'
Cannot find module 'redis'
```

Masuk ke folder server dan install dependency backend:

```bash
cd server
npm install express socket.io redis @socket.io/redis-adapter cors
```

---

### 6. Module frontend tidak ditemukan

Jika muncul error seperti:

```bash
Cannot find module 'phaser'
Cannot find module 'socket.io-client'
Cannot find module 'axios'
```

Install dependency frontend:

```bash
npm install phaser socket.io-client axios
```

---

### 7. Socket tidak connect ke backend

Periksa file `.env`:

```env
VITE_SERVER_URL=http://localhost:3000
```

Jika backend berjalan pada IP lain, sesuaikan nilainya.

Setelah mengubah `.env`, restart frontend:

```bash
npm run dev
```

---

### 8. Halaman `localhost:8080` tidak bisa dibuka

Jika browser menampilkan:

```bash
This site can't be reached
ERR_CONNECTION_REFUSED
```

Artinya frontend Vite belum berjalan atau terminal `npm run dev` sudah tertutup.

Jalankan kembali pada folder utama project:

```bash
npm run dev
```

Lalu buka alamat yang muncul pada output Vite, contoh:

```bash
http://localhost:8080
```

---

### 9. Masih membuka `localhost:5173`

Project ini berjalan pada port `8080`, bukan `5173`.

Gunakan:

```bash
http://localhost:8080
```

Bukan:

```bash
http://localhost:5173
```

Jika Vite menampilkan port lain, gunakan port yang muncul di terminal.

---

### 10. Port 3000 sudah digunakan

Jika backend gagal berjalan karena port `3000` sudah digunakan, hentikan proses yang memakai port tersebut atau ubah port pada `server.js`.

---

### 11. Port Redis 6379 sudah digunakan

Jika Redis gagal berjalan karena port `6379` sudah digunakan, cek container yang aktif:

```bash
docker ps
```

Jika sudah ada Redis yang berjalan, gunakan container tersebut.

Jika ingin membuat ulang:

```bash
docker rm -f phantom-redis
docker run --name phantom-redis -p 6379:6379 -d redis
```

---

### 12. Asset game tidak muncul

Pastikan asset masih berada di folder:

```bash
public/assets/
public/fonts/
```

Jangan menghapus atau mengubah nama asset yang sudah digunakan oleh scene game.

---

## 📝 Notes

* Game membutuhkan frontend dan backend agar multiplayer dapat berjalan.
* Redis wajib aktif sebelum menjalankan backend.
* Redis di Windows dijalankan menggunakan Docker Desktop.
* Nama container Redis bebas, selama port tetap `6379`.
* Backend berjalan pada port `3000`.
* Frontend pada project ini berjalan pada port `8080`.
* Jika Vite menampilkan port berbeda, gunakan alamat yang muncul pada terminal.
* Frontend membaca alamat backend dari file `.env`.
* Untuk laptop yang sama, gunakan `VITE_SERVER_URL=http://localhost:3000`.
* Untuk jaringan/IP tertentu, sesuaikan `VITE_SERVER_URL` dengan alamat backend.
* Untuk testing multiplayer lokal, gunakan dua browser atau incognito dengan `session_id` berbeda.
* Game dapat mengambil konfigurasi dari CMS menggunakan `api_base_url` dan `event_slug`.
* Jika konfigurasi CMS gagal dimuat, game akan menggunakan konfigurasi default.
* Submit score membutuhkan endpoint CMS/API yang aktif.
* Folder `public/assets/` dan `public/fonts/` tidak boleh dihapus karena digunakan oleh game.

---

## 🎮 Fitur Utama Game

Game **Phantom Breach** memiliki beberapa fitur utama yang mendukung gameplay multiplayer secara real-time. Fitur-fitur ini dibuat agar pemain dapat bermain dalam dua mode, menempatkan battle ship, menyerang lawan secara bergantian, serta mendapatkan hasil pertandingan di akhir permainan.

| Fitur                  | Keterangan                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Multiplayer Real-time  | Game dimainkan oleh dua player secara langsung menggunakan Socket.IO                   |
| Mode Random            | Player akan dicocokkan dengan player lain secara otomatis                              |
| Mode Teman             | Player dapat bermain dengan teman menggunakan room code                                |
| Placement Kapal        | Player dapat menempatkan battle ship pada board sendiri sebelum battle dimulai         |
| Shuffle Kapal          | Player dapat menyusun posisi kapal secara otomatis                                     |
| Battle Turn-based      | Player menyerang board lawan secara bergantian berdasarkan giliran                     |
| Hit dan Miss           | Sistem menampilkan hasil serangan apakah mengenai kapal atau tidak                     |
| Reveal Kapal Tenggelam | Kapal lawan akan ditampilkan ketika seluruh bagian kapal tersebut berhasil dihancurkan |
| Result Game            | Sistem menampilkan hasil akhir berupa menang atau kalah                                |
| Submit Score           | Score dikirim ke CMS/API setelah game selesai pada mode tertentu                       |
| Disconnect Handling    | Sistem dapat mendeteksi player yang keluar atau koneksi terputus                       |
| Redis Support          | Redis digunakan untuk membantu penyimpanan data sementara pada sistem multiplayer      |

---

## 🔄 Flow Data

Flow data menjelaskan bagaimana data berpindah dari player, frontend, backend, Redis, hingga CMS/API.

Pertama, player membuka game melalui URL yang berisi data session. Data tersebut digunakan oleh frontend untuk mengenali session player dan kebutuhan integrasi dengan CMS/API.

Contoh data yang dibaca dari URL:

| Data            | Fungsi                        |
| --------------- | ----------------------------- |
| `session_id`    | Identitas session player      |
| `session_token` | Token validasi session        |
| `api_base_url`  | Alamat CMS/API yang digunakan |
| `event_slug`    | Identitas event game          |
| `expires_at`    | Batas waktu session game      |

Setelah data session terbaca, frontend akan menghubungkan player ke backend melalui Socket.IO. Backend kemudian mengatur room, matchmaking, giliran bermain, serangan, hasil hit/miss, disconnect, dan hasil akhir pertandingan.

Redis digunakan sebagai penyimpanan sementara untuk membantu backend menyimpan data multiplayer seperti room dan state permainan.

Jika permainan selesai dan mode game mengizinkan submit score, maka frontend akan mengirim data hasil permainan ke CMS/API.

```txt
Player membuka URL game
        ↓
Frontend membaca data session
        ↓
Frontend connect ke backend menggunakan Socket.IO
        ↓
Backend mengatur room dan gameplay multiplayer
        ↓
Redis menyimpan data sementara room/state game
        ↓
Game selesai dan masuk Result
        ↓
Score dikirim ke CMS/API jika diperlukan
```

Ringkasan flow data:

```txt
Player
→ Browser
→ Frontend Phaser
→ Socket.IO Client
→ Backend Socket.IO Server
→ Redis
→ Result Game
→ CMS/API Submit Score
```

---

## 🧭 Flow Aplikasi

Flow aplikasi menjelaskan alur penggunaan game dari awal player membuka game sampai hasil pertandingan ditampilkan.

```txt
Buka URL Game
→ Validasi Session
→ Main Menu
→ Pilih Mode Game
→ Masuk Room
→ Placement Kapal
→ Battle
→ Result
→ Submit Score
```

Penjelasan alur aplikasi:

| Tahap            | Keterangan                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Buka URL Game    | Player membuka game dari link yang sudah memiliki parameter session                                                    |
| Validasi Session | Sistem membaca dan mengecek data seperti `session_id`, `session_token`, `api_base_url`, `event_slug`, dan `expires_at` |
| Main Menu        | Player masuk ke menu utama game                                                                                        |
| Pilih Mode Game  | Player memilih mode Random atau mode Teman                                                                             |
| Masuk Room       | Sistem membuat room atau memasukkan player ke room yang tersedia                                                       |
| Placement Kapal  | Player menyusun battle ship pada board sendiri                                                                         |
| Battle           | Player menyerang board lawan secara bergantian                                                                         |
| Result           | Sistem menampilkan hasil akhir pertandingan                                                                            |
| Submit Score     | Score dikirim ke CMS/API jika mode game mengizinkan                                                                    |

Pada **mode Random**, score dikirim ke CMS/API karena mode ini digunakan untuk kebutuhan event, leaderboard, atau reward.

Pada **mode Teman**, score tidak dikirim ke CMS/API karena mode ini hanya digunakan untuk bermain bersama teman.

---

## 💬 Text / Informasi Game

Text atau informasi game digunakan untuk memberikan feedback kepada player selama permainan berlangsung. Informasi ini membantu player memahami status game, giliran bermain, hasil serangan, dan hasil akhir pertandingan.

| Kondisi              | Informasi yang Ditampilkan                             |
| -------------------- | ------------------------------------------------------ |
| Menunggu Lawan       | Player sedang menunggu opponent masuk ke room          |
| Room Dibuat          | Room berhasil dibuat untuk mode Teman                  |
| Join Room            | Player berhasil masuk ke room teman                    |
| Placement            | Player diminta menyusun battle ship pada board sendiri |
| Shuffle              | Posisi kapal diacak secara otomatis                    |
| Ready                | Player sudah siap untuk masuk ke battle                |
| Your Turn            | Giliran player untuk menyerang board lawan             |
| Enemy Turn           | Giliran lawan untuk menyerang                          |
| Hit                  | Serangan berhasil mengenai kapal lawan                 |
| Miss                 | Serangan tidak mengenai kapal lawan                    |
| Ship Sunk            | Kapal lawan berhasil dihancurkan sepenuhnya            |
| Win                  | Player memenangkan pertandingan                        |
| Lose                 | Player kalah dalam pertandingan                        |
| Disconnect           | Lawan keluar atau koneksi terputus                     |
| Reconnect            | Player kembali masuk ke game setelah koneksi terputus  |
| Session Expired      | Session game sudah melewati batas waktu                |
| Submit Score Success | Score berhasil dikirim ke CMS/API                      |
| Submit Score Failed  | Score gagal dikirim ke CMS/API                         |

Text tersebut tidak hanya berfungsi sebagai tampilan, tetapi juga sebagai penanda kondisi game agar player mengetahui apa yang sedang terjadi.

---

## 🏗 Arsitektur Sistem

Arsitektur sistem **Phantom Breach** terdiri dari beberapa komponen utama, yaitu frontend game, backend server, Redis, dan CMS/API.

```txt
+------------------+
|  Browser Player  |
+------------------+
          |
          v
+------------------------------+
| Frontend Game                |
| Phaser + TypeScript + Vite   |
+------------------------------+
          |
          | Socket.IO Client
          v
+------------------------------+
| Backend Server               |
| Node.js + Express + Socket.IO|
+------------------------------+
          |
          v
+------------------+
| Redis Server     |
+------------------+
          |
          v
+------------------+
| CMS / API        |
+------------------+
```

Penjelasan komponen:

| Komponen         | Fungsi                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Browser Player   | Tempat player membuka dan memainkan game                                                  |
| Frontend Game    | Menampilkan scene game, board, asset, audio, tombol, dan interaksi player                 |
| Phaser           | Game engine yang digunakan untuk mengatur scene, sprite, animasi, dan gameplay            |
| TypeScript       | Bahasa yang digunakan pada sisi frontend game                                             |
| Vite             | Development server dan build tool untuk frontend                                          |
| Socket.IO Client | Menghubungkan frontend ke backend secara real-time                                        |
| Backend Server   | Mengatur room, matchmaking, turn, serangan, disconnect, reconnect, dan hasil pertandingan |
| Express          | Framework backend untuk menjalankan server HTTP                                           |
| Socket.IO        | Mengatur komunikasi real-time antara dua player                                           |
| Redis            | Menyimpan data sementara untuk kebutuhan multiplayer                                      |
| CMS/API          | Mengirim konfigurasi game dan menerima submit score                                       |

Dengan arsitektur ini, frontend tidak berjalan sendiri. Frontend hanya menampilkan game dan mengirim aksi player, sedangkan backend menjadi pengatur utama sistem multiplayer.

---

## 🚀 Deployment

Deployment adalah proses menjalankan game agar dapat digunakan di server atau lingkungan production. Pada game **Phantom Breach**, deployment dibagi menjadi beberapa bagian, yaitu frontend, backend, Redis, dan CMS/API.

### 1. Deployment Frontend

Frontend dibuild menggunakan perintah:

```bash
npm run build
```

Setelah proses build berhasil, hasil build akan berada di folder:

```bash
dist/
```

Folder `dist/` tersebut dapat diupload ke hosting frontend atau web server.

Sebelum build, pastikan file `.env` sudah mengarah ke backend yang benar.

Contoh:

```env
VITE_SERVER_URL=http://localhost:3000
```

Jika backend sudah berada di server, maka sesuaikan dengan alamat backend server.

Contoh:

```env
VITE_SERVER_URL=http://alamat-backend-server:3000
```

---

### 2. Deployment Backend

Backend dijalankan dari folder `server`.

```bash
cd server
node server.js
```

Backend harus berjalan agar fitur multiplayer dapat digunakan. Jika backend tidak aktif, player tidak dapat melakukan matchmaking, masuk room, atau bermain secara real-time.

Backend secara default berjalan pada port:

```txt
3000
```

---

### 3. Deployment Redis

Redis harus aktif sebelum backend dijalankan karena backend membutuhkan Redis untuk mendukung penyimpanan data sementara multiplayer.

Jika menggunakan Docker, Redis dapat dijalankan dengan:

```bash
docker start phantom-redis
```

Cek koneksi Redis:

```bash
docker exec -it phantom-redis redis-cli ping
```

Output yang benar:

```bash
PONG
```

Jika Redis tidak aktif, backend dapat mengalami error saat mencoba menghubungkan sistem multiplayer ke Redis.

---

### 4. Deployment CMS/API

CMS/API digunakan untuk mengambil konfigurasi game dan mengirim score player setelah pertandingan selesai.

Agar submit score berjalan, pastikan:

| Kebutuhan                   | Keterangan                                |
| --------------------------- | ----------------------------------------- |
| `api_base_url` benar        | URL mengarah ke CMS/API yang aktif        |
| `session_id` tersedia       | Session player terbaca dari URL           |
| `session_token` tersedia    | Token validasi session tersedia           |
| `event_slug` tersedia       | Event game terbaca                        |
| Endpoint submit score aktif | CMS/API dapat menerima hasil pertandingan |

Jika CMS/API belum aktif, game masih dapat dijalankan untuk testing, tetapi fitur konfigurasi dari CMS dan submit score dapat gagal.

---

### 5. Urutan Deployment

Urutan deployment yang disarankan:

```txt
1. Siapkan Redis Server
2. Jalankan Redis Server
3. Jalankan Backend Socket.IO Server
4. Atur file .env frontend agar mengarah ke backend
5. Build frontend menggunakan npm run build
6. Upload folder dist ke hosting/web server
7. Pastikan CMS/API aktif jika menggunakan submit score
8. Test game menggunakan dua browser atau mode incognito
```

---

### 6. Checklist Deployment

| Checklist                            | Status                              |
| ------------------------------------ | ----------------------------------- |
| Node.js sudah terinstall             | Wajib                               |
| Dependency frontend sudah terinstall | Wajib                               |
| Dependency backend sudah terinstall  | Wajib                               |
| Redis aktif                          | Wajib                               |
| Backend berjalan                     | Wajib                               |
| File `.env` sudah benar              | Wajib                               |
| Frontend berhasil dibuild            | Wajib                               |
| Folder `dist/` tersedia              | Wajib                               |
| Asset game tersedia                  | Wajib                               |
| CMS/API aktif                        | Wajib jika menggunakan submit score |
| Testing multiplayer berhasil         | Wajib                               |
