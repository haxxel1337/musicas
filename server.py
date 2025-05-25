from flask import Flask, request, redirect, session, jsonify
import requests
import os

app = Flask(__name__, static_folder="client", static_url_path="/musicas/client")
app.secret_key = os.environ.get("SECRET_KEY") or "supersecret"

CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("SPOTIFY_REDIRECT_URI")

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/login")
def login():
    scope = (
        "streaming user-read-email user-read-private "
        "user-read-playback-state user-modify-playback-state playlist-read-private"
    )
    auth_url = (
        "https://accounts.spotify.com/authorize"
        f"?response_type=code&client_id={CLIENT_ID}&scope={scope}&redirect_uri={REDIRECT_URI}"
    )
    print("LOGIN: CLIENT_ID", CLIENT_ID, "REDIRECT_URI", REDIRECT_URI)
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
    print("TOKEN_INFO:", token_info)  # DEBUG
    session['access_token'] = token_info.get("access_token")
    print("SESSION AFTER CALLBACK:", dict(session))  # DEBUG
    return redirect("/")

@app.route("/token")
def token():
    print("SESSION IN /TOKEN:", dict(session))  # DEBUG
    token = session.get("access_token")
    if not token:
        return jsonify({"error": "unauthenticated"}), 401
    return jsonify({"access_token": token})

@app.route("/trackinfo/<track_id>")
def trackinfo(track_id):
    token = session.get("access_token")
    if not token:
        return jsonify({"error": "unauthenticated"}), 401
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://api.spotify.com/v1/tracks/{track_id}"
    r = requests.get(url, headers=headers)
    return jsonify(r.json())

@app.route("/logout")
def logout():
    session.clear()
    print("SESSION CLEARED")
    return redirect("/")

@app.route("/debug-session")
def debug_session():
    return jsonify(dict(session))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("cwd:", os.getcwd())
    app.run(host="0.0.0.0", port=port)
