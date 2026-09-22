const Activity = require('../models/Activity');

const getUserActivities = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.json({ success: true, activities: [], count: 0 });
        }

        const limit = parseInt(req.query.limit) || 15;
        const activities = await Activity.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            count: activities.length,
            activities
        });
    } catch (error) {
        next(error);
    }
};

const logUserActivity = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const { type, title, description, metadata } = req.body;
        if (!type || !title) {
            return res.status(400).json({ success: false, message: 'Activity type and title are required' });
        }

        const activity = new Activity({
            userId,
            type,
            title,
            description: description || '',
            metadata: metadata || {}
        });

        await activity.save();

        res.status(201).json({
            success: true,
            message: 'Activity logged successfully',
            activity
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserActivities,
    logUserActivity
};
