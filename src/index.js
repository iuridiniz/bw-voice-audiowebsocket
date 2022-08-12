import Client from './client.js'
import alawmulaw from 'alawmulaw'
import chalk from 'chalk'
import fs from 'fs'
import { createHttpServer } from './http.js'
import { createWebSocketServer } from './ws.js'
const mulaw = alawmulaw.mulaw

const port = parseInt(process.argv[2])
const http = await createHttpServer(port)
const wss = await createWebSocketServer(http)
const stdin = process.stdin
const stdout = process.stdout

stdin.setRawMode(true)
stdin.resume()
stdin.setEncoding('utf8')
stdin.on('data', function (key) {
    switch (key) {
        case '\u0003':
        case 'q':
            console.log()
            process.exit(0)
        case 'c':
            wss.clients.forEach(ws => ws.close(1000))
    }
})
console.log(chalk.yellow('[c]'), 'Close active websocket')
console.log(chalk.yellow('[q]'), 'Quit')
console.log()

wss.on('connection', ws => {
    if (wss.clients.gaugeSize > 1) {
        ws.close()
        return
    }
    const client = new Client(ws)
    client.onStart(() => {
        console.log(chalk.yellowBright('Stream:'), client.name)
        const timer = setInterval(() => printClient(client), 100)
        return () => {
            clearInterval(timer)
            finalizeClient(client)
        }
    })
})

const finalizeClient = (client) => {
    stdout.write(client.stop ? chalk.green(' STOP\n\n') : chalk.yellow(' CLOSE\n\n'))
    Object.entries(client.media).forEach(([track, media]) => {
        const now = new Date().toISOString()
            .replaceAll(/[-:.]/g, '')
            .replaceAll('T', '-')
        const fileName = `wav/${port}-${client.name}-${track}-${now}.wav`

        const header = Buffer.alloc(44)
        header.write('RIFF', 0, 'utf-8')
        header.writeUInt32LE(media.length + 44 - 8, 4)
        header.write('WAVE', 8, 'utf-8')
        header.write('fmt ', 12, 'utf-8')
        header.writeUInt32LE(16, 16)
        header.writeUInt16LE(7, 20)
        header.writeUInt16LE(1, 22)
        header.writeUInt32LE(8000, 24)
        header.writeUInt32LE(8000, 28)
        header.writeUInt16LE(1, 32)
        header.writeUInt16LE(8, 34)
        header.write('data', 36, 'utf-8')
        header.writeUInt32LE(media.length, 40)
        fs.writeFileSync(fileName, Buffer.concat([header, media]))
    })
}

const printClient = (client) => {
    if (client.callId) {
        stdout.write('\r')
        stdout.write(Object.entries(client.media)
            .map(([track, media]) => chalk.bgGray(` ${track} `) + mediaGauge(media.slice(-5), 20))
            .join(' '))
    }
}

const mediaGauge = (media, gaugeSize) => {
    if (!media || media.length === 0) return chalk.bgGray(' '.repeat(gaugeSize))

    const level = Array
        .from(mulaw.decode(media))
        .reduce((sum, l) => sum + Math.abs(l), 0) / media.length / 8031
    const gaugeLevel = Math.min(Math.ceil(level * gaugeSize), gaugeSize)
    return chalk.bgGreenBright(' '.repeat(gaugeLevel)) + chalk.bgRgb(0, 64, 0)(' '.repeat(gaugeSize - gaugeLevel))
}