docker build . -t esp_steelbar
docker run --rm -v `pwd`/persist/:/persist/ --network="host" --name esp_steelbar esp_steelbar
