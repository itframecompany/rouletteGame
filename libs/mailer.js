var smtpConfig = {
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: "sendmail@majorskins.com",
        pass: 'Q5u3HUdtq'
    }
};

var mailer = require('nodemailer').createTransport(smtpConfig);
module.exports = mailer;
