/**
 * Created by luis on 17-4-19.
 */

var UPDATE_DOWNLOADS_HITORY_TIME = 3000      // Update tables every x milliseconds

var updateRemoveList_timer

$(document).ready(function () {

    // shows the list of assets to be removed inside the modal
    $('#operationsModal_remove').on('show.bs.modal', function () {

        // Get list
        var removeList = getRemoveCheckedList()

        // Empty list
        $('#modalRemove_List').empty()

        // Add elements
        removeList.forEach(function (elem) {
            $('#modalRemove_List').append('<li class="list-group-item">' + elem + '</li>')
        })
    })

    setTimeout(refreshAssetsList, 0)
    updateRemoveList_timer = setInterval(fillRemoveList, UPDATE_STATSHITORY_TIME)

})

function fillRemoveList () {
    refreshAssetsList()

    // If list is not empty then we clear the timer
    if ($('#uninstallList').children().length > 0) {
        clearInterval(updateRemoveList_timer)
    }
}

function installAsset () {
    var urlId = $('#urlId').val(),
        urlForm = $('#urlForm').val(),
        tokenForm = $('#tokenForm').val()

    /*
     var data1 =
     {
     "id": "driver_1",
     "url": "https://vfos-datahub.ascora.de/v1/products/342/binary?access_token=EweuNahmu8j3zSTT19HNCm8Cm3MWqFGyoCasc88LvddJ3hRsLL"
     };
     */

    var dataMerge =
        {
            'id': urlId,
            'url': urlForm + '?access_token=' + tokenForm
        }

    var data = JSON.stringify(dataMerge)

    $.ajax({
        url: '/deployment/downloads',
        type: 'PUT',
        contentType: 'application/json',
        data: data,
        success: function (result) {
            // handle success
            //console.log("Result: ", result);
        },
        error: function (request, msg, error) {
            // handle failure
            console.log('ERROR: ', error)
        }
    })

    $('#operationsModal').modal('hide')

}

function updateDownloadsHistory () {

    $.get('/deployment/downloads', function (data, status) {
        //console.log("Data: " + data + "\nStatus: " + status);
        if (status === 'success') {

            var scrollTop = $('#downloads').scrollTop()

            // clean downloads history
            $('#downloadsTable tbody').empty()

            // update with the new information
            for (var i = 0; i < data.length; i++) {

                var id = data[i].id,
                    downloadStatus = data[i].status

                var classText
                if (downloadStatus === 'Done') {
                    classText = 'text-success'
                } else if (downloadStatus === 'Downloading') {
                    classText = 'text-info'
                } else if (downloadStatus === 'Error') {
                    classText = 'text-danger'
                } else {
                    classText = ''
                }

                var d = '' +
                    '<tr class="' + classText + '">' +
                    '<td>' + id + '</td>' +
                    '<td>' + downloadStatus + '</td>' +
                    '</tr>'

                // add info to table
                $('#downloadsTable tbody').append(d)

                // set height (how to set this with css only?!!....)
                var maxH = $('#installations').height()
                $('#downloads').css('max-height', maxH) // make it with the same height as installations

                $('#downloads').scrollTop(scrollTop)
            }

        }

    })

}

function getRemoveCheckedList () {

    // Get asset to be removed
    var allCheckedInputs = $('#uninstallList').find('input:checked')

    // Create removeList
    var removeList = []
    for (var i = 0; i < allCheckedInputs.length; i++) {
        removeList.push($(allCheckedInputs[i]).val())
    }

    return removeList
}

function removeAssets () {

    var removeList = getRemoveCheckedList()

    console.log('Assets to be removed:', removeList)

    var url, assetName
    for (var i = 0; i < removeList.length; i++) {
        assetName = removeList[i]
        url = '/executionservices/assets/' + assetName
        console.log('Removing asset: ', assetName)

        // Send info to remove assets
        $.ajax({
            url: url,
            type: 'DELETE',
            contentType: 'application/json',
            invokedata: {
                assetName: assetName,
            },
            //data: data,
            success: function (result) {

                console.log('Sucess: Asset ' + this.invokedata.assetName + ' removed!')
                // handle success
                //console.log("Result: ", result);
                refreshAssetsList()
            },
            error: function (request, msg, error) {
                // handle failure
                console.log('Asset ' + this.invokedata.assetName + ' not removed!\nError: ', error)
                refreshAssetsList()
            }
        })
    }

    // hide modal
    $('#operationsModal_remove').modal('hide')

    // Refresh list

}

function refreshAssetsList () {
    // Get assets list
    var assetList = [] // variable to hold all asset names
    var historyDB_Keys = Object.keys(historyDB) // get keys of database
    for (var i = 0; i < historyDB_Keys.length; i++) { // for each key in database
        assetList = assetList.concat(Object.keys(historyDB[historyDB_Keys[i]])) // concat all keys to list
    }

    assetList.sort() // sorts array

    // Empty list
    $('#uninstallList').empty()

    // Insert all assets from list
    for (var i = 0; i < assetList.length; i++) {
        // create template
        var idSwitch = 'switch_' + assetList[i]
        var template = '' +
            '<div class="custom-control custom-switch col-3">' +
            '    <input type="checkbox" class="custom-control-input" id="' + idSwitch + '" name="example" value="' + assetList[i] + '">' +
            '    <label class="custom-control-label mw-100" style="word-wrap: break-word;" for="' + idSwitch + '">' + assetList[i] + '</label>' +
            '</div>' +
            ''
        // insert template in list
        $('#uninstallList').append(template)
    }
}

function toggleAllSwitchRemove (elem) {
    var checked = $(elem).is(':checked')
    $('#uninstallList').find('input').prop('checked', checked)
}