// Import all the packages
const Discord = require('discord.js');
const axios = require('axios');
const wol = require('wakeonlan');

// Setup variables
const creds = require('./creds.js');
const dtoken = creds.token;
const whitelist = creds.whitelist;
const client = new Discord.Client();
const command_api_root = creds.command_api_root;
const status_api = creds.status_api;
const wol_MAC = creds.wol_MAC;
let superuser;

client.once('ready', () => {
	console.log('Ready!');
	// Find the superuser
	superuser = client.users.find(val => val.username === creds.superuser);
});

function dealWithHelp(args){
	help_message =  "The following commands are available:\n";
	help_message += "• `!get_status` - Get the current status of Tom's computer and the Minecraft server.\n";
	help_message += "• `!boot` - Boot up Tom's computer.\n";
	help_message += "• `!shutdown` - Shutdown the server and Tom's computer.\n";
	help_message += "• `!cancel_shutdown` - Cancel any shutdown requests recently sent to Tom's computer.\n";
	help_message += "• `!start_server` - Start up the minecraft server.\n";
	help_message += "• `!stop_server` - Stop the minecraft server.\n";
	return help_message;
}

function getStatus() {
	return axios.get(status_api);
}

function sendCommand(cmd) {
	return axios.put(command_api_root+cmd);
}

// Dealing with message
client.on('message', message => {
	if(message.content.charAt(0)!=='!') {
		// Not a command, ignore
		return
	}
	// Check user
	uname = message.author.username
	if(!whitelist.includes(uname)){
		message.channel.send("Sorry, you are not whitelisted to run this command.");
		return
	}
	command = message.content.substr(1);
	// Split based on one or more spaces
	command_args = command.split(/ +/);
	console.log(`Received command from ${uname} : ${command}`);
	switch(command_args[0]) {
		case 'get_status':
			// Get the status of the server
			getStatus()
				.then(response => {
					// Build reponse string
					message_response = "Tom's computer is "
					if(response.data.ping_status) {
						message_response += "on ";
					} else {
						message_response += "off ";
					}
					message_response +="and the minecraft server is "
					if(response.data.mc_status){
						num_players = response.data.mc_server_res.playersOnline;
						message_response += "on. ";
						message_response += `There are ${num_players} player(s) online.`;
					} else {
						message_response += "off.";
					}
					// Send response
					message.channel.send(message_response);
				})
				.catch(error => {
					console.log(error);
					message_response = "Sorry, something went wrong.";
					message.channel.send(message_response);
				});
			break;
		case 'stop_server':
			getStatus().then( res => {
				if(res.data.mc_status) {
					// The server is on we should shut it down
					sendCommand('stop_server');
					message_response =  "Shutting the server down now. "
					message_response += "Try `!get_status` in a bit to check this worked."
					message.channel.send(message_response);
				} else {
					message.channel.send("The minecraft server is already down.");
				}
			});
			break;
		case 'start_server':
			getStatus().then( res => {
				if(res.data.mc_status) {
					message.channel.send("The minecraft server is already up.");
				} else {
					sendCommand('start_server');
					message_response =  "Starting the server up now. "
					message_response += "Try `!get_status` in a bit to check this worked."
					message.channel.send(message_response);
				}
			});
			break;
		case 'shutdown':
			getStatus().then( res => {
				if(!res.data.ping_status) {
					message.channel.send("Tom's computer is already switched off.");
				} else {
					sendCommand('shutdown');
					message_response =  "The shutdown command has been sent. ";
					message_response += "There is a 5 minute timeout before shutdown is initiated.\n";
					message_response += "Tom will be alerted of this event. ";
					message_response += "Check back later with `!get_status`. To cancel this, simply run `!cancel_shutdown`";
					message.channel.send(message_response)
						.then(superuser.send(uname + " ran a shutdown command."));
				}
			} );
			break;
		case 'boot':
			getStatus().then( res => {
				if(res.data.ping_status) {
					message.channel.send("Tom's computer is already turned on!");
				} else {
					wol(wol_MAC).then(() => {
						message_response =  "Magic packets sent. Tom's computer should be booting up.\n";
						message_response += "Tom will be alerted of this event. Check back later with `!get_status`.";
						message.channel.send(message_response)
							.then(superuser.send(uname + " ran a boot command."));
					});
				}
			});
			break;
		case 'cancel_shutdown':
			getStatus().then( res=>{
				if(!res.data.ping_status) {
					message.channel.send("Sorry the computer has already shutdown.");
				} else {
					sendCommand('cancel_shutdown');
					message_response =  "The cancel shutdown command has been sent. Fingers crossed.";
					message.channel.send(message_response);
				}
			});
			break;
		case 'help':
			message.channel.send(dealWithHelp(command_args));
			break;
		default:
			// Command not recognised
			message_response = "Sorry that command was not recognised, type `!help` to get a list of commands.";
			message.channel.send(message_response);
	}
});

client.login(dtoken);
