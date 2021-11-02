import { Application } from '../framework'
import { TerrainSystem, PlayerSystem } from '../../world'

export class MapHelper {
    private readonly canvas: HTMLCanvasElement
    constructor(private readonly context: Application){
        this.canvas = document.createElement('canvas')
        Object.assign(this.canvas.style, {
            imageRendering: 'pixelated',
            width: '80%'
        })
    }
    show(){
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
        document.body.appendChild(this.canvas)
    }
}