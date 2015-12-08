
app.filter('timestamp', function(){
    return function(input){
        var t = new Date(input);
        return t.getTime();
    }
});

