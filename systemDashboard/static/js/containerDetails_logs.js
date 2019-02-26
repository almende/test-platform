/**
 * Created by luis on 5-9-18.
 */

var UPDATE_LOGS_TIME = 3000; // Update log view every x milliseconds
var updateLogs_timer;   // variable to hold timer of the logs messaging
var previousLogContainerName = ""; // It helps to know if user did change or not to another container while showing the logs

$(document).ready(function() {

    $('.nav-tabs a[href="#containerDetails_logs"]').on('shown.bs.tab', function(event){

        console.log("I DID OPEN #containerDetails_logs");

        // update stats history
        setTimeout(updateLogs, 0);
        updateLogs_timer = setInterval(updateLogs, UPDATE_LOGS_TIME);

        setTimeout(function(){
            var objDiv = document.getElementById("logWindow");
            objDiv.scrollTop = objDiv.scrollHeight;
        }, 100);

    });


    $('.nav-tabs a[href="#containerDetails_logs"]').on('hide.bs.tab', function(event){

        console.log("I DID CLOSE #containerDetails_logs");
        clearInterval(updateLogs_timer);

    });

});


function updateLogs(){

    // Request data to executionManager (executionservices)
    var urlLogs = '/executionservices/assets' + '/logs';

    if (DETAILS_CONTAINER_NAME !== 'NO_CONTAINER_NAME') {

        var dataSend = {
            "containerName": DETAILS_CONTAINER_NAME,
            "numOfLines" : 50
        };

        $.post(urlLogs, dataSend, function (data, status) {

            if(typeof data.stdout !== 'undefined'){
                $("#logWindow").removeClass("border border-danger");    // remove red color on borders
                $("#logErrorMessage").hide();    // hide error message

                // insert text
                $("#logWindow").text(data.stdout);

                // formats all with the highlights library
                $('pre code').each(function(i, block) {
                    hljs.highlightBlock(block);
                });
                previousLogContainerName = DETAILS_CONTAINER_NAME;
            } else {
                // TODO: WHAT TO DO? A LOADING ICON WHILE PREVIOUS INFO IS STILL SHOWN?
                $("#logWindow").addClass("border border-danger");
                $("#logErrorMessage").show();

                if(previousLogContainerName !== DETAILS_CONTAINER_NAME){
                    $("#logWindow").text("");
                }
            }

        });

    } else{
        console.log("updateLogs(): DETAILS_CONTAINER_NAME = NO_CONTAINER_NAME")
    }

}