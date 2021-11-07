export const GL = {
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    SHORT: 5122,
    BYTE: 5120,
    FLOAT: 5126
}

export const DataType = {
    [GL.FLOAT]: Float32Array,
    [GL.SHORT]: Int16Array,
    [GL.UNSIGNED_SHORT]: Uint16Array,
    [GL.BYTE]: Int8Array,
    [GL.UNSIGNED_BYTE]: Uint8Array
}

export class DataBuffer {
    chunks = []
    offset = 0
    add(data){
        const padding = data.BYTES_PER_ELEMENT - this.offset % data.BYTES_PER_ELEMENT
        const range = { byteOffset: this.offset += padding, byteLength: data.byteLength }
        this.offset += range.byteLength
        this.chunks.push({ range, data })
        return range
    }
    join(){
        const arraybuffer = new ArrayBuffer(this.offset)
        for(let i = 0; i < this.chunks.length; i++){
            const { range, data } = this.chunks[i]
            new data.constructor(arraybuffer, range.byteOffset, data.length).set(data, 0)
        }
        return arraybuffer
    }
}

export function packVertexData(input, format){
    const stride = format.reduce((list, attribute, index) => list.concat(Array(attribute.length).fill(index)), [])
    const padding = stride.map((index, i) => index !== stride[i + 1] && format[index].padding || 0)
    const vertexByteSize = stride.reduce((total, index, i) => total + DataType[format[index].dataType].BYTES_PER_ELEMENT + padding[i], 0)    
    const length = input.length / stride.length
    const arraybuffer = new ArrayBuffer(vertexByteSize * length)
    let byteOffset = 0
    for(let i = 0; i < length; i++)
    for(let j = 0; j < stride.length; j++){
        const value = input[i * stride.length + j]
        const type = format[stride[j]].dataType
        const view = new DataType[type](arraybuffer, byteOffset, 1)

        if(!format[stride[j]].normalized) view[0] = value
        else if(type === GL.SHORT) view[0] = 0x7FFF * value | 0
        else if(type === GL.UNSIGNED_SHORT) view[0] = 0xFFFF * value | 0
        else if(type === GL.BYTE) view[0] = 0x7F * value | 0
        else if(type === GL.UNSIGNED_BYTE) view[0] = 0xFF * value | 0
        else view[0] = value

        byteOffset += DataType[type].BYTES_PER_ELEMENT
        byteOffset += padding[j]
    }
    return arraybuffer
}

export function interleaveVertexData(buffers, format, vertexArray){
    const length = buffers[0].length / format[0].length
    const stride = format.reduce((total, attribute) => total + attribute.length, 0)
    vertexArray = vertexArray || new Float32Array(length * stride)
    for(let i = 0; i < length; i++)
    for(let offset = 0, j = 0; j < format.length; j++)
    for(let k = 0; k < format[j].length; k++, offset++)
    vertexArray[i * stride + offset] = buffers[j][(i * format[j].length + k) % buffers[j].length]
    return vertexArray
}