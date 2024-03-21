import ProDjLink from "./pro-dj-link.js";
import WebsocketServer from "./websocket-server.js";

const proDjLink = new ProDjLink(
  "192.168.112.173",
  "00:e0:4c:65:3b:75",
  "macbook"
);

const websocketServer = new WebsocketServer(8080);

// Listen for UDP messages
proDjLink.statusesUdpSocket.on("message", (message, rinfo) => {
  if (!proDjLink.opusIp) {
    const firstAddressRequest = rinfo.address;
    proDjLink.opusIp = firstAddressRequest;
    console.log("Opus IP set:", firstAddressRequest);
    proDjLink.sendCdj();

    // Start sending out mixer status every 0.1 seconds
    setInterval(() => {
      proDjLink.sendRekordboxMixerStatusPacket();
    }, 100);
  }

  const packetType = ProDjLink.getProDjLinkPacketType(message);

  if (packetType == 10) {
    // CDJ Status Packet
    proDjLink.scanForNeededBytesForMixerStatus(message);

    // Relay to all connected WebSocket clients
    websocketServer.broadcastBinary(message);
  }
});

proDjLink.announceUdpSocket.bind(50000);
proDjLink.statusesUdpSocket.bind(50002);

// Make ourself discoverable by sending
// keep alive packets every 2 seconds.
setInterval(() => {
  proDjLink.sendKeepAlive();
}, 2000);
