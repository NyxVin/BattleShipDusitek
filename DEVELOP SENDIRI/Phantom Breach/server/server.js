// =====================================================
// SERVER UTAMA GAME MULTIPLAYER BATTLESHIP
// =====================================================
// File ini menjadi pusat logic backend realtime game.
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { generateRoomCode, rooms } from "./roomManager.js";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

// =====================================================
// GLOBAL STATE SERVER
// =====================================================
// matchmakingQueue menyimpan player yang sedang mencari lawan random.
// playersInQueue mencegah player yang sama masuk queue lebih dari sekali.
// GAME_CONFIG menyimpan aturan gameplay seperti turn_time, placement_time, cooldown, dan score.
// Config ini dikirim dari client melalui event syncConfig.
const matchmakingQueue = [];
const playersInQueue = new Set();
let GAME_CONFIG = null;
const app = express();
app.use(express.json());
const server = http.createServer(app);

// =====================================================
// SOCKET.IO SERVER
// =====================================================
// Socket.IO digunakan untuk komunikasi realtime antara client dan server.
// Semua event realtime seperti matchmaking, placement, battle, attack, timer,
// disconnect, dan reconnect dikirim melalui Socket.IO.
const io = new Server(server, {
  cors: { origin: "*" },
});

// =====================================================
// REDIS CLIENT
// =====================================================
// Redis digunakan untuk menyimpan state room sementara.
// Dengan Redis, room tetap bisa diambil kembali ketika player reconnect.
// pubClient dipakai untuk operasi Redis umum.
// subClient dipakai untuk adapter Socket.IO Redis.
const pubClient = createClient({
  url: "redis://127.0.0.1:6379",
});

const subClient = pubClient.duplicate();

// =====================================================
// REDIS ROOM HELPER
// =====================================================
// Helper ini bertugas menyimpan, mengambil, dan menghapus room dari Redis.
// Format key Redis yang digunakan adalah room:<roomCode>.
async function saveRoom(code, room) {
  await pubClient.set(`room:${code}`, JSON.stringify(room));
}

async function getRoom(code) {
  const data = await pubClient.get(`room:${code}`);
  return data ? JSON.parse(data) : null;
}

async function deleteRoomRedis(code) {
  await pubClient.del(`room:${code}`);
}

// =====================================================
// TIMER DAN USER CONNECTION STATE
// =====================================================
// roomIntervals menyimpan interval timer setiap room.
// disconnectTimers menyimpan timer timeout untuk satu player disconnect.
// bothOfflineTimers menyimpan timer timeout saat dua player disconnect.
// connectedUsers memetakan socket.id ke data user/session yang sedang online.
const roomIntervals = {};
const disconnectTimers = {};
const bothOfflineTimers = {};
const connectedUsers = {};

const PLAYER_RECONNECT_TIMEOUT = 30000; // 30 detik, sama seperti logic lama kamu
const BOTH_OFFLINE_TIMEOUT = 60000; // 60 detik untuk dua-duanya offline
const ROOM_IDLE_EXPIRE = 20000;

// =====================================================
// ROOM CLEANER
// =====================================================
// Cleaner berjalan berkala untuk membersihkan room yang sudah tidak aktif.
// Room dengan status ONE_OFFLINE atau BOTH_OFFLINE tidak langsung dihapus,
// karena masih ada kemungkinan player melakukan reconnect.
setInterval(async () => {
  for (const code in rooms) {
    let room = await getRoom(code);
    if (!room || !room.createdAt) continue;

    const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
    const now = Date.now();

    if (roomSize === 0 && now - room.createdAt > 10000 && room.phase !== "waiting" && room.status !== "ONE_OFFLINE" && room.status !== "BOTH_OFFLINE") {
      console.log("🧹 ROOM DIHAPUS:", code);
      await cleanRoom(code);
    }
  }
}, 10000);

// =====================================================
// CLEAN ROOM
// =====================================================
// Fungsi ini membersihkan room setelah match selesai, abandoned, atau tidak aktif.
async function cleanRoom(code) {
  let room = await getRoom(code);
  if (!room) return;

  console.log("🧹 CLEAN ROOM:", code);

  if (roomIntervals[code]) {
    clearInterval(roomIntervals[code]);
    delete roomIntervals[code];
  }

  await deleteRoomRedis(code); // 🔥 WAJIB

  delete rooms[code];
}

// =====================================================
// FORCE START BATTLE
// =====================================================
// Fungsi ini memaksa room masuk ke fase battle.
// Dipakai ketika semua player sudah ready atau timer placement sudah habis.
async function forceStartBattle(roomCode) {
  let room = rooms[roomCode];

  if (!room) return;

  // cegah double start
  if (room.phase === "battle") {
    return;
  }

  room.phase = "battle";
  room.currentTurn = room.host;
  room.timeLeft = GAME_CONFIG.turn_time;
  room.hasAttacked = false;

  rooms[roomCode] = room;

  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
    delete roomIntervals[roomCode];
  }

  await saveRoom(roomCode, room);

  io.to(roomCode).emit("startGame", {
    roomCode,
    ships: room.ships,
    currentTurn: room.currentTurn,
    timeLeft: room.timeLeft,
  });

  io.to(roomCode).emit("game_tick", {
    timeLeft: room.timeLeft,
    currentTurn: room.currentTurn,
  });

  startGameLoop(roomCode);

  console.log("🔥 BATTLE DIMULAI:", roomCode);
}

// =====================================================
// BATTLE GAME LOOP
// =====================================================
// Game loop battle berjalan setiap 1 detik.
// Server menurunkan timeLeft, mengganti giliran jika timer habis,
// lalu mengirim update timer dan currentTurn ke semua client di room.
// Server menjadi sumber kebenaran untuk timer dan giliran.
async function startGameLoop(roomCode) {
  if (!GAME_CONFIG) return;

  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
  }

  roomIntervals[roomCode] = setInterval(async () => {
    let room = rooms[roomCode];
    if (!room) return;

    room.timeLeft--;

    if (!room.hasAttacked && room.timeLeft <= 0) {
      room.timeLeft = GAME_CONFIG.turn_time;

      const nextTurn = room.currentTurn === room.host ? room.guest : room.host;

      room.currentTurn = nextTurn;
    }

    await saveRoom(roomCode, room);

    io.to(roomCode).emit("game_tick", {
      timeLeft: room.timeLeft,
      currentTurn: room.currentTurn,
    });
  }, 1000);
}

// =====================================================
// PLACEMENT TIMER
// =====================================================
// Timer ini berjalan saat fase placement kapal.
// Jika waktu placement habis, server akan memaksa room masuk ke battle.
async function startPlacementTimer(roomCode) {
  if (!GAME_CONFIG) {
    console.log("❌ CONFIG BELUM MASUK (placement)!");
    return;
  }

  const room = rooms[roomCode];

  if (!room) {
    console.log("❌ ROOM TIDAK ADA:", roomCode);
    return;
  }

  // 🔥 CEGAH DOUBLE TIMER
  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
    delete roomIntervals[roomCode];
  }

  room.placementTimeLeft = GAME_CONFIG.placement_time;

  await saveRoom(roomCode, room);

  roomIntervals[roomCode] = setInterval(async () => {
    const currentRoom = rooms[roomCode];

    if (!currentRoom) {
      clearInterval(roomIntervals[roomCode]);
      delete roomIntervals[roomCode];
      return;
    }

    // 🔥 JIKA SUDAH MASUK BATTLE STOP TIMER
    if (currentRoom.phase === "battle") {
      clearInterval(roomIntervals[roomCode]);
      delete roomIntervals[roomCode];
      return;
    }

    currentRoom.placementTimeLeft--;

    io.to(roomCode).emit("placementTick", {
      timeLeft: currentRoom.placementTimeLeft,
    });

    await saveRoom(roomCode, currentRoom);

    if (currentRoom.placementTimeLeft <= 0) {
      console.log("⏰ TIMER HABIS");

      await forceStartBattle(roomCode);
    }
  }, 1000);
}

// =====================================================
// CHECK ALL SHIPS DESTROYED
// =====================================================
// Fungsi ini mengecek apakah semua cell kapal milik player sudah terkena hit.
// Jika semua bagian kapal sudah terkena, player tersebut dianggap kalah.
function isAllShipsDestroyed(ships, hits) {
  for (const ship of ships) {
    const w = ship.vertical ? ship.height : ship.width;
    const h = ship.vertical ? ship.width : ship.height;

    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        const sx = ship.x + i;
        const sy = ship.y + j;

        const key = `${sx},${sy}`;

        if (!hits.includes(key)) {
          return false;
        }
      }
    }
  }

  return true;
}

// =====================================================
// BUILD SCORE
// =====================================================
// Fungsi ini menghitung statistik dan score akhir player.
// Jika player menang, score ditambah win_bonus dari GAME_CONFIG.
function buildScore(room, playerId, isWinner = false) {
  const s = room.scores[playerId] || {
    totalAttack: 0,
    hitCount: 0,
    missCount: 0,
  };

  const total = s.hitCount + s.missCount;
  const accuracy = total > 0 ? Math.round((s.hitCount / total) * 100) : 0;

  let score = s.hitCount * GAME_CONFIG.score.hit;

  if (isWinner) {
    score += GAME_CONFIG.score.win_bonus;
  }

  return {
    totalAttack: s.totalAttack,
    hitCount: s.hitCount,
    missCount: s.missCount,
    accuracy,
    score,
  };
}

function getTtlUntilExpiresAt(expiresAt) {
  if (!expiresAt) return 300;

  const expiredTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiredTime)) return 300;

  const ttl = Math.floor((expiredTime - Date.now()) / 1000);

  return ttl > 0 ? ttl : 0;
}

function isSessionExpired(expiresAt) {
  if (!expiresAt) return false;

  const expiredTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiredTime)) return false;

  return Date.now() > expiredTime;
}

function buildSessionFromUser(user) {
  if (!user) return null;

  return {
    sessionId: user.sessionId,
    sessionToken: user.sessionToken,
    apiBaseUrl: user.apiBaseUrl,
    expiresAt: user.expiresAt,
  };
}

function getPlayerSession(room, sessionId) {
  if (room.sessions?.[sessionId]) {
    return room.sessions[sessionId];
  }

  const socketField = getPlayerSocketField(room, sessionId);
  const socketId = socketField ? room[socketField] : null;

  if (!socketId) return null;

  return buildSessionFromUser(connectedUsers[socketId]);
}

async function submitScoreFromServer(playerSession, scoreData, roomCode) {
  if (!playerSession) return false;

  if (!playerSession.apiBaseUrl) {
    console.log("❌ SERVER SUBMIT GAGAL: API BASE URL TIDAK ADA");
    return false;
  }

  if (!playerSession.sessionId || !playerSession.sessionToken) {
    console.log("❌ SERVER SUBMIT GAGAL: SESSION TIDAK LENGKAP");
    return false;
  }

  if (isSessionExpired(playerSession.expiresAt)) {
    console.log("❌ SERVER SUBMIT GAGAL: SESSION EXPIRED");
    return false;
  }

  try {
    const response = await fetch(`${playerSession.apiBaseUrl}/game-sessions/submit-score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: playerSession.sessionId,
        session_token: playerSession.sessionToken,
        score: scoreData.score,
        metadata: {
          result: scoreData.result,
          room_code: roomCode,
        },
      }),
    });

    const result = await response.json();

    console.log("✅ SERVER SUBMIT SCORE BERHASIL:", {
      sessionId: playerSession.sessionId,
      result: scoreData.matchResult,
      score: scoreData.score,
      response: result,
    });

    return true;
  } catch (err) {
    console.error("❌ SERVER SUBMIT SCORE ERROR:", err);
    return false;
  }
}
// =====================================================
// DISCONNECT / RECONNECT HELPER
// =====================================================
// Helper di bagian ini digunakan untuk mendukung reconnect dan disconnect.
// Fungsinya antara lain mencari lawan player, mencari field socket player,
// memastikan struktur disconnectedPlayers tersedia, dan membersihkan timer reconnect.
function getOpponentId(room, sessionId) {
  return room.host === sessionId ? room.guest : room.host;
}

function getPlayerSocketField(room, sessionId) {
  if (room.host === sessionId) return "hostSocket";
  if (room.guest === sessionId) return "guestSocket";
  return null;
}

function ensureDisconnectState(room) {
  if (!room.disconnectedPlayers) {
    room.disconnectedPlayers = {};
  }

  if (!room.status) {
    room.status = "IN_PROGRESS";
  }

  if (room.bothOfflineAt === undefined) {
    room.bothOfflineAt = null;
  }

  return room;
}

function isPlayerDisconnected(room, sessionId) {
  return !!room.disconnectedPlayers?.[sessionId];
}

function getDisconnectedCount(room) {
  return Object.keys(room.disconnectedPlayers || {}).length;
}

function clearPlayerDisconnectTimer(roomCode, sessionId) {
  const key = `${roomCode}:${sessionId}`;

  if (disconnectTimers[key]) {
    clearTimeout(disconnectTimers[key]);
    delete disconnectTimers[key];
  }
}

function clearBothOfflineTimer(roomCode) {
  if (bothOfflineTimers[roomCode]) {
    clearTimeout(bothOfflineTimers[roomCode]);
    delete bothOfflineTimers[roomCode];
  }
}

// =====================================================
// LATE RESULT STORAGE
// =====================================================
// Fungsi ini menyimpan result sementara untuk player yang disconnect sampai timeout.
// Jika player tersebut membuka game lagi sebelum TTL Redis habis,
// server akan mengirim event lateGameResult agar dia masuk halaman Result kalah.
async function saveLateResultForPlayer(room, playerId, resultData) {
  const playerSession = getPlayerSession(room, playerId);
  const ttl = getTtlUntilExpiresAt(playerSession?.expiresAt);

  if (ttl <= 0) {
    return;
  }

  await pubClient.setEx(
    `matchResult:${playerId}`,
    ttl,
    JSON.stringify({
      roomCode: room.code,
      ...resultData,
    }),
  );
}

// =====================================================
// EXPIRED MATCH STORAGE
// =====================================================
// Fungsi ini menyimpan info match expired untuk kedua player.
// Dipakai ketika dua player disconnect sampai timeout.
// Saat player membuka game lagi, client akan diarahkan ke MainMenu dengan notifikasi match expired.
async function saveExpiredMatchForPlayers(room, reason) {
  const payload = {
    roomCode: room.code,
    reason,
    winner: room.winner ?? null,
    expiredAt: Date.now(),
  };

  if (room.host) {
    const hostSession = getPlayerSession(room, room.host);
    const hostTtl = getTtlUntilExpiresAt(hostSession?.expiresAt);

    if (hostTtl > 0) {
      await pubClient.setEx(`matchExpired:${room.host}`, hostTtl, JSON.stringify(payload));
    }
  }

  if (room.guest) {
    const guestSession = getPlayerSession(room, room.guest);
    const guestTtl = getTtlUntilExpiresAt(guestSession?.expiresAt);

    if (guestTtl > 0) {
      await pubClient.setEx(`matchExpired:${room.guest}`, guestTtl, JSON.stringify(payload));
    }
  }
}

// =====================================================
// FINISH BY FORFEIT
// =====================================================
// Fungsi ini dipakai saat satu player disconnect terlalu lama.
// Player yang disconnect dianggap kalah.
// Lawannya yang masih berada di room dianggap menang.
// Result player yang offline disimpan sementara agar saat dia kembali,
// dia tetap bisa melihat halaman Result kalah.
async function finishByForfeit(roomCode, loserId) {
  let room = await getRoom(roomCode);
  if (!room) return;

  room = ensureDisconnectState(room);

  if (room.status === "FINISHED" || room.status === "ABANDONED") {
    return;
  }

  const winnerId = getOpponentId(room, loserId);
  if (!winnerId) return;

  room.status = "FINISHED";
  room.winner = winnerId;
  room.finishReason = "DISCONNECT_TIMEOUT";

  const winnerScore = buildScore(room, winnerId, true);
  const loserScore = buildScore(room, loserId, false);

  rooms[roomCode] = room;
  await saveRoom(roomCode, room);

  // Simpan result untuk player yang disconnect.
  // Karena dia sedang offline, dia tidak menerima event gameOver.
  await saveLateResultForPlayer(room, loserId, {
    winner: winnerId,
    myId: loserId,
    total: loserScore.totalAttack,
    hit: loserScore.hitCount,
    miss: loserScore.missCount,
    accuracy: loserScore.accuracy,
    score: loserScore.score,
    reason: "DISCONNECT_TIMEOUT",
  });

  await Promise.allSettled([
    submitScoreFromServer(
      getPlayerSession(room, winnerId),
      {
        score: winnerScore.score,
        result: "win",
      },
      roomCode,
    ),
    submitScoreFromServer(
      getPlayerSession(room, loserId),
      {
        score: loserScore.score,
        result: "loss",
      },
      roomCode,
    ),
  ]);

  io.to(roomCode).emit("gameOver", {
    winner: winnerId,
    reason: "OPPONENT_DISCONNECTED",
    scores: {
      [winnerId]: winnerScore,
      [loserId]: loserScore,
    },
  });

  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
    delete roomIntervals[roomCode];
  }

  clearPlayerDisconnectTimer(roomCode, room.host);
  clearPlayerDisconnectTimer(roomCode, room.guest);
  clearBothOfflineTimer(roomCode);

  await cleanRoom(roomCode);
}

// =====================================================
// ABANDON MATCH
// =====================================================
// Fungsi ini dipakai saat dua player sama-sama disconnect sampai timeout.
// Match dianggap invalid / abandoned.
// Tidak ada winner dan score tidak dikirim.
async function abandonMatch(roomCode) {
  let room = await getRoom(roomCode);
  if (!room) return;

  room = ensureDisconnectState(room);

  if (room.status === "FINISHED" || room.status === "ABANDONED") {
    return;
  }

  room.status = "ABANDONED";
  room.winner = null;
  room.finishReason = "BOTH_PLAYERS_DISCONNECTED";

  rooms[roomCode] = room;
  await saveRoom(roomCode, room);

  await saveExpiredMatchForPlayers(room, "BOTH_PLAYERS_DISCONNECTED");

  console.log("⚠️ MATCH ABANDONED:", roomCode);

  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
    delete roomIntervals[roomCode];
  }

  clearPlayerDisconnectTimer(roomCode, room.host);
  clearPlayerDisconnectTimer(roomCode, room.guest);
  clearBothOfflineTimer(roomCode);

  await cleanRoom(roomCode);
}

// =====================================================
// SINGLE PLAYER DISCONNECT TIMER
// =====================================================
// Timer ini aktif ketika hanya satu player disconnect.
// Jika player tidak reconnect sebelum PLAYER_RECONNECT_TIMEOUT,
// maka player tersebut kalah by forfeit.
function startPlayerDisconnectTimer(roomCode, sessionId) {
  const key = `${roomCode}:${sessionId}`;

  clearPlayerDisconnectTimer(roomCode, sessionId);

  disconnectTimers[key] = setTimeout(async () => {
    let room = await getRoom(roomCode);
    if (!room) return;

    room = ensureDisconnectState(room);

    if (room.status === "FINISHED" || room.status === "ABANDONED") {
      return;
    }

    const disconnectedCount = getDisconnectedCount(room);

    // Kalau dua-duanya offline, jangan langsung kasih menang siapa pun.
    // Biar bothOfflineTimer yang menentukan abandoned.
    if (disconnectedCount >= 2) {
      return;
    }

    // Kalau player ini masih offline sampai timeout, dia kalah.
    if (isPlayerDisconnected(room, sessionId)) {
      await finishByForfeit(roomCode, sessionId);
    }
  }, PLAYER_RECONNECT_TIMEOUT);
}

// =====================================================
// BOTH PLAYERS OFFLINE TIMER
// =====================================================
// Timer ini aktif ketika dua player sama-sama disconnect.
// Jika tidak ada player yang reconnect sebelum BOTH_OFFLINE_TIMEOUT,
// maka match dianggap abandoned.
function startBothOfflineTimer(roomCode) {
  clearBothOfflineTimer(roomCode);

  bothOfflineTimers[roomCode] = setTimeout(async () => {
    let room = await getRoom(roomCode);
    if (!room) return;

    room = ensureDisconnectState(room);

    if (room.status === "FINISHED" || room.status === "ABANDONED") {
      return;
    }

    const disconnectedCount = getDisconnectedCount(room);

    if (disconnectedCount >= 2) {
      await abandonMatch(roomCode);
    }
  }, BOTH_OFFLINE_TIMEOUT);
}

// =====================================================
// SUBMIT SCORE ENDPOINT
// =====================================================
// Endpoint ini menerima data score dari client game.
// Pada integrasi SISFO, endpoint submit score bisa berada di backend SISFO.
// Di server lokal, endpoint ini digunakan untuk testing pengiriman score.
app.post("/game-sessions/submit-score", async (req, res) => {
  console.log("🏆 SUBMIT SCORE:");
  console.log(req.body);

  // 🔥 HAPUS ROOM REDIS
  if (req.body.room_code) {
    await cleanRoom(req.body.room_code);
  }

  return res.json({
    success: true,
    message: "Score diterima",
  });
});

// =====================================================
// END SESSION ENDPOINT
// =====================================================
// Endpoint ini digunakan untuk menandai session selesai.
// Biasanya dipanggil ketika player keluar atau menutup game.
app.post("/game-sessions/end", (req, res) => {
  console.log("🛑 END SESSION:");
  console.log(req.body);

  return res.json({
    success: true,
    message: "Session selesai",
  });
});

// =====================================================
// SOCKET.IO CONNECTION HANDLER
// =====================================================
// Setiap player yang terhubung akan memiliki satu socket.
// Semua event realtime dari client diproses di dalam connection handler ini.
io.on("connection", async (socket) => {
  console.log("USER CONNECT:", socket.id);

  // =====================================================
  // AUTH PLAYER
  // =====================================================
  // Client mengirim data session setelah socket connect.
  // Server menyimpan data user berdasarkan socket.id agar event berikutnya
  // dapat dikenali sebagai milik player tertentu.
  socket.on("auth", async (data) => {
    if (!data.sessionId || !data.sessionToken) {
      console.log("❌ AUTH INVALID");

      return;
    }

    connectedUsers[socket.id] = {
      sessionId: data.sessionId,
      username: data.username,
      sessionToken: data.sessionToken,
      sessionId: data.sessionId,
      apiBaseUrl: data.apiBaseUrl,
      expiresAt: data.expiresAt,
      eventId: data.eventId,
      gameId: data.gameId,
    };

    console.log("🔥 SOCKET BERHASIL DIMAPPING");
    socket.emit("authSuccess");
    console.log(socket.id);

    console.log(connectedUsers[socket.id]);

    // =========================
    // RECONNECT CHECK
    // =========================
    console.log("🔥 AUTH MASUK:");
    console.log(data);

    // Mengecek apakah player ini sebelumnya kalah karena disconnect timeout.
    // Jika ada data matchResult, server mengirim lateGameResult agar client masuk Result kalah.
    const lateResultData = await pubClient.get(`matchResult:${data.sessionId}`);

    if (lateResultData) {
      const lateResult = JSON.parse(lateResultData);

      socket.emit("lateGameResult", lateResult);

      await pubClient.del(`matchResult:${data.sessionId}`);

      return;
    }

    // Mengecek apakah match sebelumnya expired karena dua player sama-sama disconnect.
    // Jika ada data matchExpired, client diarahkan ke MainMenu dengan notifikasi match expired.
    const expiredData = await pubClient.get(`matchExpired:${data.sessionId}`);

    if (expiredData) {
      const expiredMatch = JSON.parse(expiredData);

      socket.emit("matchExpired", expiredMatch);

      await pubClient.del(`matchExpired:${data.sessionId}`);

      return;
    }

    // Jika tidak ada late result atau expired match,
    // server mengecek apakah player ini sedang reconnect ke room aktif.
    for (const code in rooms) {
      let room = await getRoom(code);
      if (!room) continue;

      room = ensureDisconnectState(room);

      const disconnectedData = room.disconnectedPlayers[data.sessionId];

      if (!disconnectedData) {
        continue;
      }

      console.log("✅ RECONNECT BERHASIL:", code, data.sessionId);

      socket.join(code);

      const socketField = getPlayerSocketField(room, data.sessionId);

      if (socketField) {
        room[socketField] = socket.id;
      }

      delete room.disconnectedPlayers[data.sessionId];

      clearPlayerDisconnectTimer(code, data.sessionId);

      const disconnectedCount = getDisconnectedCount(room);

      if (disconnectedCount === 0) {
        // Semua player sudah online lagi
        clearBothOfflineTimer(code);
        room.status = "IN_PROGRESS";
        room.bothOfflineAt = null;
      } else {
        // Player ini reconnect, tapi lawan masih offline
        room.status = "ONE_OFFLINE";

        clearBothOfflineTimer(code);

        const opponentId = getOpponentId(room, data.sessionId);

        // Yang reconnect duluan belum langsung menang.
        // Lawannya dikasih timeout normal.
        if (opponentId && isPlayerDisconnected(room, opponentId)) {
          startPlayerDisconnectTimer(code, opponentId);
        }
      }

      rooms[code] = room;
      await saveRoom(code, room);

      socket.emit("reconnectSuccess", {
        roomCode: code,
        room,
      });

      io.to(code).emit("playerReconnected", {
        player: data.sessionId,
        status: room.status,
      });

      break;
    }
  });

  // =====================================================
  // CREATE ROOM
  // =====================================================
  // Membuat room private menggunakan kode room.
  // Player pembuat room akan menjadi host.
  socket.on("createRoom", async () => {
    const roomCount = Object.keys(rooms).length;

    if (roomCount > 200) {
      socket.emit("error", "Server penuh");
      return;
    }
    if (!GAME_CONFIG) {
      console.log("❌ CONFIG BELUM MASUK!");
      socket.emit("error", "Config belum siap");
      return;
    }
    const code = generateRoomCode();

    const newRoom = {
      code,
      host: connectedUsers[socket.id].sessionId,
      guest: null,
      hostSocket: socket.id,
      guestSocket: null,
      playersReady: 0,
      ships: {},
      hits: {},
      scores: {},
      currentTurn: null,
      hasAttacked: false,
      timeLeft: GAME_CONFIG ? GAME_CONFIG.turn_time : 15,
      createdAt: Date.now(),
      disconnectedPlayers: {},
      bothOfflineAt: null,
      status: "IN_PROGRESS",
      phase: "waiting",
    };

    rooms[code] = newRoom;
    socket.join(code);
    await saveRoom(code, newRoom);
    socket.emit("roomCreated", code);
  });

  // =====================================================
  // JOIN ROOM
  // =====================================================
  // Guest masuk ke room private menggunakan kode room.
  // Jika room valid dan belum penuh, kedua player diarahkan ke fase placement.
  socket.on("joinRoom", async (code) => {
    let room = await getRoom(code);

    if (!room) {
      socket.emit("roomNotFound");
      return;
    }

    if (room.guest) {
      socket.emit("roomFull");
      return;
    }

    room.guest = connectedUsers[socket.id].sessionId;
    room.guestSocket = socket.id;
    await saveRoom(code, room);
    rooms[code] = room; // biar logic lama tetap jalan
    socket.join(code);

    socket.emit("roomJoined", code);
    io.to(room.hostSocket).emit("playerJoined", code);

    setTimeout(() => {
      io.to(code).emit("goToPlacement", {
        roomCode: code,
        timeLeft: GAME_CONFIG.placement_time,
      });

      startPlacementTimer(code);
    }, 500);
  });

  // =====================================================
  // FIND MATCH / RANDOM MATCHMAKING
  // =====================================================
  // Player masuk ke queue matchmaking.
  // Jika ada dua player dalam queue, server membuat room otomatis.
  socket.on("findMatch", () => {
    if (!connectedUsers[socket.id]) {
      console.log("❌ SOCKET BELUM AUTH");
      return;
    }
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (matchmakingQueue[i].id === socket.id) {
        matchmakingQueue.splice(i, 1);
      }
    }

    if (playersInQueue.has(socket.id)) {
      console.log("⚠️ SUDAH DI QUEUE");
      return;
    }

    playersInQueue.add(socket.id);
    matchmakingQueue.push(socket);

    console.log("QUEUE:", matchmakingQueue.length);

    tryMatch();
  });

  // =====================================================
  // TRY MATCH
  // =====================================================
  // Mengambil dua player dari matchmakingQueue dan memasangkannya ke room baru.
  async function tryMatch() {
    if (!GAME_CONFIG) {
      console.log("❌ CONFIG BELUM MASUK (MATCH)");
      return;
    }
    while (matchmakingQueue.length >= 2) {
      const p1 = matchmakingQueue.shift();
      const p2 = matchmakingQueue.shift();

      if (!p1 || !p2) return;
      if (p1.id === p2.id) continue;

      playersInQueue.delete(p1.id);
      playersInQueue.delete(p2.id);

      const code = generateRoomCode();

      rooms[code] = {
        code,
        host: connectedUsers[p1.id].sessionId,
        guest: connectedUsers[p2.id].sessionId,

        hostSocket: p1.id,
        guestSocket: p2.id,
        playersReady: 0,
        ships: {},
        hits: {},
        scores: {},
        currentTurn: null,
        hasAttacked: false,
        timeLeft: GAME_CONFIG ? GAME_CONFIG.turn_time : 15,
        createdAt: Date.now(),
        disconnectedPlayers: {},
        bothOfflineAt: null,
        status: "IN_PROGRESS",
        phase: "waiting", // 🔥 TAMBAHAN
      };

      await saveRoom(code, rooms[code]);

      p1.join(code);
      p2.join(code);

      io.to(code).emit("matchFound", code);

      setTimeout(() => {
        io.to(code).emit("goToPlacement", {
          roomCode: code,
          timeLeft: GAME_CONFIG.placement_time,
        });

        startPlacementTimer(code);
      }, 500);
    }
  }

  // =====================================================
  // CANCEL MATCH
  // =====================================================
  // Menghapus player dari queue matchmaking dan mengeluarkannya dari room sementara.
  socket.on("cancelMatch", () => {
    for (const r of socket.rooms) {
      if (r !== socket.id) {
        socket.leave(r);
      }
    }
    playersInQueue.delete(socket.id);

    const index = matchmakingQueue.findIndex((s) => s.id === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }

    console.log("❌ CANCEL MATCH:", socket.id);
  });

  // =====================================================
  // PLAYER READY / SAVE SHIPS
  // =====================================================
  // Client mengirim posisi kapal setelah fase placement.
  // Jika dua player sudah ready, server memulai battle.
  socket.on("playerReady", async ({ roomCode, ships }) => {
    if (!connectedUsers[socket.id]) {
      console.log("❌ SOCKET BELUM AUTH");
      return;
    }
    let room = rooms[roomCode];
    if (!room) return;

    if (!Array.isArray(ships)) return;

    for (const ship of ships) {
      if (typeof ship.x !== "number" || typeof ship.y !== "number" || ship.x < 0 || ship.y < 0 || ship.x >= 8 || ship.y >= 6) {
        return;
      }
    }

    const sessionId = connectedUsers[socket.id].sessionId;

    room.ships[sessionId] = ships;
    if (!room.readyPlayers) room.readyPlayers = [];

    if (!room.readyPlayers.includes(sessionId)) {
      room.readyPlayers.push(sessionId);
      room.playersReady++;
    }

    console.log("READY:", room.playersReady);

    if (room.playersReady >= 2) {
      rooms[roomCode] = room;

      await saveRoom(roomCode, room);

      await forceStartBattle(roomCode);

      return;
    }
    await saveRoom(roomCode, room);
  });

  // =====================================================
  // ATTACK HANDLER
  // =====================================================
  // Server memproses serangan player secara authoritative.
  socket.on("attack", async ({ roomCode, x, y, width, height }) => {
    if (!connectedUsers[socket.id]) {
      console.log("❌ SOCKET BELUM AUTH");
      return;
    }
    let room = rooms[roomCode];
    if (!room) return;

    if (room.lock) return;
    room.lock = true;

    await saveRoom(roomCode, room);
    try {
      const player = connectedUsers[socket.id].sessionId;
      if (room.currentTurn !== player) {
        room.hasAttacked = false;
        return;
      }

      if (room.hasAttacked) {
        room.hasAttacked = false;
        return;
      }

      if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number") {
        console.log("❌ INVALID DATA");
        room.hasAttacked = false;
        return;
      }
      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          const tx = x + dx;
          const ty = y + dy;

          if (tx < 0 || tx >= 8 || ty < 0 || ty >= 6) {
            console.log("❌ OUT OF GRID");

            room.hasAttacked = false;

            socket.emit("attackInvalid", {
              reason: "OUT_OF_GRID",
            });

            return;
          }
        }
      }
      if (!room.scores[player]) {
        room.scores[player] = {
          totalAttack: 0,
          hitCount: 0,
          missCount: 0,
        };
      }

      room.hasAttacked = true;

      const enemy = player === room.host ? room.guest : room.host;
      const enemyShips = room.ships[enemy];

      if (!enemyShips) {
        console.log("❌ ENEMY SHIPS NULL");
        room.hasAttacked = false;
        return;
      }
      if (!room.hits) room.hits = {};
      if (!room.hits[enemy]) room.hits[enemy] = [];

      if (!room.attackedCells) room.attackedCells = {};
      if (!room.attackedCells[enemy]) room.attackedCells[enemy] = [];
      let allBlocked = true;

      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          const key = `${x + dx},${y + dy}`;

          if (!room.attackedCells[enemy].includes(key)) {
            allBlocked = false;
          }
        }
      }

      if (allBlocked) {
        console.log("❌ AREA SUDAH DISERANG");

        room.hasAttacked = false;

        socket.emit("attackInvalid", {
          reason: "ALREADY_ATTACKED",
        });

        return;
      }
      const results = [];

      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          const tx = x + dx;
          const ty = y + dy;

          const key = `${tx},${ty}`;
          if (room.attackedCells[enemy].includes(key)) {
            room.scores[player].missCount++;
            room.scores[player].totalAttack++;
            continue;
          }

          if (!room.attackedCells[enemy].includes(key)) {
            room.attackedCells[enemy].push(key);
          }

          let hit = false;

          for (const ship of enemyShips) {
            const w = ship.vertical ? ship.height : ship.width;
            const h = ship.vertical ? ship.width : ship.height;

            for (let i = 0; i < w; i++) {
              for (let j = 0; j < h; j++) {
                const sx = ship.x + i;
                const sy = ship.y + j;

                if (sx === tx && sy === ty) {
                  hit = true;
                  break;
                }
              }
              if (hit) break;
            }
          }

          if (hit) {
            if (!room.hits[enemy].includes(key)) {
              room.hits[enemy].push(key);

              // 🔥 SIMPAN KE REDIS
              await saveRoom(roomCode, room);
            }
            room.scores[player].hitCount++;
          } else {
            room.scores[player].missCount++;
          }

          room.scores[player].totalAttack++;

          results.push({ x: tx, y: ty, hit });
        }
      }
      function countShipCells(ships) {
        let total = 0;

        for (const ship of ships) {
          const w = ship.vertical ? ship.height : ship.width;
          const h = ship.vertical ? ship.width : ship.height;
          total += w * h;
        }

        return total;
      }

      const enemyDestroyed = isAllShipsDestroyed(enemyShips, room.hits[enemy]);

      io.to(roomCode).emit("attackResult", {
        cells: results,
        attackerId: player,
      });
      if (enemyDestroyed) {
        if (roomIntervals[roomCode]) {
          clearInterval(roomIntervals[roomCode]);
          delete roomIntervals[roomCode];
        }

        setTimeout(async () => {
          let latestRoom = rooms[roomCode];
          if (!latestRoom) return;

          io.to(roomCode).emit("gameOver", {
            winner: player,
            scores: {
              [latestRoom.host]: buildScore(latestRoom, latestRoom.host, latestRoom.host === player),
              [latestRoom.guest]: buildScore(latestRoom, latestRoom.guest, latestRoom.guest === player),
            },
          });

          await cleanRoom(roomCode);
        }, 2000);

        return;
      }

      const nextTurn = player === room.host ? room.guest : room.host;

      setTimeout(async () => {
        let latestRoom = rooms[roomCode];

        if (!latestRoom) return;

        // 🔥 LANGSUNG GANTI TURN
        latestRoom.currentTurn = nextTurn;

        // 🔥 RESET TIMER
        latestRoom.timeLeft = GAME_CONFIG.turn_time;

        // 🔥 BOLEH SERANG LAGI
        latestRoom.hasAttacked = false;

        rooms[roomCode] = latestRoom;

        await saveRoom(roomCode, latestRoom);

        io.to(roomCode).emit("game_tick", {
          timeLeft: latestRoom.timeLeft,
          currentTurn: latestRoom.currentTurn,
        });

        console.log("🔄 TURN PINDAH:", nextTurn);
      }, 2000);
    } catch (err) {
      console.error("🔥 ERROR ATTACK:", err);
    } finally {
      try {
        let latestRoom = rooms[roomCode];

        if (latestRoom) {
          latestRoom.lock = false;
          await saveRoom(roomCode, latestRoom);
          rooms[roomCode] = latestRoom;
        } else {
          // 🔥 fallback: unlock pakai data lama
          room.lock = false;
          await saveRoom(roomCode, room);
        }
      } catch (e) {
        console.error("❌ ERROR SAVE FINAL:", e);
      }
    }
  });

  // =====================================================
  // DISCONNECT HANDLER
  // =====================================================
  // Handler ini menangani player yang putus koneksi.
  // Jika hanya satu player disconnect, server memberi waktu reconnect.
  // Jika dua player disconnect, server menunggu lebih lama sebelum match abandoned.
  socket.on("disconnect", async () => {
    console.log("❌ DISCONNECT:", socket.id);

    playersInQueue.delete(socket.id);

    const index = matchmakingQueue.findIndex((s) => s.id === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }

    const user = connectedUsers[socket.id];

    if (!user) {
      return;
    }

    const sessionId = user.sessionId;

    for (const code in rooms) {
      let room = await getRoom(code);
      if (!room) continue;

      room = ensureDisconnectState(room);

      if (room.host !== sessionId && room.guest !== sessionId) {
        continue;
      }

      if (room.status === "FINISHED" || room.status === "ABANDONED") {
        continue;
      }

      if (!room.sessions) room.sessions = {};

      room.sessions[sessionId] = buildSessionFromUser(user);

      room.disconnectedPlayers[sessionId] = {
        oldSocketId: socket.id,
        sessionId,
        disconnectedAt: Date.now(),
      };

      const disconnectedCount = getDisconnectedCount(room);

      if (disconnectedCount >= 2) {
        room.status = "BOTH_OFFLINE";
        room.bothOfflineAt = Date.now();

        console.log("⚠️ DUA PLAYER DISCONNECT:", code);

        clearPlayerDisconnectTimer(code, room.host);
        clearPlayerDisconnectTimer(code, room.guest);

        startBothOfflineTimer(code);
      } else {
        room.status = "ONE_OFFLINE";

        console.log("⚠️ SATU PLAYER DISCONNECT:", sessionId);

        startPlayerDisconnectTimer(code, sessionId);
      }

      rooms[code] = room;
      await saveRoom(code, room);

      io.to(code).emit("playerDisconnected", {
        sessionId,
        status: room.status,
      });

      break;
    }

    delete connectedUsers[socket.id];
  });

  // =====================================================
  // SYNC CONFIG
  // =====================================================
  // Client mengirim config gameplay ke server.
  // Server menyimpan turn_time, placement_time, cooldown, dan score rule ke GAME_CONFIG.
  socket.on("syncConfig", (config) => {
    console.log("🔥 CONFIG MASUK DARI CLIENT:", config);

    if (!config) return;

    GAME_CONFIG = {
      turn_time: config.turn_time ?? 15,
      placement_time: config.placement_time ?? 30,

      ship_cooldowns: {
        spaceship1: config.cooldown_spaceship1 ?? 0,
        spaceship2: config.cooldown_spaceship2 ?? 3,
        spaceship3: config.cooldown_spaceship3 ?? 0,
        spaceship4: config.cooldown_spaceship4 ?? 2,
      },

      score: {
        hit: config.score_hit ?? 10,
        win_bonus: config.score_win_bonus ?? 50,
      },
    };

    console.log("✅ GAME_CONFIG FINAL:", GAME_CONFIG);

    io.emit("configSync", GAME_CONFIG);
  });
});

// =====================================================
// START SERVER
// =====================================================
// Fungsi ini menghubungkan Redis, memasang Redis adapter untuk Socket.IO,
// lalu menjalankan HTTP server pada port 3000.
async function startServer() {
  try {
    await pubClient.connect();
    await subClient.connect();

    console.log("✅ Redis connected");

    io.adapter(createAdapter(pubClient, subClient));

    server.listen(3000, () => {
      console.log("🚀 SERVER RUNNING ON 3000");
    });
  } catch (err) {
    console.error("❌ Redis error:", err);
  }
}

startServer();
