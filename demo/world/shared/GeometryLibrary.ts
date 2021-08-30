import { Application } from '../../engine/framework'
import { createSphere, doubleSided } from '../../engine/geometry'
import { MeshSystem } from '../../engine/components/Mesh'

export function GeometryLibrary(context: Application){
    const sphere = createSphere({
        longitude: 32, latitude: 32, radius: 1
    })
    const sphereMesh = context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format, false)

    return {
        sphere, sphereMesh
    }
}