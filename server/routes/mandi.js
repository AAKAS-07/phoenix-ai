const express = require('express');
const router = express.Router();
const {
    getMandiStates,
    getMandiDistricts,
    getMandiCommodities,
    getMandiPricesFromDb
} = require('../controllers/mandiController');

router.get('/states', getMandiStates);
router.get('/districts', getMandiDistricts);
router.get('/commodities', getMandiCommodities);
router.get('/prices', getMandiPricesFromDb);

module.exports = router;
