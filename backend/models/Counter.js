const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gym',
        required: true
    },
    identifier: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        default: 0
    }
});

counterSchema.index({ gymId: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
