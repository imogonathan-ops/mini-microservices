import amqp from "amqplib";

const conn = await amqp.connect(process.env.RABBIT_URL || "amqp://localhost");