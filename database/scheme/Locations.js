const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    coords: {
        type: [Number],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    country: {
        type: String,
        required: false
    },
    county: {
        type: String,
        required: false
    },
});

module.exports.locationMemory = mongoose.model("locations", locationSchema);