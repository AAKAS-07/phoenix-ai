const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/cropController');

router.get('/', getCrops);
router.get('/mandi', getMandiPrices);
router.post('/sync', syncPrices);
router.get('/db', getCropsFromDb);
router.get('/commodities', getCommodities);
router.get('/states', getStates);
router.post('/', createCrop);
router.put('/:id', updateCrop);
router.delete('/:id', deleteCrop);
router.post('/seed', seedCrops);

module.exports = router;
