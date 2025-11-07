// script.js
// --- MQTT (Paho) setup ---
const mqttHost = "afc8a0ac2ccf462c8f92b932403518df.s1.eu.hivemq.cloud"; // change to your HiveMQ host or broker endpoint
const mqttPort = 8000; // WebSocket port (broker dependent). HiveMQ public websocket: 8000 or 8000? check docs
const clientId = "webclient-" + Math.random().toString(16).substr(2, 8);

const mqttClient = new Paho.MQTT.Client(mqttHost, Number(mqttPort), "/mqtt", clientId);

// on connect
mqttClient.onConnectionLost = function (responseObject) {
  console.log("MQTT lost", responseObject);
  document.getElementById('status-dot').style.background = '#ef4444';
  document.getElementById('status').innerText = 'MQTT disconnected';
};
mqttClient.onMessageArrived = function (message) {
  try {
    const payload = JSON.parse(message.payloadString);
    // update UI elements
    if (payload.dht_temp !== undefined) document.getElementById('dhtTemp').innerText = payload.dht_temp.toFixed(1);
    if (payload.bmp_temp !== undefined) document.getElementById('bmpTemp').innerText = payload.bmp_temp.toFixed(1);
    if (payload.dht_hum !== undefined) document.getElementById('envHum').innerText = payload.dht_hum.toFixed(0);
    if (payload.pressure_hpa !== undefined) document.getElementById('envPress').innerText = payload.pressure_hpa.toFixed(1);
    if (payload.mq_status !== undefined) document.getElementById('mqStatus').innerText = payload.mq_status;
    if (payload.mq_raw !== undefined) document.getElementById('mqRaw').innerText = payload.mq_raw;
    if (payload.mq_status === "BAD") document.getElementById('mqIssue').innerText = "High pollutants detected";
    else document.getElementById('mqIssue').innerText = "None";
    if (payload.rfid_uid !== undefined) document.getElementById('rfidUid').innerText = payload.rfid_uid;
    if (payload.rfid_access !== undefined) document.getElementById('rfidAccess').innerText = payload.rfid_access;
    // combined environment temp: take average or choose source
    if (payload.dht_temp && payload.bmp_temp) {
      const avg = (payload.dht_temp + payload.bmp_temp) / 2.0;
      document.getElementById('envTemp').innerText = avg.toFixed(1);
    } else if (payload.dht_temp) {
      document.getElementById('envTemp').innerText = payload.dht_temp.toFixed(1);
    }
    // status LED
    document.getElementById('status-dot').style.background = '#10b981';
    document.getElementById('status').innerText = 'Connected';
  } catch (e) {
    console.error("bad mqtt payload", e);
  }
};

function onConnect() {
  console.log("MQTT connected");
  mqttClient.subscribe("home/env");
  document.getElementById('status-dot').style.background = '#10b981';
  document.getElementById('status').innerText = 'Connected to MQTT';
}

function onConnectFail(err) {
  console.error("MQTT connect fail", err);
  document.getElementById('status').innerText = 'MQTT connection failed';
}

const connectOptions = {
  onSuccess: onConnect,
  onFailure: onConnectFail,
  useSSL: false
};

try {
  mqttClient.connect(connectOptions);
} catch (err) {
  console.error("MQTT init error", err);
}

// --- Socket.IO for camera feed ---
const socketUrl = "https://YOUR_RENDER_APP.onrender.com"; // change
const socket = io(socketUrl);

const liveImg = document.getElementById('liveFeed');
socket.on('connect', () => {
  console.log('socket connected', socket.id);
});
socket.on('frame', (dataUrl) => {
  // dataUrl is "data:image/jpeg;base64,...."
  if (liveImg) liveImg.src = dataUrl;
});
socket.on('disconnect', () => console.log('socket disconnected'));
