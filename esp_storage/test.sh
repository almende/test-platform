docker build . -t esp_webdav_storage
docker run --rm -v `pwd`/persist/:/persist/ --network="host" --name esp_webdav_storage esp_webdav_storage
