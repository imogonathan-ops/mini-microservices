const { Server } = require("socket.io");
const Redis = require("ioredis");

const io = new Server(3003, { cors: { origin: "*" } });
const sub = new Redis(process.env.REDIS_URL);

sub.subscribe("mesures");
sub.on("message", (_, msg) => io.emit("mesure", JSON.parse(msg)));
