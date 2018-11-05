#!/bin/sh

docker exec vf_os_platform_exec_control docker-compose down
docker stop vf_os_platform_exec_control
