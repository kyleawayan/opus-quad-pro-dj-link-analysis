import WebSocket, { WebSocketServer } from "ws";

class WebsocketServer {
  constructor(port) {
    this.port = port;
    this.server = new WebSocketServer({ port: this.port });
    this.clients = new Set();

    this.server.on("connection", (ws) => {
      this.clients.add(ws);

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });

    console.log(`WebSocket server created on port ${this.port}`);
  }

  broadcastBinary(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    for (let ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buffer);
      }
    }
  }
}

export default WebsocketServer;
