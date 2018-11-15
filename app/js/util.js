
//写cookies 
function setCookie(name, value) {
    var days = 1;
    var exp = new Date();
    exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";path=/;expires=" + exp.toGMTString();
}

//读取cookies 
function readCookie(name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg)) {
        return unescape(arr[2]);
    } else {
        return null;
    }

}

//删除cookies 
function delCookie(name) {
    var cval = readCookie(name);
    if (cval != null) {
        document.cookie = name + "=;path=/;expires=" + (new Date(0)).toGMTString();
    }
}