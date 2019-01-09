const Cache = require('./');

const Inventory = require('../inventory');

class InventoryCache extends Cache {
    get prefix() {
        return 'inventory';
    }
    
    get ttl() {
        return 5 * 60;
    }

    get() {
        return super.get().then(items => {
            items = items.map(item => {
                return {
                    asset_id: item.assetId,
                    id: item.itemId,
                    name: item.name,
                    price: item.price,
                    color: item.color,
                    name_color: item.nameColor,
                    icon_url: item.iconUrl,
                    icon_url_large: item.iconUrlLarge,
                    tradable: item.tradable
                };
            });
            
            return new Inventory(items);
        });
    }
}

module.exports = InventoryCache;
