(function($){
    function repeat(str, i) {
        if (isNaN(i) || i <= 0) return "";
        return str + repeat(str, i-1);
    }

    // pad up to n Ys before X.
    function pad(x, n, y) {
        var zeros = repeat(y, n);
        return String(zeros + x).slice(-1 * n);
    }

    function append_message(x) {
        var $m;

        x = _normalize_message_data(x);

        $m = $('<p class="message"></p>');

        $m.prependTo('#content');
        $m.text(x.body);
        $m.prepend('<span class="nickname">' + x.nickname + '</span>');
        $m.prepend('<time>' + x.time + '</time>');

        if ($(".message").size() > 100) {
            $(".message:last-child").remove();
        }
    }

    function current_time(t) {
        var t2;

        if (!t) t = new Date();
        if (!t.getHours) {
            t2 = new Date();
            t2.setTime(t);
            t = t2;
        }
        return pad(t.getHours(), 2, 0) + ':' + pad(t.getMinutes(), 2, 0);
    }

    function _normalize_message_data(x) {
        if (!x.nickname) x.nickname = "Someone";
        if (!x.time) {
            x.time = current_time();
        }
        else if (x.time.toString().match(/^\d+$/)) {
            x.time = current_time(parseInt(x.time) * 1000);
        }
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
                append_message(data);;
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
