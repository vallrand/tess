import { vec3 } from '../math'
import { ICamera, Transform } from '../scene'
import { IAudioNode } from './Mixer'

export class ListenerTransform {
    private readonly forward: vec3 = vec3()
    private readonly up: vec3 = vec3()
    frame: number = 0
    constructor(private readonly audio: AudioContext){}
    public update(camera: ICamera, frame: number): void {
        if(this.frame && this.frame >= camera.frame) return
        this.frame = frame

        vec3.set(camera.viewMatrix[1], camera.viewMatrix[5], camera.viewMatrix[9], this.up)
        vec3.set(camera.viewMatrix[2], camera.viewMatrix[6], camera.viewMatrix[10], this.forward)
        const { currentTime, listener } = this.audio

        listener.positionX.setValueAtTime(-camera.position[0], currentTime)
        listener.positionY.setValueAtTime(camera.position[1], currentTime)
        listener.positionZ.setValueAtTime(camera.position[2], currentTime)
        listener.upX.setValueAtTime(this.up[0], currentTime)
        listener.upY.setValueAtTime(this.up[1], currentTime)
        listener.upZ.setValueAtTime(this.up[2], currentTime)
        listener.forwardX.setValueAtTime(this.forward[0], currentTime)
        listener.forwardY.setValueAtTime(this.forward[1], currentTime)
        listener.forwardZ.setValueAtTime(this.forward[2], currentTime)
    }
}

export class AudioTransform implements IAudioNode {
    static readonly pool: AudioTransform[] = []
    constructor(private readonly audio: AudioContext, private readonly list: AudioTransform[]){}
    radius: number = 8
    frame: number = 0
    private panner: PannerNode
    transform: Transform
    private readonly position: vec3 = vec3(0,0,0)
    private readonly orientation: vec3 = vec3(1,0,0)
    public connect(destination: AudioNode): AudioNode {
        this.panner = this.audio.createPanner()
        Object.assign(this.panner, {
            panningModel: 'HRTF',
            distanceModel: 'inverse',
            refDistance: this.radius,
            maxDistance: 10000,
            rolloffFactor: 1,
            coneInnerAngle: 360,
            coneOuterAngle: 0,
            coneOuterGain: 0
        })
        this.panner.connect(destination)
        return this.panner
    }
    public delete(): void {
        const index = this.list.indexOf(this)
        if(index === this.list.length - 1) this.list.length--
        else if(index !== -1) this.list[index] = this.list.pop()
        this.panner = void this.panner.disconnect()
        this.transform = null
        AudioTransform.pool.push(this)
    }
    public update(frame: number): void {
        if(this.frame && this.frame >= this.transform.frame) return
        this.frame = frame
        const { panner, audio: { currentTime } } = this

        vec3.set(this.transform.matrix[12], this.transform.matrix[13], this.transform.matrix[14], this.position)
        panner.positionX.setValueAtTime(-this.position[0], currentTime)
        panner.positionY.setValueAtTime(this.position[1], currentTime)
        panner.positionZ.setValueAtTime(this.position[2], currentTime)
        panner.orientationX.setValueAtTime(this.orientation[0], currentTime)
        panner.orientationY.setValueAtTime(this.orientation[1], currentTime)
        panner.orientationZ.setValueAtTime(this.orientation[2], currentTime)
    }
}