cd assetA
docker build . -t asset-a

cd ../assetB
docker build . -t asset-b

cd ../assetC
docker build . -t asset-c

cd ../executionManager
docker build . -t exec-manager

cd ../portal
docker build . -t portal

cd ../systemDashboard
docker build . -t system-dashboard

cd ../
mkdir -p ./.aim_temp/
docker build .aim_temp -f aim.dockerfile -t vfos/aim
