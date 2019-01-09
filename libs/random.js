const crypto = require('crypto');

exports.float = () => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(7, (err, buf) => {
            if (err) return reject(err);

            let position = 0;

            const number = (((((((
                buf[position++] % 32) / 32 +
                buf[position++]) / 256 +
                buf[position++]) / 256 +
                buf[position++]) / 256 +
                buf[position++]) / 256 +
                buf[position++]) / 256 +
                buf[position]) / 256;

            resolve(number);
        });
    });
};

exports.salt = () => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) return reject(err);
            resolve(buf.toString('hex'));
        });
    });
};

exports.hash = (number, salt) => md5(md5(number) + salt);

function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}