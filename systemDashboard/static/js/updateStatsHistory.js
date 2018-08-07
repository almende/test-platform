/**
 * Created by luis on 11-7-18.
 */

// ----- GLOBAL VARIABLES -----
// define patterns of units
var pattBinaryUnits = /(KiB|MiB|GiB|TiB|PiB|EiB|ZiB|YiB)/i,
    pattDecimalUnits = /(kB|MB|GB|TB|PB|EB|ZB|YB|B)/i;

var UPDATE_STATSHITORY_TIME = 3000;      // Update tables every x milliseconds
var DETAILS_CONTAINER_OPENED_FLAG = false; // True - details view opened | false - details view not opened
var MAX_DATA_TIME_TO_SHOW = 120; // (Seconds). Data is stored in this interval. After it gets removed!

var updateStatsHistory_timer;
var statsHistory = {};

$(document).ready(function(){

    // update stats history
    updateStatsHistory_timer = setInterval(updateStatsHistory, UPDATE_STATSHITORY_TIME);

});

function updateStatsHistory(){
    // Request data to executionManager (executionservices)
    var urlStats = 'http://localhost/executionservices/assets' + '/stats';
    $.get(urlStats, function (data, status) {
        //if (error) {
        //    console.log('error:' + error);
        //}
        //if (!error && response.statusCode == 200) {
        formatNewData(data);

        addStatsToHistory(data);

        removeOldData();

        // check if it is necessary to change units scale
        changeDataScales();

        updateTable();

        //}
    });
}

// Formats data that came from server. stdout value is a string that we have to parse.
//
// data = {
//    "stdout" : stdout,
//    "timestamp_output": Date
// }
function formatNewData(data){

    // Split stdout data by lines
    var dataSplited = data.stdout.split("\n");

    // Remove empty entry caused by the last \n
    dataSplited.pop();

    // Parse data in json format
    dataSplited.forEach( (currentValue, index, arr) =>{

        var jsonObj = JSON.parse(currentValue); // Parse data in json format

        // ----- get cpu, mem, netIO, blockIO, pids in the right format-----
        var pids = parseInt(jsonObj.pids, 10);
        var cpuVal = parseFloat(jsonObj.cpu); // get cpu val by removing percentage char
        var memPercVal = parseFloat(jsonObj.memPerc); // get memory val by removing percentage char
        var mem = string_to_TwoValues(jsonObj.mem, pattBinaryUnits);
        var netIO = string_to_TwoValues(jsonObj.netIO, pattDecimalUnits);
        var blockIO = string_to_TwoValues(jsonObj.blockIO, pattDecimalUnits);

        // ----- Create the final object -----
        var finalObj = {
            "containerID" : jsonObj.containerID,
            "name": jsonObj.name,
            "cpu": cpuVal,
            "mem":{
                "memPerc": memPercVal,
                "memUsage": mem.val1,
                "memLimit": mem.val2,
            },
            "netIO":{
                "netReceived": netIO.val1,
                "netSent": netIO.val2,
            },
            "blockIO":{
                "dataRead": blockIO.val1,
                "dataWritten": blockIO.val2,
            },
            "pids": pids
        };

        arr[index] = finalObj; // replace it with data formated
    });

    data.stdout = dataSplited;
}

function string_to_TwoValues(strInfo, pattern){

    var separator = " / ";

    var pos = strInfo.indexOf(separator);                 // find separation
    var str1 = strInfo.slice(0, pos),                       // get 1st part of the string
        str2 = strInfo.slice(pos+separator.length);     // get 2nd part of the string

    // get values
    var val1 = getStringValueInBytes(str1, pattern);
    var val2 = getStringValueInBytes(str2, pattern);

    // Results to return back
    var result = {
        "val1": val1,
        "val2":val2,
    };

    return result;
}

function getStringValueInBytes(str, pattern){

    var val;
    if(str === "--"){
        val = 0.0;  // when no values are shown
    } else {

        val = parseFloat(str);                    // Get just the numbers
        var val_unitsPos = str.search(pattern);   // find units position
        var val_units = str.slice(val_unitsPos);  // Get the units

        // Put all values in Bytes
        var char = val_units.charAt(0).toUpperCase(); // get fist char to compare
        switch (char) {
            case "B":
                //val = val; // it doesn't change
                break;
            case "K":
                val = val * Math.pow(10, 3);
                break;
            case "M":
                val = val * Math.pow(10, 6);
                break;
            case "G":
                val = val * Math.pow(10, 9);
                break;
            case "T":
                val = val * Math.pow(10, 12);
                break;
            case "P":
                val = val * Math.pow(10, 15);
                break;
            case "E":
                val = val * Math.pow(10, 18);
                break;
            case "Z":
                val = val * Math.pow(10, 21);
                break;
            case "Y":
                val = val * Math.pow(10, 24);
                break;
            default:
                val = 0.0;
                console.log("ERROR: Bad formating number");
        }
    }

    return val;
}

function removeOldData(){
    
    // for all containers
    for( var containerName in statsHistory){

        var datasetsArray = [
            statsHistory[containerName].cpu,
            statsHistory[containerName].pids,
            statsHistory[containerName].mem.memPerc,
            statsHistory[containerName].mem.memUsage.dataset,
            statsHistory[containerName].netIO.dataset,
            statsHistory[containerName].blockIO.dataset
        ];

        for(let i = 0; i < datasetsArray.length; i++){

            var dataset = datasetsArray[i];                 // get dataset
            var currentTime = graph2dCpu.getCurrentTime();  // get current time of any graph

            // filter old data
            var oldIds = dataset.getIds({
                filter: function (item) {
                    return item.x < vis.moment(currentTime).add(-MAX_DATA_TIME_TO_SHOW, 'seconds');
                }
            });
            // remove old data of this dataset
            dataset.remove(oldIds);

            // if dataset is empty then remove all container from statsHistory
            if(dataset.length === 0){
                delete statsHistory[containerName];
                break; // jump to next container in statsHistory
            }
        }

    }

}

//
// newStats        -> array with objects that contains container info
//                      eg: [{container1_Info}, {container2_Info}, ... ]
function addStatsToHistory(newStats){

    var stdoutArray = newStats.stdout;
    for(let i = 0; i < stdoutArray.length; i++){ // run through all containers info

        var name = stdoutArray[i].name;

        // If container does not exist in stats history then create it
        if(!(name in statsHistory)){
            statsHistory[name] = {}; // initialize object

            statsHistory[name].containerID = undefined;

            statsHistory[name].cpu = new vis.DataSet();
            statsHistory[name].pids = new vis.DataSet();

            statsHistory[name].mem = {};
            statsHistory[name].mem.memPerc = new vis.DataSet();

            statsHistory[name].mem.memUsage = {};
            statsHistory[name].mem.memUsage.dataset = new vis.DataSet();
            statsHistory[name].mem.memUsage.units = 0; // 0 -> Bytes. Then multiples of 3

            statsHistory[name].mem.memLimit = {};
            statsHistory[name].mem.memLimit.value = undefined;
            statsHistory[name].mem.memLimit.units = 0;

            statsHistory[name].netIO = {};
            statsHistory[name].netIO.dataset = new vis.DataSet();
            statsHistory[name].netIO.units = 0;

            statsHistory[name].blockIO = {};
            statsHistory[name].blockIO.dataset = new vis.DataSet();
            statsHistory[name].blockIO.units = 0;

            //statsHistory[name].blockIO.dataWritten = {};
            //statsHistory[name].blockIO.dataWritten.dataset = new vis.DataSet();
            //statsHistory[name].blockIO.dataWritten.units = 0;
        }

        // format to the right units
        formatNewDataToSameUnits(name, stdoutArray[i]);

        // add stats values to history
        var t = newStats.timestamp; // time of sampling

        statsHistory[name].containerID = stdoutArray[i].containerID;

        statsHistory[name].cpu.add({x: t, y: stdoutArray[i].cpu});
        statsHistory[name].pids.add({x: t, y: stdoutArray[i].pids});

        statsHistory[name].mem.memPerc.add({x: t, y: stdoutArray[i].mem.memPerc});

        statsHistory[name].mem.memUsage.dataset.add({x: t, y: stdoutArray[i].mem.memUsage});
        statsHistory[name].mem.memLimit.value = stdoutArray[i].mem.memLimit;

        statsHistory[name].netIO.dataset.add([
            {x: t, y: stdoutArray[i].netIO.netSent,     group: "netSent"},
            {x: t, y: stdoutArray[i].netIO.netReceived, group: "netReceived"}
        ]);


        statsHistory[name].blockIO.dataset.add([
            {x: t, y: stdoutArray[i].blockIO.dataRead,      group: "dataRead"},
            {x: t, y: stdoutArray[i].blockIO.dataWritten,   group: "dataWritten"}
        ]);

        //statsHistory[name].blockIO.dataRead.dataset.add({x: t, y: stdoutArray[i].blockIO.dataRead});
        //statsHistory[name].blockIO.dataWritten.dataset.add({x: t, y: stdoutArray[i].blockIO.dataWritten});

    }

}

// returns the number scale in power of 10 (multiples of 3)
// e.g: - 900       returns 0
//      - 1000      returns 3
//      - 3000000   returns 6
function getNumberScale(num){

    if(num == 0){
        return 0;
    }

    for(let div = 24; div >= -24; div-=3){
        var val = Math.floor(num / Math.pow(10, div));
        if(val != 0){
            return div;
        }
    }

    return -1; // error
}

// New data come in BYTES then we just have to divide by the pow current scale
function formatNewDataToSameUnits(name, stdoutElem){

    // we need to format memUsage, memLimit

    // get current units
    var currentMemUsageUnits = statsHistory[name].mem.memUsage.units,
        currentMemLimitUnits = statsHistory[name].mem.memLimit.units,
        currentNetIOUnits = statsHistory[name].netIO.units,
        currentBlockIOUnits = statsHistory[name].blockIO.units;

    // transform number to the current units
    stdoutElem.mem.memUsage = stdoutElem.mem.memUsage / Math.pow(10, currentMemUsageUnits);
    stdoutElem.mem.memLimit = stdoutElem.mem.memLimit / Math.pow(10, currentMemLimitUnits);

    stdoutElem.netIO.netSent = stdoutElem.netIO.netSent / Math.pow(10, currentNetIOUnits);
    stdoutElem.netIO.netReceived = stdoutElem.netIO.netReceived / Math.pow(10, currentNetIOUnits);

    stdoutElem.blockIO.dataRead = stdoutElem.blockIO.dataRead / Math.pow(10, currentBlockIOUnits);
    stdoutElem.blockIO.dataWritten = stdoutElem.blockIO.dataWritten / Math.pow(10, currentBlockIOUnits);

}


function changeDataScales(){

    // for all containers
    for(var containerName in statsHistory){

        // --- memUsage ---
        formatDatasetScale(statsHistory[containerName].mem.memUsage, graph2dMemUsage);
        updateGraphScaleAxis(statsHistory[containerName].mem.memUsage, graph2dMemUsage, "binary");
        // --- memLimit ---
        formatValueScale(statsHistory[containerName].mem.memLimit);

        // --- netIO ---
        formatDatasetScale(statsHistory[containerName].netIO, graph2dNetIO);
        updateGraphScaleAxis(statsHistory[containerName].netIO, graph2dNetIO);

        // --- blockIO ---
        formatDatasetScale(statsHistory[containerName].blockIO, graph2dBlockIO);
        updateGraphScaleAxis(statsHistory[containerName].blockIO, graph2dBlockIO);

    }



    if(detailsContainerName in statsHistory){
        // update scales on graphs
        updateGraphScaleAxis(statsHistory[detailsContainerName].mem.memUsage, graph2dMemUsage, "binary");
        updateGraphScaleAxis(statsHistory[detailsContainerName].netIO, graph2dNetIO);
        updateGraphScaleAxis(statsHistory[detailsContainerName].blockIO, graph2dBlockIO);
    }

}

function updateGraphScaleAxis(datasetObj, graph, type){
    // update options on graph
    var optionMemUsage = {
        dataAxis: {
            left: {
                title: {
                    text: getPowerScaleToUnitsString(datasetObj.units, type)
                }
            }
        }
    };
    graph.setOptions(optionMemUsage);
}
/*
valueObj = {
        value: #, // number
        units: #  // pow number multiple of 3
    }
*/
function formatValueScale(valueObj){

    var powScale = getNumberScale(valueObj.value);

    // Error
    if(powScale == (-1)){
        console.log("Error: formatData_memUsage() -> powScale not a multiple of 3!");
        return;
    }

    // Nothing to change
    if(powScale == 0){
        return;
    }

    // transform
    valueObj.value = valueObj.value / Math.pow(10, powScale);

    // Update scale on stats
    valueObj.units+=powScale;
}

// statsHistory[containerName].mem.memUsage
// statsHistory[containerName].mem.memUsageUnits
// graph2dMemUsage
function formatDatasetScale(datasetObj, graph) {

    // get max value
    var maxValue = datasetObj.dataset.max('y').y;
    var powScale = getNumberScale(maxValue);

    // Error
    if(powScale == (-1)){
        console.log("Error: formatData_memUsage() -> powScale not a multiple of 3!");
        return;
    }

    // Nothing to change
    if(powScale == 0){
        return;
    }

    // change dataset according to pow scale of the biggest number
    var allData = datasetObj.dataset.get();
    allData.forEach((item)=>{
        item.y = item.y / Math.pow(10, powScale);
    });
    datasetObj.dataset.update(allData);

    // Update scale on stats
    datasetObj.units+=powScale;
    /*
    // update options on graph
    var optionMemUsage = {
        dataAxis: {
            left: {
                title: {
                    text: getPowerScaleToUnitsString(datasetObj.units)
                }
            }
        }
    };
    graph.setOptions(optionMemUsage);
    */
}


// power    -> (number) Power number to convert into string (multiple of 3)
// type     -> (String) if "binary" it will return in binary units (KiB, MiB,...) otherwise in decimal (KB, MB,...)

function getPowerScaleToUnitsString(power, type){
    var unitsStr;
    switch (power){
        case 0:
            unitsStr = "B";
            break;
        case 3:
            unitsStr = "K";
            break;
        case 6:
            unitsStr = "M";
            break;
        case 9:
            unitsStr = "G";
            break;
        case 12:
            unitsStr = "T";
            break;
        case 15:
            unitsStr = "P";
            break;
        case 18:
            unitsStr = "E";
            break;
        case 21:
            unitsStr = "Z";
            break;
        case 24:
            unitsStr = "Y";
            break;
        default:
            unitsStr = "--"
    }

    // if in scale of non multiples return Bytes
    if(unitsStr === "B"){
        return unitsStr;
    }

    // Select the type
    if(type === "binary"){
        unitsStr+="iB";
    }else{
        unitsStr+="B";
    }

    return unitsStr;
}


function updateTable(){

    // Don't update tables if container details is open
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        // Empty tables
        $("table tbody").empty();

        addRows();
    }
}

function addRows(){

    // Check if statsHistory is empty
    if(Object.keys(statsHistory).length == 0){
        return;
    }

    var rowTemplate = '';

    for(var key in statsHistory){

        var containerID = statsHistory[key].containerID,
            cpuVal = statsHistory[key].cpu.max('x').y,

            memUsageVal = statsHistory[key].mem.memUsage.dataset.max('x').y,
            memUsageUnits_string = getPowerScaleToUnitsString(statsHistory[key].mem.memUsage.units, "binary"),

            memLimitVal = statsHistory[key].mem.memLimit.value,
            memLimitUnits_string = getPowerScaleToUnitsString(statsHistory[key].mem.memLimit.units, "binary"),

            memPerc = statsHistory[key].mem.memPerc.max('x').y;


        //--- Net IO ---
        // retrieve a filtered subset of the data
        var itemsNetIOReceived = new vis.DataSet(statsHistory[key].netIO.dataset.get({
            filter: function (item) {
                return item.group == "netReceived";
            }
        }));
        var itemsNetIOSent = new vis.DataSet(statsHistory[key].netIO.dataset.get({
            filter: function (item) {
                return item.group == "netSent";
            }
        }));

        var netReceivedVal = itemsNetIOReceived.max('x').y;
        var netSentVal = itemsNetIOSent.max('x').y;
        var netIOUnits = statsHistory[key].netIO.units;

        var valueObjReceived = {"value":netReceivedVal, "units": netIOUnits};
        formatValueScale(valueObjReceived);
        
        var netReceive = valueObjReceived.value,
            netReceiveUnits = getPowerScaleToUnitsString(valueObjReceived.units);

        var valueObjSent     = {"value":netSentVal, "units": netIOUnits};
        formatValueScale(valueObjSent);

        var netSent = valueObjSent.value,
            netSentUnits = getPowerScaleToUnitsString(valueObjSent.units);


        //--- BLOCK IO ---
        var itemsBlockIORead = new vis.DataSet(statsHistory[key].blockIO.dataset.get({
            filter: function (item) {
                return item.group == "dataRead";
            }
        }));
        var itemsBlockIOWritten = new vis.DataSet(statsHistory[key].blockIO.dataset.get({
            filter: function (item) {
                return item.group == "dataWritten";
            }
        }));

        var blockIOReadVal = itemsBlockIORead.max('x').y;
        var blockIOWrittenVal = itemsBlockIOWritten.max('x').y;
        var blockIOUnits = statsHistory[key].blockIO.units;

        var valueObjRead = {"value":blockIOReadVal, "units": blockIOUnits};
        formatValueScale(valueObjRead);
        var blockIORead = valueObjRead.value,
            blockIOReadUnits = getPowerScaleToUnitsString(valueObjRead.units);

        var valueObjWritten = {"value":blockIOWrittenVal, "units": blockIOUnits};
        formatValueScale(valueObjWritten);
        var blockIOWritten = valueObjWritten.value,
            blockIOWrittenUnits = getPowerScaleToUnitsString(valueObjWritten.units);


        // --- pids ---
        var pidsVal = statsHistory[key].pids.max('x').y;

        rowTemplate +=
            '<tr> ' +
            '<td class="align-middle">' + containerID + '</td> ' +
            '<td class="align-middle" onclick="viewDetails(this)">' + '<button type="button" class="btn btn-light">' + key + '</button></td> ' +
            '<td class="align-middle">' + cpuVal.toFixed(2) + "%" + '</td> ' +
            '<td class="align-middle">' + memUsageVal.toFixed(2) + memUsageUnits_string + " / " + memLimitVal.toFixed(2) + memLimitUnits_string + '</td>' +
            '<td class="align-middle">' + memPerc.toFixed(2) + "%" + '</td> ' +
            '<td class="align-middle">' + netReceive.toFixed(2) + netReceiveUnits + " / " + netSent.toFixed(2) + netSentUnits +'</td>' +
            '<td class="align-middle">' + blockIORead.toFixed(2) + blockIOReadUnits + " / " + blockIOWritten.toFixed(2) + blockIOWrittenUnits + '</td> ' +
            '<td class="align-middle">' + pidsVal + '</td> ' +
            '</tr>';
    }

    // Append row in the last table position
    $('#runningTableContainers > tbody:last-child').append(rowTemplate);
}



// This function is called when user clicks on one of the container names
function viewDetails(thisElem) {

    // Deselect any previous highlighted row (if exists)
    deselectRow();

    // Highlight the selected row
    $(thisElem).parentsUntil("tbody").addClass("table-info");

    // If details view is closed than open it
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        toggleTableContent();
    }

    // Get container name (Or any other useful thing to request info)
    var containerName = $(thisElem).text();

    // Change data of details view;
    changeDetailsView(containerName);

    // Resize App iframe
    resizeIFrameToFitContent($("#app_iframe"));

}

// show / hide details view
function toggleTableContent() {

    // Hide content in tables
    var tableContentCollumns = [3, 4, 5, 6, 7, 8]; // collum number to toggle visibility
    for(let i=0; i<tableContentCollumns.length; i++){
        $('td:nth-child(' + tableContentCollumns[i] + '), th:nth-child(' + tableContentCollumns[i] + ')').toggle();
    }

    // Define sizes
    var tableSmallSize      = "col-sm-3",
        tableBigSize        = "col-sm-12",
        detailsSmallSize    = "col-sm-0",
        detailsbigSize      = "col-sm-9";

    // Toggle details and table
    if(DETAILS_CONTAINER_OPENED_FLAG){     // we are gonna close details view
        $("#tableDiv").removeClass(tableSmallSize);
        $("#tableDiv").addClass(tableBigSize);   // expande table

        $("#detailsDiv").removeClass(detailsbigSize);
        $("#detailsDiv").addClass(detailsSmallSize);    // Shrink details view

        // Deselect any previous highlighted row (if exists)
        deselectRow();

        $("#runningContainers").removeClass("sticky-top");

        $("#detailsDiv").hide();
        DETAILS_CONTAINER_OPENED_FLAG = false;
    }else{                          // we are gonna open details
        $("#tableDiv").removeClass(tableBigSize);
        $("#tableDiv").addClass(tableSmallSize);    // Shrink table

        $("#detailsDiv").removeClass(detailsSmallSize);
        $("#detailsDiv").addClass(detailsbigSize);  // expande details view

        $("#runningContainers").addClass("sticky-top"); // makes the table stick to the top when scrolling down

        $("#detailsDiv").show("slow");
        DETAILS_CONTAINER_OPENED_FLAG = true;
    }
}

function deselectRow(){
    // Remove class of selected row if exists
    $('table [class=table-info]').removeClass("table-info");
}
