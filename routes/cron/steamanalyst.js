const router = module.exports = require('express').Router();

const Steamanalyst = require('../../libs/steam/provider/steamanalyst');

router.get('/items/file', (req, res) => {
    res.json({
        message: '[steamanalyst] Import items from file started'
    });

    Steamanalyst.importItemsFromFile();
});