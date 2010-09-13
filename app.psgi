# -*- cperl -*-
# vim:filetype=perl:et:
package XDMeta;
use Moose;

has clients => ( is => 'rw' , 
    isa => 'HashRef' , 
    traits => [ 'Hash' ],
    default => sub { +{  } },
    handles => {
        set_client => 'set',
        get_client => 'get',
        remove_client => 'delete',
    }
);

sub get_client_list {
    my $self = shift;

    return [ map { {
        nickname => $_->{nickname},
        time     => $_->{time},
    } } values %{ $self->clients } ];
}

package main;
use Moose;
use Plack::Builder;
use Plack::Request;
use constant debug => 1;

use AnyMQ;
use AnyMQ::Topic;
use Acme::Lingua::ZH::Remix;

use HTML::Entities;
my $meta = XDMeta->new;
my $bus = AnyMQ->new;
my $topic = AnyMQ::Topic->with_traits('WithBacklog')->new(backlog_length => 90, bus => $bus);

my $x = Acme::Lingua::ZH::Remix->new;

$topic->publish({
    nickname => 'xdroot',
    type => 'says',
    body => "Welcome to xdroom.",
    time => time
});

$bus->topics->{"arena"} = $topic;

sub dispatch_verb {
    my ( $topic, $msg ) = @_;

    my $verb = $msg->{verb};
    if( $verb eq 'joined' || $verb eq 'renamed to' ) {
        $meta->set_client( $msg->{address} , $msg );
    }
    elsif( $verb eq 'leaved' ) {
        $meta->remove_client( $msg->{address} );
    }

    if( $verb eq 'joined' 
        || $verb eq 'leaved'
        || $verb eq 'renamed to'
    ) {
        my $list = $meta->get_client_list();
        $topic->publish({
            type => 'data',
            clientlist => $list,
        });
    }
}

sub is_illeagal_message {
    my $msg = shift;
    return $msg->{body} =~ m{<.*?(script|iframe)}ig;
}


builder {
    enable_if { $_[0]->{REMOTE_ADDR} eq '127.0.0.1' } "Plack::Middleware::ReverseProxy";

    mount "/_hippie/" => builder {
        enable "+Web::Hippie";
        enable "+Web::Hippie::Pipe", bus => $bus;
        sub {
            my $env = shift;
            my $request = Plack::Request->new($env);

            my $room = $env->{'hippie.args'};
            my $topic = $env->{'hippie.bus'}->topic($room);
            if ($env->{PATH_INFO} eq '/new_listener') {
                $env->{'hippie.listener'}->subscribe( $topic );
            }
            elsif ($env->{PATH_INFO} eq '/message') {
                my $msg = $env->{'hippie.message'};
                $msg->{time} = time;
                $msg->{address} = ($request->cookies->{xdroom_nickname}||'Someone') . $request->address;

                # XXX: sorry i mess it up. XD

                dispatch_verb($topic,$msg) if defined $msg->{verb};

                if( defined $msg->{body} && is_illeagal_message( $msg ) )  {
                    $msg->{body} = $x->random_sentence . '(' .  encode_entities( $msg->{body} ) . ')';
                }

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
