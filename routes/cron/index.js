const config = require('../../config');

const router = module.exports = require('express').Router();

router.use((req, res, next) => {
    if (req.query.key !== config.CRON_KEY) {
        res.status(403).send('You shall not pass');
        return;
    }

    next();
});

router.use('/steamanalyst', require('./steamanalyst'));
router.use('/steamlytics', require('./steamlytics'));