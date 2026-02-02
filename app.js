const sources = [
  {
    id: "conversation-1",
    name: "Conversation cluster",
    type: "Conversation",
    intensity: 0.8,
    position: { x: 220, y: 150 },
    enabled: true,
  },
  {
    id: "appliance",
    name: "Kitchen appliance",
    type: "Appliance",
    intensity: 0.45,
    position: { x: 520, y: 240 },
    enabled: false,
  },
  {
    id: "traffic",
    name: "Street traffic",
    type: "Traffic",
    intensity: 0.6,
    position: { x: 320, y: 320 },
    enabled: false,
  },
];

const sourceList = document.querySelector("#source-list");
const connectBtn = document.querySelector("#connect-btn");
const startBtn = document.querySelector("#start-analysis-btn");
const simulateBtn = document.querySelector("#simulate-btn");
const connectionStatus = document.querySelector("#connection-status");
const cameraBtn = document.querySelector("#enable-camera-btn");
const cameraStatus = document.querySelector("#camera-status");
const inputDeviceSelect = document.querySelector("#input-device");
const startCaptureBtn = document.querySelector("#start-capture-btn");
const stopCaptureBtn = document.querySelector("#stop-capture-btn");
const captureStatus = document.querySelector("#capture-status");
const canvas = document.querySelector("#sound-map");
const ctx = canvas.getContext("2d");
const conversationBoost = document.querySelector("#conversation-boost");
const backgroundReduction = document.querySelector("#background-reduction");
const directionalFocus = document.querySelector("#directional-focus");
const rubinsteinGain = document.querySelector("#rubinstein-gain");

let draggingSource = null;

const typeColors = {
  Conversation: "#6c6eff",
  Appliance: "#7ff5d2",
  Traffic: "#ffb86c",
};

const audioState = {
  connected: false,
  analysisActive: false,
  cameraActive: false,
  captureActive: false,
};

let audioContext = null;
let micStream = null;
let micSource = null;
let micGain = null;
let outputGain = null;

const updateSourceList = () => {
  sourceList.innerHTML = "";
  sources.forEach((source) => {
    const card = document.createElement("div");
    card.className = "source-card";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = source.name;
    const meta = document.createElement("p");
    meta.className = "source-meta";
    meta.textContent = `${source.type} • ${Math.round(source.intensity * 100)}% intensity`;

    details.append(title, meta);

    const controls = document.createElement("div");
    controls.className = "source-controls";

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "toggle";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = source.enabled;
    toggle.addEventListener("change", () => {
      source.enabled = toggle.checked;
      drawSources();
    });
    toggleLabel.append(toggle, document.createTextNode("Amplify"));

    const gain = document.createElement("input");
    gain.type = "range";
    gain.min = "0";
    gain.max = "200";
    gain.value = Math.round(source.intensity * 100);
    gain.addEventListener("input", (event) => {
      source.intensity = Number(event.target.value) / 100;
      meta.textContent = `${source.type} • ${Math.round(source.intensity * 100)}% intensity`;
      drawSources();
    });

    controls.append(toggleLabel, gain);
    card.append(details, controls);
    sourceList.append(card);
  });
};

const drawSources = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0c14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  sources.forEach((source) => {
    const color = typeColors[source.type] ?? "#6c6eff";
    ctx.beginPath();
    const radius = 20 + source.intensity * 40;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = source.enabled ? 0.9 : 0.4;
    ctx.arc(source.position.x, source.position.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(source.position.x, source.position.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#f5f7ff";
    ctx.fillText(source.name, source.position.x + 10, source.position.y - 8);
  });
};

const getSourceAt = (x, y) =>
  sources.find((source) => {
    const dx = x - source.position.x;
    const dy = y - source.position.y;
    return Math.hypot(dx, dy) < 20;
  });

const updateConnectionStatus = (message) => {
  connectionStatus.textContent = `Status: ${message}`;
};

const updateCameraStatus = (message) => {
  cameraStatus.textContent = `Camera: ${message}`;
};

const updateCaptureStatus = (message) => {
  captureStatus.textContent = `Capture: ${message}`;
};

const getAudioConstraints = () => {
  const deviceId = inputDeviceSelect?.value;
  return deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true };
};

const updateRubinsteinGain = () => {
  if (!micGain) return;
  const boost = Number(conversationBoost.value) / 100;
  const reduction = Number(backgroundReduction.value) / 100;
  const focus = Number(directionalFocus.value) / 100;
  const motionGain = Number(rubinsteinGain.value) / 100;
  const computedGain = Math.max(0, (boost * 0.6 + focus * 0.4) * motionGain * (1 - reduction * 0.5));
  micGain.gain.value = Math.min(3, computedGain);
};

const startCapture = async () => {
  if (audioState.captureActive) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    updateCaptureStatus("Microphone API unavailable.");
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
    audioContext = audioContext ?? new AudioContext();
    micSource = audioContext.createMediaStreamSource(micStream);
    micGain = audioContext.createGain();
    outputGain = audioContext.createGain();

    updateRubinsteinGain();
    outputGain.gain.value = 0.9;

    micSource.connect(micGain).connect(outputGain).connect(audioContext.destination);
    audioState.captureActive = true;
    updateCaptureStatus("Live mic capture streaming to headphones.");
    startCaptureBtn.disabled = true;
    stopCaptureBtn.disabled = false;
  } catch (error) {
    updateCaptureStatus("Microphone permission denied.");
  }
};

const stopCapture = () => {
  if (!audioState.captureActive) return;
  micStream?.getTracks().forEach((track) => track.stop());
  micSource?.disconnect();
  micGain?.disconnect();
  outputGain?.disconnect();
  audioState.captureActive = false;
  updateCaptureStatus("Off");
  startCaptureBtn.disabled = false;
  stopCaptureBtn.disabled = true;
};

const populateInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((device) => device.kind === "audioinput");
  inputDeviceSelect.innerHTML = "";
  inputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Microphone ${index + 1}`;
    inputDeviceSelect.append(option);
  });
};

const connectHeadphones = async () => {
  if (!navigator.bluetooth) {
    updateConnectionStatus("Web Bluetooth not supported in this browser.");
    return;
  }

  try {
    updateConnectionStatus("Scanning for headphones...");
    await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["battery_service"],
    });
    audioState.connected = true;
    updateConnectionStatus("Connected (simulated). Ready to stream.");
  } catch (error) {
    updateConnectionStatus("Connection cancelled.");
  }
};

const startAnalysis = () => {
  audioState.analysisActive = !audioState.analysisActive;
  startBtn.textContent = audioState.analysisActive ? "Stop room analysis" : "Start room analysis";
  if (audioState.analysisActive) {
    updateConnectionStatus(
      audioState.connected
        ? "Streaming focused mix to headphones."
        : "Analysis running locally. Connect headphones to stream."
    );
  } else {
    updateConnectionStatus(audioState.connected ? "Connected (idle)." : "Not connected");
  }
};

const enableCamera = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    updateCameraStatus("Camera API unavailable.");
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    audioState.cameraActive = true;
    updateCameraStatus("Micro-motion capture active.");
  } catch (error) {
    updateCameraStatus("Camera permission denied.");
  }
};

const randomizeSources = () => {
  sources.forEach((source) => {
    source.position.x = 120 + Math.random() * 480;
    source.position.y = 100 + Math.random() * 220;
    source.intensity = Math.min(1, Math.max(0.2, source.intensity + (Math.random() - 0.5) * 0.2));
  });
  updateSourceList();
  drawSources();
};

canvas.addEventListener("mousedown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  draggingSource = getSourceAt(x, y);
});

canvas.addEventListener("mousemove", (event) => {
  if (!draggingSource) return;
  const rect = canvas.getBoundingClientRect();
  draggingSource.position.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  draggingSource.position.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  drawSources();
});

canvas.addEventListener("mouseup", () => {
  draggingSource = null;
});

canvas.addEventListener("mouseleave", () => {
  draggingSource = null;
});

connectBtn.addEventListener("click", connectHeadphones);
startBtn.addEventListener("click", startAnalysis);
simulateBtn.addEventListener("click", randomizeSources);
cameraBtn.addEventListener("click", enableCamera);
startCaptureBtn.addEventListener("click", startCapture);
stopCaptureBtn.addEventListener("click", stopCapture);
conversationBoost.addEventListener("input", updateRubinsteinGain);
backgroundReduction.addEventListener("input", updateRubinsteinGain);
directionalFocus.addEventListener("input", updateRubinsteinGain);
rubinsteinGain.addEventListener("input", updateRubinsteinGain);

updateSourceList();
drawSources();
populateInputDevices();
