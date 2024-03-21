import ProDjLink from "./pro-dj-link.js";
import WebsocketServer from "./websocket-server.js";
import dgram from "dgram";

const proDjLink = new ProDjLink(
  "192.168.112.173",
  "00:e0:4c:65:3b:75",
  "macbook"
);
const websocketServer = new WebsocketServer(8080);

// Create a UDP socket
const udpSocket = dgram.createSocket("udp4");

// Listen for UDP messages
udpSocket.on("message", (message, rinfo) => {
  console.log(message);
});

// Start listening on UDP port 50002
udpSocket.bind(50002);

// Make ourself discoverable by sending
// keep alive packets every 2 seconds.
setInterval(() => {
  proDjLink.sendKeepAlive();
}, 2000);
