const beautifyUnique = require('mongoose-beautiful-unique-validation');

const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
    "_id"    : mongoose.Schema.Types.ObjectId,

    "codigo" : {"type": String, "required": [true, "codigo is required"], "unique": true},
    "pass"   : {"type": String, "required": [true, "pass is required"]},

    "nombre" : {"type": String, "required": [true, "nombre is required"]},

    "grupos" : {"type": {},     "required": [true, "grupos is required"]}
}, {minimize:false});

TeacherSchema.plugin(beautifyUnique);

module.exports = TeacherSchema;

//eof
