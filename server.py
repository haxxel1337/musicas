from flask import Flask, request, redirect, session, jsonify
import requests

app = Flask(__name__)
app.secret_key = "supersecret"

CLIENT_ID = "27a09eb146a942a7adcbf5507822bacd"
CLIENT_SECRET = "2a81776d787a47d9abedd0facfb49cec"
REDIRECT_URI = "https://dinapp.onrender.com/callback"

@app.route("/")
def index():
    return redirect("/client/index.html")

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
