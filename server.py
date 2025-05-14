from flask import Flask, request, redirect, session, jsonify, send_from_directory
import requests
import os

# Setup Flask med client-foldern som statisk
app = Flask(__name__, static_folder="client", static_url_path="/client")
app.secret_key = "supersecret"  # Byt gärna till något säkrare i produktion

# Spotify credentials (du har angett dessa)
CLIENT_ID = "27a09eb146a942a7adcbf5507822bacd"
CLIENT_SECRET = "2a81776d787a47d9abedd0facfb49cec"
REDIRECT_URI = "https://musicas-d1ev.onrender.com/callback"

@app.route("/")
def index():
    # Skickar användaren till startsidan
    return send_from_directory("client", "index.html")

@app.route("/login")
def login():
    scope = "playlist-read-private"
    auth_url = (
        "https://accounts.spotify.com/authorize"
        f"?response_type=code&client_id={CLIENT_ID}&scope={scope}&redirect_uri={REDIRECT_URI}"
    )
    return redirect(auth_url)

@app.route("/callback")
def callback():
    code = request.args.get("code")
    token_url = "https://accounts.spotify.com/api/token"
    response = requests.post(token_url, data={
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    })

    token_info = response.json()
    session['access_token'] = token_info.get("access_token")
    return redirect("/client/index.html")

@app.route("/tracks")
def tracks():
    playlist_id = request.args.get("playlist_id")
    token = session.get("access_token")
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    return jsonify(response.json())

# 🔌 Gör att Render kan binda rätt port (via miljövariabel)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
