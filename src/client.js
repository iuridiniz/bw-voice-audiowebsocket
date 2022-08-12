export default class Client {

    constructor(ws) {
        ws.on('message', this.handleMessage)
        ws.on('close', () => this.close())
        this.stop = false
    }

    handleMessage = buffer => {
        const event = JSON.parse(buffer.toString('utf-8'))
        switch (event.eventType) {
            case 'start': this.start(event); break
            case 'media': this.append(event); break
            case 'stop': this.stop = true; break
        }
    }

    start = event => {
        this.callId = event.metadata.callId
        this.name = event.metadata.streamName
        this.tracks = event.metadata.tracks.map(track => track.name)
        this.media = this.tracks.reduce((result, track) => {
            result[track] = Buffer.alloc(0)
            return result
        }, {})
        if (this.onStart) this.onClose = this.onStart()
    }

    append = event => {
        if (event.track in this.media) {
            this.media[event.track] = Buffer.concat([
                this.media[event.track],
                Buffer.from(event.payload, 'base64')
            ])
        } else {
            this.media[event.track] = Buffer.from(event.payload, 'base64')
        }
    }

    close = () => {
        if (this.media) {
            if (this.onClose) this.onClose()
            delete this.callId
            delete this.media
        }
    }

    onStart = (onStart) => {
        this.onStart = onStart
    }
}