window.onload = genrateTodos;

let skip = 0;

function genrateTodos() {
	axios
		.get(`/read-item?skip=${skip}`)
		.then((res) => {
			if (res.data.status !== 200) {
				alert(res.data.message);
				return;
			}

			const todos = res.data.data;

			document.getElementById("item_list").insertAdjacentHTML(
				"beforeend",
				todos
					.map((item) => {
						return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
        <span class="item-text"> ${item.todo}</span>
        <div>
        <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
        <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
        </div></li>`;
					})
					.join(""),
			);
			skip += todos.length;
		})
		.catch((err) => console.log(err));
}

document.addEventListener("click", function (event) {
	//edit
	if (event.target.classList.contains("edit-me")) {
		const updatedTodoText = prompt("Enter new Todo text");
		const todoId = event.target.getAttribute("data-id");
		axios
			.post("/edit-item", { updatedTodoText, todoId })
			.then((res) => {
				if (res.data.status !== 200) {
					alert(res.data.message);
					return;
				}
				event.target.parentElement.parentElement.querySelector(
					".item-text",
				).innerText = updatedTodoText;
			})
			.catch((err) => console.log(err));
	}
	//delete
	else if (event.target.classList.contains("delete-me")) {
		const todoId = event.target.getAttribute("data-id");

		axios
			.post("/delete-item", { todoId })
			.then((res) => {
				if (res.data.status !== 200) {
					alert(res.data.message);
					return;
				}
				event.target.parentElement.parentElement.remove();
			})
			.catch((err) => {
				console.log(err);
			});
	}
	//create
	else if (event.target.classList.contains("add_item")) {
		const todo = document.getElementById("create_field").value;

		axios
			.post("/create-item", { todo })
			.then((res) => {
				if (res.data.status !== 201) {
					alert(res.data.message);
					return;
				}

				document.getElementById("create_field").value = "";

				document.getElementById("item_list").insertAdjacentHTML(
					"beforeend",
					`<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
          <span class="item-text"> ${res.data.data.todo}</span>
          <div>
          <button data-id="${res.data.data._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
          <button data-id="${res.data.data._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
          </div></li>`,
				);
			})
			.catch((err) => console.log(err));
	}
	// show-more todos
	else if (event.target.classList.contains("show_more")) {
		genrateTodos();
	}
});

//client(axios) <------> server(express) <----->Database
