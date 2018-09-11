'use strict';

const downloader = require("download");
const fs = require('fs');

class Download {
    constructor(id, url) {
        this.id = id;
        this.url = url;
        this.status = "Initial";
        this.progress = {};

        this.proceed.call(this);
        setInterval(this.proceed.bind(this), 2000);
    };

    proceed() {
        this.updateStatus();
        //check status, decide next step
        switch (this.status) {
            case "Initial":
                setTimeout(this.download.bind(this), 0);
                break;
            case "Downloaded":
                setTimeout(this.unpack.bind(this), 0);
                break;
            case "Unpacked":
                setTimeout(this.install.bind(this), 0);
                break;
            case "Downloading":
            case "Unpacking":
            case "Installing":
            case "Done":
            default:
            //Do nothing, just wait.
        }
    }

    updateStatus() {

    }

    download() {
        let me = this;
        me.status = "Downloading";
        if (typeof me.url === "undefined") {
            me.status = "Error";
            me.errorReport = {error: "url undefined"};
        } else {
            downloader(me.url, 'downloads', {"filename": me.id + ".download.zip"}).on('downloadProgress', progress => {
                me.progress = progress;
            }).on('error', (error, body, response) => {
                me.status = "Error";
                me.errorReport = {error: error, body: body, response: response};
            }).then(() => {
                me.status = "Downloaded";
            });
        }
    }

    delete_local() {
        this.status = "Deleted";
        fs.unlinkSync("downloads/" + this.id + ".download.zip");
    }

    unpack() {

    }

    install() {

    }

}

module.exports = Download;