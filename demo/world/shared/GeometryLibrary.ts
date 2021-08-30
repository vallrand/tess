import { Application } from '../../engine/framework'
import { createCylinder, createSphere, doubleSided } from '../../engine/geometry'
import { MeshSystem } from '../../engine/components/Mesh'

export function GeometryLibrary(context: Application){
    const sphere = createSphere({
        longitude: 32, latitude: 32, radius: 1
    })
    const sphereMesh = context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format, false)

    const lowPolySphere = createSphere({
        longitude: 16, latitude: 16, radius: 1
    })

    const cylinder = doubleSided(createCylinder({
        radiusTop: 0.5, radiusBottom: 0.5, height: 1,
        radial: 32, horizontal: 1,
        cap: false, angleStart: 0, angleLength: 2*Math.PI
    }))

    return {
        sphere, lowPolySphere, cylinder, sphereMesh
    }
}