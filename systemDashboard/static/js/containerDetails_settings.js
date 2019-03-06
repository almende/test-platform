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

})