(function($){
    function hippie_woopie() {
        var timer_update;

        hpipe = new Hippie.Pipe();
        hpipe.args = "arena";

        var status = $('#connection-status');
        $(hpipe)
            .bind("connected", function () {
                status.addClass("connected").text("Connected");
                if(timer_update) clearTimeout(timer_update);
            })
            .bind("disconnected", function() {
                status.removeClass("connected").text("Server disconnected. ");
            })
            .bind("reconnecting", function(e, data) {
                var retry = new Date(new Date().getTime()+data.after*1000);
                var try_now = $('<span/>').text("Try now").click(data.try_now);
                var timer = $('<span/>');
                var do_timer_update = function() {
                    timer.text( Math.ceil((retry - new Date())/1000) + "s. " )
                    timer_update = window.setTimeout( do_timer_update, 1000);
                };
                status.text("Server disconnected.  retry in ").append(timer).append(try_now);
                do_timer_update();
            })
            .bind("message.says", function (e, data) {
                try {
                    var x = (data.nickname || "Someone") + (data.verb || ": " ) + data.body;
                    $('#content').prepend('<p class="message">' + x + '</p>');
                } catch(e) {
                    if (console) console.log(e)
                };
            });
        

        $("#message_form").bind("submit", function(e) {
            var b = $("input[name=message_body]").val(), n = $("input[name=nickname]").val();

            if (!b.match(/^\s*$/)) {
                hpipe.send({'type': 'says', 'body':  b });

                $(this).find("input[name=message_body]").val("");
            }

            e.preventDefault();
            return false;
        });

        hpipe.init();
    }

    $(function() {
        $("input[name=message_body]").focus();
        hippie_woopie();
    });
}(jQuery));
