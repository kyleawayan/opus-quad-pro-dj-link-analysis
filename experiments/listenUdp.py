import socket
from websocket_server import WebsocketServer
import threading


# Function to listen for UDP data
def listen_udp(interface, port, ws_server):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((interface, port))
    print(f"Listening on {interface}:{port}...")
    while True:
        data, addr = sock.recvfrom(1024)
        hex_data = data.hex()
        print(f"Received data from {addr}: {hex_data}")
        ws_server.send_message_to_all(hex_data)  # Send data to all WebSocket clients


# Callbacks for WebSocket events
def new_client(client, server):
    print(f"New client connected and was given ID {client['id']}")


def client_left(client, server):
    print(f"Client {client['id']} disconnected")


def message_received(client, server, message):
    print(f"Client {client['id']} said: {message}")
    server.send_message_to_all(message)


if __name__ == "__main__":
    # Create WebSocket server
    ws_server = WebsocketServer(port=8080, host="localhost")
    ws_server.set_fn_new_client(new_client)
    ws_server.set_fn_client_left(client_left)
    ws_server.set_fn_message_received(message_received)

    # Start listening for UDP
    udp_thread = threading.Thread(
        target=listen_udp, args=("192.168.112.235", 50002, ws_server)
    )
    udp_thread.start()

    # Run WebSocket server
    ws_server.run_forever()
