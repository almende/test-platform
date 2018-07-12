/**
 * Created by luis on 11-7-18.
 */

var UPDATE_TABLES_TIME = 3000;      // Update tables every x milliseconds
//var UPDATE_TABLES_FLAG = true;           // True - updates tables | false - stop update tables
var DETAILS_CONTAINER_OPENED_FLAG = false; // True - details view opened | false - details view not opened

var updateTable_timer; // timer to restart or stop updating tables

$(document).ready(function(){

    // Load container details
    $("#detailsDiv").load("./templates/containerDetails.html");

    // update tables
    updateTable();
    updateTable_timer = setInterval(updateTable, UPDATE_TABLES_TIME);
});

function updateTable(){

    getTableStats();
}

function getTableStats(){

    var result = [];
    // Request data to executionManager (executionservices)
    var urlStats = 'http://localhost/executionservices/assets' + '/stats';
    $.get(urlStats, function (data, status) {
        //if (error) {
        //    console.log('error:' + error);
        //}
        //if (!error && response.statusCode == 200) {

        var dataSplited = data.stdout.split("\n");
        dataSplited.pop(); // remove empty entry caused by the last \n

        dataSplited.forEach( (currentValue, index, arr) =>{
            arr[index] = JSON.parse(currentValue);
        });

        // Don't update tables if container details is open
        if(!DETAILS_CONTAINER_OPENED_FLAG){
            // Empty tables
            $("table tbody").empty();

            addRows(dataSplited);
        }

        //}
    });

}

function addRows(containerInfo){

    var rowTemplate = '';
    // Add rows to table (FOR NOW JUST FOR THE RUNNING CONTAINERS)
    for(let i = 0; i < containerInfo.length; i++){
        rowTemplate +=
            '<tr> ' +
            '<td>' + containerInfo[i].containerID + '</td> ' +
            '<td onclick="viewDetails(this)">' + containerInfo[i].name + '</td> ' +
            '<td>' + containerInfo[i].cpu + '</td> ' +
            '<td>' + containerInfo[i].mem + '</td>' +
            '<td>' + containerInfo[i].memPerc + '</td> ' +
            '<td>' + containerInfo[i].netIO + '</td>' +
            '<td>' + containerInfo[i].blockIO + '</td> ' +
            '<td>' + containerInfo[i].pids + '</td> ' +
            '</tr>';
    }

    // Append row in the last table position
    $('#runningTableContainers > tbody:last-child').append(rowTemplate);
}

function viewDetails(thisElem) {

    // Deselect any previous highlighted row (if exists)
    deselectRow();

    // Highlight the selected row
    $(thisElem).parentsUntil("tbody").addClass("table-info");

    // Stop updating table (To keep the same rows and keep the highlight row)
    clearTimeout(updateTable_timer);

    // If details view is closed than open it
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        toggleTableContent();
    }

    // Get container name (Or any other useful thing to request info)
    var containerName = $(thisElem).text();

    // request info to server about the details view
    //

}

function toggleTableContent() {

    // Hide content in tables
    var tableContentCollumns = [3, 4, 5, 6, 7, 8]; // collum number to toggle visibility
    for(let i=0; i<tableContentCollumns.length; i++){
        $('td:nth-child(' + tableContentCollumns[i] + '), th:nth-child(' + tableContentCollumns[i] + ')').toggle();
    }

    // Define sizes
    var tableSmallSize = "col-sm-3",
        tableBigSize = "col-sm-12",
        detailsSmallSize   = "col-sm-0",
        detailsbigSize   = "col-sm-9";

    // Toggle details and table
    if(DETAILS_CONTAINER_OPENED_FLAG){     // we are gonna close details view
        $("#tableDiv").removeClass(tableSmallSize);
        $("#tableDiv").addClass(tableBigSize);   // expande table

        $("#detailsDiv").removeClass(detailsbigSize);
        $("#detailsDiv").addClass(detailsSmallSize);    // Shrink details view

        // Start updating tables again
        updateTable_timer = setInterval(updateTable, UPDATE_TABLES_TIME);

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
