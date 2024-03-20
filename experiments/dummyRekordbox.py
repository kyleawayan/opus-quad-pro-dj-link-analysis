import socket
import time

packet_bytes = [
    0x51,
    0x73,
    0x70,
    0x74,
    0x31,
    0x57,
    0x6D,
    0x4A,
    0x4F,
    0x4C,
    0x06,
    0x00,
    0x72,
    0x65,
    0x6B,
    0x6F,
    0x72,
    0x64,
    0x62,
    0x6F,
    0x78,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x01,
    0x03,
    0x00,
    0x36,
    0x17,
    0x01,
    0x80,
    0xA9,
    0x97,
    0x09,
    0x38,
    0xA8,
    0xC0,
    0xA8,
    0x70,
    0xEB,
    0x04,
    0x01,
    0x00,
    0x00,
    0x04,
    0x08,
]

broadcast_ip = "169.254.255.255"
interface_ip = "169.254.135.13"
port = 50000

# Repeatedly send the packet to broadcast_ip on UDP port 50000
while True:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(
        socket.SOL_SOCKET, socket.SO_REUSEADDR, 1
    )  # Allow the address/port to be reused instantly
    s.bind((interface_ip, port))
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)  # Enable broadcasting
    s.sendto(bytearray(packet_bytes), (broadcast_ip, port))
    s.close()
    time.sleep(1)
