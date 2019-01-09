const API_KEY = '6312CEB8FD2FAE012D6BA41FD6CA6CBB';

const request = require('request-promise').defaults({
    baseUrl: 'https://api.steampowered.com',
    qs: {
        key: API_KEY
    },
    json: true,
    transform: body => body.response
});

exports.apiKey = API_KEY;

exports.domain = 'majorskins';

exports.getUserLevel = id => {
    return request('/IPlayerService/GetSteamLevel/v1/', {
        qs: {
            steamid: id
        }
    }).then(response => response.player_level);
};