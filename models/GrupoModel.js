const mongoose = require("mongoose");
const GrupoSchema = require("../schemas/GrupoSchema");

const GrupoModel = mongoose.model("Grupo", GrupoSchema);

module.exports = GrupoModel;

//eof
