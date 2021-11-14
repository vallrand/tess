import { Application } from '../../../engine/framework'
import { vec2, vec4 } from '../../../engine/math'
import { AnimationSystem, ActionSignal, PropertyAnimation, ease } from '../../../engine/animation'
import { Sprite2D, Transform2D } from '../../../engine/components'
import { OverlayPass } from '../../../engine/pipeline'
import { SharedSystem } from '../../shared'

export class FadeEffect {
    static create(context: Application, duration: number): void {
        context.get(AnimationSystem).start(FadeEffect.fade(context, duration), false)
    }
    private static *fade(context: Application, duration: number): Generator<ActionSignal> {
        const overlay = context.get(OverlayPass)
        const black = Sprite2D.create(16)
        black.transform = Transform2D.create(vec2.ZERO, [ context.canvas.width, context.canvas.height ])
        black.material = SharedSystem.materials.sprite.fade
        overlay.list2d.push(black)
    
        const animate = PropertyAnimation([
            { frame: 0, value: [0,0,0,1] },
            { frame: duration, value: vec4.ZERO, ease: ease.sineIn }
        ], vec4.lerp)
    
        for(const startTime = context.currentTime; true;){
            const elapsedTime = context.currentTime - startTime
            animate(elapsedTime, black.color)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    
        overlay.list2d.splice(overlay.list2d.indexOf(black), 1)
        Transform2D.delete(black.transform)
        Sprite2D.delete(black)
    }
}