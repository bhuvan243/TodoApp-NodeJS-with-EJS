const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);
// const {ObjectId} = require("mongodb"); // this is used to create id for the sessions as same as the mongodb _id

// file-imports
const { userDataValidation, isEmailValidator } = require("./utils/authUtil");
const userModel = require("./models/userModel");
const isAuth = require("./middleware/isAuthMiddleware");
const todoModel = require("./models/todoModel");

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
app.use(express.static("public"));
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

// create new todo
app.post("/create-item", isAuth, async (req, res) => {
	console.log(req.body);

	const todoText = req.body.todo;
	const username = req.session.user.username;

	console.log(todoText, username);
	// data validation
	if (!todoText) {
		return res.send({
			status: 400,
			message: "Missing todo text",
		});
	}

	if (typeof todoText !== "string") {
		return res.send({
			status: 400,
			message: "Todo is not a text",
		});
	}

	//create ann object
	//obj.save()

	const todoObj = todoModel({
		//schema : value
		todo: todoText,
		username: username,
	});

	try {
		const todoDb = await todoObj.save();

		return res.send({
			status: 201,
			message: "Todo created successfully",
			data: todoDb,
		});
	} catch (error) {
		return res.send({
			status: 500,
			messsage: "Internal server error",
			error: error,
		});
	}
});

// read data from database
app.get("/read-item", isAuth, async (req, res) => {
	const username = req.session.user.username;
	const SKIP = Number(req.query.skip) || 0;
	const LIMIT = 2;

	try {
		// const todos = await todoModel.find({
		// 	username: req.session.user.username,
		// });

		const todos = await todoModel.aggregate([
			{ $match: { username } },
			{ $skip: SKIP },
			{ $limit: LIMIT },
		]);

		if (todos.length === 0) {
			return res.send({
				status: 404,
				message: "No todos found for this user",
			});
		}

		return res.send({
			status: 200,
			message: "Todos fetched successfully",
			data: todos,
		});
	} catch (error) {
		return res.send({
			status: 500,
			messsage: "Internal server error",
			error: error,
		});
	}
});

// edit and update a todo
app.post("/edit-item", async (req, res) => {
	console.log(req.body);

	const { todoId, updatedTodoText } = req.body;

	if (!todoId || !updatedTodoText) {
		return res.send({
			status: 400,
			message: "Missing todo id or updated todo text",
		});
	}

	if (typeof updatedTodoText !== "string") {
		return res.send({
			status: 400,
			message: "Updated todo is not a text",
		});
	}

	try {
		// find the todo from db
		const updatedTodo = await todoModel.findByIdAndUpdate(
			todoId,
			{ todo: updatedTodoText },
			{ new: true }, // [options.new=false] «Boolean» if true, return the modified document rather than the original
		);

		if (!updatedTodo) {
			return res.send({
				status: 404,
				message: "Todo not found",
			});
		}

		// ownership check whether the user is same
		if (updatedTodo.username !== req.session.user.username) {
			return res.send({
				status: 403,
				message: "You are not authorized to edit this todo",
			});
		}

		return res.send({
			status: 200,
			message: "Todo updated successfully",
			data: updatedTodo,
		});
	} catch (error) {
		return res.send({
			status: 500,
			message: "Internal server error",
			error: error,
		});
	}
});

// delete a todo
app.post("/delete-item", async (req, res) => {
	console.log(req.body);

	const { todoId } = req.body;

	if (!todoId) {
		return res.send({
			status: 400,
			message: "Missing todo id",
		});
	}

	if (typeof todoId !== "string") {
		return res.send({
			status: 400,
			message: "Todo Id should be a text",
		});
	}

	try {
		// find the todo from db
		const deletedTodo = await todoModel.findByIdAndDelete(todoId);
		console.log("deletedTodo", deletedTodo);

		if (!deletedTodo) {
			return res.send({
				status: 404,
				message: "Todo not found",
			});
		}

		// ownership check whether the user is same
		if (deletedTodo.username !== req.session.user.username) {
			return res.send({
				status: 403,
				message: "You are not authorized to delete this todo",
			});
		}

		return res.send({
			status: 200,
			message: "Todo deleted successfully",
			data: deletedTodo,
		});
	} catch (error) {
		return res.send({
			status: 500,
			message: "Internal server error",
			error: error,
		});
	}
});

app.listen(PORT, () => {
	console.log("Server is running at: ");
	console.log(`http://localhost:${PORT}`);
});
