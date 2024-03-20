import socket


def listen_udp(interface, port):
    # Create a UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Bind the socket to the interface and port
    sock.bind((interface, port))

    print(f"Listening on {interface}:{port}...")

    while True:
        # Receive data from the socket
        data, addr = sock.recvfrom(1024)

        # Print the received data
        print(f"Received data from {addr}: {data.decode()}")


# Usage example
listen_udp("192.168.112.213", 50002)
