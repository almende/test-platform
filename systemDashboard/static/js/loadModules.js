/**
 * Created by luis on 2-8-18.
 */

$(document).ready(function(){
    //load_app();
});

function load_app() {

    var page   = 'apps/appRadar/index.html';
    var content_div = document.getElementById('containerDetails_app');

    $(content_div).load(page);

}
