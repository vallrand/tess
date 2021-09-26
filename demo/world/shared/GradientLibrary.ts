import { Application } from '../../engine/framework'
import { GradientRamp } from '../../engine/particles'

export function GradientLibrary(context: Application){

    return {
        yellowViolet: GradientRamp(context.gl, [
            0xffffff00, 0xfffcd600, 0xf0eba800, 0xc2bd7430, 0xa60f5050, 0x00000000,
        ], 1)
    }
}