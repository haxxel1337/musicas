// --- SETUP FLOW ---
const playerButtonsDiv = document.getElementById('player-buttons');
const playerNameFieldsDiv = document.getElementById('player-name-fields');
const nameInputsDiv = document.getElementById('name-inputs');
const continueBtn = document.getElementById('continue-to-playlist');
const playlistAndStartDiv = document.getElementById('playlist-and-start');
const playlistSelect = document.getElementById('playlist-select');
const ownPlaylistInput = document.getElementById('own-playlist-input');

// --- GAME STATE & SPOTIFY ---
const WINNING_SCORE = 10; // MAX 10 RÄTT!

let trumpetTimeout = null;
let timerInterval = null;
let currentPlayer = 0;
let players = [];
let scores = [];
let playerYears = []; // varje spelares intervall-år
let currentTrackUri = null;
let currentTrackYear = null;
let round = 1;
let gameActive = false;

let difficulty = 'Easy';
const secondsPerDifficulty = { Easy: 60, Mid: 45, Hard: 30 };

let spotifyPlayer = null;
let playlistUrl = '';
let deviceReady = false;
let deviceId = null;
let playlistTracks = [];
let unplayedTracks = [];

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

// --- Event listeners ---
if (difficultySelect) difficultySelect.addEventListener('change', e => difficulty = e.target.value);
if (goBtn) goBtn.addEventListener('click', startTurn);
if (nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);
if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame);
if (gameOverBtn) gameOverBtn.addEventListener('click', endGame);
if (forceAnswerBtn) forceAnswerBtn.addEventListener('click', () => {
  if (spotifyPlayer) spotifyPlayer.pause();
  clearInterval(timerInterval);
  forceAnswerBtn.classList.add('hidden');
  showAnswerAlternatives();
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
  playerYears = players.map(() => []); // EN array per spelare
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
    prepareTurn();
  };

  fetchPlaylistTracks(playlistUrl).then(tracks => {
    playlistTracks = tracks;
    unplayedTracks = tracks.slice();
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

  // Vid ny runda: Om spelaren inte har år, tilldela referensår:
  if (playerYears[currentPlayer].length === 0) {
    const randomYear = Math.floor(Math.random() * (2022 - 1980 + 1)) + 1980;
    playerYears[currentPlayer].push(randomYear);
  }

  let years = playerYears[currentPlayer].slice().sort((a, b) => a - b);
  infoEl.textContent = `${players[currentPlayer]}'s turn! Your reference year(s): ${years.join(", ")}. Press GO!`;
  goBtn.classList.remove('hidden');
  answerTimer.classList.add('hidden');
  nextTurnBtn.classList.add('hidden');
  forceAnswerBtn.classList.add('hidden');
}

function startTurn() {
  goBtn.classList.add('hidden');
  facitInfo.classList.add('hidden');
  let years = playerYears[currentPlayer].slice().sort((a, b) => a - b);
  infoEl.innerHTML = `${players[currentPlayer]} is listening...<br><span style="font-size:0.97em;">Reference year(s): ${years.join(", ")}</span>`;

  let musicDuration = secondsPerDifficulty[difficulty];
  countdownEl.textContent = musicDuration;
  answerTimer.classList.remove('hidden');
  nextTurnBtn.classList.add('hidden');
  forceAnswerBtn.classList.remove('hidden');

  let trackUri = dummyTrackUri;
  if (unplayedTracks.length > 0) {
    const randIdx = Math.floor(Math.random() * unplayedTracks.length);
    trackUri = unplayedTracks[randIdx].uri;
    unplayedTracks.splice(randIdx, 1);
  } else if (playlistTracks.length > 0) {
    unplayedTracks = playlistTracks.slice();
    const randIdx = Math.floor(Math.random() * unplayedTracks.length);
    trackUri = unplayedTracks[randIdx].uri;
    unplayedTracks.splice(randIdx, 1);
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

function showAnswerAlternatives() {
  answerTimer.classList.remove('hidden');
  let years = playerYears[currentPlayer].slice().sort((a, b) => a - b);
  renderAnswerButtons(years);
}

function renderAnswerButtons(years) {
  // Ta bort gamla knappar
  Array.from(document.querySelectorAll('.dynamic-answer')).forEach(btn => btn.remove());
  years = years.slice().sort((a, b) => a - b);

  // 1. Earlier först
  let earlierBtnD = document.createElement('button');
  earlierBtnD.className = 'dynamic-answer';
  earlierBtnD.textContent = `Earlier than ${years[0]}`;
  earlierBtnD.onclick = () => evaluateGuessDynamic('earlier', years[0]);
  answerTimer.parentNode.insertBefore(earlierBtnD, answerTimer.nextSibling);

  // 2. Alla "Between"
  let afterEl = earlierBtnD;
  for (let i = 0; i < years.length - 1; i++) {
    let y1 = years[i], y2 = years[i+1];
    let betweenBtn = document.createElement('button');
    betweenBtn.className = 'dynamic-answer';
    betweenBtn.textContent = `Between ${y1} - ${y2}`;
    betweenBtn.onclick = () => evaluateGuessDynamic('between', [y1, y2]);
    afterEl.parentNode.insertBefore(betweenBtn, afterEl.nextSibling);
    afterEl = betweenBtn;
  }

  // 3. Later sist
  let laterBtnD = document.createElement('button');
  laterBtnD.className = 'dynamic-answer';
  laterBtnD.textContent = `Later than ${years[years.length - 1]}`;
  laterBtnD.onclick = () => evaluateGuessDynamic('later', years[years.length - 1]);
  afterEl.parentNode.insertBefore(laterBtnD, afterEl.nextSibling);
}

function startAnswerTimer() {
  let answerTime = secondsPerDifficulty[difficulty];
  infoEl.textContent = "Now answer!";
  countdownEl.textContent = answerTime;
  clearInterval(timerInterval);

  // Visa alternativen (nu via showAnswerAlternatives)
  showAnswerAlternatives();

  timerInterval = setInterval(() => {
    answerTime--;
    countdownEl.textContent = answerTime;
    if (answerTime <= 0) {
      clearInterval(timerInterval);
      stopAnswering();
      infoEl.textContent = `${players[currentPlayer]} didn't answer in time!`;
      playTrumpet();
      showFacit();
      setTimeout(nextTurn, 2000);
    }
  }, 1000);
}

function evaluateGuessDynamic(type, value) {
  stopAnswering();
  const trackId = currentTrackUri?.split(':')[2];
  if (!trackId) return;

  fetch(`/trackinfo/${trackId}`)
    .then(res => res.json())
    .then(data => {
      const releaseYear = parseInt(data.album?.release_date?.slice(0, 4));
      if (!releaseYear || isNaN(releaseYear)) {
        infoEl.textContent = "Could not determine release year.";
        playTrumpet();
        showFacit(data);
        return;
      }
      let years = playerYears[currentPlayer].slice().sort((a, b) => a - b);
      let correct = false;
      if (type === 'earlier') {
        correct = (releaseYear < value);
      } else if (type === 'between') {
        correct = (releaseYear >= value[0] && releaseYear <= value[1]);
      } else if (type === 'later') {
        correct = (releaseYear > value);
      }

      if (correct) {
        playerYears[currentPlayer].push(releaseYear);
        infoEl.textContent = `Correct! The track is from ${releaseYear}.`;
        scores[currentPlayer]++;
      } else {
        infoEl.textContent = `Wrong! The track is from ${releaseYear}. Your intervals remain as before.`;
        playTrumpet();
      }

      renderScoreboard();
      showFacit(data);

      if (scores[currentPlayer] >= WINNING_SCORE) {
        infoEl.textContent = `${players[currentPlayer]} wins the game with ${scores[currentPlayer]} points! 🎉`;
        gameActive = false;
        nextTurnBtn.classList.add('hidden');
        goBtn.classList.add('hidden');
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

function stopAnswering() {
  clearInterval(timerInterval);
  Array.from(document.querySelectorAll('.dynamic-answer')).forEach(btn => btn.remove());
  answerTimer.classList.add('hidden');
  if (spotifyPlayer) spotifyPlayer.pause().catch(() => {});
  nextTurnBtn.classList.remove('hidden');
}

function nextTurn() {
  stopAnswering();
  facitInfo.classList.add('hidden');
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

function resetGame() {
  localStorage.removeItem("players");
  localStorage.removeItem("playlistUrl");
  localStorage.removeItem("difficulty");
  scores = Array(players.length).fill(0);
  playerYears = players.map(() => []);
  currentPlayer = 0;
  round = 1;
  gameActive = true;
  playAgainBtn.classList.add('hidden');
  gameOverBtn.classList.add('hidden');
  renderScoreboard();
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
