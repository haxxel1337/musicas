import os
from flask import Flask, send_from_directory, jsonify, request
import requests

app = Flask(__name__, static_folder="client", static_url_path="/client")

SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REFRESH_TOKEN = os.environ.get("SPOTIFY_REFRESH_TOKEN")

@app.route("/")
def index():
    return send_from_directory("client", "index.html")

@app.route("/client/<path:path>")
def static_proxy(path):
    return send_from_directory("client", path)

@app.route("/get-spotify-token")
def get_spotify_token():
    if not (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN):
        return jsonify({"error": "Missing Spotify credentials"}), 500
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": SPOTIFY_REFRESH_TOKEN,
            "client_id": SPOTIFY_CLIENT_ID,
            "client_secret": SPOTIFY_CLIENT_SECRET
        }
    )
    if response.ok:
        return jsonify({"token": response.json().get("access_token")})
    return jsonify({"error": "Failed to fetch token", "details": response.text}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
