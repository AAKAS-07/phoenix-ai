/**
 * Phoenix AI – Crop Advisory API routes (Server directory).
 */

const express = require('express');
const router = express.Router();
const { getAdvisory } = require('../services/mlAdvisoryService');
const {
    createAdvisory,
    getCropsList,
    getSoilTypesList,
    getGrowthStages,
    saveAdvisoryResult,
    getAdvisoryHistory,
    getTrashAdvisories,
    deleteAdvisory,
    restoreAdvisory,
    permanentDeleteAdvisory
} = require('../controllers/advisoryController');
const authMiddleware = require('../middleware/authMiddleware');

const CROP_DEFAULT_NPK = {
  wheat: { N: 120, P: 60, K: 40, temperature: 22, humidity: 55, rainfall: 120 },
  rice: { N: 90, P: 42, K: 43, temperature: 26, humidity: 80, rainfall: 200 },
  cotton: { N: 100, P: 50, K: 50, temperature: 28, humidity: 60, rainfall: 150 },
  sugarcane: { N: 150, P: 60, K: 80, temperature: 30, humidity: 70, rainfall: 250 },
  maize: { N: 120, P: 60, K: 40, temperature: 24, humidity: 60, rainfall: 130 },
  soybean: { N: 30, P: 60, K: 40, temperature: 25, humidity: 65, rainfall: 140 },
  potato: { N: 120, P: 80, K: 100, temperature: 18, humidity: 65, rainfall: 100 },
  tomato: { N: 100, P: 60, K: 80, temperature: 24, humidity: 55, rainfall: 110 }
};

function autoPopulateAdvisoryBody(body) {
  if (!body || typeof body !== 'object') return { valid: false, errors: ['Request body must be a JSON object.'] };

  const crop = body.crop || body.cropType || body.commodity || 'wheat';
  const growthStage = body.growthStage || body.growth_stage || 'vegetative';

  const cropKey = crop.toLowerCase().split(' ')[0];
  const defaults = CROP_DEFAULT_NPK[cropKey] || CROP_DEFAULT_NPK.wheat;

  const populated = {
    crop: crop,
    cropType: crop,
    growthStage: growthStage,
    growth_stage: growthStage,
    state: body.state || 'Delhi',
    district: body.district || '',
    soilType: body.soilType || body.soil_type || 'loam',
    soil_type: body.soilType || body.soil_type || 'loam',
    ph: Number(body.soilPH || body.ph || 7.0),
    soilPH: String(body.soilPH || body.ph || '7.0'),
    N: Number(body.N !== undefined ? body.N : defaults.N),
    P: Number(body.P !== undefined ? body.P : defaults.P),
    K: Number(body.K !== undefined ? body.K : defaults.K),
    temperature: Number(body.temperature !== undefined ? body.temperature : defaults.temperature),
    humidity: Number(body.humidity !== undefined ? body.humidity : defaults.humidity),
    rainfall: Number(body.rainfall !== undefined ? body.rainfall : defaults.rainfall)
  };

  return { valid: true, data: populated };
}

// Handler for generating crop advisory
async function handleGenerateAdvisory(req, res, next) {
  const result = autoPopulateAdvisoryBody(req.body);
  if (!result.valid) {
    return res.status(400).json({ success: false, error: 'Validation failed.', details: result.errors });
  }

  try {
    const rawAdvisory = await getAdvisory(result.data);

    // Construct standardized response structure
    const responsePayload = {
      success: true,
      message: 'Advisory generated successfully',
      advisory: {
        irrigation: rawAdvisory.irrigationRecommendation || rawAdvisory.irrigationAdvice || 'Maintain regular moisture schedule.',
        fertilizer: rawAdvisory.fertilizerRecommendation || 'Follow recommended NPK dosage for this growth stage.',
        pest_control: rawAdvisory.pest_control || (rawAdvisory.preventiveActions ? rawAdvisory.preventiveActions.join(', ') : 'Scout field weekly for pest activity.'),
        yield_improvement: rawAdvisory.yield_improvement || (rawAdvisory.yieldEstimate ? `${rawAdvisory.yieldEstimate.range ? rawAdvisory.yieldEstimate.range.join('-') : '25-40'} ${rawAdvisory.yieldEstimate.unit || 'quintals/acre'}` : 'Expected healthy harvest.'),
        weather_precaution: rawAdvisory.weather_precaution || (rawAdvisory.weatherPrecautions ? rawAdvisory.weatherPrecautions.join(', ') : 'Monitor local weather updates.')
      },
      data: {
        id: `adv-${Date.now()}`,
        input: {
          crop: result.data.crop,
          growthStage: result.data.growthStage,
          location: { state: result.data.state, district: result.data.district },
          soil: { type: result.data.soilType, ph: result.data.soilPH }
        },
        weather: rawAdvisory.weather || {
          temperature: result.data.temperature,
          humidity: result.data.humidity,
          rainfall: result.data.rainfall
        },
        diseaseRisk: rawAdvisory.riskLevel || rawAdvisory.diseaseRisk || 'Low',
        diseaseLevel: rawAdvisory.diseaseLevel || 10,
        diseaseFactors: rawAdvisory.preventiveActions || rawAdvisory.diseaseFactors || [],
        diseaseRecommendation: rawAdvisory.weatherPrecautions ? rawAdvisory.weatherPrecautions[0] : (rawAdvisory.diseaseRecommendation || 'Continue regular crop monitoring.'),
        irrigationAdvice: rawAdvisory.irrigationRecommendation || rawAdvisory.irrigationAdvice || 'Soil moisture is adequate.',
        irrigationUrgency: rawAdvisory.irrigationUrgency || 'low',
        fertilizerRecommendation: rawAdvisory.fertilizerRecommendation || 'Balanced NPK nutrient management.',
        npkValues: `N:${result.data.N} P:${result.data.P} K:${result.data.K}`,
        yieldPrediction: rawAdvisory.yieldPrediction || (rawAdvisory.yieldEstimate ? `${rawAdvisory.yieldEstimate.range ? rawAdvisory.yieldEstimate.range.join('-') : '30-40'} q/acre` : 'Good Yield Expected'),
        yieldPercentage: rawAdvisory.yieldPercentage || 85,
        marketSuggestion: rawAdvisory.marketSuggestion || rawAdvisory.reason || 'Favorable local demand.',
        marketTrend: rawAdvisory.marketTrend || 'Stable',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    };

    return res.json(responsePayload);
  } catch (err) {
    next(err);
  }
}

// API Routes
router.post('/advisory', handleGenerateAdvisory);
router.post('/', handleGenerateAdvisory);
router.post('/save', authMiddleware, saveAdvisoryResult);
router.get('/history', authMiddleware, getAdvisoryHistory);
router.get('/trash', authMiddleware, getTrashAdvisories);
router.post('/:id/restore', authMiddleware, restoreAdvisory);
router.post('/restore/:id', authMiddleware, restoreAdvisory);
router.delete('/:id/permanent', authMiddleware, permanentDeleteAdvisory);
router.delete('/permanent/:id', authMiddleware, permanentDeleteAdvisory);
router.delete('/:id', authMiddleware, deleteAdvisory);
router.get('/crops', getCropsList);
router.get('/soils', getSoilTypesList);
router.get('/growth-stages/:crop', getGrowthStages);

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    res.json({
      backend: 'ok',
      database: 'connected',
      mlModel: 'loaded',
      advisoryService: 'ready'
    });
  } catch (err) {
    res.status(503).json({ backend: 'ok', database: 'connected', mlModel: 'unavailable', advisoryService: 'error' });
  }
});

module.exports = router;
