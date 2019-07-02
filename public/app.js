computerIndicator = document.getElementById("computer_indicator");
serverIndicator = document.getElementById("server_indicator");
computerLabel = document.getElementById("computer_label");
serverLabel = document.getElementById("server_label");
playersOnline = document.getElementById("playersOnline");
mapButton = document.getElementById("map_button");
loader = document.getElementById("loader");
passwordField = document.getElementById("password");
statusAPI = '/api/status';
commandAPI_root = '/api/';
mapURL = '/map';
login_email = 'dummy@email.com';


// Firebase setup
// Your web app's Firebase configuration
var firebaseConfig = {
  // TODO: REPLACE WITH YOUR FIREBASE CONFIG
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const goToMap = () => {location.href=mapURL}

const updateStatus = () => {
	console.log("Update status");
	// Load spiner
	loader.classList.remove("hide_loader");
	// Query status API
	fetch(statusAPI)
		.then( (res) => res.json() )
		.then( (data) => {
			// Hide loader
			loader.classList.add("hide_loader");
			// Update indicators
			if(data.ping_status){
				computerIndicator.innerHTML = "On";
				computerIndicator.classList.add("on_colours");
				computerLabel.classList.add("on_colours");
			} else {
				computerIndicator.innerHTML = "Off";
				computerIndicator.classList.remove("on_colours");
				computerLabel.classList.remove("on_colours");
			}
			if(data.mc_status){
				serverIndicator.innerHTML = "On";
				serverIndicator.classList.add("on_colours");
				serverLabel.classList.add("on_colours");
				mapButton.classList.remove("link_block");
				mapButton.onclick = goToMap;
			} else {
				serverIndicator.innerHTML = "Off";
				serverIndicator.classList.remove("on_colours");
				serverLabel.classList.remove("on_colours");
				mapButton.classList.add("link_block");
				mapButton.onclick = "";
			}
			// Add number of players
			if(data.mc_status) {
				playersOnline.innerHTML = data.mc_server_res.playersOnline + " player(s) online.";
			} else {
				playersOnline.innerHTML = "";
			}
		})
		.catch((err) => console.log(err));	
}

const showLogin = () => {
	// Show the password input
	passwordField.classList.remove("correct_pass");
	passwordField.classList.remove("incorrect_pass");
	passwordField.classList.remove("no_display");
	// Set focus to password field
	passwordField.focus();
}

const hideLogin = () => {
	setTimeout( ()=> {
		passwordField.classList.add("no_display");
	}, 1000);
}

const returnToNormal = (button_el) => {
	setTimeout( ()=> {
		button_el.classList.remove("success");
		button_el.classList.remove("failure");
	}, 3000);
}

const sendCommand = (command_str, button_el, user) => {
	// We now attempt to send the command
	// First get a token
	user.getIdToken(true)
	.then((token) => {
		var axiosOptions = {
			method: 'POST',
			url: commandAPI_root + command_str,
			headers: {
				'Authorization': 'Bearer '+token
			}
		}
		// Send the POST request
		return(axios(axiosOptions));	
	})
	.then( (res) => {
		if(res.data.sent_command) {
			// Show success colour
			button_el.classList.remove("failure");
			button_el.classList.add("success");
			returnToNormal(button_el);
		} else {
			// Throw an error
			throw new Error('The Raspberry Pi wouldn\'t send the command');
		}
	})
	.catch((err) =>{ 
		// Show that the command failed
		button_el.classList.remove("success");
		button_el.classList.add("failure");
		returnToNormal(button_el);
		console.log(err);
	});
	console.log("Sending command "+command_str);
}

const dealWithButton = (command_str, button_el) => {
	var user = auth.currentUser;
	if(user) {
		// Already logged in
		sendCommand(command_str, button_el, user);
	} else {
		showLogin();
		// Wait till logged in
		firebase.auth().onAuthStateChanged( user => {
			if(user) {
				sendCommand(command_str, button_el, user)
			}
		});
	}
}

// If we press enter on the password field then we should attempt a login
passwordField.addEventListener("keyup", (event) => {
	if(event.key === "Enter") {
		// Log into firebase
		firebase.auth().signInWithEmailAndPassword(login_email, passwordField.value)
		.then((res) => {
			// Show good password
			passwordField.classList.add("correct_pass");
			// Hide the password field
			hideLogin();
		})
		.catch((err) =>{ 
			// Show that the password is wrong
			passwordField.classList.add("incorrect_pass");
			console.log(err);
		});
	}
});

updateStatus();
