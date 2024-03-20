from pro_dj_link import ProDjLink
import time
import subprocess

interface_ip = "192.168.112.213"  # yukikaM3 IP address
interface_mac_address = "3c:18:a0:99:7b:20"
this_device_name = "yukikaM3"

link = ProDjLink(interface_ip, interface_mac_address, this_device_name)
link.opus_ip = "192.168.112.180"

link.connect()

dumbCounter = -3

# Start listenUdp.py
subprocess.Popen(["node", "../udpRelay/udpRelay.js"])

# Send keep alive every 2 seconds
while True:
    dumbCounter += 1
    if dumbCounter == 0:
        link.send_cdj()
    link.send_keep_alive()
    time.sleep(2)
