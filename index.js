const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

// file-imports
const { userDataValidation } = require("./utils/authUtil");
const userModel = require("./models/userModel");

// constants
const app = express();
const PORT = process.env.PORT || 8000;

// middleware
app.set("view engine", "ejs"); // setting the view engine of express ejs
app.use(express.urlencoded({ extended: true })); // this is for data sent from web browsers
app.use(express.json()); // this is for data sent from postman
// db connection
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("MongoDB Connected..."))
	.catch((err) => console.error("Connection error:", err));

// apis
app.get("/", (req, res) => {
	res.send("Server is running");
});

// register
app.get("/register", (req, res) => {
	res.render("registerPage");
});

app.post("/register-user", async (req, res) => {
	console.log(req.body);

	try {
		await userDataValidation(req.body);
	} catch (error) {
		res.status(400).json(error);
		// -------- we can also send the response like this -----------
		// return res.send({
		//     status : 400,
		//     message : "Data invalid",
		//     error : error
		// })
	}

	// without creating the userModel instance we can save the data in DB
	// const userDB = await userModel.create({
	// 	name: req.body.name,
	// 	email: req.body.email,
	// 	username: req.body.username,
	// 	password: req.body.password,
	// });
	// console.log(userDB._id);
	// res.send("registered successfully");

	const userObj = new userModel({
		name: req.body.name,
		email: req.body.email,
		username: req.body.username,
		password: req.body.password,
	});

	// use try catch -> what if db throws error
	try {
		const userDb = await userObj.save();
		return res.send({
			status: 201,
			message: "User registered successfully",
			data: userDb,
		});
	} catch (error) {
		res.send({
			status: 500,
			message: "Error while registering user",
			error: error,
		});
	}
});

// login
app.get("/login", (req, res) => {
	res.render("loginPage");
});

app.post("/login-user", async (req, res) => {
	res.send("User logged in");
});

app.listen(PORT, () => {
	console.log("Server is running at: ");
	console.log(`http://localhost:${PORT}`);
});
