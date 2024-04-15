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

let deckTrackIds = [0, 0, 0, 0];

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
  }

  const packetType = ProDjLink.getProDjLinkPacketType(message);
  const packet = new DataView(message.buffer);

  if (packetType == 10) {
    // CDJ Status packet

    const deckIndex = packet.getUint8(0x21) - 9;
    const trackId = packet.getUint32(0x2c);
    const lastKnownTrackId = deckTrackIds[deckIndex];

    if (trackId !== lastKnownTrackId) {
      // There is a split second when track id is 0,
      // when a song is loaded, ignore it
      if (trackId === 0) {
        return;
      }
      // Update track id state
      deckTrackIds[deckIndex] = trackId;
      // Request for phrase data
      proDjLink.requestSongMetadata(trackId, deckIndex + 9);
    }

    // Relay to all connected WebSocket clients
    websocketServer.broadcastBinary(packet.buffer);
  }

  if (packetType == 86) {
    // Binary packet

    // If byte 0x25 is 02, its an image binary packet,
    // just relay it to all connected WebSocket clients
    if (packet.getUint8(0x25) == 0x02) {
      websocketServer.broadcastBinary(packet.buffer);
    }

    // If byte 0x25 is 0a, its phrase data
    // Request for the phrase data (already requested when track id changes),
    // then relay the replies to all connected WebSocket clients
    if (packet.getUint8(0x25) == 0x0a) {
      websocketServer.broadcastBinary(packet.buffer);
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
