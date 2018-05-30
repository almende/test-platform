'use strict';

const Router = require('express');
const fs = require('fs');
const Asset = require('../model/Asset');
const exec = require('child_process').exec;

const getAssetRoutes = (app) => {
    const router = new Router();
    const assets = [new Asset('assetA', 'asset-a'), new Asset('assetB', 'asset-b')];
    router
        .get('/', (req, res) => {
            Promise.all(assets.map((asset) => {
                return new Promise((resolve, reject) => {
                    asset.getLabels().then((labels) => {
                        asset['labels'] = labels;
                        resolve();
                    }).catch(reject);
                })
            })).then(
                () => {
                    res.send(assets);
                }
            ).catch(
                (errors) => {
                    res.send(errors);
                }
            )
        })
        .get('/compose_config', (req, res) => {
            let configs = {};
            Promise.all(assets.map((asset, index) => {
                return new Promise((resolve, reject) => {
                    asset.getComposeSection('asset-net-' + index.toString().padStart(2, '0')).then((config) => {
                        configs[asset.id] = config;
                        resolve();
                    }).catch(reject);
                })
            })).then(
                () => {
                    res.send(configs);
                }
            ).catch(
                (errors) => {
                    res.send(errors);
                }
            )
        })
        .post('/reload', (req, res) => {
            let configs = {};
            Promise.all(assets.map((asset, index) => {
                return new Promise((resolve, reject) => {
                    asset.getComposeSection('asset-net-' + index.toString().padStart(2, '0')).then((config) => {
                        configs[asset.id] = config;
                        resolve();
                    }).catch(reject);
                })
            })).then(
                () => {
                    let data = 'version: \'3\'\n';
                    data += 'services: ';
                    data += JSON.stringify(configs);
                    fs.writeFile(process.env.DOCKER_COMPOSE_PATH + '/test_compose.yml', data, (err) => {
                        if (err) {
                            res.send(err);
                        } else {
                            exec('docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml up -d --remove-orphans', (error, stdout, stderr) => {
                                if (!error) {
                                    res.send({result: 'OK'})
                                } else {
                                    res.status(500).send({'error': error, 'stderr': stderr});
                                }
                            });
                        }
                    });
                }
            ).catch(
                (errors) => {
                    res.send(errors);
                }
            )
        })
        .post('/:id', (req, res) => {
            if (req.query.action){
                let idx = assets.length;
                while (idx--) {
                    if (assets[idx] && assets[idx].id === req.params.id) {
                        let asset = assets[idx];
                        if (req.query.action === 'start'){
                            asset.start().then(
                                (stdout) => {res.send({result: 'OK', stdout: stdout}); }
                            ).catch(
                                (reason)=>{ res.status(500).send(reason)}
                            );

                        } else if (req.query.action === 'stop'){
                            asset.stop().then(
                                (stdout) => {res.send({result: 'OK', stdout: stdout}); }
                            ).catch(
                                (reason)=>{ res.status(500).send(reason)}
                            );
                        } else {
                            res.send({error:'No such action: '+req.params.id+ ' : '+ req.query.action});
                        }
                        return;
                    }
                }
                //Send HTTP status
                res.send({error:'No such Asset: '+req.params.id});
            } else {
                let idx = assets.length;
                while (idx--) {
                    if (assets[idx] && assets[idx].id === req.params.id){
                        res.send({error: 'Asset already exists! '+req.params.id})
                        return;
                    }
                }

                try {
                    let data = req.body;
                    assets.push(new Asset(req.params.id, data.imageId));
                    res.send({result: 'OK'});

                } catch (e) {
                    res.send({error: e});
                }
            }
        })
        .delete('/:id',(req, res) => {
            let idx = assets.length;
            while (idx--) {
                if (assets[idx] && assets[idx].id === req.params.id){
                    assets.splice(idx,1);
                    break;
                }
            }
            res.send({result: 'OK'});
        });

    app.use('/assets', router);
};

module.exports = getAssetRoutes;
