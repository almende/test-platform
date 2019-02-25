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

var DETAILS_CONTAINERNAME = "NO_CONTAINER_NAME"; // defines a container name opened on the details view, otherwise NO_CONTAINER_NAME

var updateStatsHistory_timer;

var historyDB = {
    runningVAssets:{},
    notRunningVAssets:[],
    otherContainers:{}
};

var assetsData = []; // holds data of assets when requested from executionservices/assets
var tempStats,  // variable to hold the data that come from the request of /stats to be used for processing
    tempAssets; // variable to hold the data that come from the request of /assets to be used for processing


//-----------------------------------------------
//-----------------------------------------------
// Based on:
// https://stackoverflow.com/questions/1759987/listening-for-variable-changes-in-javascript

// Responsible to update table at the same time after getting results from /stats and /assets
var updateTablesChecker = {

    i_assetsUpdated_bool: false,
    i_statsUpdated_bool: false,

    update_listerner: function(val){},

    set assetsUpdated_bool(val) {
        this.i_assetsUpdated_bool = val;
        this.update_listerner(val);
    },
    get assetsUpdated_bool(){
        return this.i_assetsUpdated_bool;
    },

    set statsUpdated_bool(val) {
        this.i_statsUpdated_bool = val;
        this.update_listerner(val);
    },
    get statsUpdated_bool(){
        return this.i_statsUpdated_bool;
    },
    get reset_bools(){
        this.i_assetsUpdated_bool = false;
        this.i_statsUpdated_bool = false;
    },
    registerListener: function(listener){
        this.update_listerner = listener;
    }
};

updateTablesChecker.registerListener(function(val) {
    // Update tables if both variables were changed to true
    if((this.assetsUpdated_bool) && (this.statsUpdated_bool)){

        // merge data that was received with historyDB
        mergeData();

        // Update/render tables
        updateTables();
    }
});

//-----------------------------------------------
//-----------------------------------------------
$(document).ready(function(){

    // update stats history
    //setTimeout(updateStatsHistory, 0);
    //updateStatsHistory_timer = setInterval(updateStatsHistory, UPDATE_STATSHITORY_TIME);

});

function updateStatsHistory(){

    // Resets checker variables
    updateTablesChecker.reset_bools;

    // Add statistics to History
    var urlStats = '/executionservices/assets' + '/stats'; // Request data to executionManager (executionservices)
    $.get(urlStats, function (data, status) {

      if(!("error" in data)){

        // format string data into values data
        formatNewData(data);

        // store data globaly to be treated later
        tempStats = data;

        // flags up that we have the stats data ready (Triggers the event)
        updateTablesChecker.statsUpdated_bool = true;
      }else{
        console.log("ERROR: /stats returned an error!")
      }

    });

    // Make the correlation between ContainerName and AssetName
    var urlAssets = '/executionservices/assets/full'; // Request data to executionManager (executionservices)
    $.get(urlAssets, function (data, status) {

      if(!("error" in data)){

        // clean up data
        for(let i = 0 ; i < data.length; i++){
          data[i].name = (data[i].name).slice(1); // removes de "/" from name
        }

        tempAssets = data; // store data globaly to be treated later
        assetsData = data;

        // flags up that we have the stats data ready (Triggers the event)
        updateTablesChecker.assetsUpdated_bool = true;
      } else {
        console.log("ERROR: /assets returned an error!")
      }
    });

}


/*
we want:
- Assets with NO "vf-OS.labels" in Other containers
- Assets with vf-OS.labels and frontUrl in vApps
- Assets with vf-OS.labels and NO frontUrl in Supporting Library Containers
 */
function mergeData(){


    // if vf-OS.lab
    var tempStatsArray = tempStats.stdout;  // array with the stats info

    for(let i = 0; i < assetsData.length; i++){
        var entryAsset = tempAssets[i];

        for(let k = 0; k < tempStatsArray.length; k++){
            var entryStats = tempStatsArray[k];

            // if there is a correspondence between Assets list and Stats list
            if(entryAsset.name === entryStats.name){


                // if asset has a "vf-OS" label and marked as "true"
                if( (typeof entryAsset.labels["vf-OS"] != "undefined") &&
                    (entryAsset.labels["vf-OS"] === "true") ){

                    // if it has a front url
                    if((typeof entryAsset.labels["vf-OS.frontendUri"] != "undefined") &&
                        (entryAsset.labels["frontendUri"] !== "")){
                        // It is a vApp

                        // put stats data in historyDB
                        var newStats = {timestamp:tempStats.timestamp, stdout: [entryStats]};
                        var locRef = {obj: historyDB, objName:"runningVAssets"};
                        addStatsToHistory(locRef, newStats);

                        // add Asset Info To History
                        historyDB.runningVAssets[entryStats.name].assetDetails = tempAssets[k];

                    } else {
                        // if it does not have a url put it in "Supporting Library Containers" table
                        // put stats data in historyDB
                        var newStats = {timestamp:tempStats.timestamp, stdout: [entryStats]};
                        var locRef = {obj: historyDB, objName:"notRunningVAssets"};
                        addStatsToHistory(locRef, newStats);

                        // add Asset Info To History
                        historyDB.notRunningVAssets[entryStats.name].assetDetails = tempAssets[k];
                    }

                } else {
                    // put it in Others Containers tables

                    // put stats data in historyDB
                    var newStats = {timestamp:tempStats.timestamp, stdout: [entryStats]};
                    var locRef = {obj: historyDB, objName:"otherContainers"};
                    addStatsToHistory(locRef, newStats);

                    // add Asset Info To History
                    historyDB.otherContainers[entryStats.name].assetDetails = tempAssets[k];

                }
            }
        }
    }
/*
    // ----- NOT RUNNING VASSETS TABLE ----

    // clean all entries
    historyDB.notRunningVAssets = [];

    // for all elements in Assets list
    for(let i=0; i < tempAssets.length; i++){
        var entry = tempAssets[i];
        // if containerName is unknown then it means this vAsset is not running, so,
        if(entry.containerName === "Unknown"){
            (historyDB.notRunningVAssets).push(entry); // store in notRunningVAssets
            tempAssets[i] = "REMOVED"; // Mark element as removed
        }
    }

    // remove "removed" elements from tempAssets array
    tempAssets = tempAssets.filter(function (currentValue, index, arr) {
        return (currentValue !== "REMOVED");
    });

    // ---------------------------------------

    // ----- RUNNING VASSETS TABLE ----

    // Define all containerID undefined
    // (It will help to know which container entries should be removed because they were stopped of running.
    // After rewritting the new information the ones who were not updated should be removed)
    for(var containerName in historyDB.runningVAssets){
        historyDB.runningVAssets[containerName].containerID = undefined;
    }

    var tempStatsArray = tempStats.stdout;  // array with the stats info

    for(var i=0; i < tempStatsArray.length; i++){
        for(var k=0; k<tempAssets.length;k++){

            // If it finds the match in both arrays
            if(tempStatsArray[i].name === tempAssets[k].containerName){

                // put stats data in historyDB
                var newStats = {timestamp:tempStats.timestamp, stdout: [tempStatsArray[i]]};
                var locRef = {obj: historyDB, objName:"runningVAssets"};
                addStatsToHistory(locRef, newStats);

                // add Asset Info To History
                historyDB.runningVAssets[tempStatsArray[i].name].assetDetails = tempAssets[k];

                // mark element as removed from stats list
                tempStatsArray[i] = "REMOVED";

                continue; // continues to next stats element
            }
        }
    }

    // remove "removed" elements from tempStatsArray array
    tempStats.stdout = tempStatsArray.filter(function (currentValue, index, arr) {
        return (currentValue !== "REMOVED");
    });


    // removed stopped containers by looking on containerID's not updated
    for(var containerName in historyDB.runningVAssets){
        if(historyDB.runningVAssets[containerName].containerID === undefined){
         delete historyDB.runningVAssets[containerName]; // delete stopped vAsset from runningVAssets
        }
    }


    // ---------------------------------------

    // ----- OTHER CONTAINERS TABLE ----

    // Define all containerID undefined
    // (It will help to know which container entries should be removed because they were stopped of running.
    // After rewritting the new information the ones who were not updated should be removed)
    for(var containerName in historyDB.otherContainers){
        historyDB.otherContainers[containerName].containerID = undefined;
    }


    var tempStatsArray = tempStats.stdout;  // array with the stats info

    for(var i=0; i < tempStatsArray.length; i++){
        // put stats data in historyDB
        var newStats = {timestamp:tempStats.timestamp, stdout: [tempStatsArray[i]]};
        var locRef = {obj: historyDB, objName:"otherContainers"};
        addStatsToHistory(locRef, newStats);
    }



    // removed stopped containers by looking on containerID's not updated
    for(var containerName in historyDB.otherContainers){
        if(historyDB.otherContainers[containerName].containerID === undefined){
            delete historyDB.otherContainers[containerName]; // delete stopped vAsset from runningVAssets
        }
    }
    // ---------------------------------------
*/
    // remove all data from all sets
    removeOldData();

    // check if it is necessary to change units scale
    changeDataScales();

    // reset temp variables
    tempStats = undefined;
    tempAssets = undefined;
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

    var allObjectsData = [historyDB.runningVAssets, historyDB.notRunningVAssets, historyDB.otherContainers];

    for(let i = 0; i < allObjectsData.length; i++){
        var group = allObjectsData[i];

        // for all containers
        for( var containerName in group){

            var datasetsArray = [
                group[containerName].cpu,
                group[containerName].pids,
                group[containerName].mem.memPerc,
                group[containerName].mem.memUsage.dataset,
                group[containerName].netIO.dataset,
                group[containerName].blockIO.dataset
            ];

            for(let k = 0; k < datasetsArray.length; k++){

                var dataset = datasetsArray[k];                 // get dataset
                var currentTime = graph2dCpu.getCurrentTime();  // get current time of any graph

                // filter old data
                var oldIds = dataset.getIds({
                    filter: function (item) {
                        return item.x < vis.moment(currentTime).add(-MAX_DATA_TIME_TO_SHOW, 'seconds');
                    }
                });
                // remove old data of this dataset
                dataset.remove(oldIds);

                // If dataset and assetDetails are empty then remove all container from historyDB
                //if( (dataset.length === 0) && (jQuery.isEmptyObject(historyDB[containerName].assetDetails) ){
                //    delete historyDB[containerName];
                //    break; // jump to next container in historyDB
                //}
            }

        }

    }

}

//
// newStats.stdout        -> array with objects that contains container info
//                      eg: [{container1_Info}, {container2_Info}, ... ]
function addStatsToHistory(objLocation, newStats){

    var location = objLocation.obj[objLocation.objName];

    var stdoutArray = newStats.stdout;
    for(let i = 0; i < stdoutArray.length; i++){ // run through all containers info

        var name = stdoutArray[i].name;

        // If container does not exists in stats history then create it
        if(!(name in location)){
            addNewEmptyEntryToHistory(location, name);
        }

        // format to the right units
        formatNewDataToSameUnits(location, name, stdoutArray[i]);

        // add stats values to history
        var t = newStats.timestamp; // time of sampling

        location[name].containerID = stdoutArray[i].containerID;

        location[name].cpu.add({x: t, y: stdoutArray[i].cpu});
        location[name].pids.add({x: t, y: stdoutArray[i].pids});

        location[name].mem.memPerc.add({x: t, y: stdoutArray[i].mem.memPerc});

        location[name].mem.memUsage.dataset.add({x: t, y: stdoutArray[i].mem.memUsage});
        location[name].mem.memLimit.value = stdoutArray[i].mem.memLimit;

        location[name].netIO.dataset.add([
            {x: t, y: stdoutArray[i].netIO.netSent,     group: "netSent"},
            {x: t, y: stdoutArray[i].netIO.netReceived, group: "netReceived"}
        ]);

        location[name].blockIO.dataset.add([
            {x: t, y: stdoutArray[i].blockIO.dataRead,      group: "dataRead"},
            {x: t, y: stdoutArray[i].blockIO.dataWritten,   group: "dataWritten"}
        ]);

    }

}

function addNewEmptyEntryToHistory(objLocation, containerName){
    objLocation[containerName] = {}; // initialize object

    objLocation[containerName].assetDetails = {};         // fill to be inserted by /assets list
    objLocation[containerName].containerID = undefined;   // fill to be inserted by /stats list

    objLocation[containerName].cpu = new vis.DataSet();
    objLocation[containerName].pids = new vis.DataSet();

    objLocation[containerName].mem = {};
    objLocation[containerName].mem.memPerc = new vis.DataSet();

    objLocation[containerName].mem.memUsage = {};
    objLocation[containerName].mem.memUsage.dataset = new vis.DataSet();
    objLocation[containerName].mem.memUsage.units = 0; // 0 -> Bytes. Then multiples of 3

    objLocation[containerName].mem.memLimit = {};
    objLocation[containerName].mem.memLimit.value = undefined;
    objLocation[containerName].mem.memLimit.units = 0;

    objLocation[containerName].netIO = {};
    objLocation[containerName].netIO.dataset = new vis.DataSet();
    objLocation[containerName].netIO.units = 0;

    objLocation[containerName].blockIO = {};
    objLocation[containerName].blockIO.dataset = new vis.DataSet();
    objLocation[containerName].blockIO.units = 0;
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
function formatNewDataToSameUnits(objLocation, name, stdoutElem){

    // get current units
    var currentMemUsageUnits = objLocation[name].mem.memUsage.units,
        currentMemLimitUnits = objLocation[name].mem.memLimit.units,
        currentNetIOUnits = objLocation[name].netIO.units,
        currentBlockIOUnits = objLocation[name].blockIO.units;

    // transform number to the current units
    stdoutElem.mem.memUsage = stdoutElem.mem.memUsage / Math.pow(10, currentMemUsageUnits);
    stdoutElem.mem.memLimit = stdoutElem.mem.memLimit / Math.pow(10, currentMemLimitUnits);

    stdoutElem.netIO.netSent = stdoutElem.netIO.netSent / Math.pow(10, currentNetIOUnits);
    stdoutElem.netIO.netReceived = stdoutElem.netIO.netReceived / Math.pow(10, currentNetIOUnits);

    stdoutElem.blockIO.dataRead = stdoutElem.blockIO.dataRead / Math.pow(10, currentBlockIOUnits);
    stdoutElem.blockIO.dataWritten = stdoutElem.blockIO.dataWritten / Math.pow(10, currentBlockIOUnits);

}


function changeDataScales(){

    var allObjectsData = [historyDB.runningVAssets, historyDB.notRunningVAssets, historyDB.otherContainers];

    for(let i = 0; i < allObjectsData.length; i++) {
        var group = allObjectsData[i];

        // for all containers
        for (var containerName in group) {

            // --- memUsage ---
            formatDatasetScale(group[containerName].mem.memUsage, graph2dMemUsage);
            updateGraphScaleAxis(group[containerName].mem.memUsage, graph2dMemUsage, "binary");

            // --- memLimit ---
            formatValueScale(group[containerName].mem.memLimit);

            // --- netIO ---
            formatDatasetScale(group[containerName].netIO, graph2dNetIO);
            updateGraphScaleAxis(group[containerName].netIO, graph2dNetIO);

            // --- blockIO ---
            formatDatasetScale(group[containerName].blockIO, graph2dBlockIO);
            updateGraphScaleAxis(group[containerName].blockIO, graph2dBlockIO);

        }

        if(detailsContainerName in group){
            // update scales on graphs
            updateGraphScaleAxis(group[detailsContainerName].mem.memUsage, graph2dMemUsage, "binary");
            updateGraphScaleAxis(group[detailsContainerName].netIO, graph2dNetIO);
            updateGraphScaleAxis(group[detailsContainerName].blockIO, graph2dBlockIO);
        }
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

// historyDB[containerName].mem.memUsage
// historyDB[containerName].mem.memUsageUnits
// graph2dMemUsage
function formatDatasetScale(datasetObj) {

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

// This function is called when assetsUpdated_bool and statsUpdated_bool on updateTablesChecker variable
// are both set to "true"
function updateTables(){

    // Don't update tables if container details is open
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        // Empty all tables
        $("#runningVAssetsTable tbody").empty();
        $("#notRunningVAssetsTable tbody").empty();
        $("#otherContainers tbody").empty();

        addRowsToTable(historyDB.runningVAssets, "runningVAssetsTable");
        addRowsToTable(historyDB.notRunningVAssets, "notRunningVAssetsTable");
        addRowsToTable(historyDB.otherContainers, "otherContainersTable");
    }

/*
    // ------ update runningVAssets table ------
    // Don't update tables if container details is open
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        // Empty all tables
        $("#runningVAssetsTable tbody").empty();

        addRowsToTable(historyDB.runningVAssets, "runningVAssetsTable");
    }

    // ------ update notRunningVAssets table ------
    // Empty table
    $("#notRunningVAssetsTable tbody").empty();

    var rowTemplate='';
    var noRunningArray = historyDB.notRunningVAssets;
    for(let i = 0; i < noRunningArray.length; i++){

        var assetName = noRunningArray[i].id;
        rowTemplate +=
            '<tr> ' +
            '<td class="align-middle">' + assetName + '</td> ' +
            '<td class="align-middle" onclick="">' + '<button type="button" class="btn btn-success">RUN</button></td> '+
            '</tr>';
    }

    // Append row in the last table position
    $('#notRunningVAssetsTable > tbody:last-child').append(rowTemplate);

    // ------ update otherContainers table ------
    // Don't update tables if container details is open
    if(!DETAILS_CONTAINER_OPENED_FLAG) {
        // Empty table
        $("#otherContainersTable tbody").empty();
        addRowsToTable(historyDB.otherContainers, "otherContainersTable");
    }
*/
}

function updateTable(){

    // Don't update tables if container details is open
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        // Empty tables
        $("table tbody").empty();

        addRows();
    }
}

function addRowsToTable(objLocation, idTable){

    // Check if historyDB is empty
    if(Object.keys(objLocation).length == 0){
        return;
    }

    var rowTemplate = '';

    for(var key in objLocation){

        var containerID = objLocation[key].containerID,
            cpuVal = objLocation[key].cpu.max('x').y,

            memUsageVal = objLocation[key].mem.memUsage.dataset.max('x').y,
            memUsageUnits_string = getPowerScaleToUnitsString(objLocation[key].mem.memUsage.units, "binary"),

            memLimitVal = objLocation[key].mem.memLimit.value,
            memLimitUnits_string = getPowerScaleToUnitsString(objLocation[key].mem.memLimit.units, "binary"),

            memPerc = objLocation[key].mem.memPerc.max('x').y;


        //--- Net IO ---
        // retrieve a filtered subset of the data
        var itemsNetIOReceived = new vis.DataSet(objLocation[key].netIO.dataset.get({
            filter: function (item) {
                return item.group == "netReceived";
            }
        }));
        var itemsNetIOSent = new vis.DataSet(objLocation[key].netIO.dataset.get({
            filter: function (item) {
                return item.group == "netSent";
            }
        }));

        var netReceivedVal = itemsNetIOReceived.max('x').y;
        var netSentVal = itemsNetIOSent.max('x').y;
        var netIOUnits = objLocation[key].netIO.units;

        var valueObjReceived = {"value":netReceivedVal, "units": netIOUnits};
        formatValueScale(valueObjReceived);
        
        var netReceive = valueObjReceived.value,
            netReceiveUnits = getPowerScaleToUnitsString(valueObjReceived.units);

        var valueObjSent = {"value":netSentVal, "units": netIOUnits};
        formatValueScale(valueObjSent);

        var netSent = valueObjSent.value,
            netSentUnits = getPowerScaleToUnitsString(valueObjSent.units);


        //--- BLOCK IO ---
        var itemsBlockIORead = new vis.DataSet(objLocation[key].blockIO.dataset.get({
            filter: function (item) {
                return item.group == "dataRead";
            }
        }));
        var itemsBlockIOWritten = new vis.DataSet(objLocation[key].blockIO.dataset.get({
            filter: function (item) {
                return item.group == "dataWritten";
            }
        }));

        var blockIOReadVal = itemsBlockIORead.max('x').y;
        var blockIOWrittenVal = itemsBlockIOWritten.max('x').y;
        var blockIOUnits = objLocation[key].blockIO.units;

        var valueObjRead = {"value":blockIOReadVal, "units": blockIOUnits};
        formatValueScale(valueObjRead);
        var blockIORead = valueObjRead.value,
            blockIOReadUnits = getPowerScaleToUnitsString(valueObjRead.units);

        var valueObjWritten = {"value":blockIOWrittenVal, "units": blockIOUnits};
        formatValueScale(valueObjWritten);
        var blockIOWritten = valueObjWritten.value,
            blockIOWrittenUnits = getPowerScaleToUnitsString(valueObjWritten.units);


        // --- pids ---
        var pidsVal = objLocation[key].pids.max('x').y;

        // --- Asset name ---
        var assetName;
        if(jQuery.isEmptyObject(objLocation[key].assetDetails)){
            assetName = "N/A";
        } else {
            assetName = objLocation[key].assetDetails.id;
        }

        rowTemplate +=
            '<tr> ' +
            '<td class="align-middle" onclick="viewDetails(this)">' + '<button type="button" class="btn btn-light">' + key + '</button></td> ' +
            '<td class="align-middle">' + containerID + '</td> ' +
            '<td class="align-middle">' + assetName + '</td> ' +
            '<td class="align-middle">' + cpuVal.toFixed(2) + "%" + '</td> ' +
            '<td class="align-middle">' + memUsageVal.toFixed(2) + memUsageUnits_string + " / " + memLimitVal.toFixed(2) + memLimitUnits_string + '</td>' +
            '<td class="align-middle">' + memPerc.toFixed(2) + "%" + '</td> ' +
            '<td class="align-middle">' + netReceive.toFixed(2) + netReceiveUnits + " / " + netSent.toFixed(2) + netSentUnits +'</td>' +
            '<td class="align-middle">' + blockIORead.toFixed(2) + blockIOReadUnits + " / " + blockIOWritten.toFixed(2) + blockIOWrittenUnits + '</td> ' +
            '<td class="align-middle">' + pidsVal + '</td> ' +
            '</tr>';
    }

    // Append row in the last table position
    $('#'+idTable+' > tbody:last-child').append(rowTemplate);
}



// This function is called when user clicks on one of the container names
function viewDetails(thisElem) {

    // Deselect any previous highlighted row (if exists)
    deselectRow();

    // Highlight the selected row
    $(thisElem).parentsUntil("tbody").addClass("table-info");

    // Put in the global variable the Container Name
    DETAILS_CONTAINERNAME = $(thisElem).text();

    // If details view is closed than open it
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        toggleTableContent();
    }

    // Change data of details view;
    changeDetailsView(DETAILS_CONTAINERNAME);

    // Resize iframes
    resizeIFrameToFitContent($("#app_iframe"));
    resizeIFrameToFitContent($("#settings_iframe"));

}

// show / hide details view
// Used on the viewDetails() function and on the close button of the details view window
function toggleTableContent() {

    // Toggle content in tables
    var tableContentCollumns = [2, 3, 4, 5, 6, 7, 8, 9]; // collum number to toggle visibility (I do not like this way yet)
    for(let i=0; i<tableContentCollumns.length; i++){
        $('.dashboardTables td:nth-child(' + tableContentCollumns[i] + '), .dashboardTables th:nth-child(' + tableContentCollumns[i] + ')').toggle();
    }

    // Define sizes
    var tableSmallSize      = "col-sm-3",
        tableBigSize        = "col-sm-12",
        detailsSmallSize    = "col-sm-0",
        detailsbigSize      = "col-sm-9";

    // Toggle details and table
    if(DETAILS_CONTAINER_OPENED_FLAG){     // we are gonna close details view
        $("#allTables").removeClass(tableSmallSize);
        $("#allTables").addClass(tableBigSize);   // expande table

        $("#detailsDiv").removeClass(detailsbigSize);
        $("#detailsDiv").addClass(detailsSmallSize);    // Shrink details view

        // Deselect any previous highlighted row (if exists)
        deselectRow();

        //$("#runningVAssets").removeClass("sticky-top");

        // closes details view window
        $("#detailsDiv").hide();
        DETAILS_CONTAINER_OPENED_FLAG = false;          // puts flag off

        // stops logs messaging
        DETAILS_CONTAINERNAME = "NO_CONTAINER_NAME";    // replaces container name "resets it"
        clearInterval(updateLogs_timer); // stop messaging to update logs view
    }else{                          // we are gonna open details
        $("#allTables").removeClass(tableBigSize);
        $("#allTables").addClass(tableSmallSize);    // Shrink table

        $("#detailsDiv").removeClass(detailsSmallSize);
        $("#detailsDiv").addClass(detailsbigSize);  // expande details view

        //$("#runningVAssets").addClass("sticky-top"); // makes the table stick to the top when scrolling down

        $("#detailsDiv").show("slow");
        DETAILS_CONTAINER_OPENED_FLAG = true;
    }
}

function deselectRow(){
    // Remove class of selected row if exists
    $('table [class=table-info]').removeClass("table-info");
}
