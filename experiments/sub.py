from pro_dj_link import ProDjLink
import time
import subprocess

interface_ip = "192.168.112.173"  # macbook IP address
interface_mac_address = "00:e0:4c:65:3b:75"
this_device_name = "macbook"

link = ProDjLink(interface_ip, interface_mac_address, this_device_name)
link.opus_ip = "192.168.112.180"

# Start listenUdp.py
subprocess.Popen(["node", "../udpRelay/udpRelay.js"])

timeCounterMs = 0

# Loop every 100ms
while True:
    # Send keep alive every 2 seconds
    if timeCounterMs % 20 == 0:
        link.send_keep_alive()

    # Send cdj right at 3 second mark
    if timeCounterMs == 30:
        link.send_cdj()
        print("CDJ sent")

    # Send idk every 0.1 seconds
    if timeCounterMs % 1 == 0:
        link.send_idk_every_10ms()

    # At 7 second mark, pro dj link lighting idk packets
    if timeCounterMs == 70:
        link.send_pro_dj_link_idk_packet()
        print("Pro DJ Link IDK packet sent")

    # At 8 second mark, request song metadata
    if timeCounterMs == 80:
        link.request_song_metadata(50, 9)
        print("Request song metadata sent")

    timeCounterMs += 1
    time.sleep(0.1)
