// --- GAME STATE & SPOTIFY ---
const WINNING_SCORE = 20;
let trumpetTimeout = null;
let timerInterval = null;
let currentPlayer = 0;
let players = [];
let scores = [];
let round = 1;
let gameActive = false;
let assignedYears = [];
let currentTrackYear = null;
let history = [];

let difficulty = 'Easy';
const secondsPerDifficulty = { Easy: 60, Mid: 45, Hard: 30 };

let spotifyPlayer = null;
let currentTrackUri = null;
let playlistUrl = '';
let deviceReady = false;
let deviceId = null;
let playlistTracks = [];
const dummyTrackUri = 'spotify:track:11dFghVXANMlKmJXsNCbNl';

// --- DOM ELEMENTS ---
const playerNameInput = document.getElementById('player-names');
const playlistInput = document.getElementById('playlist-url');
const startBtn = document.getElementById('start-btn');
const difficultySelect = document.getElementById('difficulty');
const gameControls = document.getElementById('game-controls');
const infoEl = document.getElementById('info');
const goBtn = document.getElementById('go-btn');
const answerTimer = document.getElementById('answer-timer');
const countdownEl = document.getElementById('countdown');
const stopBtn = document.getElementById('stop-btn');
const earlierBtn = document.getElementById('earlier-btn');
const laterBtn = document.getElementById('later-btn');
const nextTurnBtn = document.getElementById('next-turn');
const scoreboardEl = document.getElementById('scoreboard');
const trumpetAudio = document.getElementById('trumpet-audio');
const errorEl = document.getElementById('error-message');
const setupDiv = document.getElementById('setup');
const loginDiv = document.getElementById('login');
const loginBtn = document.getElementById('login-btn');
const loginBtnLink = document.getElementById('login-btn-link');
const facitBtn = document.getElementById('facit-btn');
const facitInfo = document.getElementById('facit-info');
const historyLog = document.getElementById('history-log');
const playAgainBtn = document.getElementById('play-again-btn');
const gameOverBtn = document.getElementById('game-over-btn');

// --- INIT ---
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
checkAuthAndShow();

// --- EVENT LISTENERS ---
startBtn?.addEventListener('click', startGame);
difficultySelect?.addEventListener('change', e => difficulty = e.target.value);
goBtn?.addEventListener('click', startTurn);
earlierBtn?.addEventListener('click', () => evaluateGuess('earlier'));
laterBtn?.addEventListener('click', () => evaluateGuess('later'));
nextTurnBtn?.addEventListener('click', nextTurn);
loginBtn?.addEventListener('click', e => { e.preventDefault(); window.location.href = "/login" });
loginBtnLink?.addEventListener('click', e => { e.preventDefault(); window.location.href = "/login" });
facitBtn?.addEventListener('click', showFacit);
playAgainBtn?.addEventListener('click', resetGame);
gameOverBtn?.addEventListener('click', endGame);

// --- GAME FLOW ---
function startGame() {
  players = playerNameInput.value.split(',').map(n => n.trim()).filter(Boolean);
  playlistUrl = playlistInput.value.trim();
  if (players.length < 1) return showError("Please enter at least one player.");

  scores = Array(players.length).fill(0);
  assignedYears = Array(players.length).fill(null);
  currentPlayer = 0;
  round = 1;
  history = [];
  gameActive = true;
  hideError();

  const onStart = () => {
    setupDiv.classList.add('hidden');
    gameControls.classList.remove('hidden');
    renderScoreboard();
    renderHistory();
    prepareTurn();
  };

  if (playlistUrl) {
    fetchPlaylistTracks(playlistUrl).then(tracks => {
      if (tracks.length > 0) {
        playlistTracks = tracks;
        onStart();
      } else showError("No tracks found in playlist.");
    });
  } else {
    playlistTracks = [];
    onStart();
  }
}

function fetchPlaylistTracks(url) {
  const match = url.match(/playlist[/:]([a-zA-Z0-9]+)/);
  if (!match) return Promise.resolve([]);
  const playlistId = match[1];

  return fetch(`/playlist/${playlistId}`)
    .then(res => res.json())
    .then(data => data.tracks?.filter(t => t.uri && t.type === "track") || [])
    .catch(() => []);
}

function prepareTurn() {
  if (!gameActive) return;
  stopAnswering();
  facitBtn.classList.add('hidden');
  facitInfo.classList.add('hidden');
  currentTrackYear = null;

  const year = Math.floor(Math.random() * (2022 - 1980 + 1)) + 1980;
  assignedYears[currentPlayer] = year;
  infoEl.textContent = `${players[currentPlayer]}'s turn! Your reference year is ${year}. Press GO! to start.`;
  goBtn.classList.remove('hidden');
  nextTurnBtn.classList.add('hidden');
}

function startTurn() {
  goBtn.classList.add('hidden');
  infoEl.textContent = `${players[currentPlayer]} is listening...`;
  let seconds = secondsPerDifficulty[difficulty];
  countdownEl.textContent = seconds;
  answerTimer.classList.remove('hidden');
  earlierBtn.classList.add('hidden');
  laterBtn.classList.add('hidden');

  const track = playlistTracks.length ? playlistTracks[Math.floor(Math.random() * playlistTracks.length)].uri : dummyTrackUri;
  playSpotifyTrack(track);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    countdownEl.textContent = --seconds;
    if (seconds <= 0) {
      clearInterval(timerInterval);
      spotifyPlayer?.pause();
      startAnswerTimer();
    }
  }, 1000);
}

function startAnswerTimer() {
  let seconds = secondsPerDifficulty[difficulty];
  infoEl.textContent = "Now answer!";
  countdownEl.textContent = seconds;
  facitBtn.classList.remove('hidden');
  earlierBtn.classList.remove('hidden');
  laterBtn.classList.remove('hidden');

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    countdownEl.textContent = --seconds;
    if (seconds <= 0) {
      clearInterval(timerInterval);
      stopAnswering();
      infoEl.textContent = `${players[currentPlayer]} didn't answer in time!`;
      playTrumpet();
      setTimeout(nextTurn, 2000);
    }
  }, 1000);
}

function stopAnswering() {
  clearInterval(timerInterval);
  stopTrumpet();
  answerTimer.classList.add('hidden');
  earlierBtn.classList.add('hidden');
  laterBtn.classList.add('hidden');
  facitBtn.classList.remove('hidden');
  nextTurnBtn.classList.remove('hidden');
  spotifyPlayer?.pause();
}

function evaluateGuess(direction) {
  stopAnswering();
  const assigned = assignedYears[currentPlayer];
  const actual = parseInt(currentTrackYear);
  const correct = (direction === 'earlier' && actual < assigned) || (direction === 'later' && actual > assigned);

  if (correct) {
    scores[currentPlayer]++;
    infoEl.textContent = `Correct! The track is from ${actual}, your year was ${assigned}.`;
  } else {
    infoEl.textContent = `Wrong! The track is from ${actual}, not ${direction} than ${assigned}.`;
    playTrumpet();
  }

  renderScoreboard();

  if (scores[currentPlayer] >= WINNING_SCORE) {
    infoEl.textContent = `${players[currentPlayer]} wins with ${scores[currentPlayer]} points! 🎉`;
    gameActive = false;
    nextTurnBtn.classList.add('hidden');
    goBtn.classList.add('hidden');
    earlierBtn.classList.add('hidden');
    laterBtn.classList.add('hidden');
    playAgainBtn.classList.remove('hidden');
    gameOverBtn.classList.remove('hidden');
    return;
  }
}

function nextTurn() {
  stopAnswering();
  facitBtn.classList.add('hidden');
  facitInfo.classList.add('hidden');
  if (currentPlayer === players.length - 1) {
    const roundScores = scores.map((s, i) => ({ player: players[i], score: s }));
    history.push({ round, scores: roundScores });
    renderHistory();
    round++;
  }
  currentPlayer = (currentPlayer + 1) % players.length;
  renderScoreboard();
  prepareTurn();
}

function renderScoreboard() {
  let data = players.map((name, i) => ({ name, score: scores[i], index: i }));
  data.sort((a, b) => b.score - a.score);
  function ordinal(n) { return ["1st", "2nd", "3rd"][n - 1] || `${n}th`; }
  let html = `<table><tr><th>Place</th><th>Player</th><th>Points</th></tr>`;
  data.forEach((p, i) => {
    const active = p.index === currentPlayer ? 'active-player' : '';
    html += `<tr><td>${ordinal(i + 1)}</td><td class="${active}">${p.name}</td><td>${p.score}</td></tr>`;
  });
  html += `</table>`;
  scoreboardEl.innerHTML = html;
}

function renderHistory() {
  if (!history.length) return;
  let html = `<h3>Round History</h3>`;
  history.forEach(r => {
    html += `<table><tr><th>Round ${r.round}</th><th>Score</th></tr>`;
    r.scores.forEach(p => html += `<tr><td>${p.player}</td><td>${p.score}</td></tr>`);
    html += `</table>`;
  });
  historyLog.innerHTML = html;
}

function resetGame() {
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
  gameActive = false;
  playAgainBtn.classList.add('hidden');
  gameOverBtn.classList.add('hidden');
  gameControls.classList.add('hidden');
  setupDiv.classList.remove('hidden');
  loginDiv.classList.add('hidden');
}

// --- SPOTIFY ---
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
    });
};

function playSpotifyTrack(uri) {
  currentTrackUri = uri;
  const id = window.spotifyDeviceId || deviceId;
  if (spotifyPlayer && id) {
    spotifyPlayer._options.getOAuthToken(token => {
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [uri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
    });
  } else {
    setTimeout(() => playSpotifyTrack(uri), 500);
  }
}

function showFacit() {
  const id = currentTrackUri?.split(':')[2];
  if (!id) return;
  fetch(`/trackinfo/${id}`)
    .then(res => res.json())
    .then(data => {
      currentTrackYear = data.album?.release_date?.slice(0, 4);
      if (!data.album?.images?.length) return facitInfo.innerText = "No data.";
      facitInfo.innerHTML = `
        <img src="${data.album.images[0].url}" style="max-width:150px;border-radius:8px;"><br>
        <div style="font-size:1.1em;margin-top:10px;font-weight:bold;">
          ${data.artists.map(a => a.name).join(", ")} – ${data.name} – ${currentTrackYear}
        </div>`;
      facitInfo.classList.remove('hidden');
    })
    .catch(() => facitInfo.innerText = "Error loading track info.");
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

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}
function hideError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}
