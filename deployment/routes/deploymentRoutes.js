'use strict';

const Router = require('express');
const Download = require('../model/Download');
const storage = require('node-persist');

const getDeploymentRoutes = (app) => {
    const router = new Router();
    storage.init().then(async () => {
        let downloads = await storage.getItem('downloads');
        if (downloads == null) {
            downloads = [];
            await storage.setItem('downloads', downloads);
        }
        router
            .get('/', (req, res) => {
                res.send(downloads);
            })
            .get('/:id', (req, res) => {
                let idx = downloads.length;
                while (idx--) {
                    if (downloads[idx] && downloads[idx].id === req.params.id) {
                        res.send(downloads[idx]); //TODO
                        return;
                    }
                }
                //Send HTTP status
                res.send({error: 'No such Download: ' + req.params.id});
            })
            .put('/', async (req, res) => {
                //Create download, start
                let idx = downloads.length;
                let data = req.body;
                while (idx--) {
                    if (downloads[idx] && downloads[idx].id === data.id) {
                        res.send({error: 'Download already exists! ' + data.id})
                        return;
                    }
                }
                try {
                    downloads.push(new Download(data.id, data.url));
                    res.send({result: 'OK'});
                    await storage.setItem('downloads', downloads);
                } catch (e) {
                    res.send({error: e});
                }
            })
            .delete('/:id', (req,res) =>{
                let idx = downloads.length;
                while (idx--) {
                    if (downloads[idx] && downloads[idx].id === req.params.id) {
                        downloads[idx].delete_local();
                        delete downloads[idx];
                        res.send({result: 'OK'});
                        return;
                    }
                }
                //Send HTTP status
                res.send({error: 'No such Download: ' + req.params.id});
            })
            .post('/:id', (req, res) => {
                //Check for parameters, (re)start download

            });

        app.use('/downloads', router);
    });
};

module.exports = getDeploymentRoutes;
