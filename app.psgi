# -*- cperl -*-
use common::sense;
use Plack::Builder;
use Plack::Request;
use AnyMQ;

my $bus = AnyMQ->new;

builder {
    mount "/_hippie/" => builder {
        enable "+Web::Hippie";
        enable "+Web::Hippie::Pipe", bus => $bus;
        sub {
            my $env = shift;
            my $room = $env->{'hippie.args'};
            my $topic = $env->{'hippie.bus'}->topic($room);
            if ($env->{PATH_INFO} eq '/new_listener') {
                $env->{'hippie.listener'}->subscribe( $topic );
            }
            elsif ($env->{PATH_INFO} eq '/message') {
                my $msg = $env->{'hippie.message'};
                $msg->{time} = time;
                $msg->{address} = $env->{REMOTE_ADDR};
                $topic->publish($msg);
            }
            else {
                my $h = $env->{'hippie.handle'}
                    or return [ '400', [ 'Content-Type' => 'text/plain' ], [ "" ] ];

                if ($env->{PATH_INFO} eq '/error') {
                    warn "==> disconnecting $h";
                }
                else {
                    die "unknown hippie message";
                }
            }
            return [ '200', [ 'Content-Type' => 'application/hippie' ], [ "" ] ]
        };
    };

    mount "/" => builder {
        enable "Static", path => qr{^/(test|pages|images|js|css)/}, root => 'public/';
        sub {
            my $env = shift;
            my $req = Plack::Request->new($env);
            my $res = $req->new_response(200);
            $res->redirect("/pages/index.html");
            return $res->finalize;
        }
    };
};
