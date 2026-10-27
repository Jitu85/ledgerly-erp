import { QueueEvents } from "bullmq";
import { queueNames } from "./queue-names";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required");
const parsed = new URL(redisUrl);
const connection = {
  host: parsed.hostname,
  port: Number(parsed.port || "6379"),
  ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
  ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
};
const events = Object.values(queueNames).map((name) => new QueueEvents(name, { connection }));
console.log(
  JSON.stringify({
    level: "info",
    message: "worker foundation ready",
    queues: Object.values(queueNames),
  }),
);

async function shutdown(): Promise<void> {
  await Promise.all(events.map((event) => event.close()));
}
process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
