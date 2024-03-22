# OPUS-QUAD Pro DJ Link Reverse Engineer Packet Analysis

## Usage

```sh
npm install
npm start -- --interfaceip=192.168.112.173 --mac=00:e0:4c:65:3b:75 --devicename="macbook pro"
```

| Argument        | Description                                                 | Example             |
| --------------- | ----------------------------------------------------------- | ------------------- |
| `--interfaceip` | The IP address of the interface                             | `192.168.112.173`   |
| `--mac`         | The MAC address of the device                               | `00:e0:4c:65:3b:75` |
| `--devicename`  | The name of the device. This does not affect functionality. | `"macbook pro"`     |

This will connect to the OPUS-QUAD and relay the CDJ status packets to a WebSocket server on port 8080. Make sure to also change the interface IP and MAC address in `index.js` for the device you are running this on. Note that not all CDJ statuses are reported back from the OPUS-QUAD.

Metadata that is received will console log a preview of the buffer.

## Special Thanks

- [DJ Link Ecosystem Analysis by Deep Symmetry](https://djl-analysis.deepsymmetry.org/djl-analysis/packets.html)
- [prolink-connect JS library by evanpurkhiser](https://github.com/evanpurkhiser/prolink-connect)

## Notes

### CDJ Status Packets binary decode

Can be found here on [prolink-connect repository](https://github.com/evanpurkhiser/prolink-connect/blob/8d0a96e3a40ec9a63691ed780868271410f7c857/src/status/utils.ts#L31-L47). Note that not all CDJ statuses are reported back from the OPUS-QUAD.

#### Timecode syncing???

I would like to point out the "beat" (the current live beat) and bpm/pitch fader info is reported back, meaning this could be used for a timecode syncing to videos or lighting if such.

Device ID, Track ID, Track Device ID, Track Slot, and Track Type are also reported back. This can maybe be used to have specific timecode offsets for different tracks. In certain scenarios, the IDs additionally with the album art can be used to verify that the correct track is playing (as we don't have access to track title or artist).

### Make the OPUS-QUAD send back some metadata

Your announce packets on port 50000 should look like this:

```
0000  51 73 70 74 31 57 6d 4a  4f 4c 06 00 72 65 6b 6f   Qspt1WmJ OL··reko
0010  72 64 62 6f 78 00 00 00  00 00 00 00 00 00 00 00   rdbox··· ········
0020  01 03 00 36 17 01 00 e0  4c 65 3b 75 c0 a8 70 ad   ···6···· Le;u··p·
0030  04 01 00 00 04 08                                  ······
```

This is sort of similar to the [mixer or CDJ keep-alive packets](https://djl-analysis.deepsymmetry.org/djl-analysis/startup.html#mixer-keep-alive). However, this is what I found rekordbox to send out (I think in Pro DJ Link Lighting mode?) that makes the OPUS-QUAD send back metadata.

The only metadata I can see being transferred are:

- [Phrase data (PSSI)](https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html#song-structure-tag). _Disclaimer: I haven't verified if this is a complete PSSI file or not, I just saw the "PSSI" header in the hex dump._
- [Album art](#image-files)
- Waveform data? (what it looks like)
- Beatgrid data? (what it looks like)

When a new song is loaded, the above four pieces of metadata are automatically sent to you. To request phrase data, please see below.

### Request Phrase Metadata

```
0000  51 73 70 74 31 57 6d 4a  4f 4c 55 72 65 6b 6f 72   Qspt1WmJ OLUrekor
0010  64 62 6f 78 00 00 00 00  00 00 00 00 00 00 00 01   dbox···· ········
0020  00 17 00 08 b8 00 00 00  0a 09 03 01               ········ ····
```

Right after this packet is sent on port 50002 to the opus, the opus responds back with the [PSSI](https://djl-analysis.deepsymmetry.org/rekordbox-export-analysis/anlz.html#song-structure-tag) if it has phrase data (I only saw the "PSSI" header, not sure how complete the PSSI file actually is). If the song doesn't have phrase data, it responds with what looks like to be a generic message, and no "PSSI" header.

Bytes 0x2b represents the deck number. On opus quad, 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4.

Byte 0x24 through 0x27 represent the track ID. It is an unsigned 32-bit integer with little endian.

### Binary files

#### Image files

```
0000  51 73 70 74 31 57 6d 4a  4f 4c 56 4f 50 55 53 2d   Qspt1WmJ OLVOPUS-
0010  51 55 41 44 00 00 00 00  00 00 00 00 00 00 00 01   QUAD···· ········
0020  00 09 05 68 00 02 00 01  00 00 01 9e 09 00 01 00   ···h···· ········
0030  00 00 00 02 ff d8 ff e0  00 10 4a 46 49 46 00 01   ········ ··JFIF··
0040  01 00 00 01 00 01 00 00  ff db 00 43 00 05 03 04   ········ ···C····
0050  04 04 03 05 04 04 04 05  05 05 06 07 0c 08 07 07   ········ ········
0060  07 07 0f 0b 0b 09 0c 11  0f 12 12 11 0f 11 11 13   ········ ········
0070  16 1c 17 13 14 1a 15 11  11 18 21 18 1a 1d 1d 1f   ········ ··!·····
0080  1f 1f 13 17 22 24 22 1e  24 1c 1e 1f 1e ff db 00   ····"$"· $·······
0090  43 01 05 05 05 07 06 07  0e 08 08 0e 1e 14 11 14   C······· ········
// ...
```

Pro dj link header: `56` on port 50002

02 at 0x32 can mean its an image?

Start of binary header for JPG: `FF D8 FF`

So binary starts at 0x33, and goes to the end of the packet.

Showing this image however shows that the image wasn't complete. It was only a part of the image and the rest was grey.

However, next packet sent after might be a continuation of the image.

```
0000  51 73 70 74 31 57 6d 4a  4f 4c 56 4f 50 55 53 2d   Qspt1WmJ OLVOPUS-
0010  51 55 41 44 00 00 00 00  00 00 00 00 00 00 00 01   QUAD···· ········
0020  00 09 04 f0 00 02 00 01  00 00 01 9e 09 00 01 00   ········ ········
0030  00 01 00 02 2d c7 71 29  29 25 c4 2f 71 dd ea f3   ····-·q) )%·/q···
0040  3f f7 a9 1f bd c0 02 b8  a5 71 a5 40 10 68 64 10   ?······· ·q·@·hd·
0050  7d 7f c7 6b 46 87 88 76  3f b9 96 e7 c2 d9 fa 74   }··kF··v ?······t
0060  00 b7 11 2f d4 5b fd d5  b4 8e 2d 4f a1 4f 4d 2e   ···/·[·· ··-O·OM.
0070  6c 38 55 58 d1 fa 05 ba  d3 90 52 9f 35 47 cd 38   l8UX···· ··R·5G·8
0080  51 20 91 eb 49 d6 27 0d  2e 0a d5 c1 c5 8e 27 f1   Q ··I·'· .·····'·
0090  06 d5 b5 d7 53 4b d4 c9  d2 c4 29 51 4c 86 b6 bc   ····SK·· ··)QL···
```

Same 02 at 0x32, so this may be image?

**Byte 0x31 incremented by 1**, so it may be a continuation of the previous image?

Have not tested concatenating the two packets to see if it makes a complete image.

Since I think rekordbox compresses the album arts to 300(?)x300(?) on export, I think there are always guaranteed to be only two packets for a single image.
