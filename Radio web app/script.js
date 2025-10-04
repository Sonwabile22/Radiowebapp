const player = document.getElementById('player');
const modeDiv = document.getElementById('mode');
const skipBtn = document.getElementById('skipBtn');
const ecrButton = document.getElementById('playECRadio');
const trackFolderInput = document.getElementById('trackFolder');
const currentTrackDiv = document.getElementById('currentTrack');
const nextTracksList = document.getElementById('nextTracks');
const progressBar = document.getElementById('progressBar');
const timerDiv = document.getElementById('timer');

let isRadioMode = true;
let playlistQueue = [];
let currentTrack = null;
let timer = 0;
let tracks = [];

const LIVE_RADIO = "https://edge.iono.fm:80/EC/ecrlow.aac";

// ===== Helpers =====
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2,'0');
  const s = String(Math.floor(seconds % 60)).padStart(2,'0');
  return `${m}:${s}`;
}

function updateQueueDisplay() {
  currentTrackDiv.textContent = currentTrack ? (currentTrack.name || currentTrack.split('/').pop()) : 'None';
  nextTracksList.innerHTML = playlistQueue.slice(0, 3)
    .map(t => `<li>${t.name || t.split('/').pop()}</li>`)
    .join('');
}

// Update progress bar and timer
function updateProgress() {
  if (player.duration > 0) {
    const percent = (player.currentTime / player.duration) * 100;
    progressBar.style.width = percent + "%";
    timerDiv.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
  } else {
    progressBar.style.width = "0%";
    timerDiv.textContent = "00:00 / 00:00";
  }
}

// Play voiceover using browser TTS
function playVoiceover(song) {
  return new Promise(resolve => {
    const fileName = song.name || song.split('/').pop();
    const [requester, title] = fileName.replace('.mp3', '').split(' - ');
    const msg = `Now playing ${title} requested by ${requester}`;
    modeDiv.textContent = `Voiceover: ${msg}`;

    const utter = new SpeechSynthesisUtterance(msg);
    utter.onend = resolve;
    speechSynthesis.speak(utter);
  });
}

// Play next track in playlist
async function playNextTrack() {
  if (isRadioMode || playlistQueue.length === 0) return;

  currentTrack = playlistQueue.shift();
  if (!currentTrack) return;
  playlistQueue.push(currentTrack);
  updateQueueDisplay();

  await playVoiceover(currentTrack);

  if (currentTrack instanceof File) {
    player.src = URL.createObjectURL(currentTrack);
  } else if (typeof currentTrack === "string") {
    player.src = currentTrack;
  } else return;

  player.play().catch(err => console.log("Playlist playback error:", err));
  player.onended = playNextTrack;
}

// ===== Event Listeners =====
trackFolderInput.addEventListener('change', (e) => {
  tracks = Array.from(e.target.files).filter(f => f.name.endsWith('.mp3'));
  playlistQueue = shuffle([...tracks]);
  updateQueueDisplay();
});

ecrButton.addEventListener('click', () => {
  isRadioMode = true;
  playRadioMode();
});

skipBtn.addEventListener('click', () => {
  if (isRadioMode) return;
  playNextTrack();
});

// ===== Radio Mode Function (with HLS.js support) =====
function playRadioMode() {
  modeDiv.textContent = "Playing East Coast Radio";
  skipBtn.disabled = true;
  currentTrack = null;
  updateQueueDisplay();

  // Voiceover for live radio
  const utter = new SpeechSynthesisUtterance("Now playing East Coast Radio 94.0 FM");
  speechSynthesis.speak(utter);

  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(LIVE_RADIO);
    hls.attachMedia(player);
    hls.on(Hls.Events.MANIFEST_PARSED, () => player.play().catch(console.log));
  } else if (player.canPlayType('audio/aac')) {
    player.src = LIVE_RADIO;
    player.play().catch(console.log);
  } else {
    console.log("Your browser cannot play this stream directly.");
  }
}

// ===== Mode Switching (Accelerated for Testing) =====
function switchMode() {
  timer++;
  if (isRadioMode && timer >= 6) {
    if (tracks.length === 0) return;
    isRadioMode = false;
    playlistQueue = shuffle([...tracks]);
    skipBtn.disabled = false;
    playNextTrack();
    timer = 0;
  } else if (!isRadioMode && timer >= 3) {
    isRadioMode = true;
    playRadioMode();
    timer = 0;
  }
}

// ===== Update Progress Bar Continuously =====
setInterval(updateProgress, 500);

// ===== Start Simulation =====
playRadioMode();
setInterval(switchMode, 1000);
