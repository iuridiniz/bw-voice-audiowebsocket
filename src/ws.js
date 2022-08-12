import { WebSocketServer } from 'ws'
import chalk from 'chalk'

export const createWebSocketServer = async http => {
    return new Promise((resolve, reject) => {
        try {
            const server = new WebSocketServer({ server: http, clientTracking: true })
            server.on('listening', () => {
                console.log(chalk.dim.gray(`WebSocket listening at port ${http.address().port}`))
                resolve(server)
            })
        } catch (e) {
            reject(e)
        }
    })
}