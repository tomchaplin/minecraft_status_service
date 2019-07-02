#!/bin/bash
# This uses the OpenBSD-netcat
LOG_FILE= #Put the log filename here
# First we setup the tmux session to be in the right configuration
tmux new-session -d -s mc_server
sleep 5
tmux send-keys -t mc_server 'su - SERVER_USER_HERE' Enter
sleep 1
tmux send-keys -t mc_server 'PASSWORD_HERE' Enter
sleep 5
tmux send-keys -t mc_server 'cd DIRECTORY_OF_MINECRAFT_SERVER_HERE' Enter

echo "Starting command listening server"

log_command() {
	dt=$(date '+%d/%m/%Y-%H:%M:%S-')
	log_line="$dt$1"
	echo $log_line >> $LOG_FILE
}

PORT=40123
while true; do
	command=$(echo -e 'HTTP/1.1 200 OK\n\n {"received": true}'\
		| nc -l -p 40123 -q 0 \
		| head -1 \
		| awk '{print $2}' \
		| cut -d '/' -f 3)
	case $command in
		stop_server)
			echo "Going to stop the server"
			tmux send-keys -t mc_server 'stop' Enter
			log_command "stop_server"
			;;
		start_server)
			echo "Going to start the server"
			tmux send-keys -t mc_server './server_start.sh' Enter
			log_command "start_server"
			;;
		shutdown)
			echo "Going to shutdown the computer"
			# Check that the server is switched off
			tmux send-keys -t mc_server 'stop' Enter
			# Send the shutdown command
			shutdown -P +5 "Remote shutdown command received from Discord bot"
			# Notify users
			notify-send --urgency=critical "Remote shutdown in 5 minutes."
			log_command "shutdown"
			;;
		cancel_shutdown)
			echo "Cancelling shutdown"
			shutdown -c
			log_command "cancel_shutdown"
			;;
		ping)
			echo "Returning ping"
			log_command "ping"
			;;
		*)
			echo "Received bad request"
			log_command "bad"
	esac
done
