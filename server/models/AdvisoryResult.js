const mongoose = require('mongoose');

const advisoryResultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cropType: {
        type: String,
        required: true,
        trim: true
    },
    growthStage: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    district: {
        type: String,
        trim: true,
        default: ''
    },
    soilPH: {
        type: String,
        trim: true
    },
    soilType: {
        type: String,
        trim: true
    },
    weather: {
        temperature: Number,
        humidity: Number,
        description: String,
        rainfall: Number
    },
    irrigation: {
        type: String,
        trim: true
    },
    diseaseRisk: {
        type: String,
        trim: true
    },
    fertilizer: {
        type: String,
        trim: true
    },
    yieldPrediction: {
        type: String,
        trim: true
    },
    marketSuggestion: {
        type: String,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

advisoryResultSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AdvisoryResult', advisoryResultSchema);
