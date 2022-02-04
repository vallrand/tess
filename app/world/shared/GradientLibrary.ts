import { Application } from '../../engine/framework'
import { GradientRamp } from '../../engine/materials/GradientRamp'

export const GradientLibrary = (context: Application) => ({
    yellowViolet: GradientRamp(context.gl, [
        0xffffff00, 0xfffcd600, 0xf0eba800, 0xc2bd7430, 0xa60f5050, 0x00000000,
    ], 1),

    purple: GradientRamp(context.gl, [
        0xdfecf0f0, 0x8cb3db80, 0x5e56c460, 0x6329a640, 0x4f0c5420, 0x00000000
    ], 1),
    teal: GradientRamp(context.gl, [
        0xffffff00, 0xdeffee00, 0x8ad4ad10, 0x68d4a820, 0x1aa17130, 0x075c4f20, 0x03303820, 0x00000000,
    ], 1),
    darkTeal: GradientRamp(context.gl, [
        0xFFFFFF00, 0xFFFFFF00, 0xEFF4F705, 0xC9DBE412, 0x99C7D44C, 0x5AA4AD9D, 0x1E51527B, 0x00000000
    ], 1),

    tealLine: GradientRamp(context.gl, [
        0x00000000, 0x04467840, 0x21ccaa20, 0xc9f2e600, 0x21ccaa20, 0x04467840, 0x00000000
    ], 1),
    yellowLine: GradientRamp(context.gl, [
        0x00000000, 0x57100320, 0xf7f3ba00, 0x57100320, 0x00000000
    ], 1),

    redPurple: GradientRamp(context.gl, [
        0xFFFFFF00, 0xEB8B9940, 0xBC265880, 0xBC2658A0, 0xB9266AF0, 0x7C388060, 0x2A174420, 0x00000000
    ], 1),
    tealBlue: GradientRamp(context.gl, [
        0xf0fafa05,0xa7d9da0a,0x78b8bf19,0x6c9eae23,0x597c9628,0x4155771e,0x2b345814,0x1b20400a,0x0f112905,0x00000000
    ], 1),

    yellowRed2D: GradientRamp(context.gl, [
        0xffffff00, 0xffffaf00, 0xffaf9f00, 0xff7f0000,
        0xffffffff, 0xf7f7cbaf, 0xffea5e7f, 0xcc49080f,
        0xbdb9b9af, 0x7d70707f, 0x422f2f3f, 0x00000000,
        0x000000ff, 0x000000af, 0x0000007f, 0x00000000
    ], 4),
    purpleGrey2D: GradientRamp(context.gl, [
        0xd5f5f500, 0x9c386f20, 0x42172510, 0x00000000,
        0x50505fff, 0x20202fff, 0x0a0a0fff, 0x00000000,
        0x30303fff, 0x10101fff, 0x0a0a0fff, 0x00000000,
        0x000000ff, 0x000000af, 0x0000007f, 0x00000000
    ], 4),
    brightRed: GradientRamp(context.gl, [
        0xffffffff, 0xffffffff, 0xffffafef, 0xffffafaf, 0xffaf9f7f, 0xe0808060, 0xa0202040, 0x00000000
    ], 1),

    orange2D: GradientRamp(context.gl, [
        0xf5f0d700, 0xbd7d7d00, 0x524747ff, 0x00000000,
        0x7f7f7fff, 0x202020ff, 0x000000ff, 0x00000000
    ], 2),
    simple: GradientRamp(context.gl, [
        0x00000000, 0xffffffff
    ], 2),
    white: GradientRamp(context.gl, [ 0xffffffff, 0x00000000 ], 1),

    darkRed: GradientRamp(context.gl, [
        0xffffffff, 0xebdadad0, 0xd18a9790, 0x94063ca0, 0x512e3c70, 0x29202330, 0x00000000, 0x00000000
    ], 1),

    brightPurple: GradientRamp(context.gl, [
        0xffffff00, 0xc5e0e300, 0x88a8bd00, 0x6e84c420, 0x4e3ba130, 0x820c4920, 0x38031510, 0x00000000
    ], 1)
})