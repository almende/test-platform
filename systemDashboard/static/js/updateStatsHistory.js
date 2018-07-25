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
/*
statsHistory has this format:
statsHistory = {
    "containerName1":{
        "containerID": String,
        "cpu": [#,#,#,...,#],
        "pids": [#,#,#,...,#],
        "mem": {
            "memPerc": [#,#,#,...,#],
            "memUsage": [#,#,#,...,#],
            "memUsageUnits": number, // multiples of 3
            "memLimit": Number,
        },
        "netIO":{
            "netSent": [#,#,#,...,#],
            "netReceived": [#,#,#,...,#],
        },
        "blockIO":{
            "dataRead": [#,#,#,...,#],
            "dataWritten": [#,#,#,...,#],
        }
    }
}
*/
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
        formatData(data);

        addStatsToHistory(data);

        removeOldData();

        // check if it is necessary to change units scale
        changeDataScale();

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
function formatData(data){

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
            statsHistory[containerName].mem.memUsage,
            //statsHistory[containerName].netIO.netSent,
            //statsHistory[containerName].netIO.netReceived,
            statsHistory[containerName].blockIO.dataRead,
            statsHistory[containerName].blockIO.dataWritten
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

            statsHistory[name].mem.memUsage = new vis.DataSet();
            statsHistory[name].mem.memUsageUnits = 0; // 0 -> Bytes. Then multiples of 3

            statsHistory[name].mem.memLimit = undefined;
            statsHistory[name].mem.memLimitUnits = 0;

            statsHistory[name].netIO = new vis.DataSet();

            //statsHistory[name].netIO.netSent = new vis.DataSet();
            //statsHistory[name].netIO.netSentUnits = 0;

            //statsHistory[name].netIO.netReceived = new vis.DataSet();
            //statsHistory[name].netIO.netReceivedUnits = 0;

            statsHistory[name].blockIO = {};
            statsHistory[name].blockIO.dataRead = new vis.DataSet();
            statsHistory[name].blockIO.dataUnits = 0;

            statsHistory[name].blockIO.dataWritten = new vis.DataSet();
            statsHistory[name].blockIO.dataWrittenUnits = 0;
        }

        // format to the right units
        formatNewDataToSameUnits(name, stdoutArray[i]);

        // add stats values to history
        var t = newStats.timestamp; // time of sampling

        statsHistory[name].containerID = stdoutArray[i].containerID;

        statsHistory[name].cpu.add({x: t, y: stdoutArray[i].cpu});
        statsHistory[name].pids.add({x: t, y: stdoutArray[i].pids});

        statsHistory[name].mem.memPerc.add({x: t, y: stdoutArray[i].mem.memPerc});

        statsHistory[name].mem.memUsage.add({x: t, y: stdoutArray[i].mem.memUsage});
        statsHistory[name].mem.memLimit = stdoutArray[i].mem.memLimit;

        statsHistory[name].netIO.add([
            {x: t, y: stdoutArray[i].netIO.netSent,     group: "netSent"},
            {x: t, y: stdoutArray[i].netIO.netReceived, group: "netReceived"}
        ]);
        //statsHistory[name].netIO.netSent.add({x: t, y: stdoutArray[i].netIO.netSent});
        //statsHistory[name].netIO.netReceived.add({x: t, y: stdoutArray[i].netIO.netReceived});

        statsHistory[name].blockIO.dataRead.add({x: t, y: stdoutArray[i].blockIO.dataRead});
        statsHistory[name].blockIO.dataWritten.add({x: t, y: stdoutArray[i].blockIO.dataWritten});

    }

}

// returns the number scale in power of 10 (multiples of 3)
// e.g: - 900       returns 0
//      - 1000      returns 3
//      - 3000000   returns 6
function getNumberScale(num){

    // We should perform some num checks

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
    var currentMemUsageUnits = statsHistory[name].mem.memUsageUnits,
        currentMemLimitUnits = statsHistory[name].mem.memLimitUnits;
        //currentNetSentUnits = statsHistory[name].net.netSentUnits,
        //currentNetReceivedUnits = statsHistory[name].net.netReceivedUnits;

    // transform number to the current units
    stdoutElem.mem.memUsage = stdoutElem.mem.memUsage / Math.pow(10, currentMemUsageUnits);
    stdoutElem.mem.memLimit = stdoutElem.mem.memLimit / Math.pow(10, currentMemLimitUnits);

}


function changeDataScale(){

    for(var containerName in statsHistory){

        // get max value
        var maxValue = statsHistory[containerName].mem.memUsage.max('y').y;
        var powScale = getNumberScale(maxValue);

        // if error or nothing to change
        if(powScale == (-1) || powScale == 0){
            continue;
        }
        /*
        var array = [
            {
                "dataset": statsHistory[containerName].mem.memUsage,
                "graph": graph2dMemUsage
            },
            {
                "dataset": statsHistory[containerName].mem.memLimit,
                "graph": 0
            }
            ];
        */
        // change dataset according to pow scale of the biggest number
        var allData = statsHistory[containerName].mem.memUsage.get();
        allData.forEach((item)=>{
            item.y = item.y / Math.pow(10, powScale);
        });
        statsHistory[containerName].mem.memUsage.update(allData);

        // Update scale on stats
        statsHistory[containerName].mem.memUsageUnits+=powScale;

        // update settings
        var optionMemUsage = {
            dataAxis: {
                left: {
                    title: {
                        text: getPowerScaleToUnitsString(statsHistory[containerName].mem.memUsageUnits)
                    }
                }
            }
        };
        graph2dMemUsage.setOptions(optionMemUsage);

    }
}

function getPowerScaleToUnitsString(power){
    var unitsStr;
    switch (power){
        case 0:
            unitsStr = "B";
            break;
        case 3:
            unitsStr = "KiB";
            break;
        case 6:
            unitsStr = "MiB";
            break;
        case 9:
            unitsStr = "GiB";
            break;
        case 12:
            unitsStr = "TiB";
            break;
        case 15:
            unitsStr = "PiB";
            break;
        case 18:
            unitsStr = "EiB";
            break;
        case 21:
            unitsStr = "ZiB";
            break;
        case 24:
            unitsStr = "YiB";
            break;
        default:
            unitsStr = "--"
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

            memUsageVal = statsHistory[key].mem.memUsage.max('x').y,
            memUsageUnits_string = getPowerScaleToUnitsString(statsHistory[key].mem.memUsageUnits),

            memLimitVal = statsHistory[key].mem.memLimit,
            memLimitUnits_string = getPowerScaleToUnitsString(statsHistory[key].mem.memLimitUnits),

            memPerc = statsHistory[key].mem.memPerc.max('x').y;


        // retrieve a filtered subset of the data
        var itemsNetIOReceived = new vis.DataSet(statsHistory[key].netIO.get({
            filter: function (item) {
                return item.group == "netReceived";
            }
        }));
        var netReceivedVal = itemsNetIOReceived.max('x').y;

        var itemsNetIOSent = new vis.DataSet(statsHistory[key].netIO.get({
            filter: function (item) {
                return item.group == "netSent";
            }
        }));
        var netSentVal = itemsNetIOSent.max('x').y;

        //TODO: BLOCK IO 

        rowTemplate +=
            '<tr> ' +
            '<td>' + containerID + '</td> ' +
            '<td onclick="viewDetails(this)">' + key + '</td> ' +
            '<td>' + cpuVal + "%" + '</td> ' +
            '<td>' + memUsageVal + memUsageUnits_string + " / " + memLimitVal + memLimitUnits_string + '</td>' +
            '<td>' + memPerc + "%" + '</td> ' +
            '<td>' + netReceivedVal + " / " + netSentVal + '</td>' +
            
            '<td>' + statsHistory[key].blockIO.dataRead.max('x').y + " / " + statsHistory[key].blockIO.dataWritten.max('x').y + '</td> ' +
            '<td>' + statsHistory[key].pids.max('x').y + '</td> ' +
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

        $("#detailsDiv").hide();
        DETAILS_CONTAINER_OPENED_FLAG = false;
    }else{                          // we are gonna open details
        $("#tableDiv").removeClass(tableBigSize);
        $("#tableDiv").addClass(tableSmallSize);    // Shrink table

        $("#detailsDiv").removeClass(detailsSmallSize);
        $("#detailsDiv").addClass(detailsbigSize);  // expande details view

        $("#detailsDiv").show("slow");
        DETAILS_CONTAINER_OPENED_FLAG = true;
    }
}

function deselectRow(){
    // Remove class of selected row if exists
    $('table [class=table-info]').removeClass("table-info");
}
