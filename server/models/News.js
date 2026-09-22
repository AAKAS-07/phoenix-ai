const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    tag: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    state: {
        type: String,
        trim: true,
        default: 'all'
    },
    language: {
        type: String,
        enum: ['en', 'ta', 'hi', 'all'],
        default: 'all'
    },
    category: {
        type: String,
        enum: ['policy', 'market', 'weather', 'technology'],
        default: 'policy'
    }
});

newsSchema.index({ category: 1, state: 1, language: 1, date: -1 });

module.exports = mongoose.model('News', newsSchema);
