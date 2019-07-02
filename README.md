# Minecraft Server Status - Web Service and Discord Bot

# Introduction

This is an extension and a refactor of [my previous Minecraft server status web service and Discord bot](https://github.com/tomchaplin/mc_server_status_bot).
This repository includes two NodeJS apps with similar purposes.

The first hosts a web service for getting and setting the status of a minecraft server through an API.
The service also provides a nice front-end for visually interacting with this API.
All state-changing API requests require authentication through Google Firebase.
The front-end also optionally provides a link to Dynmap if you are so inclined.

The second is a Discord bot that exposes these same commands to a Discord channel of your choosing.
Users are by default not trusted to run commands unless added to the whitelist.
Additionally, when the Minecraft computer is booted or shutdown, a designed superuser is altered via. Discord DM.

These two services are entirely separable.
The Discord bot should really use the API exposed by the web service to avoid redundancy.
However, I'm too lazy to sort out all the authentication again so it doesn't.
Sorry.

# Architecture

The basic architecture of the system consists of two machines on a common local network:

* **Minecraft computer** - A powerful computer whose job it is to run the Minecraft server.
This computer will also have to run a lightweight local web service that will listen for commands.
This is implemented using OpenBSD `netcat` in `bash` but could be re-written in your favourite language.
* **Secondary computer** - This is a lightweight computer that will run the main web service and Discord bot.
This should be low-powered as it will be always on.
I used a Raspberry Pi 2.

Below is a basic diagram of the network architecture so you can configure appropriate port forwarding and firewalls.

![](architecture.png)

# Setup

All of the code provided in this repo will need to be downloaded into a folder on the secondary computer.
The only exception is `mc_command_server.sh` which should be on the Minecraft computer.

# Configuration

## Command Listening Server and Minecraft Server

The Minecraft server will live in a `tmux` session named `mc_server`. 
On my setup, the Minecraft server is run by an unprivileged user who only has access to the Minecraft server files.
Hence the first few lines of `mc_command_server.sh`.
These lines should be changed or removed so that, once the relevant commands have been executed, the `tmux` session will be in the Minecraft server folder.

In this folder I then have a file named `start_server.sh` which contains the `java` command for starting the Minecraft server.
You should include one of these too.

Finally, if you want to use [Dynamp](https://dev.bukkit.org/projects/dynmap) then make sure that the server is CraftBukkit/Spigot with Dynmap installed.

## Firebase Console

When executing commands through the front-end we want to authenticate the user, otherwise anybody could turn of your server/computer.
This is done using Google's Firebase Authentication.
You will need to sign up for this free service and create a new project.

Next enable username and password login and setup an account that will be used to login over the web service.
Note the email used here will be publicly available along with the front-end and so will probably be spammed.

### Back-end firebase config

Next [setup a service account](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) and make sure the provided service account private key is stored in the root project folder on the secondary computer, as `service-account-file.json`.
Then copy the `databaseURL` section provided under `Settings > Service Accounts` into the relevant section of `web_index.js`.

### Front-end firebase config

We need to setup firebase for our front-end web app.
To do this follow Step 2 on [Firebase's web setup guide](https://firebase.google.com/docs/web/setup); then add the `firebaseConfig` object to the designated place at the top of `public/app.js`.

## Discord Developer Portal

Next we need to setup our discord bot with the desired channel.
First things first we need a token.
This project was built with `Discord.js` and so you can follow [their guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot).
The resulting token should then be added to the `token` field of `creds.js`.
You also need to make sure that you [add your bot to your Discord server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links).

## Back-end Configuration

Now that we have all of the external services we can finalise the back-end configuration.
All of this is contained in the `creds.js` file.

Most of the fields are self-explanatory:

* `token` - The token for your bot from the Discord Developer Portal.
* `whitelist` - An array of Discord users who have permission to run all commands.
* `superuser` - This should probably be your username on Discord.
This user will be sent notifications when `shutdown` and `boot` are initiated.
* `status_api` - The address of the status API exposed by `web_index`, this will probably remain unchanged.
* `command_api_root` - This is the URL that connects us to the `mc_command_server.sh` on the Minecraft computer.
Simply change `local.minecraft.ip` to the local IP of the Minecraft computer (which should preferably be static),
* `map_url` - This is the external address of the Dynmap server so simply change `public.hostname.here` to your public hostname.
If you only want the map available locally then just use the local IP of the Minecraft computer.
* `wol_MAC` - The MAC address of the Minecraft computer so that we can send magic packets.
* `mc_hostname` - The address of the Minecraft computer (without port).
Note it is probably wise to use the external hostname for this (e.g. if you are using a Dynamic DNS service).
* `ping_hostname` - The local address of the Minecraft server so that we; can ping to check if it's turned on.

## Front-end Configuration


Finally, we just need to add the email address for the user that you created earlier in the Firebase Console.
In `public/app.js`, just change `login_email` to the address for the account you created.

**Note:** Anybody accessing the web service could theoretically see this email.

If you want a logo, place it in `public/logo.png` or have a fiddle with `public/index.html`.
Theme colours can be changed at the top of `public/style.css`.
You may also want to provide favicons.

# Usage

## Minecraft server

To allow the Raspberry Pi to startup your Minecraft computer, make sure that it is configured to accept Wake-on-LAN magic packets.
Then on boot, the Minecraft computer should run `mc_command_server.sh`.
This will start up the `tmux` session for the Minecraft server and wait for commands from the Raspberry Pi.

Also ensure that the firewall is configured to accept packets from 40123 locally and 8123 externally.

## Raspberry Pi

* To start the web service run `npm run start_web`.
* To start the Discord bot run `npm run start_bot`.
* These should both be started on boot and ideally in a tmux session so you can SSH in and monitor them.

# Known Issues

* Whitelist and superusers are found by username which I don't think are unique.
