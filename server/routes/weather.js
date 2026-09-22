const express = require('express');
const router = express.Router();
const {
    getCities,
    getWeather,
    getWeatherByCity,
    getHourlyForecast,
    seedWeather
} = require('../controllers/weatherController');

router.get('/cities', getCities);
router.get('/', getWeather);
router.get('/forecast/hourly', getHourlyForecast);
router.post('/seed', seedWeather);
router.get('/:city', getWeatherByCity);

module.exports = router;
