import { Application } from '../../engine/framework'
import { mat4, quat, vec3 } from '../../engine/math'
import { createCylinder, createSphere, doubleSided, applyTransform } from '../../engine/geometry'
import { MeshSystem } from '../../engine/components/Mesh'

export function GeometryLibrary(context: Application){
    const sphere = createSphere({
        longitude: 32, latitude: 32, radius: 1
    })
    const sphereMesh = context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format, false)

    const lowPolySphere = createSphere({
        longitude: 16, latitude: 16, radius: 1
    })

    const hemisphere = applyTransform(createSphere({
        longitude: 8, latitude: 4, radius: 1,
        thetaStart: 0, thetaLength: 0.5 * Math.PI,
        phiStart: 0, phiLength: 2 * Math.PI
    }), mat4.fromRotationTranslationScale(
        quat.axisAngle(vec3.AXIS_X,0.5*Math.PI,quat()),
        vec3(0,0,-1), vec3.ONE, mat4()
    ))

    const cylinder = doubleSided(createCylinder({
        radiusTop: 0.5, radiusBottom: 0.5, height: 1,
        radial: 32, horizontal: 1,
        cap: false, angleStart: 0, angleLength: 2*Math.PI
    }))

    return {
        sphere, lowPolySphere, hemisphere, cylinder, sphereMesh
    }
}