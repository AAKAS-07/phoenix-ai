const express = require('express');
const router = express.Router();
const {
    getNews,
    getNewsById,
    createNews,
    seedNews
} = require('../controllers/newsController');

router.get('/', getNews);
router.get('/:id', getNewsById);
router.post('/', createNews);
router.post('/seed', seedNews);

module.exports = router;
