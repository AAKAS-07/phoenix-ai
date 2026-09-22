// Load weather data from API and update dashboard
async function loadDashboardWeather() {
    try {
        const savedCity = localStorage.getItem('weatherCity') || 'Coimbatore';
        const response = await fetch('/api/weather?city=' + encodeURIComponent(savedCity));
        const data = await response.json();

        if (data && data.city) {
            // Update city name
            const cityEl = document.getElementById('dashboard-city');
            if (cityEl) cityEl.textContent = data.city;

            // Update temperature
            const tempEl = document.getElementById('dashboard-temp');
            if (tempEl) tempEl.textContent = data.temperature;

            // Update condition text
            const condEl = document.getElementById('dashboard-condition');
            if (condEl) condEl.textContent = data.status || data.description;

            // Update weather icon
            const iconEl = document.getElementById('dashboard-weather-icon');
            if (iconEl && data.icon) iconEl.className = 'fas ' + data.icon + ' text-5xl drop-shadow-lg';

            // Update humidity
            const humEl = document.getElementById('dashboard-humidity');
            if (humEl) humEl.textContent = data.humidity + '%';

            // Update wind
            const windEl = document.getElementById('dashboard-wind');
            if (windEl) windEl.textContent = (data.windSpeed || 0) + ' km/h';

            // Update rain probability
            const rainEl = document.getElementById('dashboard-rain');
            if (rainEl) rainEl.textContent = (data.rainProbability || 0) + '%';

            console.log('Weather loaded:', data.city, data.temperature + 'C');
        }
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

// Load available cities from API and populate the selector
let availableCities = [];

// Load city list from API
async function loadCityList() {
    try {
        const response = await fetch('/api/weather/cities');
        const data = await response.json();

        if (data.success && data.cities) {
            availableCities = data.cities;
            populateCitySelector();
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        // Fallback to default cities
        availableCities = [
            { id: 'coimbatore', name: 'Coimbatore' },
            { id: 'delhi', name: 'Delhi' },
            { id: 'mumbai', name: 'Mumbai' },
            { id: 'chennai', name: 'Chennai' },
            { id: 'kolkata', name: 'Kolkata' },
            { id: 'bangalore', name: 'Bangalore' },
            { id: 'hyderabad', name: 'Hyderabad' },
            { id: 'pune', name: 'Pune' },
            { id: 'ahmedabad', name: 'Ahmedabad' },
            { id: 'jaipur', name: 'Jaipur' },
            { id: 'lucknow', name: 'Lucknow' },
            { id: 'chandigarh', name: 'Chandigarh' },
            { id: 'amritsar', name: 'Amritsar' },
            { id: 'ludhiana', name: 'Ludhiana' },
            { id: 'madurai', name: 'Madurai' }
        ];
        populateCitySelector();
    }
}

// Populate the city selector dropdown
function populateCitySelector() {
    const selector = document.getElementById('city-selector');
    if (!selector) return;

    const savedCity = localStorage.getItem('weatherCity') || 'Coimbatore';

    // Clear existing options
    selector.innerHTML = '';

    // Add default "Select City" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Select City';
    defaultOption.disabled = true;
    selector.appendChild(defaultOption);

    // Add cities from the list
    availableCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.text = city.name;
        option.dataset.lat = city.lat;
        option.dataset.lon = city.lon;

        // Set selected if matches saved city
        if (city.name.toLowerCase() === savedCity.toLowerCase() || city.id === savedCity.toLowerCase()) {
            option.selected = true;
        }

        selector.appendChild(option);
    });
}

// Handle city selection change
function onCityChange(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    if (!selectedOption.value) return;

    const cityId = selectedOption.value;

    // Save to localStorage
    localStorage.setItem('weatherCity', cityId);

    // Update dashboard weather with new city
    loadWeatherForCity(cityId);
}

// Load weather for a specific city
async function loadWeatherForCity(cityId) {
    try {
        const response = await fetch('/api/weather?city=' + encodeURIComponent(cityId));
        const data = await response.json();

        if (data && data.city) {
            // Update city name
            const cityEl = document.getElementById('dashboard-city');
            if (cityEl) cityEl.textContent = data.city;

            // Update temperature
            const tempEl = document.getElementById('dashboard-temp');
            if (tempEl) tempEl.textContent = data.temperature;

            // Update condition text
            const condEl = document.getElementById('dashboard-condition');
            if (condEl) condEl.textContent = data.status || data.description;

            // Update weather icon
            const iconEl = document.getElementById('dashboard-weather-icon');
            if (iconEl && data.icon) iconEl.className = 'fas ' + data.icon + ' text-5xl drop-shadow-lg';

            // Update humidity
            const humEl = document.getElementById('dashboard-humidity');
            if (humEl) humEl.textContent = data.humidity + '%';

            // Update wind
            const windEl = document.getElementById('dashboard-wind');
            if (windEl) windEl.textContent = (data.windSpeed || 0) + ' km/h';

            // Update rain probability
            const rainEl = document.getElementById('dashboard-rain');
            if (rainEl) rainEl.textContent = (data.rainProbability || 0) + '%';

            console.log('Weather updated for:', data.city, data.temperature + '°C');
        }
    } catch (error) {
        console.error('Error loading weather for city:', error);
    }
}

// Initialize city selector when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadCityList();
});
