const cities = require("./countries.json");

module.exports.getCities = () => {
    const filtered = new Map();
    cities.elements.forEach(c => {
        filtered.set(c.tags.name, {
            type: c.tags.place,
            is_in: {
                
            }
        })
    })
}

function test() {
    const data = [];
    const city = cities.elements.filter(c => c.tags.place === "city" || c.tags.place === "suburb");
    const villages = cities.elements.filter(c => c.tags.place === "village");
    console.log(city);
}

test();