prolog = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>';
var parser = new DOMParser();
XmlStr = prolog + "<bookz/>";
var xmlz  = parser.parseFromString(XmlStr, "application/xml");
console.log(window.btoa((new XMLSerializer()).serializeToString(xmlz)));