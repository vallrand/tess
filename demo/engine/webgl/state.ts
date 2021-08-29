import { GL } from './constants'

export interface WebGLState extends WebGL2RenderingContext {}
export class WebGLState implements WebGL2RenderingContext {
    constructor(private readonly gl: WebGL2RenderingContext){
        for(let property in WebGL2RenderingContext.prototype){
            if(property in this) continue
            const value = this.gl[property]
            if(typeof value === 'function') this[property] = value.bind(this.gl)
        }
    }
    get canvas(): HTMLCanvasElement | OffscreenCanvas { return this.gl.canvas }
    get drawingBufferHeight(): number { return this.gl.drawingBufferHeight }
    get drawingBufferWidth(): number { return this.gl.drawingBufferWidth }

    private readonly extensions = {
        color_buffer_float: this.gl.getExtension('EXT_color_buffer_float'),
        color_buffer_half_float: this.gl.getExtension('EXT_color_buffer_half_float'),
        float_blend: this.gl.getExtension('EXT_float_blend'),
        texture_filter_anisotropic: this.gl.getExtension('EXT_texture_filter_anisotropic'),
        texture_norm16: this.gl.getExtension('EXT_texture_norm16'),
        texture_float_linear: this.gl.getExtension('OES_texture_float_linear')
    }
    private readonly cache = {
        [GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS]: this.gl.getParameter(GL.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
        [GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS]: this.gl.getParameter(GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        [GL.MAX_TEXTURE_IMAGE_UNITS]: this.gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS),
        [GL.MAX_VERTEX_ATTRIBS]: this.gl.getParameter(GL.MAX_VERTEX_ATTRIBS),
        [GL.MAX_VERTEX_UNIFORM_VECTORS]: this.gl.getParameter(GL.MAX_VERTEX_UNIFORM_VECTORS),
        [GL.MAX_FRAGMENT_UNIFORM_VECTORS]: this.gl.getParameter(GL.MAX_FRAGMENT_UNIFORM_VECTORS),
        [GL.MAX_VARYING_VECTORS]: this.gl.getParameter(GL.MAX_VARYING_VECTORS),
        [GL.MAX_VIEWPORT_DIMS]: this.gl.getParameter(GL.MAX_VIEWPORT_DIMS),
        [GL.MAX_TEXTURE_SIZE]: this.gl.getParameter(GL.MAX_TEXTURE_SIZE),
        [GL.MAX_RENDERBUFFER_SIZE]: this.gl.getParameter(GL.MAX_RENDERBUFFER_SIZE),
        [GL.MAX_DRAW_BUFFERS]: this.gl.getParameter(GL.MAX_DRAW_BUFFERS),
        [GL.MAX_COLOR_ATTACHMENTS]: this.gl.getParameter(GL.MAX_COLOR_ATTACHMENTS),
        fragment: this.gl.getShaderPrecisionFormat(GL.FRAGMENT_SHADER, GL.HIGH_FLOAT),
        vertex: this.gl.getShaderPrecisionFormat(GL.VERTEX_SHADER, GL.HIGH_FLOAT)
    }
    private readonly state = {
        [GL.VERTEX_ARRAY_BINDING]: <WebGLVertexArrayObject> null,
        [GL.DRAW_FRAMEBUFFER_BINDING]: <WebGLFramebuffer> null,
        [GL.READ_FRAMEBUFFER_BINDING]: <WebGLFramebuffer> null,
        [GL.RENDERBUFFER_BINDING]: <WebGLRenderbuffer> null,
        [GL.VIEWPORT]: new Int32Array(4),
        [GL.CURRENT_PROGRAM]: <WebGLProgram> null,
        [GL.ARRAY_BUFFER_BINDING]: <WebGLBuffer> null,
        [GL.ACTIVE_TEXTURE]: GL.TEXTURE0,
        [GL.TEXTURE_2D]: <WebGLTexture[]> Array(this.cache[GL.MAX_TEXTURE_IMAGE_UNITS]),
        [GL.TEXTURE_2D_ARRAY]: <WebGLTexture[]> Array(this.cache[GL.MAX_TEXTURE_IMAGE_UNITS]),
        [GL.TEXTURE_CUBE_MAP]: <WebGLTexture[]> Array(this.cache[GL.MAX_TEXTURE_IMAGE_UNITS]),
        [GL.TEXTURE_3D]: <WebGLTexture[]> Array(this.cache[GL.MAX_TEXTURE_IMAGE_UNITS]),

        [GL.COLOR_CLEAR_VALUE]: new Float32Array(4),
        [GL.DEPTH_CLEAR_VALUE]: 1,
        [GL.STENCIL_CLEAR_VALUE]: 0x00,

        [GL.DEPTH_TEST]: false,
        [GL.DEPTH_FUNC]: GL.LESS,
        [GL.DEPTH_RANGE]: [0,1],
        [GL.DEPTH_WRITEMASK]: true,

        [GL.CULL_FACE]: false,
        [GL.CULL_FACE_MODE]: GL.BACK,
        [GL.FRONT_FACE]: GL.CCW,

        [GL.BLEND]: false,
        [GL.BLEND_SRC_RGB]: GL.ONE,
        [GL.BLEND_DST_RGB]: GL.ZERO,
        [GL.BLEND_SRC_ALPHA]: GL.ONE,
        [GL.BLEND_DST_ALPHA]: GL.ZERO,
        [GL.BLEND_COLOR]: new Float32Array(4),
        [GL.BLEND_EQUATION_RGB]: GL.FUNC_ADD,
        [GL.BLEND_EQUATION_ALPHA]: GL.FUNC_ADD,

        [GL.COLOR_WRITEMASK]: [true,true,true,true],
        [GL.SCISSOR_TEST]: false,
        [GL.SCISSOR_BOX]: new Int32Array(4),
    }
    disable(cap: number): void {
        if(!this.state[cap]) return
        this.state[cap] = false
        this.gl.disable(cap)
    }
    enable(cap: number): void {
        if(this.state[cap]) return
        this.state[cap] = true
        this.gl.enable(cap)
    }
    viewport(x: number, y: number, width: number, height: number): void {
        if(
            this.state[GL.VIEWPORT][0] === x &&
            this.state[GL.VIEWPORT][1] === y &&
            this.state[GL.VIEWPORT][2] === width &&
            this.state[GL.VIEWPORT][3] === height
        ) return
        this.gl.viewport(
            this.state[GL.VIEWPORT][0] = x,
            this.state[GL.VIEWPORT][1] = y,
            this.state[GL.VIEWPORT][2] = width,
            this.state[GL.VIEWPORT][3] = height
        )
    }
    blendColor(red: number, green: number, blue: number, alpha: number): void {
        if(
            this.state[GL.BLEND_COLOR][0] === red &&
            this.state[GL.BLEND_COLOR][1] === green &&
            this.state[GL.BLEND_COLOR][2] === blue &&
            this.state[GL.BLEND_COLOR][3] === alpha
        ) return
        this.gl.blendColor(
            this.state[GL.BLEND_COLOR][0] = red,
            this.state[GL.BLEND_COLOR][1] = green,
            this.state[GL.BLEND_COLOR][2] = blue,
            this.state[GL.BLEND_COLOR][3] = alpha
        )
    }
    blendEquation(mode: number): void { this.blendEquationSeparate(mode, mode) }
    blendEquationSeparate(modeRGB: number, modeAlpha: number): void {
        if(
            this.state[GL.BLEND_EQUATION_RGB] === modeRGB &&
            this.state[GL.BLEND_EQUATION_ALPHA] === modeAlpha
        ) return
        this.gl.blendEquationSeparate(
            this.state[GL.BLEND_EQUATION_RGB] = modeRGB,
            this.state[GL.BLEND_EQUATION_ALPHA] = modeAlpha
        )
    }
    blendFunc(sfactor: number, dfactor: number): void { this.blendFuncSeparate(sfactor, dfactor, sfactor, dfactor) }
    blendFuncSeparate(srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number): void {
        if(
            this.state[GL.BLEND_SRC_RGB] === srcRGB &&
            this.state[GL.BLEND_DST_RGB] === dstRGB &&
            this.state[GL.BLEND_SRC_ALPHA] === srcAlpha &&
            this.state[GL.BLEND_DST_ALPHA] === dstAlpha
        ) return
        this.gl.blendFuncSeparate(
            this.state[GL.BLEND_SRC_RGB] = srcRGB,
            this.state[GL.BLEND_DST_RGB] = dstRGB,
            this.state[GL.BLEND_SRC_ALPHA] = srcAlpha,
            this.state[GL.BLEND_DST_ALPHA] = dstAlpha
        )
    }
    clearColor(red: number, green: number, blue: number, alpha: number): void {
        if(
            this.state[GL.COLOR_CLEAR_VALUE][0] === red &&
            this.state[GL.COLOR_CLEAR_VALUE][1] === green &&
            this.state[GL.COLOR_CLEAR_VALUE][2] === blue &&
            this.state[GL.COLOR_CLEAR_VALUE][3] === alpha
        ) return
        this.gl.clearColor(
            this.state[GL.COLOR_CLEAR_VALUE][0] = red,
            this.state[GL.COLOR_CLEAR_VALUE][1] = green,
            this.state[GL.COLOR_CLEAR_VALUE][2] = blue,
            this.state[GL.COLOR_CLEAR_VALUE][3] = alpha
        )
    }
    clearDepth(depth: number): void {
        if(this.state[GL.DEPTH_CLEAR_VALUE] === depth) return
        this.gl.clearDepth(this.state[GL.DEPTH_CLEAR_VALUE] = depth)
    }
    colorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void {
        if(
            this.state[GL.COLOR_WRITEMASK][0] === red &&
            this.state[GL.COLOR_WRITEMASK][1] === green &&
            this.state[GL.COLOR_WRITEMASK][2] === blue &&
            this.state[GL.COLOR_WRITEMASK][3] === alpha
        ) return
        this.gl.colorMask(
            this.state[GL.COLOR_WRITEMASK][0] = red,
            this.state[GL.COLOR_WRITEMASK][1] = green,
            this.state[GL.COLOR_WRITEMASK][2] = blue,
            this.state[GL.COLOR_WRITEMASK][3] = alpha
        )
    }
    cullFace(mode: number): void {
        if(this.state[GL.CULL_FACE_MODE] === mode) return
        this.gl.cullFace(this.state[GL.CULL_FACE_MODE] = mode)
    }
    depthFunc(func: number): void {
        if(this.state[GL.DEPTH_FUNC] === func) return
        this.gl.depthFunc(this.state[GL.DEPTH_FUNC] = func)
    }
    depthMask(flag: boolean): void {
        if(this.state[GL.DEPTH_WRITEMASK] === flag) return
        this.gl.depthMask(this.state[GL.DEPTH_WRITEMASK] = flag)
    }
    depthRange(zNear: number, zFar: number): void {
        if(this.state[GL.DEPTH_RANGE][0] === zNear && this.state[GL.DEPTH_RANGE][1] === zFar) return
        this.gl.depthRange(this.state[GL.DEPTH_RANGE][0] = zNear, this.state[GL.DEPTH_RANGE][1] = zFar)
    }
    frontFace(mode: number): void {
        if(this.state[GL.FRONT_FACE] === mode) return
        this.gl.frontFace(this.state[GL.FRONT_FACE] = mode)
    }
    scissor(x: number, y: number, width: number, height: number): void {
        if(
            this.state[GL.SCISSOR_BOX][0] === x &&
            this.state[GL.SCISSOR_BOX][1] === y &&
            this.state[GL.SCISSOR_BOX][2] === width &&
            this.state[GL.SCISSOR_BOX][3] === height
        ) return
        this.gl.scissor(
            this.state[GL.SCISSOR_BOX][0] = x,
            this.state[GL.SCISSOR_BOX][1] = y,
            this.state[GL.SCISSOR_BOX][2] = width,
            this.state[GL.SCISSOR_BOX][3] = height
        )
    }

    bindBuffer(target: number, buffer: WebGLBuffer): void {
        this.gl.bindBuffer(target, buffer)
    }
    bindVertexArray(array: WebGLVertexArrayObject): void {
        if(this.state[GL.VERTEX_ARRAY_BINDING] === array) return
        this.gl.bindVertexArray(this.state[GL.VERTEX_ARRAY_BINDING] = array)
    }
    activeTexture(texture: number): void {
        if(this.state[GL.ACTIVE_TEXTURE] === texture) return
        this.gl.activeTexture(this.state[GL.ACTIVE_TEXTURE] = texture)
    }
    bindTexture(target: number, texture: WebGLTexture): void {
        const activeTextureUnit = this.state[GL.ACTIVE_TEXTURE] - GL.TEXTURE0
        if(this.state[target][activeTextureUnit] === texture) return
        this.gl.bindTexture(target, this.state[target][activeTextureUnit] = texture)
    }
    useProgram(program: WebGLProgram): void {
        if(this.state[GL.CURRENT_PROGRAM] === program) return
        this.gl.useProgram(this.state[GL.CURRENT_PROGRAM] = program)
    }

    blitFramebuffer(srcX0: number, srcY0: number, srcX1: number, srcY1: number, dstX0: number, dstY0: number, dstX1: number, dstY1: number, mask: number, filter: number): void {
        this.gl.blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter)
    }
    drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void {
        this.gl.drawArraysInstanced(mode, first, count, instanceCount)
    }
    drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number): void {
        this.gl.drawElementsInstanced(mode, count, type, offset, instanceCount)
    }
    drawRangeElements(mode: number, start: number, end: number, count: number, type: number, offset: number): void {
        this.gl.drawRangeElements(mode, start, end, count, type, offset)
    }
    drawArrays(mode: number, first: number, count: number): void {
        this.gl.drawArrays(mode, first, count)
    }
    drawElements(mode: number, count: number, type: number, offset: number): void {
        this.gl.drawElements(mode, count, type, offset)
    }

    shaderSource(shader: WebGLShader, source: string): void {
        this.gl.shaderSource(shader, source)
    }
}