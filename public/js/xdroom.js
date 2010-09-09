(function($){
    function append_message(x) {
        $('<p class="message"></p>').text(x).prependTo('#content');
    }

    function _normalize_message_data(x) {
        if (!x.nickname) x.nickname = "Someone";
        return x;
    }

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
                var x = _normalize_message_data(data);

                append_message(x.nickname + ": " + x.body);
            });
        

        $("#message_form").bind("submit", function(e) {
            var b = $("input[name=message_body]").val(), n = $("#nickname").text();

            if (!b.match(/^\s*$/)) {
                hpipe.send({'type': 'says', 'body':  b, 'nickname': n });

                $(this).find("input[name=message_body]").val("");
            }

            e.preventDefault();
            return false;
        });

        hpipe.init();
    }

    $(function() {
        hippie_woopie();

        $("input[name=message_body]").focus();
        $("#nickname").bind("click", function() {
            $(this).text(prompt("Change nickname", $(this).text()));
            $("input[name=message_body]").focus();
            $("p.nickname-hint").remove();
            return false;
        });
    });
}(jQuery));
