const beautifyUnique = require('mongoose-beautiful-unique-validation');

const mongoose = require("mongoose");

const AlumnoSchema = new mongoose.Schema({
    "_id"         : mongoose.Schema.Types.ObjectId,

    "codigo"      : {"type": String,   "required": [true, "codigo is required"], "unique": true},
    "pass"        : {"type": String,   "required": [true, "pass is required"]},

    "nombre"      : {"type": String,   "required": [true, "nombre is required"]},
    "apellidop"   : {"type": String,   "required": [true, "apellidop is required"]},
    "apellidom"   : {"type": String,   "required": [true, "apellidom is required"]},

    "codigotutor" : {"type": String,   "required": [true, "codigotutor is required"], "unique": true},
    "emailtutor"  : {"type": String,   "required": [true, "emailtutor is required"], "unique": true},
    "passtutor"   : {"type": String,   "required": [true, "passtutor is required"]},

    "tutor"       : {"type": String,   "required": [true, "tutor is required"]},

    "sexo"        : {"type": String,   "required": [true, "sexo is required"]},
    "grado"       : {"type": String,   "required": [true, "grado is required"]},
    "grupo"       : {"type": String,   "required": [true, "grupo is required"]},

    "calif"       : {"type": {},       "required": [true, "calif is required"]},
    "tareas"      : {"type": {},       "required": [true, "tareas is required"]},
    "exams"       : {"type": {},       "required": [true, "exams is required"]},
    "faltas"      : {"type": [String], "required": [true, "faltas is required"]}
}, {minimize:false});

AlumnoSchema.plugin(beautifyUnique);

module.exports = AlumnoSchema;

//eof
