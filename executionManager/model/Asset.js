'use strict';

const exec = require('child_process').exec;

class Asset {
    constructor(id, imageId) {
        this.id = id;  //instance ID, used as runtime name and URL prefix
        this.imageId = imageId;  //image ID, as used by docker image
    }

    getLabels() {
        let me = this;
        return new Promise((resolve, reject) => {
            exec('docker image inspect '+ me.imageId+ ' --format=\'{{json .Config.Labels}}\'', (error, stdout, stderr) => {
                if (!error) {
                    resolve(JSON.parse(stdout));
                } else {
                    reject(error, stderr);
                }
            });
        });
    }

    getComposeSection(networkId){
        let me = this;
        return new Promise(((resolve, reject) => {
            me.getLabels().then((labels)=>{
                //TODO: Depending on labels, generate config in json (conversion to yml is done later)
                let result = {};
                result['image']=me.imageId;
                result['labels']=['traefik.frontend.rule=PathPrefixStrip:/'+me.id];
                result['networks']=[networkId];
                resolve(result);
            }).catch(reject);

        }));
    }
}


module.exports = Asset;