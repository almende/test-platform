#!/bin/sh

docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml down &
sleep 10; docker stop vf_os_platform_exec_control



