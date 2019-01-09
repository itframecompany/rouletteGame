const Provider = require('../');

class Steamanalyst extends Provider {
    static get name() {
        return 'steamanalyst';
    }

    static get fileData() {
        return require('./analyst.json');
    }
    
    static getItems(data) {
        return super.getItems(data.results.map(item => {
            return {
                name: item.market_name,
                price: item.current_price,
                icon_url: item.img
            };
        }));
    }
}

module.exports = Steamanalyst;