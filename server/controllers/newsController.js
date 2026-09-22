const News = require('../models/News');

const NEWS_API_KEY = process.env.NEWS_API_KEY || '3703860daa624536adfb7b2b4ab46072';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';
const AGRI_KEYWORDS = ['agriculture', 'farming', 'crop', 'mandi', 'farmer', 'agri policy India'];

const languageMap = {
    'en': 'en',
    'hi': 'hi',
    'ta': 'ta',
    'english': 'en',
    'hindi': 'hi',
    'tamil': 'ta'
};

const getNewsList = async (limit = 10, language = 'en', page = 1) => {
    try {
        const apiLang = languageMap[language.toLowerCase()] || 'en';
        const searchQuery = AGRI_KEYWORDS.join(' OR ');

        const response = await fetch(
            `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(searchQuery)}&language=${apiLang}&sortBy=publishedAt&pageSize=${limit}&page=${page}&apiKey=${NEWS_API_KEY}`,
            {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }
        );

        if (response.ok) {
            const data = await response.json();
            if (data.status !== 'error' && data.articles && data.articles.length > 0) {
                const articles = data.articles.map((article, idx) => ({
                    id: article.url || `news-${idx}`,
                    _id: article.url || `news-${idx}`,
                    title: article.title || 'No title',
                    description: article.description || article.content || 'No description available',
                    content: article.content || article.description || 'Full article content available at source.',
                    tag: 'Agriculture',
                    url: article.url,
                    image: article.urlToImage || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop',
                    source: article.source?.name || 'Agri News',
                    publishedAt: article.publishedAt || new Date().toISOString(),
                    date: article.publishedAt || new Date().toISOString()
                }));

                return {
                    articles,
                    totalResults: data.totalResults || articles.length,
                    fallback: false
                };
            }
        }
    } catch (err) {
        console.error('Error in live news fetch:', err.message);
    }

    // Fallback to local MongoDB News collection
    try {
        const news = await News.find()
            .sort({ date: -1 })
            .limit(parseInt(limit));

        const articles = news.map(item => ({
            id: item._id,
            _id: item._id,
            title: item.title,
            description: item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '',
            content: item.content,
            tag: item.tag || 'Govt Policy',
            url: '#',
            image: item.image,
            source: 'Local News',
            publishedAt: item.date || new Date().toISOString(),
            date: item.date || new Date().toISOString()
        }));

        return {
            articles,
            totalResults: articles.length,
            fallback: true
        };
    } catch (dbErr) {
        return { articles: [], totalResults: 0, fallback: true };
    }
};

const getLocalNewsFallback = async (req, res) => {
    const result = await getNewsList(req.query.limit || 10, req.query.language || 'en', req.query.page || 1);
    res.json({
        success: true,
        news: result.articles,
        totalResults: result.totalResults,
        currentPage: 1,
        totalPages: 1,
        fallback: true,
        message: 'Showing cached local news'
    });
};

const getNews = async (req, res, next) => {
    try {
        const { language = 'en', page = 1, limit = 10 } = req.query;
        const result = await getNewsList(limit, language, page);

        res.json({
            success: true,
            news: result.articles,
            totalResults: result.totalResults,
            currentPage: parseInt(page) || 1,
            totalPages: Math.ceil((result.totalResults || 0) / (parseInt(limit) || 10))
        });
    } catch (error) {
        await getLocalNewsFallback(req, res);
    }
};

const getNewsById = async (req, res, next) => {
    try {
        const newsItem = await News.findById(req.params.id);
        if (!newsItem) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(newsItem);
    } catch (error) {
        next(error);
    }
};

const createNews = async (req, res, next) => {
    try {
        const { title, tag, image, content } = req.body;
        const newsItem = await News.create({
            title,
            tag,
            image,
            content
        });
        res.status(201).json(newsItem);
    } catch (error) {
        next(error);
    }
};

const seedNews = async (req, res, next) => {
    try {
        const existingNews = await News.countDocuments();
        if (existingNews > 0) {
            return res.json({ message: 'News already seeded' });
        }

        const newsItems = [
            {
                title: 'New Solar Subsidy for Farmers',
                tag: 'Govt Policy',
                image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&auto=format&fit=crop',
                content: '<p>The Ministry of Renewable Energy has announced an expansion of the PM-KUSUM scheme, providing 75% subsidy on solar pumps for farmers. This initiative aims to promote sustainable irrigation practices and reduce dependency on grid electricity.</p><p>Farmers can now apply through their local agricultural department with land documents and Aadhaar card. The subsidy will be directly transferred to bank accounts within 30 days of installation.</p>'
            },
            {
                title: 'MSP Hike for Kharif Crops 2024',
                tag: 'Market',
                image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop',
                content: '<p>The government has announced Minimum Support Price (MSP) hikes for Kharif crops for the 2024-25 season. Paddy sees a Rs 200 increase, while pulses and oilseeds have seen significant hikes to encourage domestic production.</p><p>Agricultural experts believe this move will boost farmer incomes and reduce reliance on imports of edible oils.</p>'
            },
            {
                title: 'Drone Technology in Agriculture',
                tag: 'Technology',
                image: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=800&auto=format&fit=crop',
                content: '<p>Drone technology is revolutionizing Indian agriculture. From precise pesticide spraying to crop health monitoring, agricultural drones are becoming increasingly popular among progressive farmers.</p><p>Several startups are now offering drone-as-a-service models, making this technology accessible to small and marginal farmers at affordable rates.</p>'
            },
            {
                title: 'Organic Farming Initiative Launched',
                tag: 'Sustainability',
                image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop',
                content: '<p>A new organic farming initiative has been launched in partnership with state agricultural universities. The program will provide training and certification support to farmers transitioning to organic methods.</p><p>Export demand for organic produce is growing, offering farmers premium prices for certified organic products.</p>'
            },
            {
                title: 'Climate-Smart Agriculture Training',
                tag: 'Education',
                image: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&auto=format&fit=crop',
                content: '<p>Free training programs on climate-smart agricultural practices are now available for farmers in drought-prone regions. The training covers water conservation, crop diversification, and weather-based farming techniques.</p><p>Interested farmers can register through the local Krishi Vigyan Kendra.</p>'
            },
            {
                title: 'New Fertilizer Subsidy Guidelines',
                tag: 'Govt Policy',
                image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&auto=format&fit=crop',
                content: '<p>The government has introduced new fertilizer subsidy guidelines aiming to promote balanced nutrient use. Under the new system, subsidies will be directly credited to manufacturers, ensuring timely availability of fertilizers at fair prices.</p>'
            }
        ];

        await News.insertMany(newsItems);
        res.json({ message: 'News seeded successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNews,
    getNewsList,
    getNewsById,
    createNews,
    seedNews
};
