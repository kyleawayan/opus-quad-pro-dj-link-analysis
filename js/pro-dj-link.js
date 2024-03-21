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
  }

  broadcastPacket(packetBytes, port) {
    const client = dgram.createSocket("udp4");

    client.bind(port, this.interfaceIp, (err) => {
      if (err) throw err;

      client.setBroadcast(true);

      client.send(
        packetBytes,
        0,
        packetBytes.length,
        port,
        this.broadcastIp,
        (err) => {
          if (err) throw err;
          client.close();
        }
      );
    });
  }

  sendPacket(packetBytes, ip, port) {
    const client = dgram.createSocket("udp4");

    client.send(packetBytes, 0, packetBytes.length, port, ip, (err) => {
      if (err) throw err;
      client.close();
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

  // For announce packets on port 50000
  static decodeMacAddressFromAnnouncePacket(packet) {
    const macBuffer = packet.slice(38, 44);
    let macAddress = Array.from(macBuffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(":");
    // If not valid MAC address, return null
    if (!macAddress.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)) {
      return null;
    }
    return macAddress;
  }

  // For announce packets on port 50000
  static decodeIpAddressFromAnnouncePacket(packet) {
    const ipBuffer = packet.slice(44, 48);
    let ipAddress = Array.from(ipBuffer).join(".");
    // If not valid IP address, return null
    if (!ipAddress.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return null;
    }
    return ipAddress;
  }

  static getProDjLinkPacketType(packet) {
    return packet[10];
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
}

export default ProDjLink;
