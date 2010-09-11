if (typeof(JSON) == 'undefined') $.getScript("/js/json2.js");

(function($){
    var XDRoom;
    
    XDRoom = {
        // NEVER-ish CHANGE THESE CAPITALZIE VALUES
        BOOT_TIME: new Date(),
        IDENTIFIER: CybozuLabs.SHA1.calc(Math.random().toString() + new Date().getTime()),
        settings: {
            disable_notification: true
        },

        show_notification: function(icon, title, text) {
            if (!window.webkitNotifications) return;

            try {
                if (0 == window.webkitNotifications.checkPermission()) {
                    x = window.webkitNotifications.createNotification(icon, title, text);
                    x.ondisplay = function() {
                        setTimeout(function() {
                            x.cancel();
                        }, 3000);
                    };
                    x.show();
                }
            } catch(e) {}
        }
    };
    window.XDRoom = XDRoom;

    function repeat(str, i) {
        if (isNaN(i) || i <= 0) return "";
        return str + repeat(str, i-1);
    }

    // pad up to n Ys before X.
    function pad(x, n, y) {
        var zeros = repeat(y, n);
        return String(zeros + x).slice(-1 * n);
    }

    function build_message(x) {
        var $m;
        x = _normalize_message_data(x);

        $m = $('<p class="message"></p>');
        $m.text(x.body);
        $m.prepend('<span class="nickname">' + x.nickname + '</span>');
        $m.prepend('<time>' + x.time + '</time>');

        return $m;
    }

    function build_action_message(x) {
        var $m;
        x = _normalize_message_data(x);

        $m = $('<p class="message action"></p>');
        $m.text(x.verb + (x.target ? (' '+x.target) : ''));
        $m.prepend('<span class="nickname">' + x.nickname + '</span>');
        $m.prepend('<time>' + x.time + '</time>');

        return $m;
    }

    function append_message($m) {
        var sha1 = CybozuLabs.SHA1.calc($m.html());
        if ($(".message[sha1=" + sha1 + "]").size() > 0) {
            return false;
        }

        $m.attr("sha1", sha1);
        $m.prependTo('#content');
        return true
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

    function nickname(new_nickname) {
        var n;

        if (new_nickname) {
            n = $("#nickname").val();
            $("#nickname").attr("old-value", n).val(new_nickname);
            return n;
        }

        return $("#nickname").val();
    }

    function hippie_woopie() {
        var timer_update;

        var hpipe = window.hpipe = new Hippie.Pipe();
        hpipe.args = "arena";

        var status = $('#connection-status');
        $(hpipe)
            .bind("ready", function () {
                if (new Date() - XDRoom.BOOT_TIME < 3000) {
                    $(document.body).trigger("xdroom-joined");
                }
            })
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
                var m = build_message(data);
                if (append_message(m))
                    $(document.body).trigger("xdroom-message-says", [data, m]);
            })
            .bind("message.action", function (e, data) {
                var m = build_action_message(data);
                append_message(m);
            });
        

        $("#message_form").bind("submit", function(e) {
            var matched, b = $("input[name=message_body]").val();
            e.preventDefault();
            if (b.match(/^\s*$/)) return false;

            if (matched = b.match(/^\/nick\s+([\s\S]+)$/)) {
                var old_nickname = nickname();
                nickname(matched[1]);
                $.cookie("xdroom_nickname", nickname(), { path: '/', expires: 365 });
                $(document.body).trigger("xdroom-nickname-changed", [ old_nickname ]);
            }
            else {
                hpipe.send({'__client': XDRoom.IDENTIFIER, 'type': 'says', 'body':  b, 'nickname': nickname() });
            }

            $(this).find("input[name=message_body]").val("");
            return false;
        });

        hpipe.init();
    }

    $(function() {
        var n;

        if (n = $.cookie("xdroom_nickname")) {
            nickname(n);
            $("#nickname").attr("old-value", n);
        }

        $("#nickname").bind("change", function(e) {
            var old_nickname = $(this).attr("old-value");
            $("input[name=message_body]").focus();
            $.cookie("xdroom_nickname", nickname(), { path: '/', expires: 365 });
            $(document.body).trigger("xdroom-nickname-changed", [ old_nickname ]);
            return false;
        });

        if (window.webkitNotifications) {
            if (window.webkitNotifications.checkPermission() == 0 && !XDRoom.settings.disable_notification) {
                $("button#enable-notification").hide();
            }
            else {
                $("button#disable-notification").hide();
            }

            $("button#enable-notification").bind("click", function() {
                var button = this;
                var permission = window.webkitNotifications.checkPermission();
                if (permission != 0) {
                    window.webkitNotifications.requestPermission(function() {
                        $(button).text("Done!").hide('slow!');
                        setTimeout(function() {
                            $(button).text("Disable Notification");
                        }, 500);

                        XDRoom.settings.disable_notification = false;
                        $("#message_body").focus();
                    });
                }
                else {
                    $("button#disable-notification").show();
                    $("button#enable-notification").hide();
                    XDRoom.settings.disable_notification = false;
                }
                $("#message_body").focus();
                return false;
            });

            $("button#disable-notification").bind("click", function() {
                XDRoom.settings.disable_notification = true;
                $("button#disable-notification").hide();
                $("button#enable-notification").show();
                return false;
            });
        }
        else {
            $("button#enable-notification").remove();
            $("button#disable-notification").remove();
        }

        $(document.body)
            .bind("xdroom-joined", function() {
                hpipe.send({'type':'action', 'nickname': nickname(), 'verb':'joined'});
            })
            .bind("xdroom-nickname-changed", function(e, old_nickname) {
                hpipe.send({'type':'action', 'nickname': old_nickname, 'verb':'renamed to', 'target': nickname()});
            })
            .bind("xdroom-message-says", function(e, message_data, $m) {
                if (new Date() - XDRoom.BOOT_TIME < 3000
                    || XDRoom.settings.disable_notification
                    || message_data.__client == XDRoom.IDENTIFIER) return;

                XDRoom.show_notification(
                    "/images/opmsg48x48.jpg",
                    message_data.nickname + " says",
                    message_data.body
                );
            });

        $(window).bind("unload", function() {
            hpipe.send({'type':'action', 'nickname': nickname(), 'verb':'leaved'});
        });

        hippie_woopie();

        $("input[name=message_body]").focus();
    });
}(jQuery));
