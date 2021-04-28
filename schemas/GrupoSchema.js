const beautifyUnique = require('mongoose-beautiful-unique-validation');

const mongoose = require("mongoose");

const GrupoSchema = new mongoose.Schema({
    "_id"      : mongoose.Schema.Types.ObjectId,

    "nombre"   : {"type": String, "required": [true, "nombre is required"], "unique": true},
    "grado"    : {"type": Number, "required": [true, "grado is required"]},

    "materias" : {"type": {},     "required": [true, "materias is required"]}
}, {minimize:false});

GrupoSchema.plugin(beautifyUnique);

module.exports = GrupoSchema;

//eof
