/**
 * Created by luis
 */
// ----- GLOBAL VARIABLES -----
var DETAILS_CONTAINER_OPENED_FLAG = false; // True - details view opened | false - details view not opened
var DETAILS_CONTAINER_NAME = "NO_CONTAINER_NAME"; // defines a container name opened on the details view, otherwise NO_CONTAINER_NAME

//-----------------------------------------------

function loadingBar(){
    var $progressBar = $('#progressBar');

    var progress = 0;      // initial value of your progress bar
    var timeout = 200;      // number of milliseconds between each frame
    var increment = 10;    // increment for each frame
    var maxprogress = 110; // when to leave stop running the animation

    function animate() {
        setTimeout(function () {

            if($("#progressBar").length !== 0){
                progress += increment;
                if(progress < maxprogress) {
                    //$progressBar.attr('value', progress);
                    $progressBar.attr('aria-valuenow', progress);
                    $progressBar.width(progress + "%");
                    //$progressBar.text(progress + "%");
                    animate();
                }
            }

        }, timeout);
    }
    animate();
}

function collapseChangeIcon(thisElem){

    var dRight = "M12 30 L24 16 12 2",
        dBottom = "M30 12 L16 24 2 12";

    var icon = $(thisElem).find(".collapseIconPath");
    var iconText = $(icon).attr("d");

    if(iconText === dRight){
        $(icon).attr("d", dBottom);
    }else{
        $(icon).attr("d", dRight);
    }
}

// This function is called when user clicks on one of the container names
function viewDetails(thisElem) {

    // Deselect any previous highlighted row (if exists)
    deselectRow();

    // Highlight the selected row
    $(thisElem).parentsUntil("tbody").addClass("table-info");

    // Put in the global variable the Container Name
    DETAILS_CONTAINER_NAME = $(thisElem).text();

    // If details view is closed than open it
    if(!DETAILS_CONTAINER_OPENED_FLAG){
        toggleTableContent();
    }

    // Change data of details view according with DETAILS_CONTAINER_NAME;
    changeDetailsView();

    // Resize iframes
    //setTimeout(resizeIFrameToFitContent, 1000, "app_iframe");
    //setTimeout(resizeIFrameToFitContent, 1000, "settings_iframe");

}

// Called from viewDetails
function changeDetailsView() {

    // where is DETAILS_CONTAINER_NAME
    var location;
    if (historyDB.runningVAssets.hasOwnProperty(DETAILS_CONTAINER_NAME)) {
        location = historyDB.runningVAssets;
    } else if (historyDB.notRunningVAssets.hasOwnProperty(DETAILS_CONTAINER_NAME)) {
        location = historyDB.notRunningVAssets;
    } else if (historyDB.otherContainers.hasOwnProperty(DETAILS_CONTAINER_NAME)){
        location = historyDB.otherContainers;
    } else {
        console.log("ERROR: DETAILS_CONTAINER_NAME not found!")
        return;
    }

    // ---- App nav ----
    var iFrame_id = "app_iframe",
        label_uri = "vf-OS.backendUri",
        notFound_url = "apps/containerApp/containerAppNotFound.html";

    loadIframe(DETAILS_CONTAINER_NAME, iFrame_id, label_uri, notFound_url);
    //if($("#linkToDetails_app").hasClass("active") && $("#linkToDetails_app").hasClass("show")){
    //    setTimeout(resizeIFrameToFitContent($("#app_iframe"), 1000));
    //}

    // ---- Stats nav ----
    // Change datasets
    graph2dCpu.setItems(location[DETAILS_CONTAINER_NAME].cpu);
    graph2dMemPerc.setItems(location[DETAILS_CONTAINER_NAME].mem.memPerc);

    graph2dMemUsage.setItems(location[DETAILS_CONTAINER_NAME].mem.memUsage.dataset);

    graph2dNetIO.setItems(location[DETAILS_CONTAINER_NAME].netIO.dataset);
    graph2dBlockIO.setItems(location[DETAILS_CONTAINER_NAME].blockIO.dataset);

    // ---- Logs nav ----
    // If log view is opened update it
    if($("#linkToDetails_logs").hasClass("active") && $("#linkToDetails_logs").hasClass("show")){
        updateLogs();

        setTimeout(function(){
            var objDiv = document.getElementById("logWindow");
            objDiv.scrollTop = objDiv.scrollHeight;
        }, 100);
    }

    // ---- Config nav ----
    iFrame_id = "settings_iframe";
    label_uri = "vf-OS.configurationUri";
    notFound_url = "apps/containerSettings/containerSettingsNotFound.html";

    loadIframe(DETAILS_CONTAINER_NAME, iFrame_id, label_uri, notFound_url);

    // ---- Labels nav ----
    updateLabels(DETAILS_CONTAINER_NAME);

    // --------------------
}

// show / hide details view
// Used on the viewDetails() function and on the close button of the details view window
function toggleTableContent() {

    // Toggle content in tables
    var tableContentCollumns = [2, 3, 4, 5, 6, 7, 8, 9]; // collum number to toggle visibility (I do not like this way yet)
    for(let i=0; i<tableContentCollumns.length; i++){
        $('.dashboardTables td:nth-child(' + tableContentCollumns[i] + '), .dashboardTables th:nth-child(' + tableContentCollumns[i] + ')').toggle();
    }

    // Define sizes
    var tableSmallSize      = "col-sm-3",
        tableBigSize        = "col-sm-12",
        detailsSmallSize    = "col-sm-0",
        detailsbigSize      = "col-sm-9";

    // Toggle details and table
    if(DETAILS_CONTAINER_OPENED_FLAG){     // we are gonna close details view
        $("#allTables").removeClass(tableSmallSize);
        $("#allTables").addClass(tableBigSize);   // expande table

        $("#detailsDiv").removeClass(detailsbigSize);
        $("#detailsDiv").addClass(detailsSmallSize);    // Shrink details view

        // Deselect any previous highlighted row (if exists)
        deselectRow();

        //$("#runningVAssets").removeClass("sticky-top");

        // closes details view window
        $("#detailsDiv").hide();
        DETAILS_CONTAINER_OPENED_FLAG = false;          // puts flag off

        // stops logs messaging
        DETAILS_CONTAINER_NAME = "NO_CONTAINER_NAME";    // replaces container name "resets it"
        clearInterval(updateLogs_timer); // stop messaging to update logs view
    }else{                          // we are gonna open details
        $("#allTables").removeClass(tableBigSize);
        $("#allTables").addClass(tableSmallSize);    // Shrink table

        $("#detailsDiv").removeClass(detailsSmallSize);
        $("#detailsDiv").addClass(detailsbigSize);  // expande details view

        //$("#runningVAssets").addClass("sticky-top"); // makes the table stick to the top when scrolling down

        $("#detailsDiv").show("slow");
        DETAILS_CONTAINER_OPENED_FLAG = true;
    }
}

function loadIframe(containerName, iFrame_id, label_uri, notFound_url){

    var iFrame_default = notFound_url;

    // Find asset info
    for(let i = 0; i < assetsData.length; i++){
        // if asset is found and If label exist
        if( (assetsData[i].name === containerName) &&
            (label_uri in assetsData[i].labels)){
            iFrame_default = assetsData[i].labels[label_uri];       // get backend uri
            break;
        }
    }

    // Change iframe url
    $("#" + iFrame_id).attr("src", iFrame_default);

    // Resize iframe (it needs a time)
    setTimeout(resizeIFrameToFitContent, 100, iFrame_id);
}

function resizeIFrameToFitContent( elemt_id ) {
    var iFrame = $("#" + elemt_id);
    iFrame.height(iFrame.contents().height());  // Maybe I should define a minimum value
}