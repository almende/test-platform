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
shopt -s nullglob



#SET TO TRUE and MODIFY DOMAIN/EMAIL for https
USE_HTTPS=/bin/false
#ACME_DOMAIN_NAME="35.181.109.46.nip.io"
ACME_DOMAIN_NAME="localhost"
ACME_EXTERNAL_IP=127.0.0.1
ACME_EMAIL="ludo@almende.org"


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
FROM docker/compose:1.23.2
RUN apk --no-cache add dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "-c"]
CMD ["cat","/dev/stdout"]
EOF
docker build . -t vfos/control

cd ../


mkdir -p .compose
# Repair old version of the config files:
for file in .compose/3_*.yml; do
       # Repair old version of the config files:
       sed -e 's/version: \"3\"/version: \"3.4\"/' -i $file
done


mkdir -p .persist
mkdir -p .persist/aim_persist
chown -R 1000:1000 ./.persist/aim_persist

if $USE_HTTPS; then
if [ ! -e ./.persist/acme.json ]; then
	touch ./.persist/acme.json
	chmod 600 ./.persist/acme.json
fi

TRAEFIK_CMDLINE="--api --docker --docker.watch=true --docker.domain=$ACME_DOMAIN_NAME --defaultentrypoints=https,http --entryPoints='Name:https Address::443 TLS' --entryPoints='Name:http Address::80' --entryPoints='Name:che Address::8081' --acme --acme.storage=/acme.json --acme.entryPoint=https --acme.httpChallenge.entryPoint=http --acme.onHostRule=false --acme.onDemand=true --acme.email=$ACME_EMAIL"
TRAEFIK_ACME="- $CURRENT_DIR/.persist/acme.json:/acme.json"
else
TRAEFIK_CMDLINE="--api --docker --docker.watch=true --defaultentrypoints=http --entryPoints='Name:http Address::80' --entryPoints='Name:che Address::8081'"
fi

cat << EOF > .compose/$INITIAL_COMPOSE_FILE
version: '3.4'

services:
  reverse-proxy:
    image: traefik:latest # The official Traefik docker image
    restart: "unless-stopped"
    command: "$TRAEFIK_CMDLINE"
    ports:
      - "8080:8080"
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      $TRAEFIK_TOML
      $TRAEFIK_ACME
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
      - $CURRENT_DIR/.persist/:/allPersist
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
    command: ["-b", "0.0.0.0","-Dkeycloak.profile.feature.docker=enabled", "-Dkeycloak.migration.action=import", "-Dkeycloak.migration.provider=singleFile", "-Dkeycloak.migration.file=/opt/jboss/vf-OS-realm.json", "-Dkeycloak.migration.strategy=OVERWRITE_EXISTING"]
    environment:
      - KEYCLOAK_USER=admin
      - KEYCLOAK_PASSWORD=vf-OS-test
      - PROXY_ADDRESS_FORWARDING=true
    networks:
      - execution-manager-net
    volumes:
      - $CURRENT_DIR/.persist/aim_persist:/opt/jboss/keycloak/standalone/data
      - $CURRENT_DIR/aim/vf-OS-realm.json:/opt/jboss/vf-OS-realm.json
    labels:
      - "traefik.frontend.rule=PathPrefix:/aim"
      - "traefik.frontend.priority=-1"
      - "traefik.port=8080"
      - "traefik.docker.network=execution-manager-net"
  deployment:
    image: localhost:5000/vfos/deploy
    restart: "unless-stopped"
    depends_on:
      - registry
      - execution-manager
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
  packager:
    image: localhost:5000/vfos/packaging
    restart: "unless-stopped"
    labels:
      - "traefik.frontend.rule=PathPrefixStrip:/packaging"
    environment:
      - DOCKER_COMPOSE_PATH=/var/run/compose
      - HOST_PWD=$CURRENT_DIR
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $CURRENT_DIR/.compose:/var/run/compose
      - $CURRENT_DIR/.persist/che_data:/data
    depends_on:
      - registry
      - execution-manager
    networks:
      - execution-manager-net
  che:
    image: hub.caixamagica.pt/vfos/studio:nightly
    restart: "unless-stopped"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - $CURRENT_DIR/.persist/che_data:/data
      - $CURRENT_DIR/.persist/che_conf:/conf
      - $CURRENT_DIR/.persist/che_logs:/logs
    network_mode: host
    environment:
      - CHE_SINGLE_PORT=false
      - CHE_PORT=8081
      - CHE_HOST=$ACME_DOMAIN_NAME
      - CHE_DOCKER_IP_EXTERNAL=$ACME_EXTERNAL_IP
      - CHE_WORKSPACE_STORAGE=$CURRENT_DIR/.persist/che_data/workspaces/
#      - CHE_INFRA_DOCKER_URL__REWRITER=singleport
      - CHE_REGISTRY_HOST=172.17.0.1
    labels:
      - vf-OS=true
      - vf-OS.frontendUri=http://$ACME_DOMAIN_NAME:8081/
      - "traefik.enable=true"
      - "traefik.frontend.entryPoints=che"
  frontend_editor:
    image: gklasen/vfos_frontend_editor:latest
    restart: "unless-stopped"
    labels:
      - "traefik.main.frontend.rule=PathPrefix:/frontend_editor"
      - "traefik.main.port=80"
      - "traefik.iframe.frontend.rule=PathPrefix:/frontend_iframe"
      - "traefik.iframe.port=4201"
    networks:
      - execution-manager-net
    environment:
      - ASSET_NAME=frontend_editor
      - WORKSPACE=hello_vfos
  processapi:
    image: informationcatalyst/vfos-process-api
    hostname: processapi
    labels:
      - vf-OS=true
      - "traefik.frontend.rule=PathPrefixStrip:/processapi"
      - "traefik.main.port=5000"
    environment:
      - RUN_TYPE=processapi
      - CorsOrigins=*
      - StorageType=remote
      - RemoteStorageSettings__Address=https://icemain2.hopto.org:7080
      - MarketplaceSettings__Address=https://vfos-datahub.ascora.de/v1
      - StudioSettings__Address=http://172.17.0.1:8081/
  processdesigner:
    image: informationcatalyst/vfos-process-designer
    hostname: processdesigner
    labels:
      - vf-OS=true
      - "traefik.frontend.rule=PathPrefixStrip:/processdesigner"
    environment:
      - "RUN_TYPE=processdesigner"
      - "API_END_POINT=http://$ACME_DOMAIN_NAME/processapi"
    depends_on:
      - processapi
  idm:
    image: localhost:5000/vfos/idm
    hostname: idm
    environment:
      - IDM_DB_HOST=security_mysql
    depends_on:
      - security_mysql
    networks:
      - execution-manager-net
  security_mysql:
    image: mysql:5.7.25
    hostname: security_mysql
    environment:
      - "MYSQL_ALLOW_EMPTY_PASSWORD=true"
    volumes:
      - $CURRENT_DIR/security/mysql/data:/var/lib/mysql
      - type: bind
        target: /etc/my.cnf
        source: $CURRENT_DIR/security/mysql/etc/my.cnf
    networks:
      - execution-manager-net

EOF

#Setup basic network configuration
./assignNetwork.js

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
