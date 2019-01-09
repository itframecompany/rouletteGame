const router = module.exports = require('express').Router();

const config = require('../../config');

const Steamlytics = require('../../libs/steam/provider/steamlytics');
const Publisher = require('../../libs/publisher');

router.get('/all', (req, res) => {
    console.log('Import started');
    
    Steamlytics.importItemsWithoutPriceFromUrl().then(() => {
        return Steamlytics.importItemsFromUrl();
    }).then(() => {
        console.log('Import successfully finished');

        const publisher = new Publisher(config.CHANNEL_NOTIFY);
        publisher.publish('price.update');
        
        res.json({
            message: 'Import successfully finished'
        });
    }).catch(err => {
        console.error(err);
        
        res.json(err);
    });
});

router.get('/items', (req, res) => {
    res.json({
        message: '[steamlytics] Import items started'
    });

    Steamlytics.importItemsWithoutPriceFromUrl();
});

router.get('/items/file', (req, res) => {
    res.json({
        message: '[steamlytics] Import items from file started'
    });

    Steamlytics.importItemsWithoutPriceFromFile();
});

router.get('/prices', (req, res) => {
    res.json({
        message: '[steamlytics] Import prices started'
    });

    Steamlytics.importItemsFromUrl();
});

router.get('/prices/file', (req, res) => {
    res.json({
        message: '[steamlytics] Import prices from file started'
    });

    Steamlytics.importItemsFromFile();
});