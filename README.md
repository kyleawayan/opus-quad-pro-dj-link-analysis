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

This will connect to the OPUS-QUAD and relay the CDJ status packets to a WebSocket server on port 8080. Note that not all CDJ statuses are reported back from the OPUS-QUAD. Metadata that is received will console log a preview of the buffer.

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

02 at 0x25 means its an image.

0x33 is the amount of packets needed to send the whole image.

0x31 is the packet number/index. e.g. packet 0/2, 1/2, etc. to complete the image.

0x21 is the deck number the image corresponds to. 9 is deck 1, 10 is deck 2, 11 is deck 3, 12 is deck 4.

The actual binary data is from 0x34 till the end of the packet.

Start of binary header for JPG: `FF D8 FF`

So binary starts at 0x33, and goes to the end of the packet.
