const mongoose = require('mongoose');
const { generateAdvisory, generateOpenAIAdvisory, cropDatabase, soilDatabase } = require('../services/advisoryService');
const AdvisoryResult = require('../models/AdvisoryResult');
const Activity = require('../models/Activity');

const createAdvisory = async (req, res, next) => {
    try {
        const { crop, growthStage, state, district, soilPH, soilType } = req.body;

        if (!crop) {
            return res.status(400).json({ success: false, message: 'Crop is required' });
        }
        if (!growthStage) {
            return res.status(400).json({ success: false, message: 'Growth stage is required' });
        }

        const cropKey = crop.toLowerCase();
        const cropData = cropDatabase[cropKey] || cropDatabase.wheat;

        const advisory = await generateAdvisory({
            crop: cropData.name || crop,
            growthStage,
            state: state || 'Delhi',
            district: district || '',
            soilPH: soilPH || '7.0',
            soilType: soilType || 'loam'
        });

        const npkValues = advisory.npk ? `N:${advisory.npk.n} P:${advisory.npk.p} K:${advisory.npk.k}` : 'N:100 P:50 K:40';

        let aiAdvisory = null;
        try {
            aiAdvisory = await generateOpenAIAdvisory({
                crop,
                growthStage,
                state: state || 'Delhi',
                district: district || '',
                soilPH: soilPH || '7.0',
                soilType: soilType || 'loam'
            });
        } catch (aiError) {
            console.log('OpenAI advisory unavailable:', aiError.message);
        }

        res.json({
            success: true,
            message: 'Advisory generated successfully',
            advisory: {
                irrigation: advisory.irrigationAdvice,
                fertilizer: advisory.fertilizerRecommendation,
                pest_control: aiAdvisory?.pest_control || (advisory.diseaseRecommendation || 'Consult local agricultural expert for pest control recommendations.'),
                yield_improvement: aiAdvisory?.yield_improvement || advisory.yieldPrediction + ' - ' + (advisory.yieldFactors ? advisory.yieldFactors.join(', ') : 'Good yield expected'),
                weather_precaution: aiAdvisory?.weather_precaution || 'Monitor weather conditions and follow local advisory.'
            },
            data: {
                ...advisory,
                npkValues: npkValues,
                status: 'active',
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        next(error);
    }
};

const getCropsList = (req, res, next) => {
    try {
        const crops = Object.entries(cropDatabase).map(([key, value]) => ({
            id: key,
            name: value.name,
            growthStages: value.growthStages,
            npkRatio: value.npkRatio,
            waterNeed: value.waterNeed
        }));

        res.json({ success: true, crops });
    } catch (error) {
        next(error);
    }
};

const getSoilTypesList = (req, res, next) => {
    try {
        const soils = Object.entries(soilDatabase).map(([key, value]) => ({
            id: key,
            name: value.name,
            waterRetention: value.waterRetention,
            drainage: value.drainage,
            phRange: value.phRange,
            nutrients: value.nutrients
        }));

        res.json({ success: true, soilTypes: soils });
    } catch (error) {
        next(error);
    }
};

const getGrowthStages = (req, res, next) => {
    try {
        const { crop } = req.params;
        const cropKey = crop.toLowerCase();

        if (!cropDatabase[cropKey]) {
            return res.status(404).json({
                success: false,
                message: `Crop "${crop}" not found`
            });
        }

        res.json({
            success: true,
            crop: cropDatabase[cropKey].name,
            growthStages: cropDatabase[cropKey].growthStages
        });
    } catch (error) {
        next(error);
    }
};

const saveAdvisoryResult = async (req, res, next) => {
    try {
        const {
            cropType,
            growthStage,
            state,
            district,
            soilPH,
            soilType,
            weather,
            irrigation,
            diseaseRisk,
            fertilizer,
            yieldPrediction,
            marketSuggestion
        } = req.body;

        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }

        const advisoryResult = new AdvisoryResult({
            userId,
            cropType: cropType || 'Wheat',
            growthStage: growthStage || 'Vegetative',
            state: state || 'Delhi',
            district: district || '',
            soilPH: soilPH || '7.0',
            soilType: soilType || 'loam',
            weather: weather || {},
            irrigation: irrigation || '',
            diseaseRisk: diseaseRisk || 'Low',
            fertilizer: fertilizer || '',
            yieldPrediction: yieldPrediction || '',
            marketSuggestion: marketSuggestion || '',
            isDeleted: false
        });

        await advisoryResult.save();

        // Log user activity & notification
        try {
            await Activity.create({
                userId,
                type: 'advisory_created',
                title: 'AI Crop Advisory Generated',
                description: `Generated advisory for ${advisoryResult.cropType} (${advisoryResult.growthStage}) in ${advisoryResult.district || advisoryResult.state}`,
                metadata: { advisoryId: advisoryResult._id, cropType: advisoryResult.cropType }
            });
        } catch (actErr) {
            console.error('Failed to log advisory activity:', actErr);
        }

        try {
            const { createNotification } = require('./notificationController');
            await createNotification({
                userId,
                type: 'advisory',
                title: '🌱 New AI Crop Advisory',
                message: `Your ${advisoryResult.cropType} advisory for ${advisoryResult.district || advisoryResult.state || 'your location'} has been generated.`,
                relatedId: String(advisoryResult._id),
                relatedRoute: '/advisory'
            });
        } catch (notifErr) {
            console.error('Failed to create advisory notification:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: 'Advisory result saved successfully',
            data: advisoryResult
        });

    } catch (error) {
        next(error);
    }
};

const getAdvisoryHistory = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.json({ success: true, data: [], total: 0 });
        }

        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const filter = {
            userId,
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
            ]
        };

        const results = await AdvisoryResult.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await AdvisoryResult.countDocuments(filter);

        res.json({
            success: true,
            data: results,
            total,
            limit,
            skip
        });
    } catch (error) {
        next(error);
    }
};

const deleteAdvisory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        console.log('[TRASH] Delete requested');
        console.log('[TRASH] Advisory ID:', id);
        console.log('[TRASH] Authenticated user ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('[TRASH] Invalid ObjectId format:', id);
            return res.status(400).json({ success: false, message: 'Invalid advisory ID format' });
        }

        const advisory = await AdvisoryResult.findOne({ _id: id, userId });
        if (!advisory) {
            console.log('[TRASH] Advisory found: false');
            return res.status(404).json({ success: false, message: 'Advisory record not found' });
        }

        console.log('[TRASH] Advisory found: true');
        console.log('[TRASH] Soft deleting advisory');
        advisory.isDeleted = true;
        advisory.deletedAt = new Date();
        await advisory.save();

        console.log('[TRASH] isDeleted:', advisory.isDeleted);
        console.log('[TRASH] deletedAt:', advisory.deletedAt);

        // Log user activity & notification
        try {
            await Activity.create({
                userId,
                type: 'advisory_deleted',
                title: 'Crop Advisory Moved to Trash',
                description: `Moved advisory for ${advisory.cropType} (${advisory.district || advisory.state}) to trash`,
                metadata: { advisoryId: id }
            });

            const { createNotification } = require('./notificationController');
            await createNotification({
                userId,
                type: 'advisory',
                title: '🌱 Advisory Moved to Trash',
                message: `Advisory record for ${advisory.cropType} was moved to trash.`,
                relatedId: id,
                relatedRoute: '/trash'
            });
        } catch (actErr) {}

        res.json({
            success: true,
            message: 'Crop advisory moved to Trash.',
            id
        });
    } catch (error) {
        console.error('[TRASH] Error soft deleting advisory:', error);
        next(error);
    }
};

const getTrashAdvisories = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        console.log('[TRASH] Fetching trash');
        console.log('[TRASH] Authenticated user ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const results = await AdvisoryResult.find({ userId, isDeleted: true })
            .sort({ deletedAt: -1, createdAt: -1 });

        console.log('[TRASH] Deleted advisories found:', results.length);

        res.json({
            success: true,
            advisories: results,
            data: results
        });
    } catch (error) {
        console.error('[TRASH] Error fetching trash:', error);
        next(error);
    }
};

const restoreAdvisory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        console.log('[TRASH] Restore requested');
        console.log('[TRASH] Advisory ID:', id);
        console.log('[TRASH] Authenticated user ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid advisory ID format' });
        }

        const advisory = await AdvisoryResult.findOne({ _id: id, userId });
        if (!advisory) {
            console.log('[TRASH] Advisory found: false');
            return res.status(404).json({ success: false, message: 'Advisory record not found' });
        }

        console.log('[TRASH] Advisory found: true');
        advisory.isDeleted = false;
        advisory.deletedAt = null;
        await advisory.save();

        console.log('[TRASH] isDeleted:', advisory.isDeleted);
        console.log('[TRASH] deletedAt:', advisory.deletedAt);

        // Log user activity & notification
        try {
            await Activity.create({
                userId,
                type: 'advisory_restored',
                title: 'Crop Advisory Restored',
                description: `Restored advisory record for ${advisory.cropType} (${advisory.district || advisory.state || 'field'})`,
                metadata: { advisoryId: id }
            });

            const { createNotification } = require('./notificationController');
            await createNotification({
                userId,
                type: 'advisory',
                title: '🌱 Crop Advisory Restored',
                message: `Advisory record for ${advisory.cropType} has been restored.`,
                relatedId: id,
                relatedRoute: '/advisory'
            });
        } catch (actErr) {}

        res.json({
            success: true,
            message: 'Crop advisory restored.',
            data: advisory
        });
    } catch (error) {
        next(error);
    }
};

const permanentDeleteAdvisory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        console.log('[TRASH] Permanent delete requested');
        console.log('[TRASH] Advisory ID:', id);
        console.log('[TRASH] Authenticated user ID:', userId);

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid advisory ID format' });
        }

        const advisory = await AdvisoryResult.findOneAndDelete({
            _id: id,
            userId,
            isDeleted: true
        });

        if (!advisory) {
            console.log('[TRASH] Advisory found for permanent delete: false');
            return res.status(404).json({ success: false, message: 'Advisory record not found in Trash' });
        }

        console.log('[TRASH] Advisory found for permanent delete: true');

        try {
            await Activity.create({
                userId,
                type: 'advisory_permanently_deleted',
                title: 'Crop Advisory Permanently Deleted',
                description: `Permanently deleted advisory record for ${advisory.cropType}`,
                metadata: { advisoryId: id }
            });
        } catch (actErr) {}

        res.json({
            success: true,
            message: 'Crop advisory permanently deleted.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
};
