FROM busybox

LABEL \
  vf-OS=true \
  vf-OS.name="Enablers Framework" \
  vf-OS.author="Uninova GRIS" \
  vf-OS.description="Aggregator platform deployment for all Enablers Framework sub-components." \
  vf-OS.dependencies="[]" \
  vf-OS.frontendUri="/efgui" \
  vf-OS.restUri="/efrequesthandler" \
  vf-OS.securityEndpoints="{}" \
  \
  vf-OS.compose.0.environment.GIT="gud" \
  \
  vf-OS.compose.1.serviceName="efdbregistry" \
  vf-OS.compose.1.image="postgres" \
  vf-OS.compose.1.volume.0="/var/lib/postgresql/data" \
  vf-OS.compose.1.environment.POSTGRES_DB="efdb" \
  vf-OS.compose.1.environment.POSTGRES_USER="efuser" \
  vf-OS.compose.1.environment.POSTGRES_PASSWORD="efpassword" \
  \
  vf-OS.compose.2.serviceName="efdbrequesthandler" \
  vf-OS.compose.2.image="postgres" \
  vf-OS.compose.2.volume.0="/var/lib/postgresql/data" \
  vf-OS.compose.2.environment.POSTGRES_DB="rhdb" \
  vf-OS.compose.2.environment.POSTGRES_USER="rhuser" \
  vf-OS.compose.2.environment.POSTGRES_PASSWORD="rhpassword" \
  \
  vf-OS.compose.3.serviceName="efrequesthandler" \
  vf-OS.compose.3.depends_on.0="efdbrequesthandler" \
  vf-OS.compose.3.image="vfos/ef-requesthandler:latest" \
  vf-OS.compose.3.depends_on.0="efdbrequesthandler" \
  \
  vf-OS.compose.4.serviceName="efregistry" \
  vf-OS.compose.4.image="vfos/ef-registry:latest" \
  vf-OS.compose.4.depends_on.0="efdbregistry" \
  vf-OS.compose.4.socket="true" \
  \
  vf-OS.compose.5.serviceName="ef-gui" \
  vf-OS.compose.5.image="vfos/ef-gui:latest" \
  vf-OS.compose.5.depends_on.0="efregistry" \
  vf-OS.compose.5.depends_on.1="efrequesthandler" 

CMD [ "ps", "faux" ]
