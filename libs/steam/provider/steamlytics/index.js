const Provider = require('../');

const Item = require('../../../../models/item/index');
const MyError = require('../../../../models/error');

class Steamlytics extends Provider {
    static get name() {
        return 'steamlytics';
    }

    static get baseUrl() {
        return 'http://api.csgo.steamlytics.xyz';
    }

    static get apiKey() {
        return '5336c8ba013fd178157fcc8cdef903df';
    }

    static get itemsUrl() {
        return '/v2/pricelist';
    }

    static get fileData() {
        return require('./pricelist.json');
    }

    static getItems(data) {
        if (!data.success) throw data;

        return super.getItems(Object.keys(data.items).map(name => {
            const item = data.items[name];
            let netPrice = (item.safe_net_price < item['30_days'].median_net_price) ? item.safe_net_price : item['30_days'].median_net_price;
            return {
                name: item.name,
                price: (item.ongoing_price_manipulation == true) ? 0 : netPrice
            };
        }));
    }

    /**
     * Parse items from response object
     * @param {*} [data=[]]
     * @returns {Item[]}
     */
    static getItemsWithoutPrice(data = []) {
        return data.items.map(item => {
            return new Item({
                name: item.market_hash_name,
                color: item.quality_color,
                name_color: item.name_color,
                icon_url: item.icon_url
            });
        });
    }

    static getItemsWithoutPriceFromUrl() {
        return this.request('/v1/items').then(this.getItemsWithoutPrice);
    }

    static getItemsWithoutPriceFromFile() {
        return this.getItemsWithoutPrice(require('./items.json'));
    }

    static importItemsWithoutPriceFromUrl() {
        return this.getItemsWithoutPriceFromUrl().then(items => this.importItems(items));
    }

    static importItemsWithoutPriceFromFile() {
        return this.importItems(this.getItemsWithoutPriceFromFile());
    }
}

module.exports = Steamlytics;
