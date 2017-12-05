# FORS
Front-end-Only Resource Sharing

### USAGE
Set `allowList` in `fors-proxy.html`.

>~~var allowList = ['https://localhost:8889', 'http://localhost:8888'];~~

>var allowList = ['https://our.site.com', 'http://our.site.org'];

Put `fors-proxy.html` on their site.

Request from our site:
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
