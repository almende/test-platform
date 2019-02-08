function postConfig (config) {
  var xhr = new XMLHttpRequest()

  xhr.open('POST', '/config/')
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.onload = function () {
    if (xhr.status === 200 && xhr.responseText !== 'ok') {
      alert('Something went wrong.  Response is:' + xhr.responseText)
    }
    else if (xhr.status !== 200) {
      alert('Request failed.  Returned status of ' + xhr.status)
    }
  }
  xhr.send(JSON.stringify(config))
}
