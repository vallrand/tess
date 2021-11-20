import { Application, ISystem } from '../framework'
import { DomNode, IDebugHelper } from './DebugHelper'
import { Monitor } from './Monitor'
import { MapHelper } from './MapHelper'
import { SkeletonHelper } from './SkeletonHelper'
import { TextureHelper } from './TextureHelper'
import { SettingsHelper } from './SettingsHelper'

export class DebugSystem implements ISystem {
    readonly enabled: boolean = location.search.indexOf('debug') != -1
    public readonly helpers: IDebugHelper[]
    constructor(private readonly context: Application){
        if(!this.enabled) return
        this.helpers = [
            new TextureHelper(this.context),
            new SkeletonHelper(this.context),
            new SettingsHelper(this.context),
            new MapHelper(this.context),
        ]
        console.log(`%cDebug Mode`,'color:#ff0000')
        window['app'] = context
        this.attachDebugPanel()
    }
    update(){
        if(!this.enabled) return
        for(let i = this.helpers.length - 1; i >= 0; i--) this.helpers[i].update()
    }
    public load(manifest, loaded, next): void {
        if(!this.enabled) return next()
        const root = DomNode('div', {
            style: {
                display: 'flex', flexDirection: 'column', justifyContent: 'start',
                position: 'fixed', left: 0, top: '64px', width: '154px'
            }
        }, [
            DomNode('div', {

            }),
            DomNode('div', {
                style: { display: 'flex', flexDirection: 'column', justifyContent: 'start' }
            }, this.helpers.map(helper => helper.open()))
        ])
        document.body.appendChild(root)
        next()
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