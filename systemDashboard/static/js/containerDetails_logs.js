/**
 * Created by luis on 5-9-18.
 */

var UPDATE_LOGS_TIME = 3000; // Update log view every x milliseconds

$(document).ready(function() {

    $('.nav-tabs a[href="#containerDetails_logs"]').on('shown.bs.tab', function(event){

        console.log("I DID OPEN #containerDetails_logs");

        // update stats history
        setTimeout(updateLogs, 0);
        updateLogs_timer = setInterval(updateLogs, UPDATE_LOGS_TIME);

    });


    $('.nav-tabs a[href="#containerDetails_logs"]').on('hide.bs.tab', function(event){

        console.log("I DID CLOSE #containerDetails_logs");
        clearInterval(updateLogs_timer);

    });

});


function updateLogs(){

    // Request data to executionManager (executionservices)
    var urlLogs = '/executionservices/assets' + '/logs';

    if (DETAILS_CONTAINERNAME !== 'NO_CONTAINER_NAME') {

        var dataSend = {
            "containerName": DETAILS_CONTAINERNAME,
            "numOfLines" : 50
        };

        $.post(urlLogs, dataSend, function (data, status) {
            // TODO: WE NEED TO DO SOMETHING WHEN WE GET ERRORS

            //if (error) {
            //    console.log('error:' + error);
            //}
            //if (!error && response.statusCode == 200) {

            // puts info on the logWindow

            $("#logWindow").text(data.stdout);

            // formats all with the highlights library
            $('pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });

            //}
        });

    } else{
        console.log("updateLogs(): DETAILS_CONTAINERNAME = NO_CONTAINER_NAME")
    }

}