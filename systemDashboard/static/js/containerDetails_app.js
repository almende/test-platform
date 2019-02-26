/**
 * Created by luis on 22-2-19.
 */
$(document).ready(function() {

    $('.nav-tabs a[href="#containerDetails_app"]').on('shown.bs.tab', function(event){

        console.log("I DID OPEN #containerDetails_app");
        // Resize iframe
        var iframe_id = "app_iframe";
        resizeIFrameToFitContent(iframe_id);
    });

    //$('.nav-tabs a[href="#containerDetails_app"]').on('hide.bs.tab', function(event){ });

});