import { Application, ISystem } from '../framework'
import { vec3, vec4, quat, mat4 } from '../math'
import { GL, UniformSamplerBindings, ShaderProgram } from '../webgl'
import * as shaders from '../shaders'
import { createBox, applyTransform } from '../geometry'
import { DeferredGeometryPass, PostEffectPass } from '../pipeline'
import { MaterialSystem, MeshMaterial } from '../materials'
import { TransformSystem } from '../scene'
import { Armature, Mesh, MeshSystem } from '../components'
import { SkeletonHelper } from './SkeletonHelper'
import { MapHelper } from './MapHelper'

import { Monitor } from './Monitor'

export class DebugSystem implements ISystem {
    public texture: WebGLTexture
    public cubemap: WebGLTexture
    private readonly textureProgram: ShaderProgram
    private readonly cubemapProgram: ShaderProgram
    public readonly skeleton: SkeletonHelper = new SkeletonHelper(this.context)
    public readonly map: MapHelper = new MapHelper(this.context)
    constructor(private readonly context: Application){
        window['app'] = context
        this.textureProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag)
        this.textureProgram.uniforms['uMask'] = vec4.ONE
        this.cubemapProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag, { CUBEMAP: true })
        this.cubemapProgram.uniforms['uMask'] = vec4.ONE
        this.attachDebugPanel()
    }
    update(){
        this.skeleton.update()
        if(this.texture) this.renderDebugTexture(this.texture, GL.TEXTURE_2D)
        if(this.cubemap) this.renderDebugTexture(this.cubemap, GL.TEXTURE_CUBE_MAP)
    }
    renderDebugTexture(texture: WebGLTexture, type: number = GL.TEXTURE_2D){
        const gl = this.context.gl
        const plane = this.context.get(PostEffectPass).plane

        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        gl.bindVertexArray(plane.vao)
        switch(type){
            case GL.TEXTURE_2D:
                gl.useProgram(this.textureProgram.target)
                break
            case GL.TEXTURE_CUBE_MAP:
                gl.useProgram(this.cubemapProgram.target)
                break
        }

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(type, texture)

        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
    }
    private attachDebugPanel(){
        const panel = document.createElement('div')
        Object.assign(panel.style, { position: 'fixed', top: 0, left: 0, zIndex: 128, fontSize: '0.8em' })
    
        const FPS = new Monitor({
            refreshRate: 100,
            color: '#83e82a', label: 'FPS', range: [0, 60],
            update(deltaTime){
                this.values.push(1000 / deltaTime)
            }
        })
    
        const glCalls = {
            drawElements: 0,
            drawArrays: 0,
            drawArraysInstanced: 0,
            drawElementsInstanced: 0,
            blitFramebuffer: 0
        }
        for(let property in glCalls)
            this.context.gl[property] = (base => function(){
                glCalls[property]++
                return base.apply(this, arguments)
            })(this.context.gl[property])
    
        const DC = new Monitor({
            refreshRate: 100,
            color: '#e8632a', label: 'DC', range: [0, 60],
            update(deltaTime){
                this.values.push(glCalls.drawArrays + glCalls.drawElements + glCalls.drawArraysInstanced + glCalls.drawElementsInstanced + glCalls.blitFramebuffer)
                glCalls.drawArrays = glCalls.drawElements = glCalls.drawArraysInstanced = glCalls.drawElementsInstanced = glCalls.blitFramebuffer = 0
            }
        })
    
        panel.appendChild(FPS.dom)
        panel.appendChild(DC.dom)
    
        document.body.appendChild(panel)
    }
}