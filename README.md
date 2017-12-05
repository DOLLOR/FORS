# FORS
Front-end-Only Resource Sharing

### USAGE
Set `allowList` in `fors-proxy.html`.

~~var allowList = ['https://localhost:8889', 'http://localhost:8888'];~~

`var allowList = ['https://our.site.com', 'http://our.site.org'];`

Put `fors-proxy.html` on **their site**.

Now request from our site:
```javascript
fors.fRequest({
  proxy:'http://their.site:8888/path/to/fors-proxy.html?s='
    + encodeURIComponent('http://any.site/path/to/fors.js'),
  url:'/api/on/their/site.xml',
  headers:{testHeader:+new Date()},
  xhrProp:{timeout:15000},
},function(result){
  console.log(result);
});
```

### API
```javascript
/**
 * fRequest
 * @param {Object} option - request option
 * @param {String} option.proxy - fors-proxy.html file url
 * @param {Boolean} option.once - the iframe will be removed after request if true
 * @param {String} option.url - target url, from which you want to request data
 * @param {String} option.method - GET, POST, or one of  other methods
 * @param {Boolean} option.isAsync - this value will pass to xhr.open() async argument
 * @param {Object} option.data - request body
 * @param {Object} option.xhrProp - other props that will past to xhr object
 * @param {Object} option.headers - request headers
 * @param {(headers,response,responseText,responseType,responseURL,status,statusText)=>} callback - callback for result
 */
```
