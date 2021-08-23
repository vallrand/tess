import { Application } from '../framework'
import { PostEffectPass, PostEffect } from './PostEffectPass'


export class DistortionEffect implements PostEffect {
    public enabled: boolean = true
    constructor(private readonly context: Application){
        const { gl } = this.context
    }
    apply(effectPass: PostEffectPass){
        if(!this.enabled) return
        const { gl } = this.context

        //render normal maps into separate texture 0.25 size, and then do fullscreen displacement
    }
}