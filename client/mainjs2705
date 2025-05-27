// --- SETUP FLOW ---
const playerButtonsDiv = document.getElementById('player-buttons');
const playerNameFieldsDiv = document.getElementById('player-name-fields');
const nameInputsDiv = document.getElementById('name-inputs');
const continueBtn = document.getElementById('continue-to-playlist');
const playlistAndStartDiv = document.getElementById('playlist-and-start');
const playlistSelect = document.getElementById('playlist-select');
const ownPlaylistInput = document.getElementById('own-playlist-input');

// --- GAME STATE & SPOTIFY ---
const WINNING_SCORE = 20;

let trumpetTimeout = null;
let timerInterval = null;
let currentPlayer = 0;
let players = [];
let scores = [];
let assignedYears = [];
let currentTrackUri = null;
let currentTrackYear = null;
let round = 1;
let history = [];
let gameActive = false;

let difficulty = 'Easy';
const secondsPerDifficulty = { Easy: 60, Mid: 45, Hard: 30 };

let spotifyPlayer = null;
let playlistUrl = '';
let deviceReady = false;
let deviceId = null;
let playlistTracks = [];

const dummyTrackUri = 'spotify:track:11dFghVXANMlKmJXsNCbNl';

// --- DOM ELEMENTS ---
const startBtn = document.getElementById('start-btn');
const difficultySelect = document.getElementById('difficulty');
const gameControls = document.getElementById('game-controls');
const infoEl = document.getElementById('info');
const goBtn = document.getElementById('go-btn');
const answerTimer = document.getElementById('answer-timer');
const countdownEl = document.getElementById('countdown');
const earlierBtn = document.getElementById('earlier-btn');
const laterBtn = document.getElementById('later-btn');
const nextTurnBtn = document.getElementById('next-turn');
const playAgainBtn = document.getElementById('play-again-btn');
const gameOverBtn = document.getElementById('game-over-btn');
const forceAnswerBtn = document.getElementById('force-answer-btn');
const scoreboardEl = document.getElementById('scoreboard');
const trumpetAudio = document.getElementById('trumpet-audio');
const errorEl = document.getElementById('error-message');
const setupDiv = document.getElementById('setup');
const loginDiv = document.getElementById('login');
const mainTitle = document.getElementById('main-title');
const facitInfo = document.getElementById('facit-info');
const historyLog = document.getElementById('history-log');

// --- Event listeners ---
if (difficultySelect) difficultySelect.addEventListener('change', e => difficulty = e.target.value);
if (goBtn) goBtn.addEventListener('click', startTurn);
if (earlierBtn) earlierBtn.addEventListener('click', () => evaluateGuess('earlier'));
if (laterBtn) laterBtn.addEventListener('click', () => evaluateGuess('later'));
if (nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);
if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
if (gameOverBtn) gameOverBtn.addEventListener('click', endGame);
if (forceAnswerBtn) forceAnswerBtn.addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.pause();
  clearInterval(timerInterval);
  startAnswerTimer();
});

// --- Setup-flow för namn och spellista ---
function initSetupFlow() {
  for (let i = 2; i <= 6; i++) {
    let btn = document.createElement('button');
    btn.textContent = i;
    btn.onclick = () => showNameFields(i);
    playerButtonsDiv.appendChild(btn);
  }
}

function showNameFields(count) {
  document.getElementById('player-count-select').classList.add('hidden');
  playerNameFieldsDiv.classList.remove('hidden');
  nameInputsDiv.innerHTML = '';
  for (let i = 0; i < count; i++) {
    let inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Player ' + (i + 1) + ' name';
    nameInputsDiv.appendChild(inp);
  }
}

if (continueBtn) continueBtn.onclick = () => {
  let names = Array.from(nameInputsDiv.querySelectorAll('input')).map(inp => inp.value.trim()).filter(Boolean);
  if (names.length < 1) return alert('Enter player names');
  localStorage.setItem('players', JSON.stringify(names));
  playerNameFieldsDiv.classList.add('hidden');
  playlistAndStartDiv.classList.remove('hidden');
};

if (playlistSelect) playlistSelect.onchange = e => {
  if (e.target.value === "own") {
    ownPlaylistInput.classList.remove('hidden');
  } else {
    ownPlaylistInput.classList.add('hidden');
  }
};

if (startBtn) startBtn.onclick = () => {
  let url = playlistSelect.value === "own" ? ownPlaylistInput.value.trim() : playlistSelect.value;
  if (!url) return alert('Välj spellista');
  localStorage.setItem('playlistUrl', url);
  localStorage.setItem('difficulty', difficultySelect.value);
  startGame();
};

// --- Login check ---
function checkAuthAndShow() {
  fetch('/token')
    .then(res => res.json())
    .then(data => {
      if (data.access_token) {
        loginDiv.classList.add('hidden');
        setupDiv.classList.remove('hidden');
      } else {
        loginDiv.classList.remove('hidden');
        setupDiv.classList.add('hidden');
      }
    });
}

// --- Game Flow ---
function startGame() {
  const storedPlayers = JSON.parse(localStorage.getItem("players") || "[]");
  const storedPlaylistUrl = localStorage.getItem("playlistUrl") || "";
  const storedDifficulty = localStorage.getItem("difficulty") || "Easy";

  if (storedPlayers.length < 1 || !storedPlaylistUrl) return showError("Missing players or playlist.");

  players = storedPlayers;
  scores = Array(players.length).fill(0);
  assignedYears = Array(players.length).fill(null);
  history = [];
  currentPlayer = 0;
  round = 1;
  gameActive = true;
  difficulty = storedDifficulty;
  playlistUrl = storedPlaylistUrl;
  hideError();

  const doStart = () => {
    setupDiv.classList.add('hidden');
    gameControls.classList.remove('hidden');
    if (mainTitle) mainTitle.classList.add('hidden');
    renderScoreboard();
    renderHistory();
    prepareTurn();
  };

  fetchPlaylistTracks(playlistUrl).then(tracks => {
    playlistTracks = tracks;
    doStart();
  });
}

function fetchPlaylistTracks(url) {
  let match = url.match(/(?:playlist\/|playlist:)([a-zA-Z0-9]+)/);
  if (!match) return Promise.resolve([]);
  let playlistId = match[1];

  return fetch(`/playlist/${playlistId}`)
    .then(res => res.json())
    .then(data => (data.tracks || []).filter(t => t && t.uri && t.type === "track"))
    .catch(() => []);
}

function prepareTurn() {
  if (!gameActive) return;
  stopAnswering();
  facitInfo.classList.add('hidden');
  currentTrackYear = null;

  const randomYear = Math.floor(Math.random() * (2022 - 1980 + 1)) + 1980;
  assignedYears[currentPlayer] = randomYear;

  infoEl.textContent = `${players[currentPlayer]}'s turn! Your reference year is ${randomYear}. Press GO!`;
  goBtn.classList.remove('hidden');
  answerTimer.classList.add('hidden');
  nextTurnBtn.classList.add('hidden');
  forceAnswerBtn.classList.add('hidden');
}

function startTurn() {
  goBtn.classList.add('hidden');
  facitInfo.classList.add('hidden');
  infoEl.textContent = `${players[currentPlayer]} is listening... Reference year: ${assignedYears[currentPlayer]}`;

  let musicDuration = secondsPerDifficulty[difficulty];
  countdownEl.textContent = musicDuration;
  answerTimer.classList.remove('hidden');
  earlierBtn.classList.add('hidden');
  laterBtn.classList.add('hidden');
  nextTurnBtn.classList.add('hidden');
  forceAnswerBtn.classList.remove('hidden');

  let trackUri = dummyTrackUri;
  if (playlistTracks.length > 0) {
    const randIdx = Math.floor(Math.random() * playlistTracks.length);
    trackUri = playlistTracks[randIdx].uri;
  }
  playSpotifyTrack(trackUri);
  currentTrackUri = trackUri;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    musicDuration--;
    countdownEl.textContent = musicDuration;
    if (musicDuration <= 0) {
      clearInterval(timerInterval);
      if (spotifyPlayer) spotifyPlayer.pause();
      startAnswerTimer();
    }
  }, 1000);
}

function evaluateGuess(direction) {
  stopAnswering();
  const trackId = currentTrackUri?.split(':')[2];
  if (!trackId) return;

  fetch(`/trackinfo/${trackId}`)
    .then(res => res.json())
    .then(data => {
      const releaseYear = data.album?.release_date?.slice(0, 4);
      if (!releaseYear || isNaN(parseInt(releaseYear))) {
        infoEl.textContent = "Could not determine release year.";
        playTrumpet();
        showFacit(data);
        return;
      }

      currentTrackYear = releaseYear;
      const assigned = assignedYears[currentPlayer];
      const actual = parseInt(releaseYear);
      let correct = false;

      if (direction === 'earlier' && actual < assigned) correct = true;
      if (direction === 'later' && actual > assigned) correct = true;

      if (correct) {
        scores[currentPlayer]++;
        infoEl.textContent = `Correct! The track is from ${actual}, compared to ${assigned}.`;
      } else {
        infoEl.textContent = `Wrong! The track is from ${actual}, not ${direction} than ${assigned}.`;
        playTrumpet();
      }

      renderScoreboard();

      // Visa alltid facit/coverart direkt efter svar
      showFacit(data);

      if (scores[currentPlayer] >= WINNING_SCORE) {
        infoEl.textContent = `${players[currentPlayer]} wins the game with ${scores[currentPlayer]} points! 🎉`;
        gameActive = false;
        nextTurnBtn.classList.add('hidden');
        goBtn.classList.add('hidden');
        earlierBtn.classList.add('hidden');
        laterBtn.classList.add('hidden');
        playAgainBtn.classList.remove('hidden');
        gameOverBtn.classList.remove('hidden');
        return;
      }

      facitInfo.classList.remove('hidden');
      nextTurnBtn.classList.remove('hidden');
    })
    .catch(() => {
      infoEl.textContent = "Error fetching track info.";
      playTrumpet();
      showFacit();
    });
}

function startAnswerTimer() {
  let answerTime = secondsPerDifficulty[difficulty];
  infoEl.textContent = "Now answer!";
  countdownEl.textContent = answerTime;
  earlierBtn.classList.remove('hidden');
  laterBtn.classList.remove('hidden');
  forceAnswerBtn.classList.add('hidden');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    answerTime--;
    countdownEl.textContent = answerTime;
    if (answerTime <= 0) {
      clearInterval(timerInterval);
      stopAnswering();
      infoEl.textContent = `${players[currentPlayer]} didn't answer in time!`;
      playTrumpet();
      // Visa facit även om man inte hann svara
      showFacit();
      setTimeout(nextTurn, 2000);
    }
  }, 1000);
}

function showFacit(existingData = null) {
  function renderFacit(data) {
    let year = "-";
    if (data.album?.release_date) {
      year = data.album.release_date.slice(0, 4);
      currentTrackYear = year;
    }
    facitInfo.innerHTML = `
      <img src="${data.album.images[0].url}" alt="Cover" style="max-width:150px;border-radius:8px;"><br>
      <div style="font-size:1.1em;margin-top:10px;font-weight:bold;">
        ${data.artists.map(a => a.name).join(", ")} – ${data.name} – ${year}
      </div>
    `;
    facitInfo.classList.remove('hidden');
  }

  if (existingData) {
    renderFacit(existingData);
  } else {
    let trackId = currentTrackUri?.split(":")[2];
    if (!trackId) return;
    fetch(`/trackinfo/${trackId}`)
      .then(res => res.json())
      .then(renderFacit)
      .catch(() => {
        facitInfo.innerHTML = "Could not fetch track info.";
        facitInfo.classList.remove('hidden');
      });
  }
}

function stopAnswering() {
  clearInterval(timerInterval);
  stopTrumpet();
  answerTimer.classList.add('hidden');
  earlierBtn.classList.add('hidden');
  laterBtn.classList.add('hidden');
  forceAnswerBtn.classList.add('hidden');
  if (spotifyPlayer) spotifyPlayer.pause().catch(() => {});
  nextTurnBtn.classList.remove('hidden');
}

function nextTurn() {
  stopAnswering();
  facitInfo.classList.add('hidden');

  if (currentPlayer === players.length - 1) {
    const roundScores = scores.map((score, i) => ({ player: players[i], score }));
    history.push({ round, scores: roundScores, round: round });
    renderHistory();
    round++;
  }

  currentPlayer = (currentPlayer + 1) % players.length;
  renderScoreboard();
  prepareTurn();
}

function renderScoreboard() {
  let scoreboardData = players.map((player, idx) => ({
    name: player,
    score: scores[idx],
    index: idx
  }));
  scoreboardData.sort((a, b) => b.score - a.score);

  const ordinal = n => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

  let html = `<table><tr><th>Place</th><th>Player</th><th>Points</th></tr>`;
  scoreboardData.forEach((entry, i) => {
    const place = ordinal(i + 1);
    const isActive = entry.index === currentPlayer;
    html += `<tr>
      <td>${place}</td>
      <td class="${isActive ? 'active-player' : ''}">${entry.name}</td>
      <td>${entry.score}</td>
    </tr>`;
  });
  html += `</table>`;
  scoreboardEl.innerHTML = html;
}

function renderHistory() {
  if (history.length === 0) { historyLog.innerHTML = ''; return; }
  let html = `<h3>Round History</h3>`;
  history.forEach(entry => {
    html += `<table><tr><th>Round ${entry.round}</th><th>Score</th></tr>`;
    entry.scores.forEach(p => {
      html += `<tr><td>${p.player}</td><td>${p.score}</td></tr>`;
    });
    html += `</table>`;
  });
  historyLog.innerHTML = html;
}

function resetGame() {
  localStorage.removeItem("players");
  localStorage.removeItem("playlistUrl");
  localStorage.removeItem("difficulty");
  scores = Array(players.length).fill(0);
  assignedYears = Array(players.length).fill(null);
  currentPlayer = 0;
  round = 1;
  history = [];
  gameActive = true;
  playAgainBtn.classList.add('hidden');
  gameOverBtn.classList.add('hidden');
  renderScoreboard();
  renderHistory();
  prepareTurn();
}

function endGame() {
  localStorage.removeItem("players");
  localStorage.removeItem("playlistUrl");
  localStorage.removeItem("difficulty");
  gameActive = false;
  playAgainBtn.classList.add('hidden');
  gameOverBtn.classList.add('hidden');
  gameControls.classList.add('hidden');
  setupDiv.classList.remove('hidden');
  loginDiv.classList.add('hidden');
  if (mainTitle) mainTitle.classList.remove('hidden');
}

function playTrumpet(delay = 0) {
  stopTrumpet();
  trumpetTimeout = setTimeout(() => {
    trumpetAudio.currentTime = 0;
    trumpetAudio.play();
  }, delay);
}

function stopTrumpet() {
  if (trumpetTimeout) clearTimeout(trumpetTimeout);
  trumpetTimeout = null;
  trumpetAudio.pause();
  trumpetAudio.currentTime = 0;
}

// --- Spotify SDK ---
window.onSpotifyWebPlaybackSDKReady = () => {
  fetch('/token')
    .then(res => res.json())
    .then(data => {
      spotifyPlayer = new Spotify.Player({
        name: 'Musicas',
        getOAuthToken: cb => cb(data.access_token),
        volume: 0.5
      });
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        window.spotifyDeviceId = device_id;
        deviceReady = true;
        deviceId = device_id;
      });
      spotifyPlayer.connect();
      window.spotifyPlayer = spotifyPlayer;
    });
};

function playSpotifyTrack(uri) {
  currentTrackUri = uri;
  if (spotifyPlayer && (deviceReady || window.spotifyDeviceId)) {
    const id = window.spotifyDeviceId || deviceId;
    spotifyPlayer._options.getOAuthToken(access_token => {
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
      });
    });
  } else {
    setTimeout(() => playSpotifyTrack(uri), 500);
  }
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function hideError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

// --- Auto Start if Data Exists ---
window.addEventListener("DOMContentLoaded", () => {
  checkAuthAndShow();
  initSetupFlow();
  setupDiv.classList.remove('hidden');
  gameControls.classList.add('hidden');
  if (mainTitle) mainTitle.classList.remove('hidden');
});
