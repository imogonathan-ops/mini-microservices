import { io, type Socket } from "socket.io-client";
import { normalizeMeasurement } from "./normalizers";
import type { Measurement } from "../types/domain";

export type RealtimeConnection = { disconnect: () => void };
export function connectMeasurements(
  onMeasurement: (m: Measurement) => void,
  onStatus: (status: "connected" | "disconnected") => void,
): RealtimeConnection {
  const url = import.meta.env.VITE_SOCKET_URL?.trim() || window.location.origin;
  const eventName = import.meta.env.VITE_SOCKET_EVENT?.trim() || "measurement";
  const socket: Socket = io(url, {
    autoConnect: true,
    reconnection: true,
    timeout: 6000,
  });
  socket.on("connect", () => onStatus("connected"));
  socket.on("disconnect", () => onStatus("disconnected"));
  socket.on("connect_error", () => onStatus("disconnected"));
  // Ne pas enregistrer cet événement à l'intérieur de « connect » (doublons en reconnexion).
  socket.on(
    eventName,
    (payload: unknown) => onMeasurement(normalizeMeasurement(payload)),
  );
  return {
    disconnect: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
