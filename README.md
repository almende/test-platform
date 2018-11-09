# vf-OS Platform setup

This code represents the Platform deliverable for the vf-OS project. 

## Overview

![Deployment of assets overview][overview]

[overview]: doc/deployment.png "Deployment of assets overview"

## Installation

Two options: binary distribution or based on the platform source

#### Binary distribution

The binary distribution consist of a large zip file `vfosPlatform.zip`, which includes a copy of the quarantine local Docker registry, which stores the binary images of the platform assets.

To start with this distribution, you'll have to unzip the file and directly go to the common steps below.

#### From Source

First step is to build the docker images for the platform itself. This build process will start a reduced version of the platform to provide access to the vf-OS quarantine local Docker registry in which the assets will be stored before installation. See overview above.

``` bash
user@host:~/platform$ ./build.sh
npm WARN platform-build@1.0.0 No repository field.
npm WARN platform-build@1.0.0 No license field.

audited 48 packages in 1.26s
found 0 vulnerabilities

67b1b27baf7389de1ed7b169dcaeda228508d5d6989a3f4434eef393cfc3a630
Creating network "vfos_default" with the default driver
Creating network "vfos_execution-manager-net" with driver "bridge"
Creating network "vfos_system-dashboard-net" with driver "bridge"
Creating network "vfos_asset-net-00" with driver "bridge"
Creating network "vfos_asset-net-01" with driver "bridge"
Creating network "vfos_asset-net-02" with driver "bridge"
Creating network "vfos_asset-net-03" with driver "bridge"
Creating network "vfos_asset-net-04" with driver "bridge"
Creating network "vfos_asset-net-05" with driver "bridge"
Creating network "vfos_asset-net-06" with driver "bridge"
Creating network "vfos_asset-net-07" with driver "bridge"
Creating network "vfos_asset-net-08" with driver "bridge"
Creating network "vfos_asset-net-09" with driver "bridge"
Creating network "vfos_asset-net-10" with driver "bridge"
Creating network "vfos_asset-net-11" with driver "bridge"
Creating vfos_registry_1 ... done
Started registry.
Sending build context to Docker daemon  146.4kB
Step 1/24 : FROM node:alpine

   .... This will take a couple of minutes ....

Stopping vfos_registry_1 ... done
Removing vfos_registry_1 ... done
Removing network vfos_default
Removing network vfos_execution-manager-net
Removing network vfos_system-dashboard-net
Removing network vfos_asset-net-00
Removing network vfos_asset-net-01
Removing network vfos_asset-net-02
Removing network vfos_asset-net-03
Removing network vfos_asset-net-04
Removing network vfos_asset-net-05
Removing network vfos_asset-net-06
Removing network vfos_asset-net-07
Removing network vfos_asset-net-08
Removing network vfos_asset-net-09
Removing network vfos_asset-net-10
Removing network vfos_asset-net-11
vf_os_platform_exec_control

```

After this script has finished, you can start the platform through the main startup script, following the common steps below.

#### Common

To start the platform you need to run the start.sh script. The first time you run this script it will install runtime dependencies, including the platform assets themselves from the local quarantine repository.

``` bash
user@host:~/platform$ ./start.sh
48071984db7f5ea86ed09403d2cf0e3744494e7b34efd875a092b68d4b494b6c
Creating network "vfos_default" with the default driver
Creating network "vfos_execution-manager-net" with driver "bridge"
Creating network "vfos_system-dashboard-net" with driver "bridge"
Creating network "vfos_asset-net-00" with driver "bridge"
Creating network "vfos_asset-net-01" with driver "bridge"
Creating network "vfos_asset-net-02" with driver "bridge"
Creating network "vfos_asset-net-03" with driver "bridge"
Creating network "vfos_asset-net-04" with driver "bridge"
Creating network "vfos_asset-net-05" with driver "bridge"
Creating network "vfos_asset-net-06" with driver "bridge"
Creating network "vfos_asset-net-07" with driver "bridge"
Creating network "vfos_asset-net-08" with driver "bridge"
Creating network "vfos_asset-net-09" with driver "bridge"
Creating network "vfos_asset-net-10" with driver "bridge"
Creating network "vfos_asset-net-11" with driver "bridge"
Creating vfos_registry_1 ... done
Starting vfos_registry_1 ... done
Creating vfos_reverse-proxy_1     ... done
Creating vfos_dashboard_1         ... done
Creating vfos_deployment_1        ... done
Creating vfos_portal_1            ... done
Creating vfos_execution-manager_1 ... done
Creating vfos_aim_1               ... done
Creating vfos_testserver_1        ... done
```

*usefull links:*

1. You can check if the platform started correctly through the Portal WebGUI: [http://localhost](http://localhost)
2. The reverseproxy has a dashboard where you can check the URL mapping: [http://localhost:8080/dashboard/](http://localhost:8080/dashboard/)
3. For interacting with the various REST api's I would advice to use the [Advanced REST Client Chrome addon](https://chrome.google.com/webstore/detail/advanced-rest-client/hgmloofddffdnphfgcellkdfbfbjeloo)
4. Our main documentation of the meta-information, used for asset deployment (see below) is found at: [vf-OS MetaData format](https://docs.google.com/document/d/1SnfLrZ7bi8S2BTyfZFnDYWB4GRX7L9uqp9Baz0orWlY)

## Asset deployment

Now for the good part: How to add your own assets to the running platform? This takes a few steps:

#### Create asset code

#### Create asset zipfile

#### Install asset locally

#### Deploy asset to vf-OS Store

