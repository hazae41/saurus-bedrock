import zlib from "zlib";
import net from "net"
import dgram from "dgram"

const args = process.argv.slice(2)
const port = Number(args[0])

const zip = (buffer) => zlib.deflateSync(buffer)
const unzip = (buffer) => zlib.inflateSync(buffer);

function handle(method, buffer) {
    if (method === 0) return zip(buffer)
    if (method === 1) return unzip(buffer)
    if (method === 2) process.exit()
}

net.createServer((socket) => {
    socket.on("data", data => {
        try {
            const method = data[0]
            const buffer = data.slice(1)
            const result = handle(method, buffer)
            socket.write(result);
        } catch (e) {
            console.log(e.message)
        }
        socket.destroy();
    });
}).listen(port)