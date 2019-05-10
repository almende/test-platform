#!/bin/bash

SCRIPT=$1

LIST=$(cat hostlist)

for HOST in $LIST; do
   if [[ $HOST =~ \#.* ]]; then
	echo "Skipping comment, $HOST"
   else
   	echo "host: $HOST (press 'y' to update)"
   	read -sN1 input
   	if [ "$input" = "y" ]; then
   	   echo doing $HOST
   	   ./do_update.sh $HOST $SCRIPT
   	else
   	   echo skipping $HOST
   	fi
   fi
done
