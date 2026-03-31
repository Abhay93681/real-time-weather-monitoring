// ------------ Initialization ------------
emailjs.init("KuhHITwtnCdhyf2xtY");

const OPENWEATHER_KEY = "f4e451913d4eda3fa11f2f4903fa539a";
const TELEGRAM_BOT = "8521880432:AAG66EDgkxPMxhJ1DSgAe5lZw95YbITqwsU";
const TELEGRAM_CHAT = "5149055672";

let lastData = null;
let map = null;
let marker = null;

// ------------ DOM Elements ------------
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const weatherResult = document.getElementById("weatherResult");
const mapBtn = document.getElementById("mapBtn");
const rainBtn = document.getElementById("rainBtn");
const forecastBtn = document.getElementById("forecastBtn");
const mapDiv = document.getElementById("map");
const animDiv = document.getElementById("anim");
const darkToggle = document.getElementById("darkToggle");
const gpsBtn = document.getElementById("gpsBtn");
const voiceBtn = document.getElementById("voiceBtn");
const speakBtn = document.getElementById("speakBtn");

// ------------ Event Listeners ------------
searchBtn.addEventListener("click", getWeatherData);
mapBtn.addEventListener("click", toggleMap);
rainBtn.addEventListener("click", predictRain);
forecastBtn.addEventListener("click", getForecast);
darkToggle.addEventListener("change", toggleDark);
gpsBtn.addEventListener("click", useMyLocation);
voiceBtn.addEventListener("click", startVoiceRecognition);
speakBtn.addEventListener("click", speakWeather);

// ------------ Fetch Weather ------------
async function getWeatherData(coords) {
    let url;

    if (coords && coords.lat && coords.lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_KEY}&units=metric`;
    } else {
        const city = cityInput.value.trim();
        if (!city) return alert("⚠ Please enter a city name!");
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_KEY}&units=metric`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.cod !== 200) {
            weatherResult.innerHTML = `<p style="color:red;">❌ City not found!</p>`;
            return;
        }

        lastData = data;
        displayWeather(data);
        showWeatherAnimation(data.weather[0].main);

        if (!mapDiv.classList.contains("hidden")) {
            loadMap(data.coord.lat, data.coord.lon);
        }

        const alertMsg = weatherAlert(data);

        sendEmail(alertMsg, data);
        sendTelegram(alertMsg, data);

    } catch (err) {
        alert("⚠ API Error or No Internet!");
        console.log(err);
    }
}

// ------------ Display Weather ------------
function displayWeather(data) {
    weatherResult.classList.remove("hidden");
    weatherResult.innerHTML = `
        <h3>📍 ${data.name}, ${data.sys.country}</h3>
        <p>🌡 Temperature: <b>${data.main.temp}°C</b></p>
        <p>💧 Humidity: <b>${data.main.humidity}%</b></p>
        <p>💨 Wind: <b>${data.wind.speed} m/s</b></p>
        <p>🌦 Condition: <b>${data.weather[0].description}</b></p>
    `;
}

// ------------ Rain Prediction ------------
function predictRain() {
    if (!lastData) return alert("⚠ Search weather first!");

    const humidity = lastData.main.humidity;
    const condition = lastData.weather[0].main.toLowerCase();

    let prediction = "🌤 No Rain Expected.";
    if (condition.includes("rain")) prediction = "🌧 It's raining right now!";
    else if (humidity > 80) prediction = "⚠ High chance of rain soon!";

    alert(prediction);
}

// ------------ 5-Day Forecast ------------
async function getForecast() {
    if (!lastData) return alert("⚠ Search weather first!");

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${lastData.name}&appid=${OPENWEATHER_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();

    const filtered = data.list.filter(item => item.dt_txt.includes("12:00:00"));

    let box = "<h3>📅 5 Day Forecast</h3><div style='display:flex;gap:10px;'>";

    filtered.forEach(day => {
        box += `
        <div style="border:1px solid white;padding:10px;width:110px;border-radius:10px;">
            <p>${new Date(day.dt * 1000).toLocaleDateString()}</p>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png">
            <p><b>${day.main.temp}°C</b></p>
        </div>`;
    });

    box += "</div>";

    weatherResult.innerHTML += box;
}

// ------------ Alerts ------------
function weatherAlert(data) {
    const temp = data.main.temp;
    const humidity = data.main.humidity;

    if (humidity > 80) return "⚠ Possible rain soon!";
    if (temp > 35) return "🔥 Heatwave alert!";
    if (temp < 10) return "❄ Cold weather alert!";
    return "Weather is normal.";
}

// ------------ Email + Telegram ------------
function sendEmail(alert, data) {
    emailjs.send("service_644z7mi", "template_nce1i4n", {
        message: alert,
        city_name: data.name,
        temperature: data.main.temp
    });
}

function sendTelegram(alertMsg, data) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT,
            text: `🚨 Weather Alert 🚨\n📍 ${data.name}\n🌡 ${data.main.temp}°C\n⚠ ${alertMsg}`
        })
    });
}

// ------------ Map ------------
function toggleMap() {
    mapDiv.classList.toggle("hidden");
    if (lastData) loadMap(lastData.coord.lat, lastData.coord.lon);
}

function loadMap(lat, lon) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        marker = L.marker([lat, lon]).addTo(map);
    } else {
        map.setView([lat, lon], 10);
        marker.setLatLng([lat, lon]);
    }
}

// ------------ Animation ------------
function showWeatherAnimation(type) {
    animDiv.innerHTML = type.includes("Rain") ?
        "🌧" :
        type.includes("Cloud") ?
        "☁" :
        type.includes("Clear") ?
        "☀️" :
        "⛅";
}

// ------------ Dark Mode ------------
function toggleDark(e) {
    document.body.classList.toggle("dark", e.target.checked);
}

// ------------ GPS ------------
function useMyLocation() {
    navigator.geolocation.getCurrentPosition(pos =>
        getWeatherData({ lat: pos.coords.latitude, lon: pos.coords.longitude })
    );
}

// ------------ Voice Recognition ------------
function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SpeechRecognition();
    recog.lang = "en-US";
    recog.start();

    recog.onresult = e => {
        cityInput.value = e.results[0][0].transcript;
        getWeatherData();
    };
}

// ------------ Speaking ------------
function speakWeather() {
    if (!lastData) return alert("Search first!");

    const msg = `Weather in ${lastData.name} is ${lastData.main.temp} degrees and ${lastData.weather[0].description}`;
    speechSynthesis.speak(new SpeechSynthesisUtterance(msg));
}
