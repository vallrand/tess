import { Application } from '../../engine/framework'
import { GradientRamp } from '../../engine/particles'

export function GradientLibrary(context: Application){

    return {
        yellowViolet: GradientRamp(context.gl, [
            0xffffff00, 0xfffcd600, 0xf0eba800, 0xc2bd7430, 0xa60f5050, 0x00000000,
        ], 1),


        tealLine: GradientRamp(context.gl, [
            0x00000000, 0x04467840, 0x21ccaa20, 0xc9f2e600, 0x21ccaa20, 0x04467840, 0x00000000
        ], 1),
        yellowLine: GradientRamp(context.gl, [
            0x00000000, 0x57100320, 0xf7f3ba00, 0x57100320, 0x00000000
        ], 1)
    }
}