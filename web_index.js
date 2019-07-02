const express = require('express')
const path = require('path')
const mc_ping = require('minecraft-ping')
const ping = require('ping')
const axios = require('axios');
const wol = require('wakeonlan');
var admin = require("firebase-admin");

const creds = require('./creds.js');
const mc_hostname = creds.mc_hostname;
const ping_hostname = creds.ping_hostname;
const command_api_root = creds.command_api_root;
const map_url = creds.map_url
const wol_MAC = creds.wol_MAC;
const MC_PORT = 25565
const WOL_PORT = 9
const NODE_PORT = 4000

const good_commands = ['boot', 'shutdown', 'start_server', 'stop_server'];

var serviceAccount = require('./service-account-file.json');

//TODO: Put your database URL here
admin.initializeApp({ 
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "" 
});

// Get status of minecraft server
const getStatus = (req, res) => {
	console.log("Status request received")
	// Ping the minecraft server
	mc_ping.ping_fe({host:mc_hostname, port:MC_PORT}, function(err, mc_res) {
		if(err) {
			// The MC server is down
			// Let's check if the computer is
			ping.promise.probe(ping_hostname,{min_reply: 1, timeout: 3})
				.then((ping_res) => {
					return ping_res.alive
				}).then( (input) => {
					res.status(200).json({
						ping_status: input,
						mc_status: false
					});
				});
		}
		else {
			// The MC server is up so the computer must be on
			res.status(200).json({
				ping_status: true,
				mc_status: true,
				mc_server_res: mc_res
			});
		}
	});
}

const sendFailure = (req, res) => {
	return res.status(401).json({
		sent_command: false
	});
}

passOnCommand = (req, res) => {
	// First we have to extract the token
	let token = req.get('Authorization');
	// Check we have a token
	if(!token) {
		return sendFailure(req, res);
	}
	// Remove the fluff
	if(token.startsWith('Bearer ')) {
		token = token.slice(7, token.length);
	}
	// Check the command is OK
	if(!good_commands.includes(req.params.cmd)) {
		return sendFailure(req, res);
	}
	admin.auth().verifyIdToken(token).then( decodedToken => {
		console.log(req.params.cmd);
		// We can send the command now
		if(req.params.cmd === "boot") {
			// We need to wake on lan
			return(wol(wol_MAC));
		} else {
			// Send off request to minecraft server
			return axios.put(command_api_root+req.params.cmd);
		}
	}).then(axio_res => {
		// Return success
		res.status(200).json({
			sent_command: true
		});
	}).catch( err => {
		return sendFailure(req, res);
	});
}

const app = express();

// Static site
app.use(express.static(path.join(__dirname,'public')));
// Dynmap redirect
app.get('/map', (req, res) => {
	mc_ping.ping_fe({host:mc_hostname, port:MC_PORT}, function(err, mc_res) {
		if(err) {
			// Minecraft server is down
			return res.status(404).sendFile(path.join(__dirname,'public','no_map.html'));
		} else {
			return res.redirect(map_url);
		}
	});
	//Check if server on first else we return a server-off page
	//return res.redirect('http://blackcardamom.duckdns.org:8123');
});
// Web server API
app.get('/api/status', getStatus);
app.post('/api/:cmd', passOnCommand);
// Listen on NODE_PORT
app.listen(NODE_PORT, () => console.log(`Server started on port ${NODE_PORT}`));
