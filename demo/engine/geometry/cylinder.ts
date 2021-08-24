import { VertexDataFormat } from '../webgl/shared'

export function createCylinder(options: {
    radiusTop: number
    radiusBottom: number
    height: number
    horizontal: number
    radial: number
    cap: boolean
    angleStart: number
    angleLength: number
}){
    const {
        radiusTop = 1,
        radiusBottom = 1,
        height = 1,
        radial = 8,
        horizontal = 1,
        cap = false,
        angleStart = 0,
        angleLength = 2 * Math.PI
    } = options
    const radial1 = radial + 1, horizontal1 = horizontal + 1
    const vertexArray = new Float32Array(horizontal1 * radial1 * (3 + 3 + 2))
    const indexArray = new Uint16Array(radial * horizontal * 6)

    const slope = (radiusBottom - radiusTop) / height
    for(let y = 0; y <= horizontal; y++){
        const v = y / horizontal
        const radius = radiusTop + v * (radiusBottom - radiusTop)
        for(let x = 0; x <= radial; x++){
            const u = x / radial
            const angle = angleStart + u * angleLength
            const sin = Math.sin(angle), cos = Math.cos(angle)

            const i = (x + y * radial1) * (3+3+2)

            vertexArray[i+0] = radius * sin
            vertexArray[i+1] = -v * height + 0.5*height
            vertexArray[i+2] = radius * cos

            let invLength = sin*sin + slope*slope + cos*cos
            invLength = invLength && 1 / Math.sqrt(invLength)
            vertexArray[i+3] = invLength * sin
            vertexArray[i+4] = invLength * slope
            vertexArray[i+5] = invLength * cos

            vertexArray[i+6] = u
            vertexArray[i+7] = 1-v
        }
    }
    for(let x = 0; x < radial; x++)
    for(let y = 0; y < horizontal; y++){
        const i = 6 * (x * horizontal + y)
        indexArray[i+0] = y * radial1 + x
        indexArray[i+1] = indexArray[i+3] = (y + 1) * radial1 + x
        indexArray[i+4] = (y + 1) * radial1 + (x + 1)
        indexArray[i+2] = indexArray[i+5] = y * radial1 + (x + 1)
    }
    cap: {
        if(!cap) break cap
    }

    return { format: VertexDataFormat.Static, vertexArray, indexArray }
}