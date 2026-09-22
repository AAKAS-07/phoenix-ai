const Crop = require('../models/Crop');

const MANDI_API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

const getCrops = async (req, res, next) => {
    try {
        const { state, district, commodity, limit = 50 } = req.query;
        const filter = {};
        if (state) filter.state = state;
        if (district) filter.district = district;
        if (commodity) filter.commodity = commodity;

        const crops = await Crop.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: crops.length,
            data: crops
        });
    } catch (error) {
        next(error);
    }
};

let mandiRateLimitBackoffUntil = 0;

const getMandiPrices = async (req, res, next) => {
    const { state, district, market, commodity, save = 'true' } = req.query;

    const returnDbFallback = async (reason = 'database-fallback') => {
        try {
            const filter = {};
            if (state) filter.state = state;
            if (district) filter.district = district;
            if (commodity) filter.commodity = commodity;
            const fallbackCrops = await Crop.find(filter).sort({ createdAt: -1 }).limit(50);
            return res.json({
                success: true,
                count: fallbackCrops.length,
                source: reason,
                data: fallbackCrops
            });
        } catch (dbErr) {
            return next(dbErr);
        }
    };

    // If external Mandi API is currently in rate-limit backoff, serve local database records immediately
    if (Date.now() < mandiRateLimitBackoffUntil) {
        return returnDbFallback('cached-database-fallback');
    }

    try {
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': '100',
            'offset': '0'
        });

        if (state) params.append('filters[state]', state);
        if (district) params.append('filters[district]', district);
        if (market) params.append('filters[market]', market);
        if (commodity) params.append('filters[commodity]', commodity);

        const response = await fetch(`${MANDI_API_URL}?${params.toString()}`);
        if (!response.ok) {
            if (response.status === 429) {
                mandiRateLimitBackoffUntil = Date.now() + 10 * 60 * 1000; // 10 minutes backoff
                console.warn('[Mandi API] Status 429 Rate Limit detected. Initiated 10-minute backoff; using local database cache.');
                return returnDbFallback('cached-database-fallback');
            }
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        const cropsData = (data.records || []).map(record => ({
            state: record.state,
            district: record.district,
            market: record.market,
            commodity: record.commodity,
            variety: record.variety,
            grade: record.grade,
            arrivalDate: record.arrival_date,
            minPrice: record.min_price,
            maxPrice: record.max_price,
            modalPrice: record.modal_price,
            unit: 'Rs./Quintal',
            source: 'data.gov.in'
        }));

        let savedCount = 0;
        if (save === 'true' && cropsData.length > 0) {
            await Crop.deleteMany({ source: 'data.gov.in' });
            await Crop.insertMany(cropsData);
            savedCount = cropsData.length;
        }

        res.json({
            success: true,
            count: cropsData.length,
            total: data.total || cropsData.length,
            savedToDatabase: savedCount,
            source: 'data.gov.in',
            data: cropsData
        });
    } catch (error) {
        console.error('Mandi API Error:', error.message);
        return returnDbFallback('database-fallback');
    }
};

const syncPrices = async (req, res, next) => {
    const { state, district, commodity } = req.body || {};

    const returnDbFallback = async (reason = 'database-fallback') => {
        try {
            const filter = {};
            if (state) filter.state = state;
            if (commodity) filter.commodity = commodity;
            const fallbackCrops = await Crop.find(filter).sort({ createdAt: -1 }).limit(50);
            return res.json({
                success: true,
                count: fallbackCrops.length,
                message: 'Synced using local database records',
                source: reason,
                data: fallbackCrops
            });
        } catch (dbErr) {
            return next(dbErr);
        }
    };

    if (Date.now() < mandiRateLimitBackoffUntil) {
        return returnDbFallback('cached-database-fallback');
    }

    try {
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': '100',
            'offset': '0'
        });

        if (state) params.append('filters[state]', state);
        if (district) params.append('filters[district]', district);
        if (commodity) params.append('filters[commodity]', commodity);

        const response = await fetch(`${MANDI_API_URL}?${params.toString()}`);
        if (!response.ok) {
            if (response.status === 429) {
                mandiRateLimitBackoffUntil = Date.now() + 10 * 60 * 1000;
                console.warn('[Mandi API] Status 429 Rate Limit detected in syncPrices. Initiated 10-minute backoff.');
                return returnDbFallback('cached-database-fallback');
            }
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        const cropsData = (data.records || []).map(record => ({
            state: record.state,
            district: record.district,
            market: record.market,
            commodity: record.commodity,
            variety: record.variety,
            grade: record.grade,
            arrivalDate: record.arrival_date,
            minPrice: record.min_price,
            maxPrice: record.max_price,
            modalPrice: record.modal_price,
            unit: 'Rs./Quintal',
            source: 'data.gov.in',
            updatedAt: new Date()
        }));

        const deleteFilter = { source: 'data.gov.in' };
        if (state) deleteFilter.state = state;
        if (commodity) deleteFilter.commodity = commodity;

        await Crop.deleteMany(deleteFilter);

        let insertedCount = 0;
        if (cropsData.length > 0) {
            const inserted = await Crop.insertMany(cropsData);
            insertedCount = inserted.length;
        }

        res.json({
            success: true,
            message: 'Prices synced successfully',
            count: insertedCount,
            data: cropsData
        });
    } catch (error) {
        next(error);
    }
};

const getCropsFromDb = async (req, res, next) => {
    try {
        const { state, district, commodity, market, limit = 50 } = req.query;
        const filter = {};
        if (state) filter.state = state;
        if (district) filter.district = district;
        if (commodity) filter.commodity = commodity;
        if (market) filter.market = market;

        const crops = await Crop.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: crops.length,
            data: crops
        });
    } catch (error) {
        next(error);
    }
};

const getCommodities = async (req, res, next) => {
    try {
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': '50',
            'offset': '0'
        });

        const response = await fetch(`${MANDI_API_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`API request failed`);
        }

        const data = await response.json();
        const commodities = [...new Set((data.records || []).map(r => r.commodity))];

        res.json({ success: true, commodities: commodities.sort() });
    } catch (error) {
        try {
            const distinctCommodities = await Crop.distinct('commodity', { source: 'data.gov.in' });
            res.json({ success: true, commodities: distinctCommodities.sort() });
        } catch (err) {
            next(error);
        }
    }
};

const getStates = async (req, res, next) => {
    try {
        const params = new URLSearchParams({
            'api-key': API_KEY,
            'format': 'json',
            'limit': '100',
            'offset': '0'
        });

        const response = await fetch(`${MANDI_API_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`API request failed`);
        }

        const data = await response.json();
        const states = [...new Set((data.records || []).map(r => r.state))];

        res.json({ success: true, states: states.sort() });
    } catch (error) {
        try {
            const distinctStates = await Crop.distinct('state', { source: 'data.gov.in' });
            res.json({ success: true, states: distinctStates.sort() });
        } catch (err) {
            next(error);
        }
    }
};

const createCrop = async (req, res, next) => {
    try {
        const { name, market, price, unit, trend, category } = req.body;
        const crop = await Crop.create({
            name,
            market,
            price,
            unit: unit || 'per Qntl',
            trend: trend || 0,
            category: category || 'grain'
        });
        res.status(201).json(crop);
    } catch (error) {
        next(error);
    }
};

const updateCrop = async (req, res, next) => {
    try {
        const crop = await Crop.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!crop) {
            return res.status(404).json({ message: 'Crop not found' });
        }
        res.json(crop);
    } catch (error) {
        next(error);
    }
};

const deleteCrop = async (req, res, next) => {
    try {
        const crop = await Crop.findByIdAndDelete(req.params.id);
        if (!crop) {
            return res.status(404).json({ message: 'Crop not found' });
        }
        res.json({ message: 'Crop removed' });
    } catch (error) {
        next(error);
    }
};

const seedCrops = async (req, res, next) => {
    try {
        const existingCrops = await Crop.countDocuments();
        if (existingCrops > 0) {
            return res.json({ message: 'Crops already seeded' });
        }

        const crops = [
            { name: 'Wheat (Premium)', market: 'Amritsar', price: 2380, unit: 'per Qntl', trend: 1.2, category: 'grain' },
            { name: 'Rice (Basmati)', market: 'Amritsar', price: 4250, unit: 'per Qntl', trend: -0.4, category: 'grain' },
            { name: 'Cotton', market: 'Gujarat', price: 6200, unit: 'per Qntl', trend: 2.1, category: 'cash' },
            { name: 'Sugarcane', market: 'Maharashtra', price: 3500, unit: 'per Qntl', trend: 0.8, category: 'cash' },
            { name: 'Potato', market: 'UP', price: 1800, unit: 'per Qntl', trend: -1.2, category: 'vegetable' },
            { name: 'Onion', market: 'Maharashtra', price: 2200, unit: 'per Qntl', trend: 3.5, category: 'vegetable' },
            { name: 'Tomato', market: 'Karnataka', price: 2800, unit: 'per Qntl', trend: -2.1, category: 'vegetable' },
            { name: 'Mustard', market: 'Rajasthan', price: 5200, unit: 'per Qntl', trend: 1.8, category: 'oilseed' }
        ];

        await Crop.insertMany(crops);
        res.json({ message: 'Crops seeded successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCrops,
    getMandiPrices,
    syncPrices,
    getCropsFromDb,
    getCommodities,
    getStates,
    createCrop,
    updateCrop,
    deleteCrop,
    seedCrops
};
