const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
    city: {
        type: String,
        trim: true,
        required: true
    },
    country: {
        type: String,
        trim: true
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    temperature: {
        type: Number
    },
    feelsLike: {
        type: Number
    },
    tempMin: {
        type: Number
    },
    tempMax: {
        type: Number
    },
    humidity: {
        type: Number
    },
    pressure: {
        type: Number
    },
    visibility: {
        type: Number
    },
    windSpeed: {
        type: Number
    },
    windDeg: {
        type: Number
    },
    weather: {
        id: Number,
        main: String,
        description: String,
        icon: String
    },
    status: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    soilStatus: {
        type: String,
        trim: true
    },
    cropHealth: {
        type: Number
    },
    rainProbability: {
        type: Number
    },
    clouds: {
        type: Number
    },
    forecast: {
        type: Array,
        default: []
    },
    sunrise: {
        type: String,
        trim: true
    },
    sunset: {
        type: String,
        trim: true
    },
    timezone: {
        type: Number
    },
    source: {
        type: String,
        default: 'openweathermap.org'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

weatherSchema.index({ city: 1 });
weatherSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Weather', weatherSchema);
