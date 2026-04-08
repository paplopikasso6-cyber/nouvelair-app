from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

USERS = {"admin": "password123"}

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if USERS.get(username) == password:
        return jsonify({"success": True, "token": "dummy-token-123"})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.json
    N = int(data.get("planes", 3))
    gear_price = float(data.get("gear_price", 1.0))
    airport = data.get("airport", "Tunis")
    return jsonify({
        "status": "Optimal",
        "total_cost": 52340.50,
        "airport": airport,
        "planes": N
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)