import { VertexDataFormat } from '../webgl/shared'

export function createPlane(options: {
    width: number
    height: number
    columns: number
    rows: number
}){
    const { width, height, columns = 1, rows = 1 } = options
    const vertical = columns + 1, horizontal = rows + 1
    const vertexArray = new Float32Array(vertical * horizontal * (3 + 3 + 2))
    const indexArray = new Uint16Array(columns * rows * 6)

    for(let c = 0; c < vertical; c++)
    for(let r = 0; r < horizontal; r++){
        const index = (c * horizontal + r) * (3+3+2)
        vertexArray[index + 0] = width * c / columns - 0.5 * width
        vertexArray[index + 1] = 0
        vertexArray[index + 2] = height * r / rows - 0.5 * height
        vertexArray[index + 3] = 0
        vertexArray[index + 4] = 1
        vertexArray[index + 5] = 0
        vertexArray[index + 6] = c / columns
        vertexArray[index + 7] = 1 - r / rows
    }
    for(let c = 0; c < columns; c++)
    for(let r = 0; r < rows; r++){
        const index = (c * rows + r) * 6
        indexArray[index + 0] = r + horizontal * c
        indexArray[index + 1] = r + 1 + horizontal * c
        indexArray[index + 2] = r + horizontal * (c + 1)
        indexArray[index + 3] = r + horizontal * (c + 1)
        indexArray[index + 4] = r + 1 + horizontal * c
        indexArray[index + 5] = r + 1 + horizontal * (c + 1)
    }
    return { format: VertexDataFormat.Static, vertexArray, indexArray }
}