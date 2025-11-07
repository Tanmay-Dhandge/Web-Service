// --- CONFIGURATION ---
// 1. Set your Render backend URL (find this on your Render dashboard)
const SERVER_URL = "https://web-service-ae9n.onrender.com"; 

// 2. Set your ESP32-CAM Stream URL (find this in the Arduino Serial Monitor after flashing the camera)
const CAMERA_STREAM_URL = "http://192.168.1.10/stream"; // <-- IMPORTANT: Change this IP
// --- END CONFIGURATION ---


// --- SOCKET.IO & STATE ---
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status');
const modeToggle = document.getElementById('mode-toggle');

// Global state for controls (to prevent spamming clicks)
let isManualMode = false;
let controlState = {
  fan: 0, // 0 = OFF, 1 = ON
  light: 0,
  door: 0 // 0 = CLOSED, 1 = OPEN
};

const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log('Connected to server!');
  statusDot.style.background = '#10b981'; // Green
  statusText.innerText = 'Connected';
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
  statusDot.style.background = '#ef4444'; // Red
  statusText.innerText = 'Disconnected';
});

// --- DATA HANDLING ---
// This is the main event listener for all sensor data
socket.on('update', (data) => {
  // console.log('Received data:', data); // Uncomment for debugging

  // Environment Card
  updateElement('envTemp', data.envTemp, 1);
  updateElement('envHum', data.envHum, 1);
  updateElement('envPress', data.envPress, 1);
  updateElement('dhtTemp', data.dhtTemp, 1);
  updateElement('bmpTemp', data.bmpTemp, 1);

  // Air Quality Card
  updateElement('mqStatus', data.mqStatus);
  updateElement('mqRaw', data.mqRaw);
  updateElement('mqIssue', data.mqIssue, null, data.mqIssue === "None" ? "#10b981" : "#b91c1c");

  // RFID Card
  updateElement('rfidUid', data.rfidUid);
  updateElement('rfidAccess', data.rfidAccess, null, data.rfidAccess === "Granted" ? "#10b981" : "#b91c1c");

  // Update control panel UI based on state from hardware
  if (data.controls) {
    controlState = data.controls;
    updateControlUI();
  }
});

// Helper to safely update text
function updateElement(id, value, dp = 0, color = null) {
  const el = document.getElementById(id);
  if (el) {
    if (value !== undefined && value !== null) {
      el.innerText = (typeof value === 'number') ? value.toFixed(dp) : value;
    } else {
      el.innerText = '--';
    }
    if (color) {
      el.style.color = color;
    }
  }
}

// --- VIEW NAVIGATION ---
function showView(viewName) {
  document.getElementById('dashboard-view').style.display = viewName === 'dashboard' ? 'block' : 'none';
  document.getElementById('surveillance-view').style.display = viewName === 'surveillance' ? 'block' : 'none';

  document.getElementById('btn-dashboard').classList.toggle('active', viewName === 'dashboard');
  document.getElementById('btn-surveillance').classList.toggle('active', viewName === 'surveillance');

  if (viewName === 'surveillance') {
    // Start the camera feed
    document.getElementById('liveFeed').src = CAMERA_STREAM_URL;
  } else {
    // Stop the camera feed to save bandwidth
    document.getElementById('liveFeed').src = "";
  }
}
// Set initial view
showView('dashboard');


// --- CONTROL PANEL ---
modeToggle.addEventListener('change', () => {
  isManualMode = modeToggle.checked;
  document.querySelectorAll('.control-item').forEach(el => {
    el.classList.toggle('disabled', !isManualMode);
  });
});

// Functions to send control commands
function toggleFan() {
  if (!isManualMode) return;
  console.log('Toggling Fan');
  socket.emit('toggleControl', { device: 'fan' });
}

function toggleLight() {
  if (!isManualMode) return;
  console.log('Toggling Light');
  socket.emit('toggleControl', { device: 'light' });
}

function toggleDoor() {
  if (!isManualMode) return;
  console.log('Toggling Door');
  socket.emit('toggleControl', { device: 'door' });
}

// Function to update the control buttons based on the `controlState`
function updateControlUI() {
  // Fan
  const fanItem = document.getElementById('fan-control');
  const fanStatus = document.getElementById('fan-status');
  fanItem.classList.toggle('active', controlState.fan === 1);
  fanStatus.innerText = controlState.fan === 1 ? 'ON' : 'OFF';

  // Light
  const lightItem = document.getElementById('light-control');
  const lightStatus = document.getElementById('light-status');
  lightItem.classList.toggle('active', controlState.light === 1);
  lightStatus.innerText = controlState.light === 1 ? 'ON' : 'OFF';

  // Door
  const doorItem = document.getElementById('door-control');
  const doorStatus = document.getElementById('door-status');
  doorItem.classList.toggle('active', controlState.door === 1);
  doorStatus.innerText = controlState.door === 1 ? 'OPEN' : 'CLOSED';
}
