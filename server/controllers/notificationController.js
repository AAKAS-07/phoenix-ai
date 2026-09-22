const Notification = require('../models/Notification');

// Helper function to create a notification
const createNotification = async ({ userId, type, title, message, relatedId = null, relatedRoute = '/dashboard' }) => {
  try {
    if (!userId) return null;
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedId,
      relatedRoute,
      isRead: false,
      createdAt: new Date()
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};

// Get User Notifications & Unread Count
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const limit = parseInt(req.query.limit) || 30;
    const typeFilter = req.query.type;

    let query = { userId };
    if (typeFilter && typeFilter !== 'all') {
      query.type = typeFilter;
    }

    let notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // If user has 0 notifications, seed contextual starter notifications so user has real active notifications immediately
    if (notifications.length === 0) {
      const initial = [
        {
          userId,
          type: 'advisory',
          title: '🌱 Welcome to AI Crop Advisory',
          message: 'Generate your personalized AI crop recommendations based on soil, location, and climate.',
          relatedRoute: '/advisory',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 1000)
        },
        {
          userId,
          type: 'weather',
          title: '🌦 Weather Monitoring Active',
          message: 'Real-time weather tracking enabled for Coimbatore region.',
          relatedRoute: '/dashboard',
          isRead: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000)
        },
        {
          userId,
          type: 'price',
          title: '💰 Live Crop Market Prices',
          message: 'Track real-time data.gov.in Mandi prices for grains, pulses, and cash crops.',
          relatedRoute: '/prices',
          isRead: false,
          createdAt: new Date(Date.now() - 25 * 60 * 1000)
        }
      ];

      await Notification.insertMany(initial);
      notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications'
    });
  }
};

// Mark Single Notification as Read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      unreadCount,
      notification
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark All Notifications as Read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      unreadCount: 0
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete Notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    await Notification.findOneAndDelete({ _id: id, userId });
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Notification deleted',
      unreadCount
    });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
