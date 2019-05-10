#!/bin/bash

HOST=$1
SCRIPT=$2

scp -o "StrictHostKeyChecking no" $SCRIPT ubuntu@$HOST:
ssh ubuntu@$HOST "./$SCRIPT $HOST"
