docker image rm vfos/deploy
docker image rm localhost:5000/vfos/deploy
docker image rm vfos/exec-manager
docker image rm localhost:5000/vfos/exec-manager
docker image rm vfos/aim
docker image rm localhost:5000/vfos/aim
docker image rm vfos/system-dashboard
docker image rm localhost:5000/vfos/system-dashboard
docker image rm vfos/portal
docker image rm localhost:5000/vfos/portal
docker image rm vfos/test-server
docker image rm localhost:5000/vfos/test-server
docker image rm vfos/messaging
docker image rm vfos/broker-auth-adapter
docker image rm localhost:5000/vfos/broker-auth-adapter
docker image rm rabbitmq
docker image rm localhost:5000/vfos/messaging
docker image rm vfos/ef-registry
docker image rm vfos/ef-requesthandler
docker image rm vfos/ef-gui
docker image rm vfos/enablersframework
docker image rm localhost:5000/vfos/enablersframework
rm -rf .persist
rm -rf .compose/3*
