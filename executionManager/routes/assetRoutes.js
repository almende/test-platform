'use strict';

const Router = require('express');
const fs = require('fs');
const Asset = require('../model/Asset');
const exec = require('child_process').exec;
const storage = require('node-persist');


const getAssetRoutes = (app) => {
    const router = new Router();
    storage.init().then(async () => {
        let assets = await storage.getItem('assets');
        if (assets == null) {
            assets = [new Asset('assetA', 'asset-a', true), new Asset('assetB', 'asset-b', true), new Asset('assetC', 'asset-c')];
            await storage.setItem('assets', assets);
        }
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
                    if (asset.autoStart) {
                        return new Promise((resolve, reject) => {
                            asset.getComposeSection('asset-net-' + index.toString().padStart(2, '0')).then((config) => {
                                configs[asset.id] = config;
                                resolve();
                            }).catch(reject);
                        })
                    } else {
                        return Promise.resolve();
                    }
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
            .get('/stats', (req, res) => {

                // We want to execute this command line:
                //      docker stats --no-stream --format "{\"containerID\":\"{{ .Container }}\", \"name\":\"{{ .Name }}\", \"cpu\":\"{{ .CPUPerc }}\", \"mem\":\"{{ .MemUsage }}\", \"memPerc\":\"{{ .MemPerc }}\", \"netIO\":\"{{ .NetIO }}\", \"blockIO\":\"{{ .BlockIO }}\", \"pids\":\"{{ .PIDs }}\"}"
                //

                let strFormat = {
                    "containerID": "{{ .Container }}",
                    "name": "{{ .Name }}",
                    "cpu": "{{ .CPUPerc }}",
                    "mem": "{{ .MemUsage }}",
                    "memPerc": "{{ .MemPerc }}",
                    "netIO": "{{ .NetIO }}",
                    "blockIO": "{{ .BlockIO }}",
                    "pids": "{{ .PIDs }}"
                };
                let statsCommand = "docker stats --no-stream --format '" + JSON.stringify(strFormat) + "'";

                exec(statsCommand, (error, stdout, stderr) => {

                    if (!error) {
                        var answer = {
                            "stdout": stdout,
                            "timestamp": Date.now()
                        };

                        // send answer
                        res.setHeader('Content-Type', 'application/json');
                        res.send(answer);
                    } else {
                        console.log("ERRORS");
                        res.setHeader('Content-Type', 'application/json');
                        //res.status(500).send({'error': error, 'stderr': stderr});
                        res.send({'error': error, 'stderr': stderr});
                    }
                });

            })
            .post('/logs', (req, res) => {

                let logsCommand = "docker logs " + req.body.containerName + " | tail -n " + req.body.numOfLines;

                //let logsCommand = 'export TERM=linux-m1b;docker logs ' + req.body.containerName + ' | tail -n ' + req.body.numOfLines;
                //let logsCommand = 'docker exec vf_os_platform_exec_control docker-compose --file test_compose.yml logs --no-color assetA'

                exec(logsCommand, (error, stdout, stderr) => {

                    if (!error) {
                        let answer = {
                            "stdout": stdout,
                            "timestamp": Date.now()
                        };
                        console.log(JSON.stringify(answer));

                        // send answer
                        res.setHeader('Content-Type', 'application/json');
                        res.send(answer);
                    } else {
                        console.log("ERRORS logs");
                        res.setHeader('Content-Type', 'application/json');
                        //res.status(500).send({'error': error, 'stderr': stderr});
                        res.send({'error': error, 'stderr': stderr});
                    }
                });

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
            .post('/:id', async (req, res) => {
                if (req.query.action) {
                    let idx = assets.length;
                    while (idx--) {
                        if (assets[idx] && assets[idx].id === req.params.id) {
                            let asset = assets[idx];
                            if (req.query.action === 'start') {
                                asset.start().then(
                                    (stdout) => {
                                        res.send({result: 'OK', stdout: stdout});
                                    }
                                ).catch(
                                    (reason) => {
                                        res.status(500).send(reason)
                                    }
                                );

                            } else if (req.query.action === 'stop') {
                                asset.stop().then(
                                    (stdout) => {
                                        res.send({result: 'OK', stdout: stdout});
                                    }
                                ).catch(
                                    (reason) => {
                                        res.status(500).send(reason)
                                    }
                                );
                            } else {
                                res.send({error: 'No such action: ' + req.params.id + ' : ' + req.query.action});
                            }
                            return;
                        }
                    }
                    //Send HTTP status
                    res.send({error: 'No such Asset: ' + req.params.id});
                } else { //Update meta-info
                    try {
                        let idx = assets.length;
                        let data = req.body;
                        while (idx--) {
                            if (assets[idx] && assets[idx].id === req.params.id) {
                                assets[idx].autoStart = data.autoStart;
                                assets[idx].imageId = data.imageId;
                                res.send({result: 'OK'});
                                await storage.setItem('assets', assets);
                                return;
                            }
                        }
                    } catch (e) {
                        res.send({error: e});
                    }
                }
            })
            .put('/', async (req, res) => {
                let idx = assets.length;
                let data = req.body;
                while (idx--) {
                    if (assets[idx] && assets[idx].id === data.id) {
                        res.send({error: 'Asset already exists! ' + data.id})
                        return;
                    }
                }
                try {
                    assets.push(new Asset(data.id, data.imageId, data.autoStart));
                    res.send({result: 'OK'});
                    await storage.setItem('assets', assets);
                } catch (e) {
                    res.send({error: e});
                }
            })
            .delete('/:id', async (req, res) => {
                let idx = assets.length;
                while (idx--) {
                    if (assets[idx] && assets[idx].id === req.params.id) {
                        assets.splice(idx, 1);
                        break;
                    }
                }
                await storage.setItem('assets', assets);
                res.send({result: 'OK'});
            });

        app.use('/assets', router);
    });
};

module.exports = getAssetRoutes;
