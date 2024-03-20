const dgram = require("dgram");
const WebSocket = require("ws");

// Create a UDP socket
const udpSocket = dgram.createSocket("udp4");

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Listen for UDP messages
udpSocket.on("message", (message, rinfo) => {
  // Relay the UDP message to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

// Start listening on UDP port 50002
udpSocket.bind(50002);

// Handle WebSocket connections
wss.on("connection", (ws) => {
  // Handle incoming WebSocket messages
  ws.on("message", (message) => {
    // You can optionally handle incoming WebSocket messages here
  });

  // Handle WebSocket disconnections
  ws.on("close", () => {
    // You can optionally handle WebSocket disconnections here
  });
});
