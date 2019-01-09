const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const steam = require('../libs/steam');
const User = require('../models/user');

const router = module.exports = require('express').Router();

router.use(require('../middlewares/geo'));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => done(null, user)).catch(done);
});

passport.use(
    new SteamStrategy({
        returnURL: `${process.env.APP_URL}/auth/steam/return`,
        realm: process.env.APP_URL,
        apiKey: steam.apiKey
    }, (identifier, profile, done) => {
        const profileData = profile._json;
        console.log(profileData)
        User.findBySteamId(profile.id).then(user => {
            if (user) {
                console.log('Found user with steamid %s', profile.id);

                user.name = profileData.personaname;
                user.avatar = profileData.avatar;
                return user;
            }

            console.log('Creating new user with steamid %s...', profile.id);

            return steam.getUserLevel(profile.id).then(level => {
                console.log('Steam level of user %s is %d', profile.id, level);
                let person1 = new User({
                    steam_id: profileData.steamid,
                    name: profileData.personaname,
                    avatar: profileData.avatar,
                    steam_level: level
                });
                console.log(person1)
                return person1
            });
               
        }).then(user => user.save()).then(user => {

            console.log('User %s successfully logged in', user.steamId);
            done(null, user);
        }).catch(error => {
            console.error(error);
            done(null, false);
        });
    })
);


router.use(require('../middlewares/session'));
router.use(passport.initialize());
router.use(passport.session());

router.get('/index', (req, res) => {
    const lang = 'ru' in req.query ? 'ru' : 'en';
    
    res.cookie('lang', lang);
    res.render('index', {lang});
});

router.use('/cron', require('./cron'));

// @todo Remove
router.use(require('../fake/route'));

router.get('/auth/steam', passport.authenticate('steam'));
router.get('/auth/steam/return', passport.authenticate('steam', {failureRedirect: '/'}), (req, res) => {
    res.redirect(req.cookies.lang === 'en' ? '/' : `/?${req.cookies.lang}`);
});

router.use('/verify', require('./verify'));

router.use(require('./mailer'));
router.use(require('./admin'));

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect(req.cookies.lang === 'en' ? '/' : `/?${req.cookies.lang}`);
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).end();
});