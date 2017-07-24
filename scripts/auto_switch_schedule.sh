#!/bin/bash
# Custom autostart/autostop schedule
# crontab
USER=`whoami`
SCHEDULE="/var/spool/cron/$USER"
#SCHEDULE_FOLDER="/var/spool/cron"
#BUCKET="s3://$AWS_BUCKET/schedule"
#BACKUP="aws --profile ${AWS_PROFILE} --region ${AWS_REGION} s3 sync ${SCHEDULE_FOLDER} $BUCKET"

# Pre-requisite
sudo chmod a+x /var/spool/cron
sudo touch $SCHEDULE
sudo chown $USER.$USER $SCHEDULE

# start or stop
ACTION=$1

if [ "$ACTION" == 'stop' ]; then 
	RANGE='daily'
	WEEKDAY='*'
	SCALE='scaledown'
fi

if [ "$ACTION" == 'start' ]; then 
	RANGE='Monday-Friday'
	WEEKDAY='1-5'
	SCALE='scaleup'
fi

# on or off or show
SWITCH=$2

# target environment
MYENV=$3

# new schedule in hh:mm format
CLOCK=$4
HH=`echo $CLOCK | cut -d':' -f1`
MM=`echo $CLOCK | cut -d':' -f2`
if [ "$HH" == '00' ]; then HH='0'; fi
if [ "$MM" == '00' ]; then MM='0'; fi

# current schedule
CURRENT_HH=`grep -E "\"${MYENV}\".*${ACTION}" $SCHEDULE | awk '{print $2}'`
CURRENT_MM=`grep -E "\"${MYENV}\".*${ACTION}" $SCHEDULE | awk '{print $1}'`
if [ "${CURRENT_HH}" == '0' ]; then CURRENT_HH='00'; fi
if [ "${CURRENT_MM}" == '0' ]; then CURRENT_MM='00'; fi

# scheduled operation
COMMAND="$MM $HH * * $WEEKDAY curl -X POST -H \"Content-Type: application/json\" -d '{\"username\":\"huggies\",\"password\":\"$HUGGIES_PASSWORD\",\"server\":\"$MYENV\"}' http://localhost:8080/aws/eb/$ACTION"

if [ "$ACTION" == 'stop' ]; then 
	RANGE='daily'
	WEEKDAY='*'
fi

case "$SWITCH" in
	show)
		if [ "$MYENV" == 'all' ]; then
			echo "auto${ACTION} or ${SCALE} schedule list:"
			for each in `cat $SCHEDULE | grep ${ACTION} | tr ' ' '@'`; do 
				START_HH=`echo $each | cut -d'@' -f2`
				START_MM=`echo $each | cut -d'@' -f1`
				if [ "${START_HH}" == '0' ]; then START_HH='00'; fi
				if [ "${START_MM}" == '0' ]; then START_MM='00'; fi
				START_ENV=`echo $each | cut -d'@' -f13 | cut -d"'" -f2 | jq -r .server`
				START_LIST=""${START_ENV}" is scheduled to auto"${ACTION}" or "${SCALE}" at "${START_HH}":"${START_MM}" "${RANGE}"".
				echo "$START_LIST"
			done
		else 
			if [[ `grep -E "\"${MYENV}\".*${ACTION}" $SCHEDULE` ]]; then
				echo "$MYENV auto${ACTION} or ${SCALE} is scheduled at ${CURRENT_HH}:${CURRENT_MM} $RANGE."
			else
				echo "$MYENV auto${ACTION} or ${SCALE} is off."
			fi
		fi
		;;
	on)
		if [[ `grep -E "\"${MYENV}\".*${ACTION}" $SCHEDULE` ]]; then
			echo "Change $MYENV auto${ACTION} or ${SCALE} schedule from ${CURRENT_HH}:${CURRENT_MM} to $CLOCK $RANGE."
			sudo sed -ie "/\"${MYENV}\".*${ACTION}/d" "$SCHEDULE"
		else
			echo "$MYENV auto${ACTION} or ${SCALE} is scheduled at $CLOCK $RANGE now."
		fi
		echo "$COMMAND" >> "$SCHEDULE" 
		#${BACKUP} > /dev/null 2>&1
		#service crond reload
		;;
	off)
		if [[ ! `grep -E "\"${MYENV}\".*${ACTION}" $SCHEDULE` ]]; then
			echo "$MYENV auto${ACTION} or ${SCALE} is already off."
		else
			sudo sed -ie "/\"${MYENV}\".*${ACTION}/d" "$SCHEDULE"
			#${BACKUP} > /dev/null 2>&1
			echo "$MYENV auto${ACTION} or ${SCALE} is off now."
		fi	
		;;
	*)
 		echo "Unknown operations."
 		;;
esac


