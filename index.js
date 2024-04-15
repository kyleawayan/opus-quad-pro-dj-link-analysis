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

class PacketTracker {
  constructor() {
    this.packetsReceived = 0;
    this.data = [];
  }

  receivePacket(packetData, packetNumber, totalPackets) {
    // Make sure packetData is a UInt8Array
    if (!(packetData instanceof Uint8Array)) {
      packetData = new Uint8Array(packetData);
    }

    this.data.push(...packetData);
    this.packetsReceived++;

    if (packetNumber === totalPackets) {
      return this.data;
    } else {
      return null;
    }
  }

  reset() {
    this.packetsReceived = 0;
    this.data = [];
  }
}

class ImageTracker extends PacketTracker {
  receivePacket(packetData, packetNumber, totalPackets) {
    const data = super.receivePacket(packetData, packetNumber, totalPackets);

    if (data) {
      // Encode UInt8Array to base64
      const completeImageData = String.fromCharCode(...this.data);
      const base64ImageData = btoa(completeImageData);

      return base64ImageData;
    } else {
      return null;
    }
  }
}

class PhraseTracker extends PacketTracker {
  receivePacket(packetData, packetNumber, totalPackets) {
    const data = super.receivePacket(packetData, packetNumber, totalPackets);

    if (data) {
      return data;
    } else {
      return null;
    }
  }
}

let state = new Array(4).fill().map(() => ({
  trackId: -1,
  albumArt: new ImageTracker(),
  phraseDataBase64: new PhraseTracker(),
}));

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

    // Update state
    const deckIndex = packet.getUint8(0x21) - 9;

    const trackId = packet.getUint32(0x2c);
    const deckState = state[deckIndex];

    if (trackId !== deckState.trackId) {
      deckState.trackId = trackId;
      deckState.albumArt.reset();
      deckState.phraseDataBase64.reset();
    }

    // Relay to all connected WebSocket clients
    websocketServer.broadcastBinary(packet);
  }

  if (packetType == 86) {
    // Binary packet
    const deckIndex = packet.getUint8(0x21) - 9;

    // If byte 0x25 is 02, its an image
    if (packet.getUint8(0x25) == 2) {
      const numberOfPacketsToCompleteImage = packet.getUint8(0x33) - 1;
      const packetNumber = packet.getUint8(0x31);
      const trackIdForImage = packet.getUint32(0x28);

      const base64ImageData = state[deckIndex].albumArt.receivePacket(
        packet.buffer.slice(0x2c),
        packetNumber,
        numberOfPacketsToCompleteImage
      );

      if (base64ImageData) {
        console.log("Image received");
      }
    }
  }
});

proDjLink.announceUdpSocket.bind(50000);
proDjLink.statusesUdpSocket.bind(50002);

// Make ourself discoverable by sending
// keep alive packets every 2 seconds.
setInterval(() => {
  proDjLink.sendKeepAlive();
  console.log(state);
}, 2000);
