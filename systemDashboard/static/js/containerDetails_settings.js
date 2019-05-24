/**
 * Created by luis.
 */
$(document).ready(function () {

    $('.nav-tabs a[href="#containerDetails_settings"]').on('shown.bs.tab', function (event) {

        console.log('I DID OPEN #containerDetails_settings')
        // Resize iframe
        var iframe_id = 'settings_iframe'
        resizeIFrameToFitContent(iframe_id)
    })

    //$('.nav-tabs a[href="#containerDetails_settings"]').on('hide.bs.tab', function(event){ });

});


function reloadAsset () {

    // POST TO:  /executionservices/assets/<assetID>/reload

    var url = "/executionservices/assets/" + DETAILS_CONTAINER_NAME + "/reload"
    var dataObj =
        {
            "test": "TestReload"
        };

    var data = JSON.stringify(dataObj);

    $.ajax({
        url: url,
        type: 'POST',
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


}

function factoryResetAsset () {
    // POST TO: /executionservices/assets/<assetID>/reset

    var url = "/executionservices/assets/" + DETAILS_CONTAINER_NAME + "/reset"
    var dataObj =
        {
            "test": "TestReset"
        };

    var data = JSON.stringify(dataObj);

    $.ajax({
        url: url,
        type: 'POST',
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


    $("#factoryResetModal").modal('hide');
    $("#factoryResetInfo").show();
    setTimeout(function () {
        $("#factoryResetInfo").hide("slow");
    }, 5000)
}