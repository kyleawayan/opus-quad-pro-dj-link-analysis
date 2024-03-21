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

timeCounterMs = 0

# Loop every 10ms
while True:
    timeCounterMs += 1

    # Send keep alive every 2 seconds
    if timeCounterMs % 20 == 0:
        link.send_keep_alive()

    # Send cdj right at 5 second mark
    if timeCounterMs == 50:
        link.send_cdj()
        print("CDJ sent")

    # At 15 second mark, request song metadata
    if timeCounterMs == 150:
        link.request_song_metadata(50, 9)
        print("Request song metadata sent")

    time.sleep(0.1)
