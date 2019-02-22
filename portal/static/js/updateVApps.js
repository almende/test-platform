/**
 * Created by luis on 27-9-18.
 */


  // GLOBAL VARIABLES
var UPDATE_VAPPS_TIME = 3000; // timer to update the list of vApps
var assetsData = []; // holds data of assets when requested from executionservices/assets

$(document).ready(function(){

  // Modal vApp description
  $('#vAppsDescriptionModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var vAppName = button.data('vappname') // Extract info from data-* attributes

    // Find data of vAppName
    var vAppFoundFlag = false;
    for(let i = 0; i < assetsData.length; i++){
      var vApp = assetsData[i];
      if(assetsData[i].id === vAppName){
        vAppFoundFlag = true;
        break; // here we have the vApp data
      }
    }

    // Update the modal's content.
    var modal = $(this);
    modal.find('#modalTitle').text(vAppName); // update title
    modal.find('#modalOpenLink').prop("href", "http://localhost/" + vAppName); // update open vApp link

    // If vApp data found
    if(vAppFoundFlag){

      // If description available then print it
      if( ('vf-OS.description' in vApp.labels) && (vApp.labels['vf-OS.description'] !== "") ){
        modal.find('#modalDescription').text(vApp.labels['vf-OS.description']);
      } else {
        modal.find('#modalDescription').text("Description not found!");
      }

    } else { // it shouldn't happen
      modal.find('#modalDescription').text("Data not found!");
    }

  });

  // Modal vApp clean up when closed
  $('#vAppsDescriptionModal').on('hide.bs.modal', function (event) {
    // Update the modal's content.
    var modal = $(this);
    modal.find('#modalTitle').text(" ");
    modal.find('#modalDescription').text(" ");
  });

}); // End of ready


function showBackgroundError(image){
  $(image).closest(".iconHolder").css("background-image", 'url("/img/notFoundIcon.png")');
}

function updateInstalledVApps () {

  // Make the correlation between ContainerName and AssetName
  var urlAssets = '/executionservices/assets'; // Request data to executionManager (executionservices)
  $.get(urlAssets, function (data, status) {

    if(!("error" in data)){

      // save data to global variable (Modal vApp description is using it)
      assetsData = data;


      // ---  remove cards that are not included in the new data ---
      var idFlag = false;
      var cards = $("#cardsHolder").children(); // get all current cards on cardsHolder
      for(let i = 0; i < cards.length; i++){

        var cardID = $(cards[i]).attr("id");

        idFlag = false; // reset flag
        for(let k = 0; k < data.length; k++){

          // If it finds the related ID
          if(cardID === data[k].id){
            idFlag = true;    // flag up
            break;  // leave the loop
          }
        }

        // If id not found then remove card
        if(idFlag == false){
          $("#" + cardID).remove();
        }

      }

      //--------------------------------------------------------------

      // ---- Run through data to add the new vApps templates --------

      var idFlag = false;
      var newTemplates = '';
      for(let i = 0; i < data.length; i++){
        var dataID = data[i].id; // get single data element id

        idFlag = false;
        for(let k = 0; k<cards.length; k++){

          // if it finds the match with a card
          if(dataID === $(cards[k]).attr("id") ){
            idFlag = true;
            break; // pass to next element id;
          }
        }

        // If vAsset is not on the list then create it
        if(idFlag==false){
          // add new template
          newTemplates+=createNewCardTemplate(data[i]);
        }

      }

      // add new templates to cardsHolder
      $('#cardsHolder').append(newTemplates);

      //--------------------------------------------------------------


    } else {
      console.log("ERROR: /assets returned an error!")
    }
  });

}



function createNewCardTemplate(vApp){
  var vApp_name  = vApp.id,
      vApp_link   = "http://localhost/" + vApp_name,
      vApp_icon   = "http://localhost/" + vApp_name + "/" + vApp.labels['vf-OS.iconHDUri'];

  var rowTemplate =
    '<div id="'+ vApp_name + '" class="card card-sizes">' +
      '<div class="h-75 iconHolder">' +
        '<a class="" href="'+ vApp_link + '" target="_blank">' +

          '<img class="icon" src="' + vApp_icon + '" onerror="showBackgroundError(this)" alt="">' +

        '</a>' +
      '</div>' +
      '<div class="card-body h-25 py-0">' +
        '<div class="d-flex">' +
          '<p class="" style="margin-bottom: auto;overflow: hidden;">' + vApp_name + '</p>' +
          '<div class="ml-auto">' +
            '<a data-toggle="modal" href="#vAppsDescriptionModal" data-vappname="' + vApp_name + '"><i class="fas fa-info-circle"></i></a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';


  return rowTemplate;
}

