const mongoose = require("mongoose");
const TeacherSchema = require("../schemas/TeacherSchema");

const TeacherModel = mongoose.model("Teacher", TeacherSchema);

module.exports = TeacherModel;

//eof
