'use strict';

const Router = require('express');
const Asset = require('../model/Asset');

const getAssetRoutes = (app) => {
    const router = new Router();
    const assets = [new Asset('assetA', 'asset-a'), new Asset('assetB', 'asset-b'), new Asset('assetC', 'asset-c')];

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
        .post('/', (req, res) => {
            //Todo: create new asset
            res.send({result: 'OK'});
        });

    app.use('/assets', router);
};

module.exports = getAssetRoutes;
