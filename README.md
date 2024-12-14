# OPUS-QUAD Pro DJ Link Reverse Engineer Packet Analysis

Some reverse engineering of the Pro DJ Link protocol from the Pioneer DJ OPUS-QUAD. Note that the OPUS-QUAD does not fully support the protocol. However, the OPUS-QUAD does support [PRO DJ LINK Lighting](https://www.youtube.com/watch?v=KDEJVMGnlQY) even in standalone mode. This provides enough information to build a [timecode syncing system](#timecode-syncing). In this repository, I document all the findings of the Pro DJ Link protocol using packet analysis.

## Integration with Beat Link Trigger
The OPUS-QUAD is now supported with Beat Link Trigger, a software that bridges Pioneer DJ equipment to lighting, video, and various other software. It is supported in v8.0.0 and above.

Please see the [ongoing thread in the Deep Symmetry Zulip](https://deep-symmetry.zulipchat.com/#narrow/stream/275322-beat-link-trigger/topic/Opus.20Quad.20Integration) to implement OPUS-QUAD support in [Beat Link Trigger](https://github.com/Deep-Symmetry/beat-link-trigger).

## Special Thanks

- [DJ Link Ecosystem Analysis by Deep Symmetry](https://djl-analysis.deepsymmetry.org/djl-analysis/packets.html)
- [prolink-connect JS library by evanpurkhiser](https://github.com/evanpurkhiser/prolink-connect)

## Example Script

This Node.js script will connect to the OPUS-QUAD, then relay the [CDJ status packets](#cdj-statuses) to a WebSocket server on port 8080. Metadata that is received on song load will console log a preview of the buffer. Main logic is in `index.js`, and helper functions are in `pro-dj-link.js`.

```sh
npm install
npm start -- --interfaceip=192.168.112.173 --mac=00:e0:4c:65:3b:75 --devicename="macbook pro"
```

| Argument        | Description                                                 | Example             |
| --------------- | ----------------------------------------------------------- | ------------------- |
| `--interfaceip` | The IP address of the interface                             | `192.168.112.173`   |
| `--mac`         | The MAC address of the device                               | `00:e0:4c:65:3b:75` |
| `--devicename`  | The name of the device. This does not affect functionality. | `"macbook pro"`     |

## Timecode syncing

The [Beat Link Trigger software](#integration-with-beat-link-trigger) is able to connect to the OPUS-QUAD and output timecode. Please see the [SMPTE Linear Timecode integration example in the Beat Link Trigger User Guide](https://blt-guide.deepsymmetry.org/beat-link-trigger/7.4.1/Integration_SMPTE.html).

## How it works

Below I will explain what the script does and how it works.

### 1. Background

Basically in a nutshell, [the Pro DJ Link protocol works with UDP packets](https://djl-analysis.deepsymmetry.org/djl-analysis/packets.html). The UDP packets of all Pro DJ Link packets start with `51 73 70 74 31 57 6d 4a 4f 4c`. The next byte is what type of packet it is. For example, `06` is an announce packet, so a packet starting with `51 73 70 74 31 57 6d 4a 4f 4c 06` means it is an announce packet.

For this documentation, due to most of the packets being dynamic, I will paste the JavaScript code that will generate the packet. **Please refer to `pro-dj-link.js` for the helper functions shown in the code snippets**.

### 2. Initialization

When the OPUS-QUAD is connected to a network, it broadcasts a keep-alive UDP packet every few seconds on port 50000. Its data always starts with `51 73 70 74 31 57 6d 4a 4f 4c 06`. This is _similar_ to the [CDJ keep-alive packets](https://djl-analysis.deepsymmetry.org/djl-analysis/startup.html#cdj-keep-alive).

To join the Pro DJ Link network, announce yourself on port 50000 with the following packet:

```js
  sendKeepAlive() {
    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([0x06, 0x00]),
      ProDjLink.encodeDeviceName("rekordbox"),
      Buffer.from([0x01, 0x03, 0x00, 0x36, 0x17, 0x01]),
      ProDjLink.encodeMacAddress(this.interfaceMacAddress),
      ProDjLink.encodeIpAddress(this.interfaceIp),
      Buffer.from([0x04, 0x01, 0x00, 0x00, 0x04, 0x08]),
    ]);

    this.broadcastPacket(packet, 50000);
  }
```

You must send this packet every few seconds to maintain connection to the network.

This is what I found rekordbox to send out—in Pro DJ Link Lighting mode—that makes the OPUS-QUAD send back metadata when songs are loaded, and allows you to request for phrase data. I am not sure exactly which byte allows this, but the packet has to be sent like above, or else the OPUS-QUAD will not send back metadata or allow you to request phrase data. It took me a while to figure this out as I made a typo in copying the packet and my requests for phrase data were not being responded to, nor was metadata being sent back when a song loaded.

Upon launch, rekordbox will also send what appears to be [first-stage channel number claims(?)](https://djl-analysis.deepsymmetry.org/djl-analysis/startup.html#mixer-assign-stage-1) and [second-stage channel number claims(?)](https://djl-analysis.deepsymmetry.org/djl-analysis/startup.html#mixer-assign-stage-2) on port 50000. In my testing, I found that the OPUS-QUAD could still send metadata back even without these packets being sent.

### 3. CDJ Status Packets and Metadata

When you send your first announce packet on port 50000, the OPUS-QUAD will start sending UDP packets to you on port 50002. Initially, these packets do not contain the CDJ status packets. In order to prompt the OPUS-QUAD to send back CDJ status packets, you need to send the UDP packet to the OPUS-QUAD on port 50002:

```js
  sendCdj() {
    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([0x11]),
      ProDjLink.encodeDeviceName("rekordbox"),
      Buffer.from([0x01, 0x01, 0x17, 0x01, 0x04, 0x17, 0x01, 0x00, 0x00, 0x00]),
      ProDjLink.encodeWeirdString(this.thisDeviceName),
    ]);

    this.sendPacket(packet, this.opusIp, 50002);
  }

  // I called it sendCdj() but I'm not actually sure if this is similar to what a real CDJ would send.
```

This is what rekordbox sends. After this is sent, the OPUS-QUAD will start sending lots of packets to you on port 50002. These packets contain the CDJ status packets. Also, when a new song is loaded, the OPUS-QUAD will send back [metadata](#metadata-on-song-load).

`encodeWeirdString()` encodes a string, with `00` between every letter (and with the correct padding). It's weird, but this is how rekordbox formatted my computer's name.

You are also able to request [phrase data (PSSI)](https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html#song-structure-tag):

```js
  requestSongMetadata(trackId, deckNo) {
    let trackIdBuffer = Buffer.alloc(4);
    trackIdBuffer.writeUInt32LE(trackId);

    let packet = Buffer.concat([
      Buffer.from(proDjLinkBeginBytes),
      Buffer.from([0x55]),
      ProDjLink.encodeDeviceName("rekordbox"),
      Buffer.from([0x01, 0x00, 0x17, 0x00, 0x08]),
      trackIdBuffer,
      Buffer.from([0x0a]),
      Buffer.from([deckNo]),
      Buffer.from([0x03, 0x01]),
    ]);

    this.sendPacket(packet, this.opusIp, 50002);
  }
```

_Disclaimer: I haven't verified if this is a complete PSSI file or not, I just saw the "PSSI" header in the hex dump._

The trackId is the track ID (can be seen in the CDJ status packets). The deck numbers on the OPUS-QUAD are as follows: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4 (also can be seen in the CDJ status packets).

I also observed that rekordbox sends what appears to be [rekordbox status packets(?) on port 50002](https://djl-analysis.deepsymmetry.org/djl-analysis/vcdj.html#rekordbox-status-packets). However, the OPUS-QUAD still sends back metadata even if these packets are not sent.

Please see the [appendix](#appendix) for more information on CDJ statuses and metadata on song load.

## Appendix

### CDJ Statuses

The following pieces of data are sent back to you on port 50002:

TODO, please see the [prolink-connect code](https://github.com/evanpurkhiser/prolink-connect/blob/8d0a96e3a40ec9a63691ed780868271410f7c857/src/status/utils.ts#L31-L47) in the meantime. Note that not all CDJ statuses are reported back from the OPUS-QUAD. The ids and deck numbers on the OPUS-QUAD are as follows: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4.

### Metadata on song load

On song load, the following data is sent back to you on port 50002:

- Album art
- Waveform data?, what it looks like
- Beatgrid data?, what it looks like

These are sent with binary data. The binary packets' format seem to be all the same for all three (I only confirmed with the album art, however at quick glances of the supposed waveform and beatgrid data, they look the same). The format is as follows:

`51 73 70 74 31 57 6d 4a 4f 4c 56` (Pro DJ Link header, then `56`, which may mean it's binary data?), then...

| Offset | Description                                                                           |
| ------ | ------------------------------------------------------------------------------------- |
| 0x21   | Deck number: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4                    |
| 0x25   | Type of binary data: `02` for image, `06` for beatgrid data?, `04` for waveform data? |
| 0x28   | Track ID (32-bit integer, big endian)                                                 |
| 0x31   | Packet number/index (e.g. packet 0/2, 1/2, etc.)                                      |
| 0x33   | Amount of packets needed to send the whole binary data (minus 1)                      |
| 0x34   | Start of the actual binary data                                                       |

From 0x34 to the end of the packet is the binary data.

### Phrase data

Please refer to [phrase data (PSSI) on DJ Link Ecosystem Analysis](https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html#song-structure-tag). _Disclaimer: I haven't verified if what is sent back is a complete PSSI file or not, I just saw the "PSSI" header in the hex dump._
