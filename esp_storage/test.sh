docker build . -t esp_storage
docker run --rm -v `pwd`/persist/:/persist/ --network="host" --name esp_storage esp_storage
