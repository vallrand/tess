import { Application } from '../framework'
import { TerrainSystem, PlayerSystem } from '../../world'
import { DomNode, IDebugHelper } from './DebugHelper'

export class MapHelper implements IDebugHelper {
    private readonly canvas: HTMLCanvasElement
    public enabled: boolean = false
    constructor(private readonly context: Application){
        this.canvas = document.createElement('canvas')
        Object.assign(this.canvas.style, {
            imageRendering: 'pixelated', width: '100%', display: 'none'
        })
    }
    public update(): void {
        this.canvas.style.display = this.enabled ? 'block' : 'none'
        if(!this.enabled) return

        const tile = this.context.get(PlayerSystem).cube.tile
        const { levelGenerator } = this.context.get(TerrainSystem)
        const zoneX = Math.floor(tile[0] / levelGenerator.zoneSize)
        const zoneY = Math.floor(tile[1] / levelGenerator.zoneSize)
        const zone = levelGenerator.generateZone(zoneX, zoneY)

        this.canvas.width = zone.map.width
        this.canvas.height = zone.map.height
        const ctx = this.canvas.getContext('2d')
        ctx.putImageData(zone.map, 0, 0)
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(tile[0] - zone.offsetX, tile[1] - zone.offsetY, 1, 1)
    }
    public open(): HTMLElement {
        return DomNode('div', {
            style: { display: 'flex', flexDirection: 'column' }
        }, [
            DomNode('div', {
                innerText: 'map', style: { textTransform: 'uppercase', display: 'flex', borderBottom: '1px solid #efefef' }
            }, [DomNode('input', {
                type: 'checkbox', checked: this.enabled, style: { pointerEvents: 'all', marginLeft: 'auto' }
            }, null, {
                change: event => this.enabled = (event.target as HTMLInputElement).checked
            })]),
            this.canvas
        ])
    }
}