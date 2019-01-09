const redis = require('../libs/redis').client;
const router = module.exports = require('express').Router();

router.use(require('../middlewares/auth'));

router.get('/:secret', function (req, res) {

    let secret = req.params.secret,
        verified = 'false';

    if (secret.length == 8 && typeof secret === 'string') {

        let key = `secret:${req.user.id}:${secret}`;

        redis.get(key, (err, reply) => {

            console.log("Searched for key " + key + ", got reply: " + reply + " with error " + err);
            if (!err && reply !== null) {

                //found
                redis.del(key);
                verified = true;

            }

            res.cookie('verifiedOffer', verified, {secure: true, maxAge: '300000'});
            res.redirect('/');

        });

    } else {

        console.log("Secret " + secret + " does not match");
        res.cookie('verifiedOffer', verified, {secure: true, maxAge: '300000'});
        res.redirect('/');

    }


});