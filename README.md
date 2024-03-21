# OPUS-QUAD Pro DJ Link Reverse Engineer Packet Analysis

## Usage

- `experiments/sub.py` while connected on the same network as the OPUS-QUAD will relay [CDJ status packets](https://djl-analysis.deepsymmetry.org/djl-analysis/vcdj.html#cdj-status-packets) to a WebSocket server on port 8080. Make sure to also change the IP/mac addresses in the `sub.py` file. Note that not all CDJ statuses are reported back from the OPUS-QUAD.

## Special Thanks

- [DJ Link Ecosystem Analysis by Deep Symmetry](https://djl-analysis.deepsymmetry.org/djl-analysis/packets.html)
- [prolink-connect JS library by evanpurkhiser](https://github.com/evanpurkhiser/prolink-connect)

## Notes

### CDJ Status Packets binary decode

Can be found here on [prolink-connect repository](https://github.com/evanpurkhiser/prolink-connect/blob/8d0a96e3a40ec9a63691ed780868271410f7c857/src/status/utils.ts#L31-L47)

### Binary files

#### Image file was sent to my computer...?

I think I had Pro DJ Link Lighting running on rekordbox when I was sniffing.

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

However, next packet sent after might be a conitnuation of the image.

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
