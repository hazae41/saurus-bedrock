import zlib from "zlib";
import net from "net"
import dgram from "dgram"
import crypto from "crypto"

const _mojang = "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAE8ELkixyLcwlZryUQcu1TvPOmI2B7vX83ndnWRUaXm74wFfa5f/lwQNTfrLVHa2PmenpGI6JhIMUJaWZrjmMj90NoKNFSNBuKdm8rYiXsfaz3K36x/1U26HpG0ZxK/V1V"

const args = process.argv.slice(2)
const port = Number(args[0])

const mojang = crypto.createPublicKey({
    key: Buffer.from(_mojang, "base64"),
    format: "der",
    type: "spki"
})

const encode = (text) => new TextEncoder().encode(text)
const decode = (buffer) => new TextDecoder().decode(text)

const zip = (buffer) => zlib.deflateSync(buffer)
const unzip = (buffer) => zlib.inflateSync(buffer);

const gen = (buffer) => {
    const options = { namedCurve: "secp384r1" }
    const keypair = crypto.generateKeyPairSync("ec", options)
    const { publicKey, privateKey } = keypair
    const pub = publicKey.export({ type: "spki", format: "pem" })
    const priv = privateKey.export({ type: "pkcs8", format: "pem" })
    return new UInt8Array([...encode(pub), ...encode(priv)])
}

function handle(method, buffer) {
    if (method === 0) return zip(buffer)
    if (method === 1) return unzip(buffer)
    if (method === 2) return gen()
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