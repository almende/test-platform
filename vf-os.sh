#!/bin/bash
#
# Run docker-compose in a container, modified for vf-OS by including our initial compose-file.
#
# This script will attempt to mirror the host paths by using volumes for the
# following paths:
#   * $(pwd)
#   * $(dirname $COMPOSE_FILE) if it's set
#   * $HOME if it's set
#
# You can add additional volumes (or any docker run options) using
# the $COMPOSE_OPTIONS environment variable.
#


set -e
#set -o xtrace

CURRENT_DIR=$(pwd)
if command -v cygpath &> /dev/null; then CURRENT_DIR=`cygpath -aw $(pwd)`; fi

INITIAL_COMPOSE_FILE="0_platform_compose.yml"
NETWORK_COMPOSE_FILE="1_networks_compose.yml"
DOCKER_COMPOSE_ALIAS="docker-compose"
PROJECTNAME="vfos"
PERSISTENT_VOLUME="/persist"

mkdir -p .control_build
cd .control_build

cat << EOF > Dockerfile
FROM docker/compose:1.22.0
RUN apk --no-cache add dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "-c"]
CMD ["cat","/dev/stdout"]
EOF
docker build . -t vfos/control

cd ../


mkdir -p .compose
mkdir -p .persist

cat << EOF > .compose/$INITIAL_COMPOSE_FILE
version: '3'

services:
  reverse-proxy:
    image: traefik:latest # The official Traefik docker image
    restart: "unless-stopped"
    command: "--api --docker --docker.watch=true --web"
    ports:
      - "8080:8080"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - default
      - execution-manager-net
      - system-dashboard-net
  registry:
    image: registry:2  #newer versions give "docker-credential-secretservice not installed or not available in PATH"
    restart: "unless-stopped"
    ports:
      - "5000:5000"    #Docker registry's can't handle subpath endpoints, need to be root-level citizen
    networks:
      - execution-manager-net
    volumes:
      - $CURRENT_DIR/.persist/registry_persist:/var/lib/registry
  execution-manager:
    image: localhost:5000/vfos/exec-manager
    restart: "unless-stopped"
    depends_on:
      - registry
    labels:
      - "traefik.frontend.rule=PathPrefixStrip:/executionservices"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $CURRENT_DIR/.compose:/var/run/compose
      - $CURRENT_DIR/.persist/executionservices_persist:$PERSISTENT_VOLUME
    environment:
      - DOCKER_COMPOSE_PATH=/var/run/compose
      - HOST_PWD=$CURRENT_DIR
    networks:
      - execution-manager-net
  aim:
    image: localhost:5000/vfos/aim
    restart: "unless-stopped"
    depends_on:
      - registry
    command: ["-b", "0.0.0.0","-Dkeycloak.profile.feature.docker=enabled", "-Dkeycloak.import=/opt/jboss/vf-OS-realm.json"]
    environment:
      - KEYCLOAK_USER=admin
      - KEYCLOAK_PASSWORD=vf-OS-test
      - PROXY_ADDRESS_FORWARDING=true
    networks:
      - execution-manager-net
    labels:
      - "traefik.frontend.rule=PathPrefix:/aim"
      - "traefik.frontend.priority=-1"
      - "traefik.port=8080"
      - "traefik.docker.network=execution-manager-net"
  deployment:
    image: localhost:5000/vfos/deploy  #newer versions give "docker-credential-secretservice not installed or not available in PATH"
    restart: "unless-stopped"
    depends_on:
      - registry
    privileged: true
    labels:
      - "traefik.frontend.rule=PathPrefixStrip:/deployment"
      - "traefik.frontend.priority=-1"
    networks:
      - execution-manager-net
    volumes:
      - $CURRENT_DIR/.persist/deployment_persist:$PERSISTENT_VOLUME
  portal:
    image: localhost:5000/vfos/portal
    restart: "unless-stopped"
    depends_on:
      - registry
    labels:
      - "traefik.frontend.rule=PathPrefix:/"
      - "traefik.frontend.priority=-1"
    networks:
      - execution-manager-net
  dashboard:
    image: localhost:5000/vfos/system-dashboard
    restart: "unless-stopped"
    depends_on:
      - registry
    labels:
      - "traefik.frontend.rule=PathPrefixStrip:/systemdashboard"
      - "traefik.frontend.priority=-1"
    networks:
      - system-dashboard-net
  testserver:
    image: localhost:5000/vfos/test-server
    restart: "unless-stopped"
    depends_on:
      - registry
    labels:
      - "traefik.frontend.rule=PathPrefixStrip:/testserver"
    volumes:
      - $CURRENT_DIR/testImages:/usr/src/app/static
    networks:
      - execution-manager-net

networks:
    execution-manager-net:
       driver: bridge
    system-dashboard-net:
       driver: bridge
EOF


cat << EOF > .compose/$NETWORK_COMPOSE_FILE
version: '3'

services:
  reverse-proxy:
    networks:
      - default
      - execution-manager-net
      - system-dashboard-net
      - asset-net-00
      - asset-net-01
      - asset-net-02
      - asset-net-03
      - asset-net-04
      - asset-net-05
      - asset-net-06
      - asset-net-07
      - asset-net-08
      - asset-net-09
      - asset-net-10
      - asset-net-11

networks:
    asset-net-00:
       driver: bridge
    asset-net-01:
       driver: bridge
    asset-net-02:
       driver: bridge
    asset-net-03:
       driver: bridge
    asset-net-04:
       driver: bridge
    asset-net-05:
       driver: bridge
    asset-net-06:
       driver: bridge
    asset-net-07:
       driver: bridge
    asset-net-08:
       driver: bridge
    asset-net-09:
       driver: bridge
    asset-net-10:
       driver: bridge
    asset-net-11:
       driver: bridge
EOF


# Setup options for connecting to docker host
if [ -z "$DOCKER_HOST" ]; then
    DOCKER_HOST="/var/run/docker.sock"
fi
if [ -S "$DOCKER_HOST" ]; then
    DOCKER_ADDR="-v $DOCKER_HOST:$DOCKER_HOST -e DOCKER_HOST"
else
    DOCKER_ADDR="-e DOCKER_HOST -e DOCKER_TLS_VERIFY -e DOCKER_CERT_PATH"
fi

# Only allocate tty if we detect one
if [ -t 1 ]; then
    DOCKER_RUN_OPTIONS="-t"
fi
if [ -t 0 ]; then
    DOCKER_RUN_OPTIONS="$DOCKER_RUN_OPTIONS -i"
fi

#Initial startup:
cat << EOF > .compose/$DOCKER_COMPOSE_ALIAS
#!/bin/sh

/usr/local/bin/docker-compose -p $PROJECTNAME \`ls -1 /compose/*.yml | sed -e 's/^/-f /' | tr '\n' ' '\` \$@

EOF
chmod +x .compose/$DOCKER_COMPOSE_ALIAS
COMPOSE_OPTIONS="$COMPOSE_OPTIONS -e PATH=.:/compose:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
VOLUMES="-v $CURRENT_DIR/.compose:/compose"
docker run --detach --name vf_os_platform_exec_control --rm $DOCKER_RUN_OPTIONS $DOCKER_ADDR $COMPOSE_OPTIONS $VOLUMES vfos/control &

until `docker ps | grep -q "vf_os_platform_exec_control"` && [ "`docker inspect -f {{.State.Running}} vf_os_platform_exec_control`"=="true" ]; do
    sleep 0.1;
done;

#Start registry
docker exec vf_os_platform_exec_control docker-compose up --no-recreate --remove-orphans -d registry  &

until `docker ps | grep -q "vfos_registry_1"` && [ "`docker inspect -f {{.State.Running}} vfos_registry_1`"=="true" ]; do
    sleep 0.1;
done;

if [[ "$1" == "dev" ]]; then
    #Only start the registry, for building support
    echo "Started registry."
else
    #Start everything
    docker exec vf_os_platform_exec_control docker-compose up --no-recreate --remove-orphans -d ;
fi
