import { clamp } from '../math'

export interface IAudioNode {
    connect(node: AudioNode): AudioNode
    delete(): void
}

class AudioChannel implements IAudioNode {
    compressor: DynamicsCompressorNode
    private gain: GainNode
    constructor(private readonly audio: AudioContext){
        this.gain = this.audio.createGain()
    }
    get input(): AudioNode { return this.compressor || this.gain }
    createCompressor(options: {
        threshold: number
        knee: number
        ratio: number
        attack: number
        release: number
    }): this {
        this.compressor = this.audio.createDynamicsCompressor()
        this.compressor.threshold.value = options.threshold
        this.compressor.knee.value = options.knee
        this.compressor.ratio.value = options.ratio
        this.compressor.attack.value = options.attack
        this.compressor.release.value = options.release
        return this
    }
    volume(delay: number, value: number): this {
        value = clamp(value, this.gain.gain.minValue, this.gain.gain.maxValue)
        if(delay) this.gain.gain.linearRampToValueAtTime(value, this.audio.currentTime + delay)
        else this.gain.gain.setValueAtTime(value, this.audio.currentTime)
        return this
    }
    connect(destination: AudioNode): AudioNode {
        this.gain.connect(destination)
        if(!this.compressor) return this.gain
        this.compressor.connect(this.gain)
        return this.compressor
    }
    delete(){
        this.compressor = void this.compressor.disconnect()
        this.gain = void this.gain.disconnect()
    }
}

export class AudioMixer {
    readonly channel: {
        sfx: AudioChannel
        music: AudioChannel
    }
    constructor(private readonly audio: AudioContext){
        this.channel = {
            music: new AudioChannel(this.audio).volume(0, 0.5),
            sfx: new AudioChannel(this.audio).volume(0, 0.5).createCompressor({
                threshold: -24,
                knee: 30,
                ratio: 12,
                attack: 0.003,
                release: 0.25
            })
        }
        for(let key in this.channel) this.channel[key].connect(this.audio.destination)
    }
}