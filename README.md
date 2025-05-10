# OPUS-QUAD Pro DJ Link Reverse Engineer Packet Analysis

Some reverse engineering of the Pro DJ Link protocol from the Pioneer DJ OPUS-QUAD. Note that the OPUS-QUAD does not fully support the protocol. However, the OPUS-QUAD does support [PRO DJ LINK Lighting](https://www.youtube.com/watch?v=KDEJVMGnlQY) even in standalone mode. This provides enough information to build a [timecode syncing system](#timecode-syncing). In this repository, I document all the findings of the Pro DJ Link protocol using packet analysis.

## Integration with Beat Link Trigger

> [!NOTE]  
> # **[Beat Link Trigger](https://github.com/Deep-Symmetry/beat-link-trigger) is the best way to get started with interfacing with the OPUS-QUAD.**

The OPUS-QUAD is now supported in [Beat Link Trigger](https://github.com/Deep-Symmetry/beat-link-trigger), a software that bridges Pioneer DJ equipment to lighting, video, and various other software. It is supported as of version 8.0.0. Some of the findings in this project were contributed to Beat Link Trigger.

To follow development or get involved, see the [ongoing thread in the Deep Symmetry Zulip](https://deep-symmetry.zulipchat.com/#narrow/stream/275322-beat-link-trigger/topic/Opus.20Quad.20Integration).

> [!TIP]
> The above link to the Zulip thread is the best place to get the latest findings about the OPUS-QUAD's capabilities with Pro DJ Link.

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

The [Beat Link Trigger software](#integration-with-beat-link-trigger) is able to connect to the OPUS-QUAD and output timecode, even including dynamically setting timecode offsets based on the song playing. Please see the [SMPTE Linear Timecode integration example in the Beat Link Trigger User Guide](https://blt-guide.deepsymmetry.org/beat-link-trigger/7.4.1/Integration_SMPTE.html).

## How it works

Below I will explain what the script does and how it works.

> [!WARNING]  
> # Any rekordbox ID sent back from the OPUS-QUAD refers to the track ID in the <ins>Device Library Plus (encrypted SQLite)</ins> database. This ID is <ins>not compatible with the DeviceSQL database</ins> and will result in incorrect track metadata if used with it.
> One implementation to match track metadata with the Device Library Plus database can be found in this [pull request](https://github.com/Deep-Symmetry/beat-link/pull/86).

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

The trackId is the track ID (can be seen in the CDJ status packets). The deck numbers on the OPUS-QUAD are as follows: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4 (also can be seen in the CDJ status packets).

I also observed that rekordbox sends what appears to be [rekordbox status packets(?) on port 50002](https://djl-analysis.deepsymmetry.org/djl-analysis/vcdj.html#rekordbox-status-packets). However, the OPUS-QUAD still sends back metadata even if these packets are not sent.

Please see the [appendix](#appendix) for more information on CDJ statuses and metadata on song load.

## Appendix

### CDJ Statuses

When [`sendCdj()`](#3-cdj-status-packets-and-metadata) is ran, the OPUS-QUAD will start sending CDJ status packets on port 50002. Please refer to [CDJ Status packets on DJ Link Ecosystem Analysis](https://djl-analysis.deepsymmetry.org/djl-analysis/vcdj.html#cdj-status-packets). Note that not all values shown on the linked guide are reported back from the OPUS-QUAD.

Based on testing so far, the following values do not appear to be included in the CDJ status packets (this list may not be exhaustive):

- USB slot number the track is loaded from
- Looping status

The deck numbers on the OPUS-QUAD are as follows: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4.

### Absolute Position Packets

~~The OPUS-QUAD does not send high-precision position packets like the CDJ-3000 does. However the current beat number is included, and can be used to approximate a timecode with known beatgrid data. The [Beat Link Trigger software](#integration-with-beat-link-trigger) can achieve this.~~ **It has been recently found that the OPUS-QUAD does send back high-precision/absolute position packets, when using a CDJ keep alive packet**. However in this mode, it looks like data in the ["Metadata on song load" section](#metadata-on-song-load) is not sent on song load, and the ability to request for [phrase data (PSSI)](#phrase-data) does not work. See this [Zulip message](https://deep-symmetry.zulipchat.com/#narrow/channel/275322-beat-link-trigger/topic/Ableton.20Link.3A.20Sync.20phase/near/516333211) for more details, as well as this [preview video demonstrating the high-precision position packets being implemented in a Beat Link Trigger development version](https://deep-symmetry.zulipchat.com/#narrow/channel/275322-beat-link-trigger/topic/Opus.20Quad.20Integration/near/516555078).

### Metadata on song load

> [!NOTE]  
> I have found that this packet is about one second delayed from when the song actually loads. It is better to track ID changes in the CDJ status packets, as this packet comes earlier.

On song load, a low resolution album art is sent back, and two unknown types of data. It is sent on port 50002.

These are sent with binary data. The binary packets' format seem to be all the same for all three (I only confirmed with the album art, however at quick glances of the two unknown types, they look the same). The format is as follows:

`51 73 70 74 31 57 6d 4a 4f 4c 56` (Pro DJ Link header, then `56`, which may mean it's binary data?), then...

| Offset | Description                                                                           |
| ------ | ------------------------------------------------------------------------------------- |
| 0x21   | Deck number: 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4                    |
| 0x25   | Type of binary data: `02` for image, `06` is unknown, `04` is unknown                 |
| 0x28   | Track ID (32-bit integer, big endian)                                                 |
| 0x31   | Packet number/index (e.g. packet 0/2, 1/2, etc.)                                      |
| 0x33   | Amount of packets needed to send the whole binary data                                |
| 0x34   | Start of the actual binary data                                                       |

From 0x34 to the end of the packet is the binary data.

### Phrase data

Please refer to [phrase data (PSSI) on DJ Link Ecosystem Analysis](https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html#song-structure-tag).
