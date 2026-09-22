const User = require('../models/User');
const Crop = require('../models/Crop');
const News = require('../models/News');
const Weather = require('../models/Weather');
const AdvisoryResult = require('../models/AdvisoryResult');
const Activity = require('../models/Activity');
const { getNewsList } = require('./newsController');

const API_KEY = process.env.OPENWEATHER_API_KEY || '74c5eb3f4cfc3b56b6b7bd342fdd6ac0';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

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
    'madurai': { lat: 9.9250, lon: 78.1198, name: 'Madurai' }
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

// Optimized weather fetch with 1200ms AbortController timeout
async function fetchWeatherDataWithTimeout(lat, lon, timeoutMs = 1200) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
            { signal: controller.signal }
        );
        if (!currentResponse.ok) {
            throw new Error(`Current weather API error: ${currentResponse.status}`);
        }
        const currentData = await currentResponse.json();

        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=8`,
            { signal: controller.signal }
        );
        if (!forecastResponse.ok) {
            throw new Error(`Forecast API error: ${forecastResponse.status}`);
        }
        const forecastData = await forecastResponse.json();

        clearTimeout(timeoutId);
        return { current: currentData, forecast: forecastData };
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

const getDashboardData = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const advisoryFilter = { userId, isDeleted: { $ne: true } };

        // PARALLEL EXECUTION: Run all MongoDB queries & news fetch concurrently
        const [
            user,
            totalAdvisories,
            recentAdvisories,
            totalCropPricesCount,
            distinctCommodities,
            latestCrops,
            newsResult,
            userActivities,
            cachedWeather
        ] = await Promise.all([
            User.findById(userId).select('-password').lean(),
            AdvisoryResult.countDocuments(advisoryFilter),
            AdvisoryResult.find(advisoryFilter)
                .sort({ createdAt: -1 })
                .limit(5)
                .select('cropType growthStage state district soilType soilPH diseaseRisk yieldPrediction irrigation fertilizer createdAt')
                .lean(),
            Crop.countDocuments({ source: 'data.gov.in' }),
            Crop.distinct('commodity', { source: 'data.gov.in' }),
            Crop.find({ source: 'data.gov.in' })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('commodity market district state modalPrice minPrice maxPrice unit trend arrivalDate')
                .lean(),
            getNewsList(4, 'en'),
            Activity.find({ userId })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
            Weather.findOne().sort({ updatedAt: -1 }).lean()
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let weatherCity = DEFAULT_CITY;
        if (user.address) {
            const addressLower = user.address.toLowerCase();
            for (const [city, coords] of Object.entries(CITIES)) {
                if (addressLower.includes(city)) {
                    weatherCity = coords;
                    break;
                }
            }
        }

        // Fast Weather Resolution: Try cached weather first, then fast network fetch
        let weatherData = null;
        if (cachedWeather && cachedWeather.city === weatherCity.name) {
            weatherData = {
                city: cachedWeather.city,
                temperature: cachedWeather.temperature,
                humidity: cachedWeather.humidity,
                status: cachedWeather.status,
                description: cachedWeather.description,
                icon: cachedWeather.weather?.icon || 'fa-cloud',
                windSpeed: cachedWeather.windSpeed || 0,
                rainProbability: cachedWeather.rainProbability || 0
            };
        }

        // Fast async network fetch with 1200ms timeout
        try {
            const apiData = await fetchWeatherDataWithTimeout(weatherCity.lat, weatherCity.lon, 1200);
            const weatherId = apiData.current.weather[0].id;
            const isNight = apiData.current.weather[0].icon?.includes('n');
            const todayRain = apiData.forecast.list.slice(0, 8).reduce((max, item) => {
                return Math.max(max, Math.round((item.pop || 0) * 100));
            }, 0);

            weatherData = {
                city: weatherCity.name,
                temperature: Math.round(apiData.current.main.temp),
                humidity: apiData.current.main.humidity,
                status: getWeatherStatus(weatherId),
                description: apiData.current.weather[0].description,
                icon: getWeatherIcon(weatherId, isNight),
                windSpeed: Math.round(apiData.current.wind.speed * 3.6),
                rainProbability: todayRain
            };

            // Non-blocking update cache in DB
            Weather.findOneAndUpdate(
                { city: weatherCity.name },
                {
                    city: weatherCity.name,
                    temperature: weatherData.temperature,
                    humidity: weatherData.humidity,
                    status: weatherData.status,
                    description: weatherData.description,
                    weather: { id: weatherId, icon: getWeatherIcon(weatherId, isNight) },
                    windSpeed: weatherData.windSpeed,
                    rainProbability: weatherData.rainProbability,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            ).catch(() => {});
        } catch (weatherErr) {
            // Network fallback to cached weather or default
            if (!weatherData && cachedWeather) {
                weatherData = {
                    city: cachedWeather.city,
                    temperature: cachedWeather.temperature,
                    humidity: cachedWeather.humidity,
                    status: cachedWeather.status,
                    description: cachedWeather.description,
                    icon: cachedWeather.weather?.icon || 'fa-cloud',
                    windSpeed: cachedWeather.windSpeed || 0,
                    rainProbability: cachedWeather.rainProbability || 0
                };
            }
        }

        if (!weatherData) {
            weatherData = {
                city: 'Coimbatore',
                temperature: 28,
                humidity: 65,
                status: 'Partly Cloudy',
                description: 'partly cloudy',
                icon: 'fa-cloud-sun',
                windSpeed: 12,
                rainProbability: 20
            };
        }

        // Process Crop Prices List
        const availableCropsCount = distinctCommodities.length || totalCropPricesCount;
        let cropPricesList = [];
        if (latestCrops && latestCrops.length > 0) {
            const priceMap = new Map();
            latestCrops.forEach(crop => {
                const key = crop.commodity;
                if (!priceMap.has(key)) {
                    priceMap.set(key, {
                        name: crop.commodity,
                        market: crop.market,
                        district: crop.district,
                        state: crop.state,
                        price: crop.modalPrice,
                        minPrice: crop.minPrice,
                        maxPrice: crop.maxPrice,
                        unit: crop.unit || 'Rs./Quintal',
                        trend: crop.trend || 0,
                        arrivalDate: crop.arrivalDate
                    });
                }
            });
            cropPricesList = Array.from(priceMap.values()).slice(0, 6);
        }

        // Process News Items List
        const rawArticles = (newsResult && newsResult.articles) ? newsResult.articles : [];
        const newsItems = rawArticles.map(item => ({
            id: item.id || item._id,
            _id: item._id || item.id,
            title: item.title,
            tag: item.tag || 'Agriculture',
            image: item.image,
            content: item.content || item.description,
            description: item.description,
            source: item.source || 'Agri News',
            date: item.publishedAt || item.date,
            publishedAt: item.publishedAt || item.date,
            url: item.url
        }));

        // Dynamic Weather & Advisory Alerts
        const latestAdvisory = recentAdvisories.length > 0 ? recentAdvisories[0] : null;
        const alertsList = [];
        if (weatherData.rainProbability > 50) {
            alertsList.push({
                type: 'weather',
                level: 'warning',
                title: 'High Rain Forecast',
                text: `${weatherData.rainProbability}% rain probability in ${weatherData.city}. Adjust irrigation.`
            });
        }
        if (latestAdvisory && (latestAdvisory.diseaseRisk === 'High' || latestAdvisory.diseaseRisk === 'Medium')) {
            alertsList.push({
                type: 'advisory',
                level: latestAdvisory.diseaseRisk === 'High' ? 'danger' : 'warning',
                title: `${latestAdvisory.cropType} Disease Risk`,
                text: `${latestAdvisory.diseaseRisk} risk detected for ${latestAdvisory.cropType} in ${latestAdvisory.district || latestAdvisory.state}.`
            });
        }

        res.json({
            success: true,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.firstName + ' ' + user.lastName,
                email: user.email,
                phone: user.phone,
                address: user.address,
                isProfileComplete: user.isProfileComplete,
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}&background=2E7D32&color=fff`
            },
            weather: weatherData,
            cropAdvisories: {
                total: totalAdvisories,
                latest: latestAdvisory,
                recent: recentAdvisories
            },
            cropPrices: {
                availableCrops: availableCropsCount,
                latest: cropPricesList
            },
            farmerNews: {
                total: (newsResult && newsResult.totalResults) || newsItems.length,
                latest: newsItems
            },
            activity: userActivities,
            alerts: alertsList,
            savedReports: totalAdvisories
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardData
};
