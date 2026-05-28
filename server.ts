import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { redis } from "./src/lib/redis";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((request, response) => handle(request, response));
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ code, name, spectator }: { code: string; name: string; spectator?: boolean }) => {
      const roomCode = code.toUpperCase();
      socket.join(roomCode);
      await redis.hset(`room:${roomCode}:players`, socket.id, JSON.stringify({ name, spectator: Boolean(spectator), score: 0 }));
      const players = await redis.hvals(`room:${roomCode}:players`);
      io.to(roomCode).emit("room:players", players.map((player) => JSON.parse(player)));
    });

    socket.on("room:start", async ({ code }: { code: string }) => {
      const roomCode = code.toUpperCase();
      await redis.hset(`room:${roomCode}`, { status: "LIVE", currentQuestion: "0", startedAt: new Date().toISOString() });
      io.to(roomCode).emit("room:state", { status: "LIVE", currentQuestion: 0 });
    });

    socket.on("room:answer", async ({ code, answerIds, durationMs }: { code: string; answerIds: string[]; durationMs: number }) => {
      const roomCode = code.toUpperCase();
      await redis.rpush(`room:${roomCode}:answers`, JSON.stringify({ socketId: socket.id, answerIds, durationMs, at: Date.now() }));
      io.to(roomCode).emit("room:answer-count", await redis.llen(`room:${roomCode}:answers`));
    });

    socket.on("room:next", async ({ code, questionIndex }: { code: string; questionIndex: number }) => {
      const roomCode = code.toUpperCase();
      await redis.hset(`room:${roomCode}`, { currentQuestion: String(questionIndex) });
      io.to(roomCode).emit("room:state", { status: "LIVE", currentQuestion: questionIndex });
    });

    socket.on("disconnecting", async () => {
      for (const roomCode of socket.rooms) {
        if (roomCode === socket.id) continue;
        await redis.hdel(`room:${roomCode}:players`, socket.id);
        socket.to(roomCode).emit("room:player-left", { socketId: socket.id });
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`QuizForge ready on http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
