/**
 * Created by luis
 */
$(document).ready(function() {

    $('.nav-tabs a[href="#containerDetails_labels"]').on('shown.bs.tab', function(event){

        console.log("I DID OPEN #containerDetails_labels");

    });

    //$('.nav-tabs a[href="#containerDetails_labels"]').on('hide.bs.tab', function(event){ });

});

function updateLabels(containerName) {

    // clean table
    $("#detailsLabelsTable tbody").empty();

    // Find asset
    var asset = "NO_ASSET";
    for(let i = 0; i < assetsData.length; i++){
        if(assetsData[i].name === containerName){
            asset = assetsData[i];
        }
    }
    // If no asset found
    if(asset === "NO_ASSET"){
        return;
    }

    // if no labels found
    if( typeof asset.labels === "undefined" ){
        return;
    }

    var labels = asset.labels;
    var rowTemplate = '';

    for(var key in labels){
        rowTemplate +=
            '<tr> ' +
            '<td class="align-middle">' + key + '</td> ' +
            '<td class="align-middle">' + labels[key] + '</td> ' +
            '</tr>';
    }

    // Append row in the last table position
    $('#detailsLabelsTable > tbody:last-child').append(rowTemplate);

}