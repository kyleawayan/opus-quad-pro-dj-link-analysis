from pro_dj_link import ProDjLink
import time

interface_ip = "192.168.112.235"  # yukikaM3 IP address
interface_mac_address = "80:a9:97:09:38:a8"

link = ProDjLink(interface_ip, interface_mac_address)

link.connect()

# Send keep alive every 2 seconds
while True:
    link.send_keep_alive()
    time.sleep(2)
