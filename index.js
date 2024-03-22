import ProDjLink from "./pro-dj-link.js";
import WebsocketServer from "./websocket-server.js";

// Parse command line arguments
const args = process.argv.slice(2);
const interfaceIp = args
  .find((arg) => arg.startsWith("--interfaceip"))
  .split("=")[1];
const mac = args.find((arg) => arg.startsWith("--mac")).split("=")[1];
const deviceName = args
  .find((arg) => arg.startsWith("--devicename"))
  .split("=")[1];

// Add optional WebSocket port argument
const wsPortArg = args.find((arg) => arg.startsWith("--wsport"));
const wsPort = wsPortArg ? wsPortArg.split("=")[1] : 8080;

const proDjLink = new ProDjLink(interfaceIp, mac, deviceName);

const websocketServer = new WebsocketServer(wsPort);

// Listen for UDP messages
proDjLink.statusesUdpSocket.on("message", (message, rinfo) => {
  if (
    !proDjLink.opusIp &&
    ProDjLink.checkIfFirstPort50002PacketIsFromOpusQuad(message)
  ) {
    const firstAddressRequest = rinfo.address;
    proDjLink.opusIp = firstAddressRequest;
    console.log("Opus IP set:", firstAddressRequest);
    proDjLink.sendCdj();

    // After 1.3 seconds, request song metadata
    setTimeout(() => {
      // requestSongMetadata(trackId, deckNo)
      // proDjLink.requestSongMetadata(829, 9);
      // console.log("Requested song metadata");
    }, 1300);
  }

  const packetType = ProDjLink.getProDjLinkPacketType(message);

  if (packetType == 10) {
    // Relay to all connected WebSocket clients
    websocketServer.broadcastBinary(message);
  }

  if (packetType == 86) {
    // If byte 0x25 is 02, its an image
    if (message[0x25] == 2) {
      websocketServer.broadcastBinary(message);
    }
  }
});

proDjLink.announceUdpSocket.bind(50000);
proDjLink.statusesUdpSocket.bind(50002);

// Make ourself discoverable by sending
// keep alive packets every 2 seconds.
setInterval(() => {
  proDjLink.sendKeepAlive();
}, 2000);
