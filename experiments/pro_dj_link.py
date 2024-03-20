import socket
import time

pro_dj_link_begin_bytes = [0x51, 0x73, 0x70, 0x74, 0x31, 0x57, 0x6D, 0x4A, 0x4F, 0x4C]


class ProDjLink:
    def __init__(self, interface_ip, interface_mac_address):
        self.interface_ip = interface_ip
        self.interface_mac_address = interface_mac_address
        self.broadcast_ip = self.get_broadcast_ip()

    def get_broadcast_ip(self):
        interface_elements = self.interface_ip.split(".")
        broadcast_elements = interface_elements.copy()
        broadcast_elements[-1] = "255"
        broadcast_ip = ".".join(broadcast_elements)
        return broadcast_ip

    def broadcast_packet(self, packet_bytes, port):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((self.interface_ip, port))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.sendto(bytearray(packet_bytes), (self.broadcast_ip, port))
        s.close()

    def connect(self):
        # Send first-stage channel number claim 3 times
        for i in range(3):
            self.send_first_stage(i + 1)
            time.sleep(0.03)

        # Send second-stage channel number claim
        # d we need to send
        d_needed = [0x11, 0x12, 0x29, 0x2A, 0x2B, 0x2C]

        for i in range(6):
            for d in d_needed:
                self.send_second_stage(d, i + 1)
                time.sleep(0.03)

    @staticmethod
    def encode_device_name(device_name):
        device_name_bytes = device_name.encode("utf-8")
        device_name_bytes += b"\x00" * (20 - len(device_name_bytes))
        return list(device_name_bytes)

    @staticmethod
    def encode_mac_address(mac_address):
        return list(bytes.fromhex(mac_address.replace(":", "")))

    @staticmethod
    def encode_ip_address(ip_address):
        return list(map(int, ip_address.split(".")))

    def send_first_stage(self, n):
        packet = (
            pro_dj_link_begin_bytes
            + [0x00, 0x00]
            + self.encode_device_name("rekordbox")
        )
        packet += [0x01, 0x03, 0x00, 0x2C]
        packet += [n]
        packet += [0x01]
        packet += self.encode_mac_address(self.interface_mac_address)
        self.broadcast_packet(packet, 50000)

    def send_second_stage(self, d, n):
        packet = (
            pro_dj_link_begin_bytes
            + [0x02, 0x00]
            + self.encode_device_name("rekordbox")
        )
        # other stuff + Length of bit idk
        packet += [0x01, 0x03, 0x00, 0x32]
        # ip address
        packet += self.encode_ip_address(self.interface_ip)
        # mac address
        packet += self.encode_mac_address(self.interface_mac_address)
        # d
        packet += [d]
        # n
        packet += [n]
        # idk
        packet += [0x04, 0x01]

        self.broadcast_packet(packet, 50000)

    def send_keep_alive(self):
        packet = (
            pro_dj_link_begin_bytes
            + [0x06, 0x00]
            + self.encode_device_name("rekordbox")
        )
        packet += [0x01, 0x03, 0x00, 0x36]
        packet += [0x11]
        packet += [0x01]
        packet += self.encode_mac_address(self.interface_mac_address)
        packet += self.encode_ip_address(self.interface_ip)
        packet += [0x01, 0x01, 0x00, 0x00, 0x04, 0x08]
        self.broadcast_packet(packet, 50000)
