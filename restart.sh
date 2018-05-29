#!/bin/sh

docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml down
docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml up

