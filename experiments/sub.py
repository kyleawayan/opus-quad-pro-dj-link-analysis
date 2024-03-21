from pro_dj_link import ProDjLink
import time
import subprocess

interface_ip = "192.168.112.213"  # macbook IP address
interface_mac_address = "3c:18:a0:99:7b:20"
this_device_name = "macbook"

link = ProDjLink(interface_ip, interface_mac_address, this_device_name)
link.opus_ip = "192.168.112.180"

# Start listenUdp.py
subprocess.Popen(["node", "../udpRelay/udpRelay.js"])

print("Sending first and second stage...")
link.connect()

timeCounterMs = 0

# Loop every 10ms
while True:
    timeCounterMs += 1

    # Send keep alive every 2 seconds
    if timeCounterMs % 20 == 0:
        link.send_keep_alive()
        print("Keep alive sent")

    # Send cdj right at 5 second mark
    if timeCounterMs == 50:
        link.send_cdj()
        print("CDJ sent")

    # Send idk every 10ms after 5 second mark
    if timeCounterMs > 50:
        link.send_idk_every_10ms()
        # print("IDK sent")

    # At 7 second mark, pro dj link lighting idk packets
    if timeCounterMs == 70:
        link.send_pro_dj_link_idk_packet()
        print("Pro DJ Link IDK packet sent")

    # By now the opus should be sending binary data when a song is loaded (no matter if it has phrase data or not)

    time.sleep(0.1)
