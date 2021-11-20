import { clamp } from '../math'
import { IAudioNode } from './Mixer'
import { AudioTransform } from './Spatial'

export interface IAudioClip {
    buffer: AudioBuffer
    offset: number
    duration: number
    loop: number
}

export class AudioSource implements IAudioNode {
    static readonly pool: AudioSource[] = []
    constructor(private readonly audio: AudioContext){}
    private source: AudioBufferSourceNode
    private gain: GainNode
    transform: AudioTransform
    clip: IAudioClip
    public play(delay: number, rate: number = 1): void {
        if(this.source) throw new Error(`audio.source!=null`)
        this.source = this.audio.createBufferSource()
        this.source.buffer = this.clip.buffer
        this.source.loop = this.clip.loop >= 0
        this.source.loopStart = this.clip.offset + this.clip.loop
        this.source.loopEnd = this.clip.offset + this.clip.duration
        this.source.playbackRate.setValueAtTime(rate, this.audio.currentTime)
        this.source.onended = this.end
        this.source.connect(this.gain)
        this.source.start(this.audio.currentTime + delay, this.clip.offset, this.source.loop ? undefined : this.clip.duration)
    }
    private end = (event: Event) => {
        if(this.source !== event.target) return
        this.source = null
        this.delete()
    }
    public stop(delay: number): void {
        this.source.stop(this.audio.currentTime + delay)
    }
    public volume(delay: number, value: number): this {
        value = clamp(value, this.gain.gain.minValue, this.gain.gain.maxValue)
        if(delay) this.gain.gain.linearRampToValueAtTime(value, this.audio.currentTime + delay)
        else this.gain.gain.setValueAtTime(value, this.audio.currentTime)
        return this
    }
    public connect(destination: AudioNode): AudioNode {
        if(this.transform) destination = this.transform.connect(destination)
        this.gain = this.audio.createGain()
        this.gain.connect(destination)
        return this.gain
    }
    public delete(): void {
        this.gain.gain.cancelScheduledValues(0)
        if(this.transform) this.transform = void this.transform.delete()
        this.gain = void this.gain.disconnect()
        if(this.source) this.source = void this.source.disconnect()
        AudioSource.pool.push(this)
    }
}