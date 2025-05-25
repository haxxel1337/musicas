// --- SPELSTATE & SPOTIFY ---
let trumpetTimeout = null;
let timerInterval = null;
let timeLeft = 30;
let currentPlayer = 0;
let players = [];
let scores = [];
let round = 1;
let gameActive = false;

let difficulty = 'Easy'; // Default
const secondsPerDifficulty = { Easy: 30, Mid: 20, Hard: 10 };

let spotifyPlayer = null; // Global Spotify Player
const dummyTrackUri = 'spotify:track:11dFghVXANMlKmJXsNCbNl'; // EXEMPEL – byt mot din egen låt

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

// --- EVENTS ---
startBtn.addEventListener('click', startGame);
difficultySelect.addEventListener('change', e => {
  difficulty = e.target.value;
});
goBtn.addEventListener('click', startTurn); // OBS! Musik och timer startar här!
stopBtn.addEventListener('click', () => stopAnswering(true));
nextTurnBtn.addEventListener('click', nextTurn);

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

// Nu visas GO!-knappen, och ingen musik startas förrän användaren klickar på den.
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
  stopBtn.disabled = false;
  stopBtn.classList.remove('hidden');
  nextTurnBtn.classList.add('hidden');

  playSpotifyTrack(dummyTrackUri); // Starta musiken DIREKT vid klick
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft--;
  countdownEl.textContent = timeLeft;
  if (timeLeft <= 0) {
    stopAnswering(false);
    infoEl.textContent = `${players[currentPlayer]} hann inte svara!`;
    playTrumpet(0);
    setTimeout(nextTurn, 2000);
  }
}

function stopAnswering(userClicked = false) {
  clearInterval(timerInterval);
  stopTrumpet();
  answerTimer.classList.add('hidden');
  stopBtn.disabled = true;
  if (spotifyPlayer) {
    spotifyPlayer.pause().catch(() => {});
  }
  stopBtn.classList.add('hidden');
  // Visa nästa-turn-knappen om spelet är igång
  if (gameActive) nextTurnBtn.classList.remove('hidden');
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
  stopAnswering(true);
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
  fetch('/get-spotify-token') // Du måste fixa detta endpoint i backend!
    .then(res => res.json())
    .then(data => {
      spotifyPlayer = new Spotify.Player({
        name: 'Musicas',
        getOAuthToken: cb => { cb(data.token); },
        volume: 0.5
      });
      spotifyPlayer.connect();
      window.spotifyPlayer = spotifyPlayer; // för felsökning
    });
};

// --- Exempel: Spela upp en låt ---
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
