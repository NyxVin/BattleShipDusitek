import express from "express";
import http from "http";
import { Server } from "socket.io";
import { generateRoomCode, rooms } from "./roomManager.js";

const matchmakingQueue = [];
const playersInQueue = new Set();
let GAME_CONFIG = null;
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const roomIntervals = {};
const disconnectTimers = {};
const ROOM_IDLE_EXPIRE = 20000;

setInterval(() => {
  const now = Date.now();

  for (const code in rooms) {
    const room = rooms[code];
    if (!room || !room.createdAt) continue;

    const roomSize = io.sockets.adapter.rooms.get(code)?.size || 0;

    if (roomSize === 0) {
      console.log("🧹 ROOM KOSONG, HAPUS:", code);
      cleanRoom(code);
    }
  }
}, 10000);

function cleanRoom(code) {
  const room = rooms[code];
  if (!room) return;

  console.log("🧹 CLEAN ROOM:", code);

  if (roomIntervals[code]) {
    clearInterval(roomIntervals[code]);
    delete roomIntervals[code];
  }

  if (room.placementInterval) {
    clearInterval(room.placementInterval);
    room.placementInterval = null;
  }

  if (room.host && disconnectTimers[room.host]) {
    clearTimeout(disconnectTimers[room.host]);
    delete disconnectTimers[room.host];
  }

  if (room.guest && disconnectTimers[room.guest]) {
    clearTimeout(disconnectTimers[room.guest]);
    delete disconnectTimers[room.guest];
  }

  delete rooms[code];
}

function startGameLoop(roomCode) {
  if (!GAME_CONFIG) {
    console.log("❌ CONFIG BELUM MASUK!");
    return;
  }

  const room = rooms[roomCode];
  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
  }
  room.timeLeft = GAME_CONFIG.turn_time;
  room.currentTurn = room.host;

  io.to(roomCode).emit("game_tick", {
    timeLeft: room.timeLeft,
    currentTurn: room.currentTurn,
  });

  roomIntervals[roomCode] = setInterval(() => {
    room.timeLeft--;

    if (room.timeLeft <= 0) {
      room.timeLeft = GAME_CONFIG.turn_time;

      const nextTurn = room.currentTurn === room.host ? room.guest : room.host;
      room.currentTurn = nextTurn;

      room.hasAttacked = false;
    }

    io.to(roomCode).emit("game_tick", {
      timeLeft: room.timeLeft,
      currentTurn: room.currentTurn,
    });
  }, 1000);
}

function startPlacementTimer(roomCode) {
  if (!GAME_CONFIG) {
    console.log("❌ CONFIG BELUM MASUK (placement)!");
    return;
  }
  const room = rooms[roomCode];
  if (!room) return;

  const duration = GAME_CONFIG.placement_time;

  room.placementTimeLeft = duration;

  room.placementInterval = setInterval(() => {
    const currentRoom = rooms[roomCode];
    if (!currentRoom) {
      clearInterval(room.placementInterval);
      return;
    }

    currentRoom.placementTimeLeft--;

    io.to(roomCode).emit("placementTick", {
      timeLeft: currentRoom.placementTimeLeft,
    });

    if (currentRoom.placementTimeLeft <= 0) {
      clearInterval(currentRoom.placementInterval);
      currentRoom.placementInterval = null;

      console.log("⏰ TIMER HABIS");

      currentRoom.phase = "battle"; // 🔥 TAMBAHAN WAJIB

      io.to(roomCode).emit("startGame", {
        roomCode,
        ships: currentRoom.ships,
      });

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

        if (!hits.has(key)) {
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

  let score = s.hitCount * GAME_CONFIG.gameplay.score.hit;

  if (isWinner) {
    score += GAME_CONFIG.gameplay.score.win_bonus;
  }

  return {
    totalAttack: s.totalAttack,
    hitCount: s.hitCount,
    missCount: s.missCount,
    accuracy,
    score,
  };
}

io.on("connection", (socket) => {
  console.log("USER CONNECT:", socket.id);
  for (const code in rooms) {
    const room = rooms[code];
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
  socket.on("createRoom", () => {
    if (!GAME_CONFIG) {
      console.log("❌ CONFIG BELUM MASUK!");
      socket.emit("error", "Config belum siap");
      return;
    }
    const code = generateRoomCode();

    rooms[code] = {
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

      phase: "waiting", // 🔥 TAMBAHAN
    };

    socket.join(code);
    socket.emit("roomCreated", code);

    console.log("ROOM CREATED:", code);
  });

  socket.on("joinRoom", (code) => {
    const room = rooms[code];

    if (!room) {
      socket.emit("roomNotFound");
      return;
    }

    if (room.guest) {
      socket.emit("roomFull");
      return;
    }

    room.guest = socket.id;
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

  function tryMatch() {
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
  socket.on("playerReady", ({ roomCode, ships }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.ships[socket.id] = ships;
    if (!room.readyPlayers) room.readyPlayers = new Set();

    if (!room.readyPlayers.has(socket.id)) {
      room.readyPlayers.add(socket.id);
      room.playersReady++;
    }

    console.log("READY:", room.playersReady);

    if (room.playersReady === 2) {
      // 🔥 1. MATIKAN TIMER PLACEMENT
      if (room.placementInterval) {
        clearInterval(room.placementInterval);
        room.placementInterval = null;
      }

      // 🔥 2. SET PHASE
      room.phase = "battle";

      // 🔥 3. START GAME
      io.to(roomCode).emit("startGame", {
        roomCode,
        ships: room.ships,
      });

      startGameLoop(roomCode);
    }
  });

  socket.on("attack", ({ roomCode, x, y, width, height }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (room.lock) return;
    room.lock = true;

    try {
      const player = socket.id;
      if (room.currentTurn !== player) {
        room.hasAttacked = false;
        return;
      }

      if (room.hasAttacked) {
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
      if (!room.hits[enemy]) room.hits[enemy] = new Set();

      if (!room.attackedCells) room.attackedCells = {};
      if (!room.attackedCells[enemy]) room.attackedCells[enemy] = new Set();
      let allBlocked = true;

      for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
          const key = `${x + dx},${y + dy}`;
          if (!room.attackedCells[enemy].has(key)) {
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
          if (room.attackedCells[enemy].has(key)) {
            room.scores[player].missCount++;
            room.scores[player].totalAttack++;
            continue;
          }

          room.attackedCells[enemy].add(key);

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
            room.hits[enemy].add(key);
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

      const totalCells = countShipCells(enemyShips);
      const hitCount = room.hits[enemy].size;

      const enemyDestroyed = hitCount >= totalCells;
      socket.emit("attackResult", {
        cells: results,
        target: "enemy",
        attackerId: player,
      });

      io.to(enemy).emit("attackResult", {
        cells: results,
        target: "self",
        attackerId: player,
      });
      if (enemyDestroyed) {
        if (roomIntervals[roomCode]) {
          clearInterval(roomIntervals[roomCode]);
          delete roomIntervals[roomCode];
        }

        setTimeout(() => {
          io.to(roomCode).emit("gameOver", {
            winner: player,
            scores: {
              [room.host]: buildScore(room, room.host, room.host === player),
              [room.guest]: buildScore(room, room.guest, room.guest === player),
            },
          });

          if (roomIntervals[roomCode]) {
            clearInterval(roomIntervals[roomCode]);
            delete roomIntervals[roomCode];
          }

          cleanRoom(roomCode);
        }, 2000);

        return;
      }
      const nextTurn = player === room.host ? room.guest : room.host;

      setTimeout(() => {
        room.hasAttacked = false;
        room.currentTurn = nextTurn;
        room.timeLeft = GAME_CONFIG.turn_time;

        io.to(roomCode).emit("game_tick", {
          timeLeft: room.timeLeft,
          currentTurn: room.currentTurn,
        });
      }, 2000);
    } catch (err) {
      console.error("🔥 ERROR ATTACK:", err);
    } finally {
      room.lock = false;
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ DISCONNECT:", socket.id);
    playersInQueue.delete(socket.id);

    const index = matchmakingQueue.findIndex((s) => s.id === socket.id);
    if (index !== -1) {
      matchmakingQueue.splice(index, 1);
    }
    for (const code in rooms) {
      const room = rooms[code];

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
server.listen(3000, () => {
  console.log("🚀 SERVER RUNNING ON 3000");
});
