// src/App.jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:3003");
    socket.on(
      "mesure",
      (m) =>
        setData((
          d,
        ) => [...d.slice(-49), {
          ...m,
          heure: new Date(m.time).toLocaleTimeString(),
        }]),
    );
    return () => socket.disconnect();
  }, []);

  const last = data[data.length - 1];

  return (
    <div style={{ padding: 24 }}>
      <header
        style={{
          position: "relative",
          display: "flex",
          alignitems: "center",
          justifycontent: "center",
        }}
      >
        <div class="hero-content">
          <h1 id="hero-title" class="hero-title">Dashboard Environment</h1>
          <p id="hero-subtitle" class="hero-subtitle">
            Découvrez les jeux de cartes classiques guidés par Lumina
          </p>
        </div>
        <div class="hero-background">
          <div class="hero-card card-1"></div>
          <div class="hero-card card-2"></div>
          <div class="hero-card card-3"></div>
          <div class="hero-card card-4"></div>
        </div>
      </header>
      {last && (
        <div style={{ display: "flex", gap: 16, border: 2 }}>
          <div>🌡️ {last.temperature} °C</div>
          <div>💧 {last.humidite} %</div>
          <div>⏱️ {last.pression} hPa</div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="heure" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#e74c3c"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="humidite"
            stroke="#3498db"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
