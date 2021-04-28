const mongoose = require("mongoose");
const AdminSchema = require("../schemas/AdminSchema");

const AdminModel = mongoose.model("Admin", AdminSchema);

module.exports = AdminModel;

//eof
