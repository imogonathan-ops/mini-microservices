const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBIT_URL || "amqp://localhost";

async function publier(commande) {
  const conn = await amqp.connect(RABBIT_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue("commandes", { durable: true });
  ch.sendToQueue("commandes", Buffer.from(JSON.stringify(commande)), {
    persistent: true,
  });
  await ch.close();
  await conn.close();
}

module.exports = { publier };