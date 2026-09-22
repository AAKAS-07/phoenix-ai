const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    market: {
        type: String,
        trim: true
    },
    price: {
        type: Number
    },
    unit: {
        type: String,
        default: 'per Qntl'
    },
    trend: {
        type: Number,
        default: 0
    },
    category: {
        type: String,
        default: 'grain'
    },
    state: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    commodity: {
        type: String,
        trim: true
    },
    variety: {
        type: String,
        trim: true
    },
    grade: {
        type: String,
        trim: true
    },
    arrivalDate: {
        type: String,
        trim: true
    },
    minPrice: {
        type: Number
    },
    maxPrice: {
        type: Number
    },
    modalPrice: {
        type: Number
    },
    source: {
        type: String,
        default: 'data.gov.in'
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

cropSchema.index({ state: 1, district: 1, market: 1, commodity: 1 });
cropSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model('Crop', cropSchema);
