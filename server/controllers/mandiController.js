const Crop = require('../models/Crop');
const { ALL_INDIAN_STATES, getDistrictsForState } = require('../utils/indiaData');

const getMandiStates = async (req, res, next) => {
    try {
        const dbStates = await Crop.distinct('state', { source: 'data.gov.in' });
        const mergedStates = Array.from(new Set([...ALL_INDIAN_STATES, ...dbStates])).sort();
        res.json({ success: true, states: mergedStates });
    } catch (error) {
        res.json({ success: true, states: ALL_INDIAN_STATES });
    }
};

const getMandiDistricts = async (req, res, next) => {
    try {
        const { state } = req.query;
        if (!state) {
            return res.status(400).json({ success: false, message: 'State is required' });
        }

        const dbDistricts = await Crop.distinct('district', { state, source: 'data.gov.in' });
        const staticDistricts = getDistrictsForState(state);
        const mergedDistricts = Array.from(new Set([...staticDistricts, ...dbDistricts])).sort();

        res.json({ success: true, districts: mergedDistricts });
    } catch (error) {
        const { state } = req.query;
        res.json({ success: true, districts: getDistrictsForState(state) });
    }
};

const getMandiCommodities = async (req, res, next) => {
    try {
        const commodityNames = await Crop.distinct('commodity', { source: 'data.gov.in' });
        const commodities = commodityNames.map((name, index) => ({
            id: index + 1,
            name: name,
            category: 'Agricultural'
        }));
        res.json({ success: true, commodities: commodities });
    } catch (error) {
        next(error);
    }
};

const getMandiPricesFromDb = async (req, res, next) => {
    try {
        const { state, district, commodity, market, limit = 50 } = req.query;
        const filter = { source: 'data.gov.in' };
        if (state) filter.state = state;
        if (district) filter.district = district;
        if (commodity) filter.commodity = commodity;
        if (market) filter.market = market;

        const prices = await Crop.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, count: prices.length, data: prices });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMandiStates,
    getMandiDistricts,
    getMandiCommodities,
    getMandiPricesFromDb
};
