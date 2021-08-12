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

export class BoxPacker {
    static pack(items, options){
        const spritesheets = []
        outer: for(let i = 0; i < items.length; i++){
            const item = items[i]
            for(let length = spritesheets.length, j = 0; j <= length; j++){
                if(!spritesheets[j]) spritesheets[j] = new BoxPacker(options)
                if(!spritesheets[j].filled.every(node => (node.reference.group & item.group) != 0)) continue
                if(!spritesheets[j].insert(item, item.width + item.padding, item.height + item.padding)) continue
                continue outer
            }
            throw new Error(`Image "${item.filename}" ${item.width}x${item.height} exceeds ${spritesheets[0].options.width}x${spritesheets[0].options.height}!`)
        }
        return spritesheets
    }
    static sort = {
        distance: (a, b) => a.x * a.x + a.y * a.y - b.x * b.x + b.y * b.y,
        top: (a, b) => a.y - b.y || a.x - b.x,
        left: (a, b) => a.x - b.x || a.y - b.y
    }
    constructor(options){
        this.options = { sort: BoxPacker.sort.distance, ...options }
        this.clear()
    }
    insert(reference, width, height){
        const empty = this.empty.find(empty => width <= empty.width && height <= empty.height)
        if(!empty) return false
        const filled = { x: empty.x, y: empty.y, width, height, reference }
        this.filled.push(filled)

        const list = []
        for(let i = this.empty.length - 1; i >= 0; i--){
            const empty = this.empty[i]
            if(
                filled.x >= empty.x + empty.width ||
                filled.x + filled.width <= empty.x ||
                filled.y >= empty.y + empty.height ||
                filled.y + filled.height <= empty.y
            ) list.push(empty)
            else{
                if(empty.x < filled.x)
                    list.push({ x: empty.x, y: empty.y, width: filled.x - empty.x, height: empty.height })
                if(empty.x + empty.width > filled.x + filled.width)
                    list.push({ x: filled.x + filled.width, y: empty.y, width: empty.x + empty.width - filled.x + filled.width, height: empty.height })
                if(empty.y < filled.y)
                    list.push({ x: empty.x, y: empty.y, width: empty.width, height: filled.y - empty.y })
                if(empty.y + empty.height > filled.y + filled.height)
                    list.push({ x: empty.x, y: filled.y + filled.height, width: empty.width, height: empty.y + empty.height - filled.y + filled.height })
            }
        }
        this.empty = list.sort(this.options.sort).filter(empty => list.every(node => node === empty || !(
            empty.x >= node.x && (empty.x + empty.width) <= (node.x + node.width) &&
            empty.y >= node.y && (empty.y + empty.height) <= (node.y + node.height)
        )))
        this.width = Math.max(this.width, filled.x + filled.width)
        this.height = Math.max(this.height, filled.y + filled.height)
        return filled
    }
    clear(){
        this.filled = []
        this.width = this.height = 0
        this.empty = [{ x: 0, y: 0, width: this.options.width, height: this.options.height }]
    }
}