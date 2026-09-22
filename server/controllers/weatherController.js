const Weather = require('../models/Weather');

const API_KEY = process.env.OPENWEATHER_API_KEY || '74c5eb3f4cfc3b56b6b7bd342fdd6ac0';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const CACHE_DURATION = 30;

const DEFAULT_CITY = {
    name: 'Coimbatore',
    lat: 11.0168,
    lon: 76.9558
};

const CITIES = {
    'delhi': { lat: 28.6139, lon: 77.2090, name: 'Delhi' },
    'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
    'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
    'kolkata': { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
    'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bangalore' },
    'hyderabad': { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
    'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune' },
    'ahmedabad': { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad' },
    'jaipur': { lat: 26.9124, lon: 75.7873, name: 'Jaipur' },
    'lucknow': { lat: 26.8467, lon: 80.9462, name: 'Lucknow' },
    'chandigarh': { lat: 30.7333, lon: 76.7794, name: 'Chandigarh' },
    'amritsar': { lat: 31.6340, lon: 74.8723, name: 'Amritsar' },
    'ludhiana': { lat: 30.9010, lon: 75.8573, name: 'Ludhiana' },
    'coimbatore': { lat: 11.0168, lon: 76.9558, name: 'Coimbatore' },
    'madurai': { lat: 9.9250, lon: 78.1198, name: 'Madurai' },
    'turin': { lat: 45.133, lon: 7.367, name: 'Province of Turin' },
    'rome': { lat: 41.9028, lon: 12.4964, name: 'Rome' },
    'milan': { lat: 45.4642, lon: 9.19, name: 'Milan' }
};

function getWeatherStatus(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return 'Thunderstorm';
    if (weatherId >= 300 && weatherId < 400) return 'Drizzle';
    if (weatherId >= 500 && weatherId < 600) return 'Rainy';
    if (weatherId >= 600 && weatherId < 700) return 'Snowy';
    if (weatherId >= 700 && weatherId < 800) return 'Misty';
    if (weatherId === 800) return 'Clear';
    if (weatherId === 801) return 'Partly Cloudy';
    if (weatherId >= 802) return 'Cloudy';
    return 'Unknown';
}

function getWeatherIcon(weatherId, isNight = false) {
    if (weatherId >= 200 && weatherId < 300) return 'fa-cloud-bolt';
    if (weatherId >= 300 && weatherId < 400) return 'fa-cloud-drizzle';
    if (weatherId >= 500 && weatherId < 600) return 'fa-cloud-rain';
    if (weatherId >= 600 && weatherId < 700) return 'fa-snowflake';
    if (weatherId >= 700 && weatherId < 800) return 'fa-smog';
    if (weatherId === 800) return isNight ? 'fa-moon' : 'fa-sun';
    if (weatherId === 801) return isNight ? 'fa-cloud-moon' : 'fa-cloud-sun';
    if (weatherId >= 802) return 'fa-cloud';
    return 'fa-cloud';
}

function getSoilStatus(humidity) {
    if (humidity > 70) return 'Moist';
    if (humidity > 60) return 'Optimal';
    return 'Dry';
}

function getCropHealth(humidity, temp) {
    if (humidity >= 60 && humidity <= 80 && temp >= 20 && temp <= 35) {
        return 92;
    }
    return 78;
}

async function fetchWeatherDataFromApi(lat, lon) {
    const currentResponse = await fetch(
        `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    if (!currentResponse.ok) {
        throw new Error(`Current weather API error: ${currentResponse.status}`);
    }
    const currentData = await currentResponse.json();

    const forecastResponse = await fetch(
        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=24`
    );
    if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`);
    }
    const forecastData = await forecastResponse.json();

    return { current: currentData, forecast: forecastData };
}

function transformWeatherData(apiData, cityName) {
    const { current, forecast } = apiData;
    const weatherId = current.weather[0].id;
    const isNight = current.weather[0].icon?.includes('n');

    const hourlyForecast = forecast.list.slice(0, 5).map(item => {
        const itemWeatherId = item.weather[0].id;
        const itemIsNight = item.weather[0].icon?.includes('n');
        const date = new Date(item.dt * 1000);
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            temp: Math.round(item.main.temp),
            humidity: item.main.humidity,
            icon: getWeatherIcon(itemWeatherId, itemIsNight),
            status: getWeatherStatus(itemWeatherId),
            pop: Math.round((item.pop || 0) * 100)
        };
    });

    const todayRain = forecast.list.slice(0, 8).reduce((max, item) => {
        return Math.max(max, Math.round((item.pop || 0) * 100));
    }, 0);

    return {
        city: cityName || current.name || 'Unknown',
        temperature: Math.round(current.main.temp),
        humidity: current.main.humidity,
        status: getWeatherStatus(weatherId),
        description: current.weather[0].description,
        icon: getWeatherIcon(weatherId, isNight),
        windSpeed: Math.round(current.wind.speed * 3.6),
        pressure: current.main.pressure,
        visibility: current.visibility,
        soilStatus: getSoilStatus(current.main.humidity),
        cropHealth: getCropHealth(current.main.humidity, current.main.temp),
        rainProbability: todayRain,
        forecast: hourlyForecast,
        sunrise: new Date(current.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(current.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date().toISOString()
    };
}

function getCityCoords(cityName) {
    const normalizedName = cityName.toLowerCase().trim();
    if (CITIES[normalizedName]) {
        return CITIES[normalizedName];
    }
    return DEFAULT_CITY;
}

const getCities = (req, res, next) => {
    try {
        const citiesList = Object.entries(CITIES).map(([key, value]) => ({
            id: key,
            name: value.name,
            lat: value.lat,
            lon: value.lon
        }));
        res.json({ success: true, cities: citiesList });
    } catch (error) {
        next(error);
    }
};

const getWeather = async (req, res, next) => {
    try {
        const { city, lat, lon } = req.query;
        let lati, longi, cityName;

        if (lat && lon) {
            lati = parseFloat(lat);
            longi = parseFloat(lon);
            cityName = 'Current Location';
        } else if (city) {
            const coords = getCityCoords(city);
            lati = coords.lat;
            longi = coords.lon;
            cityName = coords.name;
        } else {
            lati = DEFAULT_CITY.lat;
            longi = DEFAULT_CITY.lon;
            cityName = DEFAULT_CITY.name;
        }

        const cacheAge = Date.now() - (CACHE_DURATION * 60 * 1000);
        const cachedWeather = await Weather.findOne({
            city: cityName,
            updatedAt: { $gt: new Date(cacheAge) }
        }).sort({ updatedAt: -1 });

        if (cachedWeather) {
            return res.json({
                city: cachedWeather.city,
                temperature: cachedWeather.temperature,
                humidity: cachedWeather.humidity,
                status: cachedWeather.status,
                description: cachedWeather.description,
                icon: cachedWeather.weather?.icon || getWeatherIcon(cachedWeather.weather?.id),
                windSpeed: cachedWeather.windSpeed,
                pressure: cachedWeather.pressure,
                visibility: cachedWeather.visibility,
                soilStatus: cachedWeather.soilStatus,
                cropHealth: cachedWeather.cropHealth,
                rainProbability: cachedWeather.rainProbability,
                sunrise: cachedWeather.sunrise,
                sunset: cachedWeather.sunset,
                timestamp: cachedWeather.updatedAt.toISOString(),
                forecast: cachedWeather.forecast || [],
                cached: true
            });
        }

        const apiData = await fetchWeatherDataFromApi(lati, longi);
        const weatherData = transformWeatherData(apiData, cityName);

        try {
            await Weather.findOneAndUpdate(
                { city: cityName },
                {
                    city: cityName,
                    country: apiData.current.sys?.country,
                    latitude: lati,
                    longitude: longi,
                    temperature: Math.round(apiData.current.main.temp),
                    feelsLike: Math.round(apiData.current.main.feels_like),
                    tempMin: Math.round(apiData.current.main.temp_min),
                    tempMax: Math.round(apiData.current.main.temp_max),
                    humidity: apiData.current.main.humidity,
                    pressure: apiData.current.main.pressure,
                    visibility: apiData.current.visibility,
                    windSpeed: Math.round(apiData.current.wind.speed * 3.6),
                    windDeg: apiData.current.wind.deg,
                    weather: {
                        id: apiData.current.weather[0].id,
                        main: apiData.current.weather[0].main,
                        description: apiData.current.weather[0].description,
                        icon: getWeatherIcon(apiData.current.weather[0].id)
                    },
                    status: getWeatherStatus(apiData.current.weather[0].id),
                    description: apiData.current.weather[0].description,
                    soilStatus: getSoilStatus(apiData.current.main.humidity),
                    cropHealth: getCropHealth(apiData.current.main.humidity, apiData.current.main.temp),
                    rainProbability: weatherData.rainProbability,
                    clouds: apiData.current.clouds?.all,
                    sunrise: weatherData.sunrise,
                    sunset: weatherData.sunset,
                    timezone: apiData.current.timezone,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (dbErr) {
            console.error('Database weather cache error:', dbErr.message);
        }

        res.json(weatherData);
    } catch (error) {
        console.error('Weather route error:', error.message);
        try {
            const fallbackWeather = await Weather.findOne().sort({ updatedAt: -1 });
            if (fallbackWeather) {
                return res.json({
                    city: fallbackWeather.city,
                    temperature: fallbackWeather.temperature,
                    humidity: fallbackWeather.humidity,
                    status: fallbackWeather.status,
                    description: fallbackWeather.description,
                    icon: fallbackWeather.weather?.icon || getWeatherIcon(fallbackWeather.weather?.id),
                    windSpeed: fallbackWeather.windSpeed,
                    pressure: fallbackWeather.pressure,
                    visibility: fallbackWeather.visibility,
                    soilStatus: fallbackWeather.soilStatus,
                    cropHealth: fallbackWeather.cropHealth,
                    rainProbability: fallbackWeather.rainProbability,
                    sunrise: fallbackWeather.sunrise,
                    sunset: fallbackWeather.sunset,
                    timestamp: fallbackWeather.updatedAt.toISOString(),
                    forecast: [],
                    cached: true
                });
            }
        } catch (dbError) {}

        res.status(500).json({
            message: 'Unable to fetch weather data. Using cached data.',
            error: error.message,
            city: req.query.city || 'Coimbatore',
            temperature: 28,
            humidity: 65,
            status: 'Partly Cloudy',
            soilStatus: 'Optimal',
            cropHealth: 92,
            forecast: [
                { day: 'Today', temp: 28, icon: 'fa-cloud-sun' },
                { day: 'Tomorrow', temp: 30, icon: 'fa-sun' },
                { day: 'Day After', temp: 27, icon: 'fa-cloud' }
            ]
        });
    }
};

const getWeatherByCity = async (req, res, next) => {
    try {
        const cityName = req.params.city;
        const coords = getCityCoords(cityName);
        const apiData = await fetchWeatherDataFromApi(coords.lat, coords.lon);
        const weatherData = transformWeatherData(apiData, coords.name);
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({
            message: 'Unable to fetch weather data for ' + req.params.city,
            error: error.message,
            city: req.params.city,
            temperature: 28,
            humidity: 65,
            status: 'Partly Cloudy',
            soilStatus: 'Optimal',
            cropHealth: 92,
            forecast: []
        });
    }
};

const getHourlyForecast = async (req, res, next) => {
    try {
        const { lat, lon, city } = req.query;
        let lati, longi, cityName;

        if (lat && lon) {
            lati = parseFloat(lat);
            longi = parseFloat(lon);
            cityName = 'Current Location';
        } else if (city) {
            const coords = getCityCoords(city);
            lati = coords.lat;
            longi = coords.lon;
            cityName = coords.name;
        } else {
            lati = DEFAULT_CITY.lat;
            longi = DEFAULT_CITY.lon;
            cityName = DEFAULT_CITY.name;
        }

        const response = await fetch(
            `${BASE_URL}/forecast?lat=${lati}&lon=${longi}&appid=${API_KEY}&units=metric`
        );
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const hourlyData = data.list.map(item => {
            const weatherId = item.weather[0].id;
            const isNight = item.weather[0].icon?.includes('n');
            const date = new Date(item.dt * 1000);

            return {
                dateTime: item.dt_txt,
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                temp: Math.round(item.main.temp),
                tempMin: Math.round(item.main.temp_min),
                tempMax: Math.round(item.main.temp_max),
                feelsLike: Math.round(item.main.feels_like),
                humidity: item.main.humidity,
                pressure: item.main.pressure,
                weather: {
                    id: item.weather[0].id,
                    main: item.weather[0].main,
                    description: item.weather[0].description,
                    icon: getWeatherIcon(weatherId, isNight)
                },
                wind: {
                    speed: Math.round(item.wind.speed * 3.6),
                    deg: item.wind.deg
                },
                clouds: item.clouds.all,
                visibility: item.visibility,
                pop: Math.round((item.pop || 0) * 100),
                rain: item.rain ? item.rain['3h'] : 0
            };
        });

        res.json({
            city: cityName,
            country: data.city.country,
            timezone: data.city.timezone,
            sunrise: new Date(data.city.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            sunset: new Date(data.city.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            hourly: hourlyData
        });
    } catch (error) {
        next(error);
    }
};

const seedWeather = async (req, res, next) => {
    try {
        const citiesEntries = Object.entries(CITIES);
        const results = { success: 0, failed: 0, total: citiesEntries.length, errors: [] };

        for (const [cityKey, coords] of citiesEntries) {
            try {
                const apiData = await fetchWeatherDataFromApi(coords.lat, coords.lon);
                const weatherData = transformWeatherData(apiData, coords.name);

                await Weather.findOneAndUpdate(
                    { city: coords.name },
                    {
                        city: coords.name,
                        country: apiData.current.sys?.country,
                        latitude: coords.lat,
                        longitude: coords.lon,
                        temperature: Math.round(apiData.current.main.temp),
                        feelsLike: Math.round(apiData.current.main.feels_like),
                        tempMin: Math.round(apiData.current.main.temp_min),
                        tempMax: Math.round(apiData.current.main.temp_max),
                        humidity: apiData.current.main.humidity,
                        pressure: apiData.current.main.pressure,
                        visibility: apiData.current.visibility,
                        windSpeed: Math.round(apiData.current.wind.speed * 3.6),
                        windDeg: apiData.current.wind.deg,
                        weather: {
                            id: apiData.current.weather[0].id,
                            main: apiData.current.weather[0].main,
                            description: apiData.current.weather[0].description,
                            icon: getWeatherIcon(apiData.current.weather[0].id)
                        },
                        status: getWeatherStatus(apiData.current.weather[0].id),
                        description: apiData.current.weather[0].description,
                        soilStatus: getSoilStatus(apiData.current.main.humidity),
                        cropHealth: getCropHealth(apiData.current.main.humidity, apiData.current.main.temp),
                        rainProbability: weatherData.rainProbability,
                        clouds: apiData.current.clouds?.all,
                        sunrise: weatherData.sunrise,
                        sunset: weatherData.sunset,
                        timezone: apiData.current.timezone,
                        forecast: weatherData.forecast,
                        updatedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                results.success++;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (cityError) {
                results.failed++;
                results.errors.push({ city: coords.name, error: cityError.message });
            }
        }

        res.json({
            success: true,
            message: `Weather data seeded successfully`,
            results: results
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCities,
    getWeather,
    getWeatherByCity,
    getHourlyForecast,
    seedWeather
};
