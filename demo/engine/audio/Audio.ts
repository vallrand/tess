import { Application, ISystem, ILoadedData } from '../framework'
import { CameraSystem, Transform } from '../scene'
import { ListenerTransform, AudioTransform } from './Spatial'
import { IAudioClip, AudioSource } from './Source'
import { AudioMixer } from './Mixer'
import { trimAudioBuffer } from './trim'

export class AudioSystem implements ISystem {
    private readonly audio: AudioContext
    private readonly listener: ListenerTransform
    private readonly mixer: AudioMixer
    private readonly list: AudioTransform[] = []
    readonly clips: Record<string, IAudioClip> = Object.create(null)

    constructor(private readonly context: Application){
        this.audio = new AudioContext()
        this.listener = new ListenerTransform(this.audio)
        this.mixer = new AudioMixer(this.audio)
        document.addEventListener('visibilitychange', () => document.hidden ? this.audio.suspend() : this.audio.resume())
    }
    public update(): void {
        if(this.context.frame === 1) this.audio.resume()
        this.listener.update(this.context.get(CameraSystem).camera, this.context.frame)
        for(let i = this.list.length - 1; i >= 0; i--)
            this.list[i].update(this.context.frame)
    }
    public create(key: string, channel: keyof AudioMixer['channel'], transform: Transform): AudioSource {
        const source = AudioSource.pool.pop() || new AudioSource(this.audio)
        source.clip = this.clips[key]
        if(transform){
            source.transform = AudioTransform.pool.pop() || new AudioTransform(this.audio, this.list)
            source.transform.transform = transform
            this.list.push(source.transform)
        }
        source.connect(this.mixer.channel[channel].input)
        return source
    }
    public load(manifest: { buffer: string[], audio: Array<{
        key: string
        byteOffset: number
        byteLength: number
    }> }, data: ILoadedData, next: () => void): void {
        const arraybuffer = data.buffers[1]
        let remaining = manifest.audio.length
        for(let i = 0; i < manifest.audio.length; i++){
            const audio = manifest.audio[i]
            const dataView = arraybuffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength)
            this.audio.decodeAudioData(dataView, (buffer: AudioBuffer) => {
                const loop: boolean = /loop\.mp3$/.test(audio.key)
                const range = trimAudioBuffer(buffer)
                this.clips[audio.key] = {
                    buffer, offset: range[0],
                    loop: loop ? 0 : -1, duration: range[1] - range[0]
                }
                if(--remaining <= 0) next()
            })
        }
        data.buffers[1] = null
    }
}