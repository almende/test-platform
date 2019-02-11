function postConfig (config) {
  var xhr = new XMLHttpRequest()

  xhr.open('POST', '/config/')
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.onload = function () {
    if (xhr.status === 200) {
      location.reload()
    }
    else if (xhr.status !== 200) {
      alert('Request failed.  Returned status of ' + xhr.status)
    }
  }
  xhr.send(JSON.stringify(config))
}
