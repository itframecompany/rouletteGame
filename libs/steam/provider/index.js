const request = require('requestretry');

const config = require('../../../config');
const db = require('../../../libs/db');

const Item = require('../../../models/item/index');

class Provider {
    static get name() {
        return null;
    }

    static get baseUrl() {
        return null;
    }

    static get apiKey() {
        return null;
    }

    static get request() {
        return request.defaults({
            baseUrl: this.baseUrl,
            qs: {
                key: this.apiKey
            },
            json: true,
            fullResponse: false
        });
    }

    static get itemsUrl() {
        return null;
    }

    static get fileData() {
        return [];
    }

    /**
     * Parse items from response object
     * @param {*} [data=[]]
     * @returns {Item[]}
     */
    static getItems(data = []) {
        return Array.from(data).map(properties => new Item(properties));
    }

    /**
     * Fetch json from url
     * @returns {Promise}
     */
    static getItemsFromUrl() {
        return this.request(this.itemsUrl).then(this.getItems);
    }

    /**
     * Get items from json file
     * @returns {Item[]}
     */
    static getItemsFromFile() {
        return this.getItems(this.fileData);
    }

    /**
     * Import items to db from url
     * @returns {Promise}
     */
    static importItemsFromUrl() {
        return this.getItemsFromUrl().then(items => this.importItems(items));
    }

    /**
     * Import items to db from json file
     * @returns {Promise}
     */
    static importItemsFromFile() {
        return this.importItems(this.getItemsFromFile());
    }

    /**
     * Import items to db
     * @param {Item[]} items
     * @returns {Promise}
     */
    static importItems(items) {
        items = items.map(item => [item.name, item.price, item.color, item.nameColor, item.iconUrl, item.iconUrlLarge]);

        return new Promise((resolve, reject) => {
            db.query(`
                insert into ${config.tables.item} (name, price, color, name_color, icon_url, icon_url_large)
                values ?
                on duplicate key update price = coalesce(values(price), price)
            `, [items], error => {
                if (error) return reject(error);
                resolve();
            });
        });
    }
}

module.exports = Provider;