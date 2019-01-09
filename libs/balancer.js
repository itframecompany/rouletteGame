const request = require('request-promise').defaults({
    baseUrl: 'http://46.101.134.70:8088',
    json: true
});

exports.deposit = (steamid, token, assets) => request.post('/deposit', {body: {steamid, token, assets}});

exports.withdraw = (steamid, token, assets) => request.post('/withdraw', {body: {steamid, token, assets}});

exports.check = (botColor, botId, offerId) => request(`/trade/${botColor}/${botId}/${offerId}`);

exports.inventory = steamId => request(`/inventory/${steamId}`).then(items => {
    return items.map(item => {
        return {
            asset_id: item.assetid,
            name: item.market_hash_name,
            tradable: item.tradable
        };
    });
});