import websocket
import json

SESSION_TOKEN = "_s8D5FjqsQCtdVySOCIdYjMDz9n-Y-b9seUwSkBworg"

ws = websocket.create_connection(
    "ws://127.0.0.1:8000/ws/1",
    cookie=f"session_token={SESSION_TOKEN}"
)

print("Connected to WebSocket!")

message = {
    "type": "message",
    "content": "Hello Alice! WebSocket is working 🔥"
}

ws.send(json.dumps(message))

print("Message sent!")

while True:
    response = ws.recv()
    print("Received:", response)