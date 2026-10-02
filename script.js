// ============================================================
// 🌤️ WEATHER APP — Tugas Rutin 5
// Menggunakan: ES6+, async/await, Fetch API, LocalStorage
// + BONUS: Perkiraan 6 jam ke depan dengan visualisasi awan
// ============================================================

// 🔑 API Key dari OpenWeatherMap
const API_KEY = 'b7c4089c4026dd078cfc484991496f7b';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 🌥️ Open-Meteo API (gratis, tanpa key, data per jam)
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// 📌 State aplikasi
const state = {
    currentUnit: 'C',
    currentTemp: null,
    currentFeelsLike: null,
    forecastTemps: [], // simpan suhu forecast untuk konversi
};

// 🎯 Ambil elemen DOM
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const weatherResult = document.getElementById('weatherResult');
const forecastSection = document.getElementById('forecastSection');
const forecastList = document.getElementById('forecastList');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const unitToggleC = document.getElementById('unitToggleC');
const unitToggleF = document.getElementById('unitToggleF');

// ============================================================
//  FUNGSI 1: Ambil data cuaca sekarang (OpenWeatherMap)
// ============================================================
const fetchWeather = async (city) => {
    const url = `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`;

    try {
        const response = await fetch(url);

        // ❌ Error handling: kota tidak ditemukan (404)
        if (response.status === 404) {
            throw new Error(`Kota "${city}" tidak ditemukan. Coba nama kota lain ya! 😅`);
        }

        // ❌ Error handling: error lain dari server
        if (!response.ok) {
            throw new Error(`Terjadi kesalahan server (${response.status}). Coba lagi nanti.`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        // ❌ Error handling: network error
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Koneksi internet terputus. Periksa jaringanmu ya! 📡');
        }
        throw error;
    }
};

// ============================================================
// ️ FUNGSI 2: Ambil forecast per jam (Open-Meteo)
// ============================================================
const fetchHourlyForecast = async (lat, lon) => {
    const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
                `&hourly=temperature_2m,weathercode,cloudcover` +
                `&timezone=auto&forecast_days=1`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil forecast.');

        const data = await response.json();
        return data.hourly;

    } catch (error) {
        throw new Error('Gagal memuat perkiraan cuaca.');
    }
};

// ============================================================
// 🌤️ FUNGSI 3: Tampilkan data cuaca sekarang
// ============================================================
const displayWeather = (data) => {
    state.currentTemp = data.main.temp;
    state.currentFeelsLike = data.main.feels_like;

    document.getElementById('cityName').textContent = data.name;
    document.getElementById('country').textContent = data.sys.country;
    document.getElementById('humidity').textContent = data.main.humidity;
    document.getElementById('wind').textContent = data.wind.speed;

    updateTemperatureDisplay();

    document.getElementById('description').textContent =
        data.weather[0].description;

    const iconCode = data.weather[0].icon;
    document.getElementById('weatherIcon').src =
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

    weatherResult.classList.remove('hidden');
    errorEl.classList.add('hidden');
};

// ============================================================
// 🌥️ FUNGSI 4: Tampilkan forecast 6 jam ke depan
// ============================================================
const displayForecast = (hourlyData) => {
    const now = new Date();
    const currentHour = now.getHours();

    const startIdx = currentHour;
    const forecastItems = [];

    // Simpan suhu forecast untuk konversi unit nanti
    state.forecastTemps = [];

    for (let i = 0; i < 6; i++) {
        const idx = startIdx + i;
        if (idx >= hourlyData.time.length) break;

        const timeStr = hourlyData.time[idx];
        const temp = hourlyData.temperature_2m[idx];
        const weatherCode = hourlyData.weathercode[idx];
        const cloudCover = hourlyData.cloudcover[idx];

        state.forecastTemps.push(temp);

        // Format jam
        const dateObj = new Date(timeStr);
        const hourLabel = dateObj.getHours().toString().padStart(2, '0') + ':00';

        const label = i === 0 ? 'Sekarang' : `+${i} jam`;

        const iconCode = getWeatherIconFromCode(weatherCode);
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        const desc = getWeatherDescFromCode(weatherCode);

        forecastItems.push({
            label,
            hourLabel,
            temp,
            iconUrl,
            desc,
            cloudCover,
        });
    }

    // Gunakan array method: map untuk render HTML
    forecastList.innerHTML = forecastItems
        .map((item) => {
            const displayTemp = state.currentUnit === 'C'
                ? Math.round(item.temp)
                : Math.round((item.temp * 9) / 5 + 32);

            return `
                <div class="forecast-item">
                    <div class="forecast-time">${item.label}<br><small>${item.hourLabel}</small></div>
                    <img class="forecast-icon" src="${item.iconUrl}" alt="${item.desc}" />
                    <div class="forecast-temp">${displayTemp}°${state.currentUnit}</div>
                    <div class="forecast-desc">${item.desc}</div>
                    <div class="cloud-visual">
                        <div class="cloud-label">☁️ Awan</div>
                        <div class="cloud-bar-bg">
                            <div class="cloud-bar-fill" style="width: ${item.cloudCover}%"></div>
                        </div>
                        <div class="cloud-percent">${Math.round(item.cloudCover)}%</div>
                    </div>
                </div>
            `;
        })
        .join('');

    forecastSection.classList.remove('hidden');
};

// ============================================================
// 🌤️ FUNGSI 5: Konversi WMO Weather Code → Ikon OpenWeatherMap
// ============================================================
const getWeatherIconFromCode = (code) => {
    const codeMap = {
        0: '01d',
        1: '02d', 2: '03d', 3: '04d',
        45: '50d', 48: '50d',
        51: '09d', 53: '09d', 55: '09d',
        56: '13d', 57: '13d',
        61: '10d', 63: '10d', 65: '10d',
        66: '13d', 67: '13d',
        71: '13d', 73: '13d', 75: '13d', 77: '13d',
        80: '09d', 81: '09d', 82: '09d',
        85: '13d', 86: '13d',
        95: '11d',
        96: '11d', 99: '11d',
    };
    return codeMap[code] || '01d';
};

// ============================================================
// 📝 FUNGSI 6: Konversi WMO Code → Deskripsi
// ============================================================
const getWeatherDescFromCode = (code) => {
    const descMap = {
        0: 'Cerah',
        1: 'Cerah berawan',
        2: 'Berawan sebagian',
        3: 'Mendung',
        45: 'Berkabut',
        48: 'Berkabut tebal',
        51: 'Gerimis ringan',
        53: 'Gerimis',
        55: 'Gerimis lebat',
        56: 'Gerimis beku',
        57: 'Gerimis beku lebat',
        61: 'Hujan ringan',
        63: 'Hujan',
        65: 'Hujan lebat',
        66: 'Hujan beku',
        67: 'Hujan beku lebat',
        71: 'Salju ringan',
        73: 'Salju',
        75: 'Salju lebat',
        77: 'Butiran salju',
        80: 'Hujan ringan',
        81: 'Hujan sedang',
        82: 'Hujan deras',
        85: 'Salju ringan',
        86: 'Salju lebat',
        95: 'Badai petir',
        96: 'Badai + hujan es',
        99: 'Badai + hujan es lebat',
    };
    return descMap[code] || 'Tidak diketahui';
};

// ============================================================
// 🌡️ FUNGSI 7: Update tampilan suhu (°C atau °F)
// ============================================================
const updateTemperatureDisplay = () => {
    const unit = state.currentUnit;

    if (unit === 'C') {
        document.getElementById('temperature').textContent =
            `${Math.round(state.currentTemp)}°C`;
        document.getElementById('feelsLike').textContent =
            Math.round(state.currentFeelsLike);
    } else {
        const tempF = (state.currentTemp * 9) / 5 + 32;
        const feelsF = (state.currentFeelsLike * 9) / 5 + 32;
        document.getElementById('temperature').textContent =
            `${Math.round(tempF)}°F`;
        document.getElementById('feelsLike').textContent =
            Math.round(feelsF);
    }

    // Update suhu di forecast
    const forecastItems = forecastList.querySelectorAll('.forecast-item');
    forecastItems.forEach((item, idx) => {
        if (state.forecastTemps[idx] !== undefined) {
            const tempC = state.forecastTemps[idx];
            const displayTemp = unit === 'C'
                ? Math.round(tempC)
                : Math.round((tempC * 9) / 5 + 32);
            item.querySelector('.forecast-temp').textContent =
                `${displayTemp}°${unit}`;
        }
    });
};

// ============================================================
// ⏳ FUNGSI 8: Loading
// ============================================================
const showLoading = () => {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    weatherResult.classList.add('hidden');
    forecastSection.classList.add('hidden');
};

const hideLoading = () => {
    loadingEl.classList.add('hidden');
};

// ============================================================
// ❌ FUNGSI 9: Error
// ============================================================
const showError = (message) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    weatherResult.classList.add('hidden');
    forecastSection.classList.add('hidden');
};

// ============================================================
// 📜 FUNGSI 10: Riwayat pencarian (LocalStorage) — BONUS
// ============================================================
const getHistory = () => {
    const history = localStorage.getItem('weatherHistory');
    return history ? JSON.parse(history) : [];
};

const saveToHistory = (city) => {
    let history = getHistory();
    // Gunakan array method: filter — hapus duplikat
    history = history.filter((item) => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    history = history.slice(0, 5);
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    renderHistory();
};

const renderHistory = () => {
    const history = getHistory();

    if (history.length === 0) {
        historySection.classList.add('hidden');
        return;
    }

    historySection.classList.remove('hidden');

    // Gunakan array method: map — buat list item
    historyList.innerHTML = history
        .map((city) => `<li data-city="${city}">${city}</li>`)
        .join('');

    historyList.querySelectorAll('li').forEach((li) => {
        li.addEventListener('click', () => {
            cityInput.value = li.dataset.city;
            handleSearch(li.dataset.city);
        });
    });
};

const clearHistory = () => {
    localStorage.removeItem('weatherHistory');
    historyList.innerHTML = '';
    historySection.classList.add('hidden');
};

// ============================================================
// 🔍 FUNGSI 11: Handle pencarian (utama)
// ============================================================
const handleSearch = async (city) => {
    const cityName = city || cityInput.value.trim();

    if (!cityName) {
        showError('Ketik nama kota dulu ya! 🏙️');
        return;
    }

    showLoading();

    try {
        // 1. Ambil cuaca sekarang
        const weatherData = await fetchWeather(cityName);
        displayWeather(weatherData);

        // 2. Ambil koordinat dari data cuaca
        const lat = weatherData.coord.lat;
        const lon = weatherData.coord.lon;

        // 3. Ambil forecast 6 jam ke depan
        const hourlyData = await fetchHourlyForecast(lat, lon);
        displayForecast(hourlyData);

        // 4. Simpan ke riwayat
        saveToHistory(cityName);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
};

// ============================================================
// 🎮 EVENT LISTENERS
// ============================================================
searchBtn.addEventListener('click', () => handleSearch());

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

unitToggleC.addEventListener('click', () => {
    state.currentUnit = 'C';
    unitToggleC.classList.add('active');
    unitToggleF.classList.remove('active');
    if (state.currentTemp !== null) {
        updateTemperatureDisplay();
    }
});

unitToggleF.addEventListener('click', () => {
    state.currentUnit = 'F';
    unitToggleF.classList.add('active');
    unitToggleC.classList.remove('active');
    if (state.currentTemp !== null) {
        updateTemperatureDisplay();
    }
});

clearHistoryBtn.addEventListener('click', clearHistory);

// ============================================================
// 🚀 INIT
// ============================================================
renderHistory();

console.log('️ Weather App siap digunakan!');