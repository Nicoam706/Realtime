const ws = require("ws");

const server = new ws.WebSocketServer({port:8080}, ()=>{
    console.log("Servidor iniciado en el puerto 8080: ");
});

//Datos del jugador y fruta
var jugadores = new Map();  //Guardo:  conexión, datos = datos del jugador
var siguienteId = 0;

// Datos de la fruta (posición aleatoria)
var fruta = {posx: Math.floor(Math.random()*480), posy: Math.floor(Math.random()*480)};

server.addListener("connection", (conexionJugador)=>{
    console.log("Alguien se ha conectado");

    //Crear nuevo jugador con color diferente
    const colores = ["red","blue","purple","orange","brown","gray","cyan","pink"];
    datos = {
        id: siguienteId,
        posx: Math.floor(Math.random()*480),
        posy: Math.floor(Math.random()*480),
        dir: "0",
        puntos: 0,
        color: colores[siguienteId % colores.length]
    };

    siguienteId++;   //para que la siguiente conexion tenga otro id
    jugadores.set(conexionJugador, datos);

    //Avisar a los demás que alguien ha entrado
    jugadores.forEach((d,c)=>{
        c.send(JSON.stringify({tipo:"new", datos:datos}));
    });

    //Enviar la fruta actual
    conexionJugador.send(JSON.stringify({tipo:"fruta", datos: fruta}));

    //avisar al nuevo, que todos los jugadores ya existian antes
    jugadores.forEach((d, c)=>{
        if(c!=conexionJugador){     //solo al resto de jugadores (ignorarte)
            conexionJugador.send(JSON.stringify({tipo:"new", datos:d}));
        }
    });

    conexionJugador.addEventListener("close", ()=>{
        console.log("Alguien se ha desconectado");

        //Quien se ha desconectado?
        var datosDisconectPlayer = jugadores.get(conexionJugador);

        //Eliminarlo de la lista
        jugadores.delete(conexionJugador);

        //Avisar a los demás que alguien ha salido
        jugadores.forEach((d,c)=>{
            c.send(
                JSON.stringify({
                    tipo:"delete",
                    datos:datosDisconectPlayer.id
                })
            );
        });
    });

    conexionJugador.addEventListener("message", (m)=>{
        mensaje = JSON.parse(m.data.toString());
        if(mensaje.tipo == "mover"){
            var datosDelJugador = jugadores.get(conexionJugador);
            // Mezcla los nuevos datos con los existentes
            datosDelJugador.dir = mensaje.datos.dir;
            datosDelJugador.posx = parseInt(mensaje.datos.posx);
            datosDelJugador.posy = parseInt(mensaje.datos.posy);

            //Comprobar si hay colisión con la fruta
            if (Math.abs(datosDelJugador.posx-fruta.posx) < 25 && Math.abs(datosDelJugador.posy-fruta.posy) < 25){
                datosDelJugador.puntos++;
                fruta = {posx: Math.floor(Math.random()*480), posy: Math.floor(Math.random()*480)};
                //Avisar a todos del nuevo punto y nueva fruta
                jugadores.forEach((d,c)=>{
                    c.send(JSON.stringify({tipo:"puntos", datos:{id: datosDelJugador.id, puntos: datosDelJugador.puntos}}));
                    c.send(JSON.stringify({tipo:"fruta", datos: fruta}));
                });
            }

            //guardo la info actualizada
            jugadores.set(conexionJugador, datosDelJugador);

            //informar a todos el nuevo movimiento
            jugadores.forEach((d, c)=>{
                c.send(JSON.stringify({tipo:"mover", datos:datosDelJugador}));
            });
        }
    });
});
