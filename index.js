const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

// file-imports
const { userDataValidation, isEmailValidator } = require("./utils/authUtil");
const userModel = require("./models/userModel");
const isAuth = require("./middleware/isAuthMiddleware");
const store = new mongodbSession({
	uri: process.env.MONGO_URI,
	collection: "sessions",
});

// constants
const app = express();
const PORT = process.env.PORT || 8000;

// middleware
app.set("view engine", "ejs"); // setting the view engine of express ejs
app.use(express.urlencoded({ extended: true })); // this is for data sent from web browsers
app.use(express.json()); // this is for data sent from postman
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		store: store,
	}),
);
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
	const { email, password, username, name } = req.body;

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

	// check if the user with email/username is already registered
	const userEmailExist = await userModel.findOne({ email });
	if (userEmailExist) {
		return res.send({ status: 409, message: "Email already registered" });
	}

	const userUsernameExist = await userModel.findOne({ username });
	if (userUsernameExist) {
		return res.send({
			status: 409,
			message: "Username already registered",
		});
	}

	const hashedPassword = await bcrypt.hash(
		req.body.password,
		parseInt(process.env.BCRYPT_SALT),
	);

	console.log(hashedPassword);

	const userObj = new userModel({
		name: req.body.name,
		email: req.body.email,
		username: req.body.username,
		password: hashedPassword,
	});

	// use try catch -> what if db throws error
	try {
		await userObj.save();
		return res.redirect("/login");
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
	// console.log(req.body);
	const { loginId, password } = req.body;

	if (!loginId || !password) {
		return res.send({
			status: 400,
			message: "Missing loginId or password",
		});
	}

	try {
		//find the user with loginId
		let userDb;
		if (isEmailValidator({ str: loginId })) {
			userDb = await userModel.findOne({ email: loginId });
		} else {
			userDb = await userModel.findOne({ username: loginId });
		}

		if (!userDb)
			return res
				.status(400)
				.json("User not found, please register first");

		//compare the password

		const isMatch = await bcrypt.compare(password, userDb.password);
		if (!isMatch) return res.status(400).json("Password does not matched");

		// session based auth
		req.session.isAuth = true;
		req.session.user = {
			userId: userDb.userId,
			username: userDb.username,
			email: userDb.email,
		};

		return res.redirect("/dashboard");
	} catch (error) {
		return res.send({
			status: 500,
			message: "Internal server error",
			error: error,
		});
	}

	res.send("User logged in successfully");
});

// protected apis
// dashboard api
app.get("/dashboard", isAuth, (req, res) => {
	return res.render("dashboardPage");
});

app.post("/logout", (req, res) => {
	console.log("logout");

	req.session.destroy((err) => {
		if (err) return res.status(500).json(err);

		//successfully logout
		return res.redirect("/login");
	});
});

app.listen(PORT, () => {
	console.log("Server is running at: ");
	console.log(`http://localhost:${PORT}`);
});
