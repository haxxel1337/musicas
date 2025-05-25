
// --- SPELSTATE & SPOTIFY ---
let trumpetTimeout = null;
let timerInterval = null;
let timeLeft = 30;
let currentPlayer = 0;
let players = [];
let scores = [];
let round = 1;
let gameActive = false;

let difficulty = 'Easy';
const secondsPerDifficulty = { Easy: 30, Mid: 20, Hard: 10 };

let spotifyPlayer = null;
const dummyTrackUri = 'spotify:track:11dFghVXANMlKmJXsNCbNl';

// --- DOM ELEMENTS ---
const playerNameInput = document.getElementById('player-names');
const startBtn = document.getElementById('start-btn');
const difficultySelect = document.getElementById('difficulty');
const gameControls = document.getElementById('game-controls');
const infoEl = document.getElementById('info');
const goBtn = document.getElementById('go-btn');
const answerTimer = document.getElementById('answer-timer');
const countdownEl = document.getElementById('countdown');
const stopBtn = document.getElementById('stop-btn');
const nextTurnBtn = document.getElementById('next-turn');
const scoreboardEl = document.getElementById('scoreboard');
const trumpetAudio = document.getElementById('trumpet-audio');
const errorEl = document.getElementById('error-message');
const setupDiv = document.getElementById('setup');
const loginDiv = document.getElementById('login');
const loginBtn = document.getElementById('login-btn');

// --- EVENTS ---
if (startBtn) startBtn.addEventListener('click', startGame);
if (difficultySelect) difficultySelect.addEventListener('change', e => {
  difficulty = e.target.value;
});
if (goBtn) goBtn.addEventListener('click', startTurn);
if (stopBtn) stopBtn.addEventListener('click', stopAnswering);
if (nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);
if (loginBtn) loginBtn.addEventListener('click', login);

function login() {
  window.location.href = "/login";
}

// --- GAME LOGIC ---
function startGame() {
  const names = playerNameInput.value.split(',').map(n => n.trim()).filter(Boolean);
  if (names.length < 1) return showError("Ange minst ett namn (komma-separerat).");
  players = names;
  scores = Array(players.length).fill(0);
  currentPlayer = 0;
  round = 1;
  gameActive = true;
  hideError();
  setupDiv.classList.add('hidden');
  gameControls.classList.remove('hidden');
  renderScoreboard();
  prepareTurn();
}

function prepareTurn() {
  stopAnswering();
  infoEl.textContent = `Det är ${players[currentPlayer]}'s tur! Tryck på GO! för att starta låten.`;
  goBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  answerTimer.classList.add('hidden');
  nextTurnBtn.classList.add('hidden');
}

function startTurn() {
  goBtn.classList.add('hidden');
  infoEl.textContent = `${players[currentPlayer]} lyssnar...`;
  timeLeft = secondsPerDifficulty[difficulty];
  countdownEl.textContent = timeLeft;
  answerTimer.classList.remove('hidden');
  stopBtn.classList.remove('hidden');
  stopBtn.disabled = false;
  nextTurnBtn.classList.add('hidden');

  playSpotifyTrack(dummyTrackUri);
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft--;
  countdownEl.textContent = timeLeft;
  if (timeLeft <= 0) {
    stopAnswering();
    infoEl.textContent = `${players[currentPlayer]} hann inte svara!`;
    playTrumpet(0);
    setTimeout(nextTurn, 2000);
  }
}

function stopAnswering() {
  clearInterval(timerInterval);
  stopTrumpet();
  answerTimer.classList.add('hidden');
  stopBtn.disabled = true;
  stopBtn.classList.add('hidden');
  if (spotifyPlayer) {
    spotifyPlayer.pause().catch(() => {});
  }
  nextTurnBtn.classList.remove('hidden');
}

function playTrumpet(delayMs = 0) {
  stopTrumpet();
  trumpetTimeout = setTimeout(() => {
    trumpetAudio.currentTime = 0;
    trumpetAudio.play();
  }, delayMs);
}

function stopTrumpet() {
  if (trumpetTimeout) clearTimeout(trumpetTimeout);
  trumpetTimeout = null;
  trumpetAudio.pause();
  trumpetAudio.currentTime = 0;
}

function nextTurn() {
  stopAnswering();
  currentPlayer = (currentPlayer + 1) % players.length;
  if (currentPlayer === 0) round++;
  renderScoreboard();
  prepareTurn();
}

// --- SCOREBOARD & UI ---
function renderScoreboard() {
  let html = `<table><tr><th>Spelare</th><th>Poäng</th></tr>`;
  players.forEach((player, idx) => {
    html += `<tr>
      <td class="${idx === currentPlayer ? 'active-player' : ''}">${player}</td>
      <td>${scores[idx]}</td>
    </tr>`;
  });
  html += `</table>`;
  scoreboardEl.innerHTML = html;
}

// --- INFO & FEL ---
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}
function hideError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

// --- SPOTIFY SDK INIT ---
window.onSpotifyWebPlaybackSDKReady = () => {
  fetch('/token')
    .then(res => res.json())
    .then(data => {
      spotifyPlayer = new Spotify.Player({
        name: 'Musicas',
        getOAuthToken: cb => { cb(data.access_token); },
        volume: 0.5
      });
      spotifyPlayer.connect();
      window.spotifyPlayer = spotifyPlayer;
    });
};

function playSpotifyTrack(uri) {
  if (spotifyPlayer) {
    spotifyPlayer._options.getOAuthToken(access_token => {
      fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${spotifyPlayer._options.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ uris: [uri] }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
    });
  }
}
