import dgram from "dgram";
import { Buffer } from "buffer";
import ip from "ip";

const proDjLinkBeginBytes = [
  0x51, 0x73, 0x70, 0x74, 0x31, 0x57, 0x6d, 0x4a, 0x4f, 0x4c,
];

class ProDjLink {
  constructor(interfaceIp, interfaceMacAddress, thisDeviceName) {
    this.interfaceIp = interfaceIp;
    this.interfaceMacAddress = interfaceMacAddress;
    this.broadcastIp = ip.subnet(interfaceIp, "255.255.255.0").broadcastAddress;
    this.thisDeviceName = thisDeviceName;
    this.opusIp = null;
    this.bpmMixerBytes = Buffer.from([0x00, 0x00]);

    this.announceUdpSocket = dgram.createSocket("udp4");
    this.statusesUdpSocket = dgram.createSocket("udp4");
  }

  chooseUdpSocket(port) {
    if (port === 50000) {
      return this.announceUdpSocket;
    } else if (port === 50002) {
      return this.statusesUdpSocket;
    } else {
      throw new Error("Invalid port");
    }
  }

  broadcastPacket(packetBytes, port) {
    const client = this.chooseUdpSocket(port);
    client.setBroadcast(true);

    client.send(
      packetBytes,
      0,
      packetBytes.length,
      port,
      this.broadcastIp,
      (err) => {
        if (err) throw err;
      }
    );
  }

  sendPacket(packetBytes, ip, port) {
    const client = this.chooseUdpSocket(port);

    client.send(packetBytes, 0, packetBytes.length, port, ip, (err) => {
      if (err) throw err;
    });
  }

  static encodeDeviceName(deviceName) {
    let deviceNameBytes = Buffer.from(deviceName, "utf-8");
    deviceNameBytes = Buffer.concat([
      deviceNameBytes,
      Buffer.alloc(20 - deviceNameBytes.length),
    ]);
    return deviceNameBytes;
  }

  static encodeWeirdString(inputStr) {
    let inputBytes = Buffer.from(inputStr, "utf-8");
    let spacedBytes = Buffer.alloc(255);
    for (let i = 0; i < inputBytes.length; i++) {
      spacedBytes[i * 2] = inputBytes[i];
    }
    return spacedBytes;
  }

  static encodeMacAddress(macAddress) {
    return Buffer.from(macAddress.replace(/:/g, ""), "hex");
  }

  static encodeIpAddress(ipAddress) {
    return Buffer.from(ipAddress.split(".").map(Number));
  }

  static getProDjLinkPacketType(packet) {
    return packet[10];
  }

  static calcPitch(pitch) {
    let value = (pitch[0] << 16) | (pitch[1] << 8) | pitch[2];
    const relativeZero = 0x100000;
    const computed = ((value - relativeZero) / relativeZero) * 100;

    return parseFloat(computed.toFixed(2));
  }

  static encodeBpm(bpm) {
    const rawBPM = bpm === null ? 0xffff : Math.round(bpm * 100);
    const buffer = Buffer.alloc(2); // creates a buffer of length 2 bytes
    buffer.writeUInt16BE(rawBPM, 0); // Write rawBPM in Big Endian format
    return buffer;
  }

  scanForNeededBytesForMixerStatus(packet) {
    const isMaster = (packet[0x89] & 32) !== 0;

    if (!isMaster) {
      return;
    }

    const rawBPM = (packet[0x92] << 8) | packet[0x93];
    const sliderPitchBuffer = packet.slice(0x8d, 0x90);
    const trackBPM = rawBPM === 65535 ? null : rawBPM / 100;
    const sliderPitch = ProDjLink.calcPitch(sliderPitchBuffer);
    const foundBpmUnrounded = trackBPM * (1 + sliderPitch / 100);

    const foundBpm = Math.floor(foundBpmUnrounded * 100) / 100; // Round down to 2 decimal places

    this.bpmMixerBytes = ProDjLink.encodeBpm(foundBpm);
  }

  sendCdj() {
    if (this.opusIp === null) {
      throw new Error("Opus IP is not set");
    }

    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([0x11]),
      ProDjLink.encodeDeviceName("rekordbox"),
      Buffer.from([0x01, 0x01, 0x11, 0x01, 0x04, 0x11, 0x01, 0x00, 0x00, 0x00]),
      ProDjLink.encodeWeirdString(this.thisDeviceName),
    ]);

    this.sendPacket(packet, this.opusIp, 50002);
  }

  sendKeepAlive() {
    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([0x06, 0x00]),
      ProDjLink.encodeDeviceName("rekordbox"),
      Buffer.from([0x01, 0x03, 0x00, 0x36, 0x11, 0x01]),
      ProDjLink.encodeMacAddress(this.interfaceMacAddress),
      ProDjLink.encodeIpAddress(this.interfaceIp),
      Buffer.from([0x01, 0x01, 0x00, 0x00, 0x04, 0x08]),
    ]);

    this.broadcastPacket(packet, 50000);
  }

  sendRekordboxMixerStatusPacket() {
    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([
        0x29, 0x72, 0x65, 0x6b, 0x6f, 0x72, 0x64, 0x62, 0x6f, 0x78, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x17,
        0x00, 0x38, 0x17, 0x00, 0x00, 0xc0, 0x00, 0x10, 0x00, 0x00, 0x80, 0x00,
      ]),
      this.bpmMixerBytes,
      Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x09, 0xff, 0x00]),
    ]);

    this.broadcastPacket(packet, 50002);
  }
}

export default ProDjLink;
