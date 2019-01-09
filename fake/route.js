const User = require('../models/user');

const router = module.exports = require('express').Router();

router.get('/login', (req, res) => res.redirect(`/fake/76561198219935289`));

router.get('/fake/:id', (req, res) => {
    User.findBySteamId(req.params.id).then(user => {
        Object.assign(req.session, {
            passport: {
                user: user.id
            }
        });
    }).catch(console.error).then(() => res.redirect('/'));
});