from pro_dj_link import ProDjLink
import time
import subprocess

interface_ip = "192.168.112.235"  # yukikaM3 IP address
interface_mac_address = "80:a9:97:09:38:a8"
this_device_name = "yukikaM3"

link = ProDjLink(interface_ip, interface_mac_address, this_device_name)
link.opus_ip = "192.168.112.180"

link.connect()

dumbCounter = -3

# Start listenUdp.py
subprocess.Popen(["python3", "listenUdp.py"])

# Send keep alive every 2 seconds
while True:
    dumbCounter += 1
    if dumbCounter == 0:
        link.send_cdj()
    link.send_keep_alive()
    time.sleep(2)
