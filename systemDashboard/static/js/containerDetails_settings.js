/**
 * Created by luis.
 */

// Global variables

var INFO_TOAST_CLASS = "infoToast",
    SUCCESS_TOAST_CLASS = "successToast",
    ERROR_TOAST_CLASS = "errorToast";
//-------------------------

$(document).ready(function () {

    $('.nav-tabs a[href="#containerDetails_settings"]').on('shown.bs.tab', function (event) {

        console.log('I DID OPEN #containerDetails_settings')
        // Resize iframe
        var iframe_id = 'settings_iframe'
        resizeIFrameToFitContent(iframe_id)
    })
    
});

// Makes a call to executionservices to reload an asset
//      POST TO:  /executionservices/assets/<assetID>/reload
function reloadAsset () {

    var url = "/executionservices/assets/" + DETAILS_CONTAINER_NAME + "/reload"

    var dataObj = { "test": "TestReload" };
    var data = JSON.stringify(dataObj);

    // Make the call
    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: data,
        invokedata: {
            containerName: DETAILS_CONTAINER_NAME,
        },
        success: function(result, containerName) {
            // handle success
            var message = {
                header: this.invokedata.containerName,
                body: "Successfullly reloaded!"
            }
            createAndShowToast(message, false, SUCCESS_TOAST_CLASS);
        },
        error: function(request,msg,error) {
            // handle failure
            console.log("ERROR: ", error);

            var msgBody = '' +
                '<p>' +
                    'Unable to reload!<br>' +
                    '<strong>Error</strong>:<br>' +
                    error +
                '</p>';

            var message = {
                header: this.invokedata.containerName,
                body: msgBody
            }
            createAndShowToast(message, false, ERROR_TOAST_CLASS);
        }
    });

    // Inform user that asset is reloading
    var message = {
        header: DETAILS_CONTAINER_NAME,
        body: 'Reloading...'
    }
    createAndShowToast(message, true, INFO_TOAST_CLASS);
}

// Makes a call to executionservices to factory reset an asset
//      POST TO: /executionservices/assets/<assetID>/reset
function factoryResetAsset () {

    var url = "/executionservices/assets/" + DETAILS_CONTAINER_NAME + "/reset"

    var dataObj = { "test": "TestReset" };
    var data = JSON.stringify(dataObj); // data to send to server

    // Make the call
    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: data,
        invokedata: {
            containerName: DETAILS_CONTAINER_NAME,
        },
        success: function(result) {
            var message = {
                header: this.invokedata.containerName,
                body: "Successfullly resetted!"
            }
            createAndShowToast(message, false, SUCCESS_TOAST_CLASS);
        },
        error: function(request,msg,error) {

            console.log("ERROR: ", error);
            // Show a error message to user
            var msgBody = '' +
                '<p>' +
                'Unable to reset!<br>' +
                '<strong>Error</strong>:<br>' +
                error +
                '</p>';

            var message = {
                header: this.invokedata.containerName,
                body: msgBody
            }
            createAndShowToast(message, false, ERROR_TOAST_CLASS);
        }
    });

    // Hide modal
    $("#factoryResetModal").modal('hide');

    // Inform user that asset is reloading
    var message = {
        header: DETAILS_CONTAINER_NAME,
        body: 'Resetting...'
    }
    createAndShowToast(message, true, INFO_TOAST_CLASS);
}


/*
Creates and show a toast.
message             --> Object containing:
    message.header  --> header text
    message.body    --> content to show in the toast body. It can by text of any html DOM

hide                --> (Bool) If true toast will dissapear after 5 secs, otherwise
                        user has to click on the close button.
type                --> Empty or one of the follow global variables:
                            INFO_TOAST_CLASS
                            SUCCESS_TOAST_CLASS
                            ERROR_TOAST_CLASS
 */
function createAndShowToast(message, hide, type){

    var dateID = new Date().getTime();

    // Create toast
    var toast = '' +
        '<div id="' + dateID + '" class="toast ' + type + '">' +
        '    <div class="toast-header">' +
        '        <strong class="mr-auto">' + message.header + '</strong>' +
        '        <button type="button" class="ml-2 mb-1 close" data-dismiss="toast">&times;</button>' +
        '    </div>' +
        '    <div class="toast-body">' +
        '        ' + message.body + '' +
        '    </div>' +
        '</div>' +
    '';

    // append toast
    $("#toastsContainer").append(toast);

    // Initialize toast
    var toastOptions = {
        animation:true,
        autohide: hide,
        delay: 5000
    };
    $("#" + dateID).toast(toastOptions);

    // Show toast
    $("#" + dateID).toast("show");

    // Destroy toast
    $("#" + dateID).on('hidden.bs.toast', function () {
        $(this).remove();
    });

}