const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const { updateUserProfile, getUserProfile } = require('../controllers/userController');

router.put('/profile', authMiddleware, upload.single('avatar'), updateUserProfile);
router.get('/profile', authMiddleware, getUserProfile);

module.exports = router;
