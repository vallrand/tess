import { Application } from '../../engine/framework'
import { vec2, vec3, quat, mat4 } from '../../engine/math'
import { ease } from '../../engine/animation'
import {
    IGeometry, createPlane, createBox, createCylinder, createSphere,
    doubleSided, applyTransform, extrudePolygon, modifyGeometry
} from '../../engine/geometry'
import { MeshSystem, Sprite } from '../../engine/components'

export function GeometryLibrary(context: Application){
    const transform = mat4(), rotation = quat()

    const sphere = createSphere({
        longitude: 32, latitude: 32, radius: 1
    })
    const lowpolySphere = createSphere({
        longitude: 16, latitude: 16, radius: 1
    })
    const hemisphere = applyTransform(createSphere({
        longitude: 8, latitude: 4, radius: 1,
        thetaStart: 0, thetaLength: 0.5 * Math.PI,
        phiStart: 0, phiLength: 2 * Math.PI
    }), mat4.fromRotationTranslationScale(
        Sprite.FlatUp, vec3(0,0,-1), vec3.ONE, transform
    ))
    const cylinder = doubleSided(createCylinder({
        radiusTop: 0.5, radiusBottom: 0.5, height: 1,
        radial: 32, horizontal: 1,
        cap: false, angleStart: 0, angleLength: 2*Math.PI
    }))
    const cone = doubleSided(applyTransform(createCylinder({
        radiusTop: 0, radiusBottom: 2, height: 1,
        horizontal: 4, radial: 16,
        cap: false, angleStart: 0, angleLength: 2 * Math.PI
    }), mat4.translate(mat4.IDENTITY, vec3(0,-0.5,0), transform)))

    const lowpolyCylinder = doubleSided(applyTransform(createCylinder({
        radiusTop: 0.5, radiusBottom: 0.5, height: 1,
        radial: 16, horizontal: 1,
        cap: false, angleStart: 0, angleLength: 2*Math.PI
    }), mat4.translate(mat4.IDENTITY, vec3(0,0.5,0), transform)))

    const lopolyCylinderFlip = doubleSided(applyTransform(createCylinder({
        radiusTop: 0.5, radiusBottom: 0.5, height: 1,
        radial: 16, horizontal: 1,
        cap: false, angleStart: 0, angleLength: 2*Math.PI
    }), mat4.translate(mat4.IDENTITY, vec3(0,-0.5,0), transform)))

    const cross = doubleSided(extrudePolygon([
        [-1,-3],[-1,-1],[-3,-1],[-3,1],[-1,1],[-1,3],[1,3],[1,1],[3,1],[3,-1],[1,-1],[1,-3]
    ], 1))

    const box = doubleSided(createBox({
        width: 1, height: 1, depth: 1, open: false
    }))

    const openBox = doubleSided(applyTransform(createBox({
        width: 1, height: 1, depth: 1, open: true
    }), mat4.fromRotationTranslationScale(quat.IDENTITY, vec3(0,0.5,0), vec3.ONE, transform)))


    let funnel = createCylinder({
        radiusTop: 0.5, radiusBottom: 4, height: 4,
        horizontal: 8, radial: 8,
        cap: false, angleStart: 0, angleLength: 2 * Math.PI
    })
    modifyGeometry(funnel, function verticalSkew(position: vec3, normal: vec3){
        const skewAngle = 1.6 * Math.PI * ease.circIn(0.5 + position[1] / 4)
        quat.axisAngle(vec3.AXIS_Y, skewAngle, rotation)
        quat.transform(position, rotation, position)
        quat.transform(normal, rotation, normal)
    })
    applyTransform(funnel, mat4.fromRotationTranslationScale(
        Sprite.FlatUp, vec3(0,0,-2), vec3.ONE, transform
    ))
    funnel = doubleSided(funnel)

    return {
        sphere, lowpolySphere, hemisphere,
        cylinder, lowpolyCylinder, cone,
        box, openBox,
        cross,
        funnel,
        lopolyCylinderFlip,

        sphereMesh: context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format, false)
    }
}