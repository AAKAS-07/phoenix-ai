require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cropRoutes = require('./routes/crops');
const newsRoutes = require('./routes/news');
const weatherRoutes = require('./routes/weather');
const mandiRoutes = require('./routes/mandi');
const advisoryRoutes = require('./routes/advisory');
const dashboardRoutes = require('./routes/dashboard');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notification');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/advisory', advisoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Phoenix AI Server is running smoothly' });
});

// SMTP Test Email route
app.get("/api/test-email", async (req, res) => {
  try {
    const { createTransporter } = require('./config/nodemailer');
    const transporter = createTransporter();
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const info = await transporter.sendMail({
      from: `"Smart Agriculture" <${smtpUser}>`,
      to: smtpUser,
      subject: "SMTP Test Email",
      text: "SMTP is working correctly."
    });

    console.log("EMAIL SENT:", info);

    res.json({
      success: true,
      message: "Test email sent",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Email failed",
      error: error.message
    });
  }
});


// Seed endpoint
app.post('/api/seed', async (req, res, next) => {
    try {
        const Crop = require('./models/Crop');
        const News = require('./models/News');

        const cropCount = await Crop.countDocuments();
        if (cropCount === 0) {
            const crops = [
                { name: 'Wheat (Premium)', market: 'Amritsar', price: 2380, unit: 'per Qntl', trend: 1.2, category: 'grain' },
                { name: 'Rice (Basmati)', market: 'Amritsar', price: 4250, unit: 'per Qntl', trend: -0.4, category: 'grain' },
                { name: 'Cotton', market: 'Gujarat', price: 6200, unit: 'per Qntl', trend: 2.1, category: 'cash' },
                { name: 'Sugarcane', market: 'Maharashtra', price: 3500, unit: 'per Qntl', trend: 0.8, category: 'cash' }
            ];
            await Crop.insertMany(crops);
        }

        const newsCount = await News.countDocuments();
        if (newsCount === 0) {
            const newsItems = [
                {
                    title: 'New Solar Subsidy for Farmers',
                    tag: 'Govt Policy',
                    image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&auto=format&fit=crop',
                    content: '<p>The Ministry of Renewable Energy has announced an expansion of the PM-KUSUM scheme...</p>'
                },
                {
                    title: 'MSP Hike for Kharif Crops 2024',
                    tag: 'Market',
                    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop',
                    content: '<p>The government has announced MSP hikes for Kharif crops...</p>'
                }
            ];
            await News.insertMany(newsItems);
        }

        res.json({ message: 'Database seeded successfully' });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Phoenix AI Backend Server running on http://localhost:${PORT}`);
});

connectDB().then(() => {
    console.log('Database connection initialized');
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
});
