// --- Integrated from UI ---
const storedPlayers = JSON.parse(localStorage.getItem("players") || "[]");
const storedPlaylistUrl = localStorage.getItem("playlistUrl") || "";
const storedDifficulty = localStorage.getItem("difficulty") || "Easy";

window.addEventListener("load", () => {
  if (storedPlayers.length > 0 && storedPlaylistUrl) {
    players = storedPlayers;
    scores = Array(players.length).fill(0);
    assignedYears = Array(players.length).fill(null);
    playlistUrl = storedPlaylistUrl;
    difficulty = storedDifficulty;
    round = 1;
    currentPlayer = 0;
    gameActive = true;

    fetchPlaylistTracks(playlistUrl).then(tracks => {
      playlistTracks = tracks;
      setupDiv.classList.add('hidden');
      gameControls.classList.remove('hidden');
      renderScoreboard();
      renderHistory();
      prepareTurn();
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loginDiv = document.getElementById("login");
  const setupDiv = document.getElementById("setup");
  const playerButtonsDiv = document.getElementById("player-buttons");
  const playerNameFields = document.getElementById("player-name-fields");
  const nameInputsDiv = document.getElementById("name-inputs");
  const continueBtn = document.getElementById("continue-to-playlist");
  const playlistAndStart = document.getElementById("playlist-and-start");
  const playlistSelect = document.getElementById("playlist-select");
  const ownPlaylistInput = document.getElementById("own-playlist-input");

  fetch('/token').then(res => res.json()).then(data => {
    if (data.access_token) {
      loginDiv.classList.add("hidden");
      setupDiv.classList.remove("hidden");
    }
  });

  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.addEventListener("click", () => {
      nameInputsDiv.innerHTML = "";
      for (let j = 1; j <= i; j++) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Player " + j;
        input.required = true;
        nameInputsDiv.appendChild(input);
      }
      playerNameFields.classList.remove("hidden");
    });
    playerButtonsDiv.appendChild(btn);
  }

  continueBtn.addEventListener("click", () => {
    playlistAndStart.classList.remove("hidden");
  });

  playlistSelect.addEventListener("change", () => {
    if (playlistSelect.value === "own") {
      ownPlaylistInput.classList.remove("hidden");
    } else {
      ownPlaylistInput.classList.add("hidden");
    }
  });
});

function startGame(players, playlistUrl, difficulty) {
  // Store values in localStorage (optional, or adapt to your structure)
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("playlistUrl", playlistUrl);
  localStorage.setItem("difficulty", difficulty);

  // Here you could redirect or call backend logic
  console.log("Starting game with:", { players, playlistUrl, difficulty });

  // Replace the following with your backend start logic
  window.location.href = "/"; // or load game view dynamically
}

document.getElementById("start-btn").addEventListener("click", () => {
  const nameInputs = document.querySelectorAll("#name-inputs input");
  const players = Array.from(nameInputs).map(input => input.value.trim()).filter(Boolean);

  const playlistDropdown = document.getElementById("playlist-select");
  const selected = playlistDropdown.value;
  const ownInput = document.getElementById("own-playlist-input");
  const playlistUrl = selected === "own" ? ownInput.value.trim() : selected;

  const difficulty = document.getElementById("difficulty").value;

  if (players.length === 0) {
    alert("Please enter player names.");
    return;
  }

  if (!playlistUrl) {
    alert("Please select or enter a playlist.");
    return;
  }

  startGame(players, playlistUrl, difficulty);
});
