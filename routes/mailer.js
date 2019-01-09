const mailer = require('../libs/mailer');
const User = require('../models/user');
const bodyParser = require('body-parser');
const util = require('util');

const router = module.exports = require('express').Router();

function getUserDetails(userDetails){

        let userTemplate = "";

        if (/[0-9]{14,20}/.test(userDetails.steamId)) {

                userTemplate = userTemplate + '<div style=" display: inline-block;background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; text-transform:uppercase;">Name:</div><div style="display: inline-block; background-color:#5f5f5f; color:#ffffff; padding:10px 10px 10px 10px; font-size:14pt; margin-left:1px;">' + userDetails.name + '</div></div><div style=" margin-top:10px; "><div style="display: inline-block; background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; text-transform:uppercase;">Player since:</div><div style="display: inline-block; background-color:#5f5f5f; color:#ffffff; padding:10px 10px 10px 10px; font-size:14pt; margin-left:1px;">' + userDetails.created + '</div></div><div style=" margin-top:10px; "><div style="display: inline-block; background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; text-transform:uppercase;">Steam profile:</div><div style="display: inline-block; background-color:#5f5f5f; color:#ffffff; padding:10px 10px 10px 10px; font-size:14pt; margin-left:1px;"><a style="color:#ffffff;" href="https://steamcommunity.com/profiles/' + userDetails.steamId + '">' + userDetails.steamId + '</a></div></div><div style=" margin-top:10px;"><div style="display: inline-block; background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; text-transform:uppercase;">Trade offer link:</div><div style="display: inline-block; background-color:#5f5f5f; color:#ffffff; padding:10px 10px 10px 10px; font-size:14pt; margin-left:1px;"><a style="color:#ffffff;" href="' + userDetails.tradelink + '">' + userDetails.tradelink + '</a></div>';


        } else {

            userTemplate = userTemplate + '<div style="background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; margin-top:10px;">This report was submitted anonymously</div>';

        }

        return userTemplate;

}

router.use(bodyParser.json());

router.post('/support/submit', function (req, res) {
    console.log(req.cookies);


	console.log("Mailer engaged. User: "+ util.inspect(req.user));

    let steamid = (req.user) ? req.user.steamId : '';
	
	console.log("Mailer engaged. Steam ID: "+ util.inspect(steamid));
	
    let userReport = getUserDetails(req.user);

        let htmlResponse = '<div style="background-color:#8c7b64; padding:10px 10px 10px 10px; color:#ffffff; text-transform:uppercase; margin-bottom:10px; font-size:18pt;">Support Inquiry</div><div style="float:left; display:block;"><div style="float:left; background-color:#4ac27d; color:#ffffff; padding:10px 10px 10px 10px; font-size:16pt;">From:</div> <div style="float:left;  background-color:#30a763; color:#ffffff; padding:10px 10px 10px 10px; margin-left:1px; font-size:16pt;">' + req.body.messEmail + '</div></div><div style="float:left;display:block; margin-left:20px; margin-bottom:10px; clear: right;"><div style="float:left; background-color:#469ecb; color:#ffffff; padding:10px 10px 10px 10px; font-size:16pt; ">Subject:</div><div style="float:left; background-color:#3a92bf; color:#ffffff; padding:10px 10px 10px 10px; font-size:16pt; margin-left:1px;">' + req.body.messTitle + '</div></div><div style=" clear:left; margin-top:10px; "><div style="background-color:#8c7b64; padding:10px 10px 10px 10px; color:#ffffff; text-transform:uppercase; font-size:18pt">User info:</div><div style=" margin-top:10px; ">' + userReport + '</div></div><div style="float:none; display:block; clear:both;"><div style="background-color:#8c7b64; padding:10px 10px 10px 10px; color:#ffffff; text-transform:uppercase; margin-top:20px; font-size:18pt">Message:</div> <div style="background-color:#e3e3e3; color:#414141; padding:10px 10px 10px 10px; font-size:14pt; margin-top:10px;">' + req.body.messText + '</div></div>';

        let mailOptions = {

            from: 'sendmail@majorskins.com',
            to: 'support@majorskins.com',
            subject: 'Support Inquiry: ' + req.body.messTitle,
            html: htmlResponse,

        };

        mailer.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log('Mailer message error: ' + error);
            } else {
                console.log('Mailer message sent: ' + info.response);
            }

            res.status(200).end();
        });


});

router.post('/faq/submit', function (req, res) {

    getUserDetails(req.user.steamId).then((userReport) => {

        let htmlResponse = '<h2>Question</h2><p> From: ' + req.body.messEmail + '</p><hr/>' + userReport + '<hr/><h4>Message</h4><p>' + req.body.messText + '</p>';

        let mailOptions = {

            from: 'sendmail@majorskins.com',
            to: 'faq@majorskins.com',
            subject: 'Question',
            html: htmlResponse,

        };

        mailer.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log('Mailer message error: ' + error);
            } else {
                console.log('Mailer message sent: ' + info.response);
            }

            res.status(200).end();
        });

    });

});