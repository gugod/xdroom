// Paste into firebug.

// time
timebot_interval = setInterval(function() {
    $("#nickname").text("不整點報時");
    $("#message_body").val("-----------" + new Date() + "-----------");
    $("#message_form").submit();
}, Math.radnom(1800 * 1000) + 600000);

// moretext
moretext_interval = setInterval(function() {
    $.getJSON(
        "http://more.handlino.com/sentences.json?callback=?",
        function(d) {
            $("#nickname").text("Moretext");
            $("#message_body").val(d.sentences[0]);
            $("#message_form").submit();
        }
    )
}, 120 * 1000);
