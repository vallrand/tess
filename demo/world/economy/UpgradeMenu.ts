import { Application } from '../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mod, moddelta, mat3x2 } from '../../engine/math'
import { ActionSignal, AnimationTimeline, PropertyAnimation, ease } from '../../engine/animation'
import { Sprite, BillboardType, Sprite2D, Transform2D } from '../../engine/components'
import { TransformSystem, Transform } from '../../engine/scene'
import { ParticleEffectPass, OverlayPass } from '../../engine/pipeline'
import { VectorGraphicsTexture, SpriteMaterial } from '../../engine/materials'
import { KeyboardSystem } from '../../engine/device'
import { PlayerSystem, Cube, CubeModule } from '../player'
import { SharedSystem } from '../shared'
import { IconLibrary } from './IconLibrary'

export class UpgradeMenu {
    private readonly icons: ReturnType<typeof IconLibrary>
    readonly upgrades: {
        readonly module: CubeModule
        readonly type: keyof ReturnType<typeof IconLibrary>
        readonly limit: number
        cost: number
        amount: number
        upgrade(player: PlayerSystem): any
    }[] = [{
        module: CubeModule.Empty, type: 'armor', limit: 6, amount: 0, cost: 4, upgrade: player => player.cube.health.amount = ++player.cube.health.capacity
    },{
        module: CubeModule.Empty, type: 'storage', limit: 4, amount: 0, cost: 4, upgrade: player => player.cube.matter.capacity++
    },{
        module: CubeModule.Auger, type: 'storage', limit: 4, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Auger].indicator.capacity++
    },{
        module: CubeModule.Repair, type: 'efficacy', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Repair].damage++
    },{
        module: CubeModule.Shield, type: 'storage', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Shield].indicator.capacity++
    },{
        module: CubeModule.EMP, type: 'efficacy', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.EMP].damage++
    },{
        module: CubeModule.Minelayer, type: 'efficacy', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Minelayer].damage++
    },{
        module: CubeModule.Machinegun, type: 'range', limit: 3, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Machinegun].range++
    }, {
        module: CubeModule.Machinegun, type: 'rate', limit: 4, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Machinegun].indicator.capacity++
    }, {
        module: CubeModule.Missile, type: 'rate', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Missile].indicator.capacity++
    },{
        module: CubeModule.Missile, type: 'efficacy', limit: 1, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Missile].damage++
    },{
        module: CubeModule.Railgun, type: 'efficacy', limit: 4, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Railgun].damage++
    },{
        module: CubeModule.Voidgun, type: 'range', limit: 2, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Voidgun].range++
    },{
        module: CubeModule.Voidgun, type: 'efficacy', limit: 1, amount: 0, cost: 4, upgrade: player => player.skills[CubeModule.Voidgun].damage++
    }]
    readonly availableModules = [
        CubeModule.Empty,
        CubeModule.Machinegun,
        CubeModule.Railgun,
        CubeModule.EMP,
        CubeModule.Voidgun,
        CubeModule.Repair,
        CubeModule.Minelayer,
        CubeModule.Auger,
        CubeModule.Shield,
        CubeModule.Missile
    ]
    actionIndex: number
    moduleIndex: number
    private static readonly enabled: vec4 = vec4(1,1,1,0.4) 
    private carouselTransform: Transform
    private color: vec4 = vec4()
    private carouselIcons: Sprite[] = []
    private upgradePanel: Sprite2D
    private upgradeIcons: {
        module: Sprite2D
        type: Sprite2D
        slots: Sprite2D[]
    }[]
    private cameraOffset: vec3
    constructor(private readonly context: Application){
        this.icons = IconLibrary(context)

        const transform = Transform2D.create()
        this.upgradePanel = Sprite2D.create(-1, vec2.HALF)
        vec4.set(0.05,0.05,0.05,0.75, this.upgradePanel.color)
        this.upgradePanel.material = SharedSystem.materials.sprite.fade
        this.upgradePanel.transform = Transform2D.create(vec2(0, 64 - 8), vec2(this.upgrades.length * 32, 8 * 32 + 16), 0, transform)
        this.upgradeIcons = this.upgrades.map((upgrade, i) => {
            const x = 32 * (i - 0.5 * (this.upgrades.length - 1))
            const moduleIcon = Sprite2D.create(1, vec2.HALF)
            moduleIcon.material = SpriteMaterial.copy(this.icons.moduleIcons[upgrade.module], new SpriteMaterial())
            moduleIcon.material.program = this.context.get(OverlayPass).program
            moduleIcon.transform = Transform2D.create([x, -32*2], vec2.ONE, 0, transform)
            const typeIcon = Sprite2D.create(1, vec2.HALF)
            typeIcon.material = this.icons[upgrade.type] as SpriteMaterial
            typeIcon.transform = Transform2D.create([x, -32], vec2.ONE, 0, transform)
            const slots: Sprite2D[] = []
            for(let j = 0; j < upgrade.limit; j++){
                const slot = slots[j] = Sprite2D.create(1, vec2.HALF)
                slot.material = this.icons.slot
                slot.transform = Transform2D.create([x, 32 * j + 16], vec2.ONE, 0, transform)
            }
            return { module: moduleIcon, type: typeIcon, slots }
        })
    }
    public *open(cube: Cube): Generator<ActionSignal> {
        const rotation = quat()
        this.carouselTransform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, [1.2,1.2,1.2], cube.transform)
        for(let i = 0; i < this.availableModules.length; i++){
            const icon = this.carouselIcons[i] = Sprite.create(BillboardType.None, 0)
            const angle = 2 * Math.PI * i / this.availableModules.length
            icon.transform = this.context.get(TransformSystem)
            .create([ -Math.sin(angle) * 2, Math.cos(angle) * 2, 0 ], quat.HALF_N_X, vec3.ONE, this.carouselTransform)
            quat.multiply(quat.axisAngle(vec3.AXIS_Z, angle, rotation), icon.transform.rotation, icon.transform.rotation)
            icon.material = this.icons.moduleIcons[this.availableModules[i]]
            this.context.get(OverlayPass).add(icon)
        }
        this.moduleIndex = this.availableModules.indexOf(cube.sides[cube.side].type)

        for(const startTime = this.context.currentTime; this.actionIndex != -1;){
            const elapsedTime = this.context.currentTime - startTime
            vec4.lerp(vec4.ZERO, UpgradeMenu.enabled, Math.min(1, elapsedTime / 0.5), this.color)

            this.moduleIndex = mod(this.moduleIndex, this.availableModules.length)
            const angle = 2 * Math.PI * (1-this.moduleIndex / this.availableModules.length)
            quat.axisAngle(vec3.AXIS_Z, angle, rotation)

            quat.slerp(this.carouselTransform.rotation, rotation, 0.1, this.carouselTransform.rotation)
            this.carouselTransform.frame = 0
            for(let i = this.carouselIcons.length - 1; i >= 0; i--)
                vec4.lerp(this.color, vec4.ZERO,
                    Math.min(1, 0.4 * Math.abs(moddelta(this.availableModules.length, i, this.moduleIndex))),
                    this.carouselIcons[i].color)
            yield ActionSignal.WaitNextFrame
        }

        for(const duration = 0.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            vec4.lerp(vec4.ZERO, UpgradeMenu.enabled, 1 - Math.min(1, elapsedTime / 0.5), this.color)
            for(let i = this.carouselIcons.length - 1; i >= 0; i--)
                vec4.lerp(this.color, vec4.ZERO,
                    Math.min(1, 0.4 * Math.abs(moddelta(this.availableModules.length, i, this.moduleIndex))),
                    this.carouselIcons[i].color)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        for(let i = this.carouselIcons.length - 1; i >= 0; i--){
            this.context.get(TransformSystem).delete(this.carouselIcons[i].transform)
            this.context.get(OverlayPass).remove(this.carouselIcons[i])
            this.carouselIcons[i] = void Sprite.delete(this.carouselIcons[i])
        }
        this.context.get(TransformSystem).delete(this.carouselTransform)
    }
    public *upgrade(): Generator<ActionSignal> {
        const overlay = this.context.get(OverlayPass)
        const sprites: Sprite2D[] = this.upgradeIcons
        .reduce((list, icon) => list.concat(icon.slots, icon.type, icon.module),[])
        .concat(this.upgradePanel)
        overlay.list2d.push(...sprites)

        this.cameraOffset = this.context.get(PlayerSystem).cameraOffset
        const animate = AnimationTimeline(this, {
            'cameraOffset': PropertyAnimation([
                { frame: 0, value: vec3.copy(this.cameraOffset, vec3()) },
                { frame: 0.5, value: [1,0,4], ease: ease.quadInOut }
            ], vec3.lerp),
            'upgradePanel.transform.parent.position': PropertyAnimation([
                { frame: 0, value: vec2(0.5*this.context.canvas.width, 0.5*this.context.canvas.height + this.upgradePanel.transform.scale[1]) },
                { frame: 0.5, value: vec2(0.5*this.context.canvas.width, 0.5*this.context.canvas.height), ease: ease.quadInOut }
            ], vec2.lerp)
        })

        const keys = this.context.get(KeyboardSystem)
        const player = this.context.get(PlayerSystem)
        let selectedIndex: number = 0
        const disabled = vec4(0.4,0.4,0.5,1)
        const enabled = vec4(1,1,1,0)

        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)

            if(keys.trigger(PlayerSystem.input.down)) break
            else if(keys.trigger(PlayerSystem.input.left)){
                selectedIndex = Math.max(0, selectedIndex - 1)
            }else if(keys.trigger(PlayerSystem.input.right)){
                selectedIndex = Math.min(this.upgrades.length - 1, selectedIndex + 1)
            }else if(keys.down(PlayerSystem.input.action)){
                const upgrade = this.upgrades[selectedIndex]
                if(upgrade.amount < upgrade.limit && player.cube.matter.amount >= upgrade.cost){
                    player.cube.matter.amount -= upgrade.cost
                    const slot = this.upgradeIcons[selectedIndex].slots[upgrade.amount++]
                    slot.material = this.icons.filled
                    slot.frame = 0
                    upgrade.upgrade(player)
                    for(const generator = this.animateSlotUpgrade(slot); true;){
                        const iterator = generator.next()
                        if(iterator.done) break
                        else yield iterator.value
                    }
                }
            }

            for(let i = this.upgradeIcons.length - 1; i >= 0; i--){
                const icon = this.upgradeIcons[i]
                vec4.lerp(icon.type.color, i === selectedIndex ? enabled : disabled, 0.2, icon.type.color)
                vec4.lerp(icon.module.color, i === selectedIndex ? enabled : disabled, 0.2, icon.module.color)
                for(let j = icon.slots.length - 1; j >= 0; j--)
                    vec4.lerp(icon.slots[j].color, i === selectedIndex ? enabled : disabled, 0.2, icon.slots[j].color)
            }

            yield ActionSignal.WaitNextFrame
        }
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(duration - elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        for(let i = sprites.length - 1; i >= 0; i--){
            const index = overlay.list2d.indexOf(sprites[i])
            overlay.list2d[index] = overlay.list2d[overlay.list2d.length - 1]
            overlay.list2d.length--
        }
    }
    private *animateSlotUpgrade(slot: Sprite2D): Generator<ActionSignal> {
        const overlay = this.context.get(OverlayPass)
        const glow = Sprite2D.create(2, vec2.HALF)
        glow.material = this.icons.glow
        glow.transform = slot.transform
        overlay.list2d.push(glow)
        const animate = PropertyAnimation([
            { frame: 0, value: vec4.ZERO },
            { frame: 0.2, value: [1,1,1,0], ease: ease.quadOut },
            { frame: 0.5, value: vec4.ZERO, ease: ease.sineIn }
        ], vec4.lerp)
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, glow.color)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        const index = overlay.list2d.indexOf(glow)
        overlay.list2d[index] = overlay.list2d[overlay.list2d.length - 1]
        overlay.list2d.length--
    }
}