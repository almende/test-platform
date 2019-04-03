docker build . -t esp_template
docker run --rm -v `pwd`/persist/:/persist/ --network="host" --name esp_template esp_template
