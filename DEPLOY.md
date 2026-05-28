# 🎮 Phantom Breach

**Phantom Breach** adalah game multiplayer berbasis web dengan konsep pertempuran battle ship secara real-time. Pemain akan menempatkan battle ship pada board masing-masing, lalu bergantian menyerang board lawan hingga seluruh battle ship musuh berhasil dihancurkan.

Project ini menggunakan **Phaser** sebagai game engine, **Vite** sebagai frontend development server, serta **Node.js, Express, Socket.IO, Redis, dan Socket.IO Redis Adapter** untuk backend multiplayer real-time.

---

## 📌 Table 
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

### 1. Pastikan Docker Desktop Aktif

Buka aplikasi **Docker Desktop**, lalu pastikan Docker sudah running.

Cek melalui terminal PowerShell atau CMD:

```bash
docker --version
```

Jika Docker sudah aktif, lanjut ke tahap berikutnya.

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

Jika Redis berhasil berjalan, akan muncul container dengan nama:

```bash
phantom-redis
```

---

### 5. Tes Koneksi Redis

Jalankan:

```bash
docker exec -it phantom-redis redis-cli ping
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

Cek ulang koneksi:

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

Jadi sebelum menjalankan backend, pastikan Redis Docker sudah aktif dan menghasilkan output:

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

Game akan berjalan pada:

```bash
http://localhost:5173
```

---

### 4. Buka Game di Browser

Untuk testing lokal, buka game dengan parameter session:

```bash
http://localhost:5173/?session_id=dev-player-1&session_token=dev-token-1&api_base_url=http://localhost:8000&event_slug=local-event&expires_at=2099-12-31T23:59:59Z
```

Untuk testing multiplayer, buka browser kedua atau incognito dengan `session_id` berbeda:

```bash
http://localhost:5173/?session_id=dev-player-2&session_token=dev-token-2&api_base_url=http://localhost:8000&event_slug=local-event&expires_at=2099-12-31T23:59:59Z
```

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

### 8. Port 3000 sudah digunakan

Jika backend gagal berjalan karena port `3000` sudah digunakan, hentikan proses yang memakai port tersebut atau ubah port pada `server.js`.

---

### 9. Port Redis 6379 sudah digunakan

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

### 10. Asset game tidak muncul

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
* Backend berjalan pada port `3000`.
* Frontend berjalan pada port `5173`.
* Frontend membaca alamat backend dari file `.env`.
* Untuk laptop yang sama, gunakan `VITE_SERVER_URL=http://localhost:3000`.
* Untuk jaringan/IP tertentu, sesuaikan `VITE_SERVER_URL` dengan alamat backend.
* Untuk testing multiplayer lokal, gunakan dua browser atau incognito dengan `session_id` berbeda.
* Game dapat mengambil konfigurasi dari CMS menggunakan `api_base_url` dan `event_slug`.
* Jika konfigurasi CMS gagal dimuat, game akan menggunakan konfigurasi default.
* Submit score membutuhkan endpoint CMS/API yang aktif.
* Folder `public/assets/` dan `public/fonts/` tidak boleh dihapus karena digunakan oleh game.
