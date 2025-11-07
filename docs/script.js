// --- CONFIGURATION ---
// 1. Set your MQTT topics (MUST match your ESP32)
const MQTT_DATA_TOPIC = "myhome/esp32/data";
const MQTT_CONTROL_TOPIC = "myhome/esp32/control";

// 2. Set your ESP32-CAM Stream URL
const CAMERA_STREAM_URL = "http://192.168.1.10/stream"; // <-- IMPORTANT: Change this IP
// --- END CONFIGURATION ---


// --- MQTT CLIENT ---
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status');
const modeToggle = document.getElementById('mode-toggle');

// Create a client instance with a unique ID
const clientID = "web-client-" + parseInt(Math.random() * 100000);
const mqttClient = new Paho.MQTT.Client("broker.hivemq.com", 8000, clientID);

// Set callback handlers
mqttClient.onConnectionLost = onConnectionLost;
mqttClient.onMessageArrived = onMessageArrived;

// Global state for controls
let isManualMode = false;
let controlState = {
  fan: 0, // 0 = OFF, 1 = ON
  light: 0,
  door: 0 // 0 = CLOSED, 1 = OPEN
};

// Connect to the broker
mqttClient.connect({
  onSuccess: onConnect,
  onFailure: (err) => { console.log("Failed to connect: ", err); },
  useSSL: True
});

function onConnect() {
  console.log("Connected to HiveMQ!");
  statusDot.style.background = '#10b981'; // Green
  statusText.innerText = 'Connected';

  // Subscribe to the data topic
  mqttClient.subscribe(MQTT_DATA_TOPIC);
  console.log("Subscribed to: " + MQTT_DATA_TOPIC);
}

function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:" + responseObject.errorMessage);
    statusDot.style.background = '#ef4444'; // Red
    statusText.innerText = 'Disconnected';
    
    // Attempt to reconnect
    setTimeout(() => {
        mqttClient.connect({ onSuccess: onConnect, onFailure: (err) => { console.log("Failed to reconnect: ", err); } });
    }, 2000);
  }
}

// Main message handler
function onMessageArrived(message) {
  try {
    const data = JSON.parse(message.payloadString);
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
  } catch (e) {
    console.error("Error parsing JSON: ", e);
  }
}

// Helper to safely update text (NO CHANGE)
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

// --- VIEW NAVIGATION (NO CHANGE) ---
function showView(viewName) {
  document.getElementById('dashboard-view').style.display = viewName === 'dashboard' ? 'block' : 'none';
  document.getElementById('surveillance-view').style.display = viewName === 'surveillance' ? 'block' : 'none';

  document.getElementById('btn-dashboard').classList.toggle('active', viewName === 'dashboard');
  document.getElementById('btn-surveillance').classList.toggle('active', viewName === 'surveillance');

  if (viewName === 'surveillance') {
    document.getElementById('liveFeed').src = CAMERA_STREAM_URL;
  } else {
    document.getElementById('liveFeed').src = "";
  }
}
showView('dashboard');

// --- CONTROL PANEL (MODIFIED) ---
modeToggle.addEventListener('change', () => {
  isManualMode = modeToggle.checked;
  document.querySelectorAll('.control-item').forEach(el => {
    el.classList.toggle('disabled', !isManualMode);
  });
});

// Helper function to send an MQTT control message
function sendControlCommand(device) {
    if (!isManualMode) return;
    
    // 1. Send the command (same as before)
    const payload = JSON.stringify({ device: device });
    const message = new Paho.MQTT.Message(payload);
    message.destinationName = MQTT_CONTROL_TOPIC;
    mqttClient.send(message);
    console.log(`Sent command: ${payload}`);

    // --- ADD THIS NEW SECTION ---
    // 2. Optimistically update the local state
    if (device === 'fan') {
      controlState.fan = !controlState.fan; // Toggle the state
    } else if (device === 'light') {
      controlState.light = !controlState.light;
    } else if (device === 'door') {
      controlState.door = !controlState.door;
    }

    // 3. Immediately update the UI
    updateControlUI();
    // --- END OF NEW SECTION ---
}

function toggleFan() {
  sendControlCommand('fan');
}

function toggleLight() {
  sendControlCommand('light');
}

function toggleDoor() {
  sendControlCommand('door');
}

// Function to update the control buttons based on the `controlState` (NO CHANGE)
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
