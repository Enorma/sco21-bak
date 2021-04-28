const mongoose = require("mongoose");
const AlumnoSchema = require("../schemas/AlumnoSchema");

const AlumnoModel = mongoose.model("Alumno", AlumnoSchema);

module.exports = AlumnoModel;

//eof
