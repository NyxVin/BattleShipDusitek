import express from "express";
import http from "http";
import { Server } from "socket.io";
import { generateRoomCode, rooms } from "./roomManager.js";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

const matchmakingQueue = [];
const playersInQueue = new Set();
let GAME_CONFIG = null;
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const pubClient = createClient({
  url: "redis://127.0.0.1:6379",
});

const subClient = pubClient.duplicate();

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

const roomIntervals = {};
const disconnectTimers = {};
const ROOM_IDLE_EXPIRE = 20000;

setInterval(async () => {
  for (const code in rooms) {
    let room = await getRoom(code);
    if (!room || !room.createdAt) continue;

    const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;
    const now = Date.now();

    if (roomSize === 0 && now - room.createdAt > 10000 && room.phase !== "waiting") {
      console.log("🧹 ROOM DIHAPUS:", code);
      await cleanRoom(code);
    }
  }
}, 10000);

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

async function startGameLoop(roomCode) {
  if (!GAME_CONFIG) return;

  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
  }

  roomIntervals[roomCode] = setInterval(async () => {
    let room = await getRoom(roomCode);
    if (!room) return;

    room.timeLeft--;

    if (room.timeLeft <= 0) {
      room.timeLeft = GAME_CONFIG.turn_time;

      const nextTurn = room.currentTurn === room.host ? room.guest : room.host;

      room.currentTurn = nextTurn;
      room.hasAttacked = false;
    }

    await saveRoom(roomCode, room);

    io.to(roomCode).emit("game_tick", {
      timeLeft: room.timeLeft,
      currentTurn: room.currentTurn,
    });
  }, 1000);
}

async function startPlacementTimer(roomCode) {
  if (!GAME_CONFIG) {
    console.log("❌ CONFIG BELUM MASUK (placement)!");
    return;
  }
  let room = await getRoom(roomCode);
  if (!room) return;

  const duration = GAME_CONFIG.placement_time;

  room.placementTimeLeft = duration;
  await saveRoom(roomCode, room); // 🔥 TAMBAHAN WAJIB

  roomIntervals[roomCode] = setInterval(async () => {
    let currentRoom = await getRoom(roomCode);
    if (!currentRoom) {
      clearInterval(roomIntervals[roomCode]);
      delete roomIntervals[roomCode];
      return;
    }

    currentRoom.placementTimeLeft--;

    io.to(roomCode).emit("placementTick", {
      timeLeft: currentRoom.placementTimeLeft,
    });

    if (currentRoom.placementTimeLeft <= 0) {
      clearInterval(roomIntervals[roomCode]);
      delete roomIntervals[roomCode];

      console.log("⏰ TIMER HABIS");

      currentRoom.phase = "battle"; // 🔥 TAMBAHAN WAJIB

      io.to(roomCode).emit("startGame", {
        roomCode,
        ships: currentRoom.ships,
      });
      currentRoom.currentTurn = currentRoom.host;
      currentRoom.timeLeft = GAME_CONFIG.turn_time;

      await saveRoom(roomCode, currentRoom);
      startGameLoop(roomCode);
    }
  }, 1000);
}
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

io.on("connection", async (socket) => {
  console.log("USER CONNECT:", socket.id);
  for (const code in rooms) {
    let room = await getRoom(code);
    if (!room.disconnectPlayer) continue;
    if (room.disconnectPlayer.oldId !== socket.id) continue;

    console.log("✅ RECONNECT KE ROOM:", code);

    socket.join(code);
    room.disconnectPlayer = null;
    if (disconnectTimers[socket.id]) {
      clearTimeout(disconnectTimers[socket.id]);
      delete disconnectTimers[socket.id];
    }
    io.to(code).emit("playerReconnected", {
      player: socket.id,
    });

    break;
  }
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
      host: socket.id,
      guest: null,
      playersReady: 0,
      ships: {},
      hits: {},
      scores: {},
      currentTurn: null,
      hasAttacked: false,
      timeLeft: GAME_CONFIG ? GAME_CONFIG.turn_time : 15,
      createdAt: Date.now(),
      disconnectPlayer: null,
      phase: "waiting",
    };

    rooms[code] = newRoom;
    socket.join(code);
    await saveRoom(code, newRoom);
    socket.emit("roomCreated", code);
  });

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

    room.guest = socket.id;
    await saveRoom(code, room);
    rooms[code] = room; // biar logic lama tetap jalan
    socket.join(code);

    socket.emit("roomJoined", code);
    io.to(room.host).emit("playerJoined", code);

    setTimeout(() => {
      io.to(code).emit("goToPlacement", {
        roomCode: code,
        timeLeft: GAME_CONFIG.placement_time,
      });

      startPlacementTimer(code);
    }, 500);
  });

  socket.on("findMatch", () => {
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
        host: p1.id,
        guest: p2.id,
        playersReady: 0,
        ships: {},
        hits: {},
        scores: {},
        currentTurn: null,
        hasAttacked: false,
        timeLeft: GAME_CONFIG ? GAME_CONFIG.turn_time : 15,
        createdAt: Date.now(),
        disconnectPlayer: null,

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
  socket.on("playerReady", async ({ roomCode, ships }) => {
    let room = await getRoom(roomCode);
    if (!room) return;

    if (!Array.isArray(ships)) return;

    for (const ship of ships) {
      if (typeof ship.x !== "number" || typeof ship.y !== "number" || ship.x < 0 || ship.y < 0 || ship.x >= 8 || ship.y >= 6) {
        return;
      }
    }

    room.ships[socket.id] = ships;
    if (!room.readyPlayers) room.readyPlayers = [];

    if (!room.readyPlayers.includes(socket.id)) {
      room.readyPlayers.push(socket.id);
      room.playersReady++;
    }

    console.log("READY:", room.playersReady);

    if (room.playersReady === 2) {
      if (roomIntervals[roomCode]) {
        clearInterval(roomIntervals[roomCode]);
        delete roomIntervals[roomCode];
      }

      room.phase = "battle";

      // 🔥 TAMBAHAN 1 (WAJIB)
      room.currentTurn = room.host;
      room.timeLeft = GAME_CONFIG.turn_time;
      room.hasAttacked = false;

      await saveRoom(roomCode, room); // 🔥 WAJIB DISIMPAN

      io.to(roomCode).emit("startGame", {
        roomCode,
        ships: room.ships,
      });

      // 🔥 TAMBAHAN 2 (INI YANG NGILANG DI KODE KAMU)
      io.to(roomCode).emit("game_tick", {
        timeLeft: room.timeLeft,
        currentTurn: room.currentTurn,
      });

      startGameLoop(roomCode);
    }
    await saveRoom(roomCode, room);
  });

  socket.on("attack", async ({ roomCode, x, y, width, height }) => {
    let room = await getRoom(roomCode);
    if (!room) return;

    if (room.lock) return;
    room.lock = true;

    await saveRoom(roomCode, room);
    try {
      const player = socket.id;
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
          let latestRoom = await getRoom(roomCode);
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
        let latestRoom = await getRoom(roomCode);
        if (!latestRoom) return;

        latestRoom.hasAttacked = false;
        latestRoom.currentTurn = nextTurn;
        latestRoom.timeLeft = GAME_CONFIG.turn_time;

        await saveRoom(roomCode, latestRoom);

        io.to(roomCode).emit("game_tick", {
          timeLeft: latestRoom.timeLeft,
          currentTurn: latestRoom.currentTurn,
        });
      }, 2000);
    } catch (err) {
      console.error("🔥 ERROR ATTACK:", err);
    } finally {
      try {
        let latestRoom = await getRoom(roomCode);

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

  socket.on("disconnect", async () => {
    console.log("❌ DISCONNECT:", socket.id);
    playersInQueue.delete(socket.id);

    const index = matchmakingQueue.findIndex((s) => s.id === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }
    for (const code in rooms) {
      let room = await getRoom(code);

      if (room.host === socket.id || room.guest === socket.id) {
        console.log("⏳ WAIT 10 DETIK...");

        room.disconnectPlayer = {
          oldId: socket.id,
        };
        if (disconnectTimers[socket.id]) {
          clearTimeout(disconnectTimers[socket.id]);
        }
        disconnectTimers[socket.id] = setTimeout(() => {
          console.log("💀 AUTO LOSE");

          const winner = room.host === socket.id ? room.guest : room.host;

          if (!winner) return;

          const winnerScore = buildScore(room, winner, true);
          const loserScore = buildScore(room, socket.id, false);
          io.to(code).emit("gameOver", {
            winner,
            scores: {
              [winner]: winnerScore,
              [socket.id]: loserScore,
            },
          });
          if (roomIntervals[code]) {
            clearInterval(roomIntervals[code]);
            delete roomIntervals[code];
          }

          cleanRoom(code);
        }, 10000); // ⏱️ 10 DETIK
      }
    }
  });

  socket.on("syncConfig", (config) => {
    console.log("🔥 CONFIG MASUK DARI CLIENT:", config);

    if (!config) return;

    if (!config.score) {
      console.error("❌ SCORE TIDAK ADA DI CONFIG!");
    }

    GAME_CONFIG = {
      turn_time: config.gameplay?.turn_time ?? 15,
      placement_time: config.gameplay?.placement_time ?? 30,
      ship_cooldowns: config.gameplay?.ship_cooldowns ?? {},
      score: {
        hit: config.score?.hit ?? 10,
        win_bonus: config.score?.win_bonus ?? 50,
      },
    };

    console.log("✅ GAME_CONFIG FINAL:", GAME_CONFIG);

    io.emit("configSync", {
      gameplay: {
        turn_time: GAME_CONFIG.turn_time,
        placement_time: GAME_CONFIG.placement_time,
        ship_cooldowns: GAME_CONFIG.ship_cooldowns,
      },
      score: GAME_CONFIG.score,
    });
  });
});
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
