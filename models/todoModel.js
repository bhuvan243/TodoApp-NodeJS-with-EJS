const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const todoSchema = new Schema(
	{
		todo: {
			type: String,
			required: true,
			trim: true,
			minLength: 3,
			maxLength: 100,
		},
		username: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model("Todo", todoSchema);
