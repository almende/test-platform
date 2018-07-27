/**
 * Created by luis on 17-7-18.
 */

var detailsContainerName;   // name of the container that is currently open for details view. Updated onClick event.

// Define all graph2ds
var graph2dCpu,
    graph2dMemPerc,
    graph2dMemUsage,
    graph2dNetIO,
    graph2dBlockIO;

// Define groups
var groupsNetIO = new vis.DataSet();
groupsNetIO.add({
    id: "netSent",
    content: "netSent",
    options: {
        drawPoints: {
            style: 'circle' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    }});

groupsNetIO.add({
    id: "netReceived",
    content: "netReceived",
    options: {
        drawPoints: {
            style: 'square' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    }
});

var groupsBlockIO = new vis.DataSet();
groupsBlockIO.add({
    id: "blockRead",
    content: "blockRead",
    options: {
        drawPoints: {
            style: 'circle' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    }});

groupsBlockIO.add({
    id: "blockWritten",
    content: "blockWritten",
    options: {
        drawPoints: {
            style: 'square' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    }
});


$(document).ready(function(){

    var DELAY = 3000;

    // get button seletion options of the graphs
    var strategyCpu = document.getElementById('strategyCpu'),
        strategyMemPerc = document.getElementById('strategyMemPerc'),
        strategyMemUsage = document.getElementById('strategyMemUsage'),
        strategyNetIO = document.getElementById('strategyNetIO'),
        strategyBlockIO = document.getElementById('strategyBlockIO');

    // Create a graph2d with an (currently empty) dataset
    var containerCpu = document.getElementById('visualizationCpu'),
        containerMemPerc = document.getElementById('visualizationMemPerc'),
        containerMemUsage = document.getElementById('visualizationMemUsage'),
        containerNetIO = document.getElementById('visualizationNetIO'),
        containerBlockIO = document.getElementById('visualizationBlockIO');

    // Define datasets of the graph2d
    var datasetCpu = new vis.DataSet(),
        datasetMemPerc = new vis.DataSet(),
        datasetMemUsage = new vis.DataSet(),
        datasetNetIO = new vis.DataSet(),
        datasetBlockIO = new vis.DataSet();

    // Define option of the graph (If later on we decide to have them similar then we can reduze it to a single object!)
    var optionsCpu = {
        height: '200px',
        start: vis.moment().add(-60, 'seconds'), // changed so its faster
        end: vis.moment(),
        dataAxis: {
            left: {
                title: {
                    text: "%"
                },
                range: {
                    min:-10, max: 110
                }
            }
        },
        drawPoints: {
            style: 'circle' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    };

    var optionsMemPerc = {
        height: '200px',
        start: vis.moment().add(-60, 'seconds'), // changed so its faster
        end: vis.moment(),
        dataAxis: {
            left: {
                title: {
                    text: "%"
                },
                range: {
                    min:-10, max: 110
                }
            }
        },
        drawPoints: {
            style: 'circle' // square, circle
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    };

    var optionsMemUsage = {
        height: '200px',
        start: vis.moment().add(-60, 'seconds'), // changed so its faster
        end: vis.moment(),
        drawPoints: {
            style: 'circle' // square, circle
        },
        dataAxis: {
            left: {
                title: {text: "B"}
            }
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    };

    var optionsNetIO = {
        height: '200px',
        start: vis.moment().add(-60, 'seconds'), // changed so its faster
        end: vis.moment(),
        defaultGroup:'',
        legend: true,
        drawPoints: {
            style: 'circle' // square, circle
        },
        dataAxis: {
            left: {
                title: {text: "B"}
            }
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    };

    var optionsBlockIO = {
        height: '200px',
        start: vis.moment().add(-60, 'seconds'), // changed so its faster
        end: vis.moment(),
        defaultGroup:'',
        legend: true,
        drawPoints: {
            style: 'circle' // square, circle
        },
        dataAxis: {
            left: {
                title: {text: "B"}
            }
        },
        shaded: {
            orientation: 'zero' // top, bottom
        }
    };

    // create graphs (one for each container dataset)
    graph2dCpu      = new vis.Graph2d(containerCpu, datasetCpu, optionsCpu);
    graph2dMemPerc  = new vis.Graph2d(containerMemPerc, datasetMemPerc, optionsMemPerc);
    graph2dMemUsage = new vis.Graph2d(containerMemUsage, datasetMemUsage, optionsMemUsage);
    
    graph2dNetIO    = new vis.Graph2d(containerNetIO, datasetNetIO, groupsNetIO, optionsNetIO);
    graph2dBlockIO    = new vis.Graph2d(containerBlockIO, datasetBlockIO, groupsBlockIO, optionsBlockIO);

    renderStep(graph2dCpu, strategyCpu, DELAY);
    renderStep(graph2dMemPerc, strategyMemPerc, DELAY);
    renderStep(graph2dMemUsage, strategyMemUsage, DELAY);
    renderStep(graph2dNetIO, strategyNetIO, DELAY);
    renderStep(graph2dBlockIO, strategyBlockIO, DELAY);

});

function changeDetailsView(containerName) {

    // Change datasets
    detailsContainerName = containerName; // write the name of the container
    graph2dCpu.setItems(statsHistory[containerName].cpu);
    graph2dMemPerc.setItems(statsHistory[containerName].mem.memPerc);

    graph2dMemUsage.setItems(statsHistory[containerName].mem.memUsage.dataset);

    graph2dNetIO.setItems(statsHistory[containerName].netIO.dataset);
    graph2dBlockIO.setItems(statsHistory[containerName].blockIO.dataset);

}

function renderStep(graph, strategy, DELAY) {

    // move the window (you can think of different strategies).
    var now = vis.moment();
    var range = graph.getWindow();
    var interval = range.end - range.start;
    switch (strategy.value) {
        case 'continuous':                                  // THIS ONE IS NOT WORKING CORRECTLY!!!!
            // continuously move the window
            graph.setWindow(now - interval, now, {animation: false});
            requestAnimationFrame(() => {renderStep(graph,strategy, DELAY);});
            break;
        case 'discrete':
            graph.setWindow(now - interval, now, {animation: false});
            setTimeout(() => {renderStep(graph, strategy, DELAY)}, DELAY);
            break;
        default: // 'static'

            // move the window 90% to the left when now is larger than the end of the window
            if (now > range.end) {
                graph.setWindow(now - 0.1 * interval, now + 0.9 * interval);
            }
            setTimeout(() => {renderStep(graph, strategy, DELAY)}, DELAY);
            break;
    }
}
