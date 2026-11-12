const mqtt = require("mqtt");
const client = mqtt.connect(process.env.MQTT_URL);

const capteurs = ["salle-A", "salle-B", "serveur"];
const rand = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);

client.on("connect", () => {
    setInterval(() => {
        for (const id of capteurs) {
            client.publish(
                `capteurs/${id}/mesures`,
                JSON.stringify({
                    temperature: rand(18, 32),
                    humidite: rand(30, 70),
                    pression: rand(990, 1030),
                }),
            );
        }
    }, 2000);
});

client.on("error", (err) => console.error(err));