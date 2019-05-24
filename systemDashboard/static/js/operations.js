/**
 * Created by luis on 17-4-19.
 */

var UPDATE_DOWNLOADS_HITORY_TIME = 3000;      // Update tables every x milliseconds


$(document).ready(function(){

    // update downloads history
    //setTimeout(updateStatsHistory, 0);
    //updateDownloadsHistory_timer = setInterval(updateDownloadsHistory, UPDATE_STATSHITORY_TIME);

});

function installAsset(){
    var urlId = $("#urlId").val(),
        urlForm = $("#urlForm").val(),
        tokenForm = $("#tokenForm").val();

    /*
    var data1 =
    {
        "id": "driver_1",
        "url": "https://vfos-datahub.ascora.de/v1/products/342/binary?access_token=EweuNahmu8j3zSTT19HNCm8Cm3MWqFGyoCasc88LvddJ3hRsLL"
    };
    */

    var dataMerge =
        {
            "id": urlId,
            "url": urlForm + "?access_token=" + tokenForm
        };

    var data = JSON.stringify(dataMerge)

    $.ajax({
        url: '/deployment/downloads',
        type: 'PUT',
        contentType: 'application/json',
        data: data,
        success: function(result) {
            // handle success
            //console.log("Result: ", result);
        },
        error: function(request,msg,error) {
            // handle failure
            console.log("ERROR: ", error);
        }
    });

    $("#operationsModal").modal('hide');

}


function updateDownloadsHistory () {

    $.get('/deployment/downloads', function(data, status){
        //console.log("Data: " + data + "\nStatus: " + status);
        if(status === "success"){

            var scrollTop = $("#downloads").scrollTop();

            // clean downloads history
            $("#downloadsTable tbody").empty();

            // update with the new information
            for(var i = 0; i < data.length; i++){

                var id = data[i].id,
                    downloadStatus = data[i].status;

                var classText;
                if(downloadStatus === "Done"){
                    classText = "text-success"
                } else if(downloadStatus === "Downloading"){
                    classText = "text-info"
                } else if(downloadStatus === "Error"){
                    classText = "text-danger"
                } else {
                    classText = "";
                }

                var d = '' +
                    '<tr class="' + classText + '">' +
                        '<td>' + id + '</td>' +
                        '<td>' + downloadStatus + '</td>' +
                    '</tr>';

                // add info to table
                $("#downloadsTable tbody").append(d)

                // set height (how to set this with css only?!!....)
                var maxH = $("#installations").height();
                $("#downloads").css("max-height", maxH); // make it with the same height as installations

                $("#downloads").scrollTop(scrollTop);
            }

        }



    });

}