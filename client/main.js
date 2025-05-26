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
