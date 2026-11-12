const mqtt = require("mqtt");
const { Pool } = require("pg");
const Redis = require("ioredis");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);
const client = mqtt.connect(process.env.MQTT_URL);

client.on("connect", () => client.subscribe("capteurs/+/mesures"));

client.on("message", async (topic, payload) => {
    const capteurId = topic.split("/")[1];
    const { temperature, humidite, pression } = JSON.parse(payload);

    await pool.query(
        "INSERT INTO mesures (time, capteur_id, temperature, humidite, pression) VALUES (NOW(), $1, $2, $3, $4)",
        [capteurId, temperature, humidite, pression],
    );

    const mesure = {
        capteurId,
        temperature,
        humidite,
        pression,
        time: new Date(),
    };
    await redis.set(`last:${capteurId}`, JSON.stringify(mesure));
    await redis.publish("mesures", JSON.stringify(mesure));
});
