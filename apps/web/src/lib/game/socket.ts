"use client";

import { io, type Socket } from "socket.io-client";
import type { GameMessage } from "shared";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";
export type ServerMessage = GameMessage | { type: "queueJoined"; data: { position: number; queueLength: number }; timestamp: number } | { type: "Error"; data: { message: string; code: string }; timestamp: number };

/**
 * Socket.IO connection to the game service (/ws on the same origin; the session cookie
 * authenticates the handshake). Every protocol message is one JSON string on "message".
 */
export class GameSocket {
  private socket: Socket;
  private listeners = new Set<(msg: ServerMessage) => void>();
  private statusListeners = new Set<(s: ConnectionStatus, error?: string) => void>();
  status: ConnectionStatus = "connecting";
  lastError?: string;
  /** Round-trip time of the last heartbeat, ms */
  pingMs?: number;
  private pingTimer?: ReturnType<typeof setInterval>;
  private startTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.socket = io({
      path: "/ws",
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      // connect on the next tick: React's dev double-mount closes the first instance before it
      // opens, so no socket is created (and closed while connecting) for nothing
      autoConnect: false,
    });
    this.startTimer = setTimeout(() => this.socket.connect(), 0);

    this.socket.on("connect", () => {
      this.setStatus("connected");
      // Register as a player; the server takes identity from the session cookie
      this.send({ type: "connection", data: { playerName: "", playerId: "", picture: "" }, timestamp: Date.now() });
    });
    this.socket.on("disconnect", (reason) => {
      // "io server disconnect" = the server closed us on purpose (auth, limits): don't retry
      this.setStatus(reason === "io server disconnect" || reason === "io client disconnect" ? "disconnected" : "reconnecting", reason);
    });
    this.socket.on("connect_error", (err) => {
      this.lastError = err.message;
      if (["UNAUTHORIZED", "TOO_MANY_CONNECTIONS", "RATE_LIMITED"].includes(err.message)) {
        this.socket.disconnect();
        this.setStatus("disconnected", err.message);
      } else {
        this.setStatus("reconnecting", err.message);
      }
    });
    this.socket.io.on("reconnect_failed", () => this.setStatus("disconnected", "RECONNECT_FAILED"));
    this.socket.on("message", (raw: string) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      this.listeners.forEach((l) => l(msg));
    });

    // Measure latency with an acknowledged emit (the server answers unknown events with nothing,
    // so time the Engine.IO heartbeat round trip via a volatile ping instead)
    this.pingTimer = setInterval(() => {
      const started = performance.now();
      this.socket.timeout(2000).emit("latency", () => {
        this.pingMs = Math.round(performance.now() - started);
      });
    }, 3000);
  }

  private setStatus(s: ConnectionStatus, error?: string) {
    this.status = s;
    if (error) this.lastError = error;
    this.statusListeners.forEach((l) => l(s, error));
  }

  send(msg: { type: string; data: unknown; timestamp?: number }) {
    if (!this.socket.connected) return false;
    this.socket.emit("message", JSON.stringify({ timestamp: Date.now(), ...msg }));
    return true;
  }

  onMessage(fn: (msg: ServerMessage) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: (s: ConnectionStatus, error?: string) => void) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  retry() {
    this.setStatus("connecting");
    this.socket.connect();
  }

  close() {
    clearTimeout(this.startTimer);
    clearInterval(this.pingTimer);
    this.listeners.clear();
    this.statusListeners.clear();
    this.socket.disconnect();
  }
}
