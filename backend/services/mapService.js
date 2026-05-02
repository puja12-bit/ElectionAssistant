class MapService {
    getBoothLocationLink(boothName) {
        // Since we don't have a real Google Maps API key yet, we mock a search query URL
        const query = encodeURIComponent(boothName + " polling station India");
        return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
}

module.exports = new MapService();
