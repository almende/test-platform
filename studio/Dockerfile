FROM alpine

RUN apk --no-cache add dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "-c"]
CMD ["cat","/dev/stdout"]

LABEL vf-OS=true
LABEL vf-OS.compose.0.socket=false
LABEL vf-OS.compose.1.serviceName=che
LABEL vf-OS.compose.1.image=eclipse/che-server:nightly
LABEL vf-OS.compose.1.socket=true
LABEL vf-OS.compose.1.volume.0="/data"
LABEL vf-OS.compose.1.volume.1="/conf"
LABEL vf-OS.compose.1.volume.2="/logs"
LABEL vf-OS.compose.1.environment.CHE_SINGLE_PORT=true
LABEL vf-OS.compose.1.environment.CHE_HOST=localhost
LABEL vf-OS.compose.1.environment.CHE_PORT=8081
LABEL vf-OS.compose.1.environment.CHE_REGISTRY_HOST=registry
LABEL vf-OS.compose.1.traefikOverride=che
