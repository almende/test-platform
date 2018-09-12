#!/usr/bin/env bash

#first parameter is image name (and filename)
#get labels from docker
#Generate manifest file using labels.

cat << EOF > manifest.json
{
    'binaryFile':$1
}
EOF

zip $1.zip $1 manifest.json
rm manifest.json
rm $1
