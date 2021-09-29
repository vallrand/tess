import { clamp, vec2, vec3, vec4, quat, ease } from '../math'
import { Line } from '../components'
import { IAnimationTween, IAnimationTrigger } from './Animation'
import { Transform } from './Transform'

export function FollowPath(tween: IAnimationTween<vec3>): IAnimationTrigger<Transform> {
    const position = vec3(), normal = vec3()
    return function(elapsedTime: number, deltaTime: number, target: Transform){
        tween(elapsedTime, position)
        vec3.subtract(position, target.position, normal)
        vec3.normalize(normal, normal)
        quat.fromNormal(normal, vec3.AXIS_Y, target.rotation)
        quat.normalize(target.rotation, target.rotation)
        vec3.copy(position, target.position)
        target.frame = 0
    }
}

FollowPath.Line = function FollowPathLine(tween: IAnimationTween<vec3>, options: {
    length: number
}): IAnimationTrigger<Line> {
    return function(elapsedTime: number, deltaTime: number, target: Line){
        for(let i = target.path.length - 1; i >= 0; i--)
            tween(elapsedTime - i * options.length, target.path[i])
        target.frame = 0
    }
}

//TODO move AnimationProperty.vec3 ? elsewhere?
FollowPath.separate = (
    x: IAnimationTween<number>, y: IAnimationTween<number>, z: IAnimationTween<number>
): IAnimationTween<vec3> => function(elapsedTime: number, out: vec3): vec3 {
    out[0] = x(elapsedTime, out[0])
    out[1] = y(elapsedTime, out[1])
    out[2] = z(elapsedTime, out[2])
    return out
}

FollowPath.curve = (sampler: (time: number, out: vec3) => vec3, options: {
    frame: number
    ease: ease.IEase
    duration: number
}): IAnimationTween<vec3> => function(time: number, out: vec3): vec3 {
    time = clamp((time - options.frame) / options.duration, 0, 1)
    return sampler(options.ease(time), out)
}

FollowPath.spline = (path: vec3[], frames: number[], options: {
    ease: ease.IEase
    tension?: number
}): IAnimationTween<vec3> => {
    const start = frames[0], duration = frames[frames.length - 1] - start
    const positions = frames.map(frame => (frame - start) / duration)
    const curveX = ease.Spline(path.map(value => value[0]), positions, 3, options.tension)
    const curveY = ease.Spline(path.map(value => value[1]), positions, 3, options.tension)
    const curveZ = ease.Spline(path.map(value => value[2]), positions, 3, options.tension)
    return function(elapsedTime: number, out: vec3): vec3 {
        const time = options.ease(clamp((elapsedTime - start) / duration, 0, 1))
        vec3.set(curveX(time), curveY(time), curveZ(time), out)
        return out
    }
}