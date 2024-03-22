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

    // After 1 second, send Pro DJ Link Lighting packets
    setTimeout(() => {
      proDjLink.sendProDjLinkLightingPackets();
      console.log("Sent lighting packets");
    }, 1000);

    // After 1.3 seconds, request song metadata
    setTimeout(() => {
      proDjLink.requestSongMetadata(829, 9);
      console.log("Requested song metadata");
    }, 1300);
  }

  const packetType = ProDjLink.getProDjLinkPacketType(message);

  if (packetType == 10) {
    // CDJ Status Packet
    proDjLink.scanForNeededBytesForMixerStatus(message);

    // Relay to all connected WebSocket clients
    websocketServer.broadcastBinary(message);
  }

  if (packetType == 86) {
    // We got some metadata back!
    console.log("Got metadata packet:", message);
  }
});

proDjLink.announceUdpSocket.bind(50000);
proDjLink.statusesUdpSocket.bind(50002);

// Send initial packets
const startUpPacketsDelay = proDjLink.sendStartupPackets();

// Make ourself discoverable by sending
// keep alive packets every 2 seconds.
// (Only after the initial packets have been sent)
setTimeout(() => {
  setInterval(() => {
    proDjLink.sendKeepAlive();
  }, 2000);
}, startUpPacketsDelay);
