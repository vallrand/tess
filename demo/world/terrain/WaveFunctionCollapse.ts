abstract class WaveFunctionCollapse {
    static randomIndex(weights: number[] | Float32Array, random: number, total: number = 0): number {
        if(!total) for(let i = weights.length - 1; i >= 0; i--) total += weights[i]
        random *= total
        for(let i = weights.length - 1; i >= 0; i--)
            if((total -= weights[i]) <= random) return i
    }
    protected static readonly dx = [-1, 0, 1, 0]
    protected static readonly dy = [0, 1, 0, -1]
    protected static readonly opposite = [2, 3, 0, 1]
    
    protected wave: Uint8Array
    protected propagator: number[][]
    private compatible: Uint32Array
    protected visited: Int32Array
    private lastVisited: number = 0
    private readonly stack: number[] = []
    protected count: number
    protected weights: Float32Array
    private logWeights: Float32Array
    private distribution: Float32Array
    private remainders: Int32Array
    private totalWeight: number
    private totalLogWeight: number
    private initialEntropy: number
    private nodeTotalWeight: Float32Array
    private nodeTotalLogWeight: Float32Array
    private entropies: Float32Array

    protected constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly size: number,
        protected periodic: boolean,
        public heuristic: 'entropy' | 'scanline' | 'min'
    ){}
    private precalculate(): void {
        if(this.wave) return
        this.visited = new Int32Array(this.width * this.height)
        this.wave = new Uint8Array(this.visited.length * this.count)
        this.compatible = new Uint32Array(this.visited.length * this.count * 4)
        this.distribution = new Float32Array(this.count)
        this.logWeights = new Float32Array(this.count)
        this.totalWeight = this.totalLogWeight = 0
        for(let i = 0; i < this.count; i++){
            this.totalWeight += this.weights[i]
            this.logWeights[i] = this.weights[i] * Math.log(this.weights[i])
            this.totalLogWeight += this.logWeights[i]
        }
        this.initialEntropy = Math.log(this.totalWeight) - this.totalLogWeight / this.totalWeight

        this.remainders = new Int32Array(this.visited.length)
        this.nodeTotalWeight = new Float32Array(this.visited.length)
        this.nodeTotalLogWeight = new Float32Array(this.visited.length)
        this.entropies = new Float32Array(this.visited.length)
    }
    public generate(random: () => number, limit: number): boolean {
        this.precalculate()
        this.clear()
        for(let l = 0; l < limit || limit < 0; l++){
            let node = this.next(random)
            if(node >= 0){
                this.visit(node, random)
                if(!this.propagate()) return false
                continue
            }
            break
        }
        for(let i = 0; i < this.visited.length; i++) if(this.remainders[i] == 1)
        for(let j = 0; j < this.count; j++) if(this.wave[i * this.count + j]){
            this.visited[i] = j
            break
        }
        return true
    }
    private next(random: () => number): number {
        let min = 1e3, node = -1
        for(let i = this.lastVisited; i < this.visited.length; i++){
            if(!this.periodic && (i % this.width + this.size > this.width || (i / this.width | 0) + this.size > this.height)) continue
            if(this.remainders[i] <= 1) continue
            if(this.heuristic === 'scanline'){
                this.lastVisited = i + 1
                return i
            }
            let entropy = this.heuristic == 'entropy' ? this.entropies[i] : this.remainders[i]
            if(entropy > min) continue
            else if((entropy += 1e-6 * random()) >= min) continue
            min = entropy
            node = i
        }
        return node
    }
    private visit(node: number, random: () => number): void {
        let total = 0, _j = node * this.count
        for(let j = 0; j < this.count; j++) total += this.distribution[j] = this.wave[_j + j] ? this.weights[j] : 0
        const index = WaveFunctionCollapse.randomIndex(this.distribution, random(), total)
        for(let j = 0; j < this.count; j++) if(this.wave[_j + j] && j != index) this.remove(node, j)
    }
    protected propagate(): boolean {
        const { dx, dy } = WaveFunctionCollapse
        while(this.stack.length){
            const j1 = this.stack.pop(), i1 = this.stack.pop()
            const x1 = i1 % this.width
            const y1 = i1 / this.width | 0
            for(let d = 0; d < 4; d++){
                let x2 = x1 + dx[d]
                let y2 = y1 + dy[d]
                if(!this.periodic && (x2 < 0 || y2 < 0 || x2 + this.size > this.width || y2 + this.size > this.height)) continue
                if(x2 < 0) x2 += this.width
                else if(x2 >= this.width) x2 -= this.width
                if(y2 < 0) y2 += this.height
                else if(y2 >= this.height) y2 -= this.height

                const i2 = x2 + y2 * this.width
                const propagator = this.propagator[j1 * 4 + d]
                for(let i = 0; i < propagator.length; i++){
                    const j2 = propagator[i]
                    if(--this.compatible[(i2 * this.count + j2) * 4 + d] == 0) this.remove(i2, j2)
                }
            }
        }
        return this.remainders[0] > 0
    }
    protected remove(i: number, j: number): void {
        this.stack.push(i, j)
        this.wave[i * this.count + j] = 0
        for(let _d = (i * this.count + j) * 4, d = 0; d < 4; d++) this.compatible[_d + d] = 0
        this.remainders[i] -= 1
        this.nodeTotalWeight[i] -= this.weights[j]
        this.nodeTotalLogWeight[i] -= this.logWeights[j]
        this.entropies[i] = Math.log(this.nodeTotalWeight[i]) - this.nodeTotalLogWeight[i] / this.nodeTotalWeight[i]
    }
    protected clear(): void {
        for(let i = this.lastVisited = 0; i < this.visited.length; i++){
            this.remainders[i] = this.weights.length
            this.nodeTotalWeight[i] = this.totalWeight
            this.nodeTotalLogWeight[i] = this.totalLogWeight
            this.entropies[i] = this.initialEntropy
            this.visited[i] = -1
            for(let _j = i * this.count, j = 0; j < this.count; j++){
                this.wave[_j + j] = 1
                for(let _d = (_j + j) * 4, d = 0; d < 4; d++)
                    this.compatible[_d + d] = this.propagator[j*4+WaveFunctionCollapse.opposite[d]].length
            }
        }
    }
}

export class TextureMapGenerator extends WaveFunctionCollapse {
    static copy(size: number, sampler: (x: number, y: number, size: number) => number, source: number[], out: number[]){
        for(let x = 0; x < size; x++) for(let y = 0; y < size; y++)
            out[x+y*size] = source[sampler(x, y, size)]
        return out
    }
    static extract(
        source: number[], width: number, height: number, offsetX: number, offsetY: number,
        size: number, out: number[]
    ): number[] {
        for(let y = 0; y < size; y++) for(let x = 0; x < size; x++)
            out[x + y * size] = source[(offsetX + x) % width + ((offsetY + y) % height) * width]
        return out
    }
    static symmetries = [
        (x: number, y: number, size: number) => x + y * size,
        (x: number, y: number, size: number) => size - 1 - y + x * size,
        (x: number, y: number, size: number) => size - 1 - x + (size - 1 - y) * size,
        (x: number, y: number, size: number) => y + (size - 1 - x) * size,
        (x: number, y: number, size: number) => size - 1 - x + y * size,
        (x: number, y: number, size: number) => size - 1 - y + (size - 1 - x) * size,
        (x: number, y: number, size: number) => x + (size - 1 - y) * size,
        (x: number, y: number, size: number) => y + x * size
    ]
    static overlap(v0: number[], v1: number[], dx: number, dy: number, size: number): boolean {
        let xmin = dx < 0 ? 0 : dx, xmax = dx < 0 ? dx + size : size
        let ymin = dy < 0 ? 0 : dy, ymax = dy < 0 ? dy + size : size
        for(let y = ymin; y < ymax; y++) for(let x = xmin; x < xmax; x++)
            if(v0[x + size * y] != v1[x - dx + size * (y - dy)]) return false
        return true
    }

    public readonly colors: number[] = []
    public readonly patterns: number[][]
    private mask: boolean[]

    constructor(
        size: number, width: number, height: number, periodic: boolean,
        bitmap: ImageData, inPeriodic: boolean, symmetry: number
    ){
        super(width, height, size, periodic, 'min')

        const inWidth = bitmap.width, inHeight = bitmap.height, bitmapData = new Uint32Array(bitmap.data.buffer)
        const sample: number[] = new Uint32Array(inWidth * inHeight) as any, colorMap: Record<number, number> = {}
        for(let y = 0; y < inHeight; y++) for(let x = 0; x < inWidth; x++){
            const color = bitmapData[x + y * inWidth]
            if(colorMap[color] == null) colorMap[color] = this.colors.push(color) - 1
            sample[x + y * inWidth] = colorMap[color]
        }
        
        const weights: Record<number, number> = {}
        const ordering: number[] = []
        const patterns: number[][] = Array(8)
        for(let i = 0; i < 8; i++) patterns[i] = Array(size * size)

        for(let yl = inPeriodic ? inHeight : inHeight - size + 1, y = 0; y < yl; y++)
        for(let xl = inPeriodic ? inWidth : inWidth - size + 1, x = 0; x < xl; x++){
            TextureMapGenerator.extract(sample, inWidth, inHeight, x, y, this.size, patterns[0])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[4], patterns[0], patterns[1])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[1], patterns[0], patterns[2])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[5], patterns[0], patterns[3])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[2], patterns[0], patterns[4])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[6], patterns[0], patterns[5])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[3], patterns[0], patterns[6])
            TextureMapGenerator.copy(size, TextureMapGenerator.symmetries[7], patterns[0], patterns[7])
            for(let k = 0; k < symmetry; k++){
                const index = this.patternHash(patterns[k])
                if(!weights[index]){
                    weights[index] = 1
                    ordering.push(index)
                }else weights[index]++
            }
        }

        this.count = ordering.length
        this.patterns = new Array(this.count)
        this.weights = new Float32Array(this.count)
        for(let i = 0; i < this.count; i++){
            this.patterns[i] = this.hashPattern(ordering[i], Array(size * size))
            this.weights[i] = weights[ordering[i]]
        }

        this.propagator = new Array(4 * this.count)
        for(let d = 0; d < 4; d++) for(let t = 0; t < this.count; t++){
            const propagator = this.propagator[t * 4 + d] = []
            for(let j2 = 0; j2 < this.count; j2++)
                if(TextureMapGenerator.overlap(this.patterns[t], this.patterns[j2], WaveFunctionCollapse.dx[d], WaveFunctionCollapse.dy[d], size))
                    propagator.push(j2)
        }
    }
    public patternHash(pattern: number[] | Uint32Array): number {
        let hash = 0, power = 1, count = this.colors.length
        for(let length = pattern.length, i = 0; i < length; i++, power *= count)
            hash += pattern[length - 1 - i] * power
        return hash
    }
    public hashPattern(hash: number, out: number[]): number[] {
        let count = this.colors.length, power = Math.pow(count, this.size * this.size - 1)
        for(let i = 0; i < out.length; i++, power /= count){
            const value = out[i] = hash / power | 0
            hash -= value * power
        }
        return out
    }
    public graphics(out: ImageData): ImageData {
        if(this.visited[0] < 0) return
        out = out || new ImageData(new Uint8ClampedArray(this.width * this.height * 4), this.width, this.height)
        const bitmapData = new Uint32Array(out.data.buffer)
        for(let y = 0; y < this.height; y++){
            let dy = y < this.height - this.size + 1 ? 0 : this.size - 1
            for(let x = 0; x < this.width; x++){
                let dx = x < this.width - this.size + 1 ? 0 : this.size - 1
                const color = this.colors[this.patterns[this.visited[x - dx + (y - dy) * this.width]][dx + dy * this.size]]
                bitmapData[x + y * this.width] = color
            }
        }
        return out
    }
    public set(x: number, y: number, color: number): void {
        if(!this.mask) this.mask = new Array(this.width * this.height * this.count)
        const index = this.colors.indexOf(color)
        for(let dy = 0; dy < this.size; dy++) for(let dx = 0; dx < this.size; dx++){
            let x0 = x - dx
            let y0 = y - dy
            if(!this.periodic && (x0 + this.size > this.width || y0 + this.size > this.height || x0 < 0 || y0 < 0)) continue
            if(x0 < 0) x0 += this.width
            if(y0 < 0) y0 += this.height
            for(let j = 0; j < this.count; j++)
            if(this.patterns[j][dx+dy*this.size] !== index) this.mask[(x0+y0*this.width) * this.count + j] = true
        }
    }
    public unset(): void {
        if(!this.mask) this.mask = new Array(this.width * this.height * this.count)
        this.mask.fill(false)
    }
    protected clear(): void {
        super.clear()
        if(!this.mask) return
        for(let i = 0; i < this.visited.length; i++) for(let j = 0; j < this.count; j++)
        if(this.mask[i * this.count + j]) this.remove(i, j)
        if(!this.propagate()) throw 'Impossible configuration'
    }
}


export class TileSetMapGenerator extends WaveFunctionCollapse {
    static symmetry = {
        'L':{ cardinality: 4,
            rotate: i => (i + 1) % 4,
            reflect: i => i % 2 == 0 ? i + 1 : i - 1
        },
        'T':{ cardinality: 4,
            rotate: i => (i + 1) % 4,
            reflect: i => i % 2 == 0 ? i : 4 - i
        },
        'I':{ cardinality: 2, rotate: i => 1 - i, reflect: i => i },
        '\\':{ cardinality: 2, rotate: i => 1 - i, reflect: i => 1 - i },
        'F':{ cardinality: 8,
            rotate: i => i < 4 ? (i + 1) % 4 : 4 + (i - 1) % 4,
            reflect: i => i < 4 ? i + 4 : i - 4
        },
        'X':{ cardinality: 1, rotate: i => i, reflect: i => i }
    }

    private readonly tiles: number[] = []
    constructor(tiles: {
        symmetry: (keyof typeof TileSetMapGenerator.symmetry)[]
        weight: number[]
        constraints: [number,number,number,number][]
    }, width: number, height: number, periodic: boolean){
        super(width, height, 1, periodic, 'min')
        const weights: number[] = [], order: number[] = [], indices: number[][] = []

        for(let i = 0; i < tiles.symmetry.length; i++){
            const { rotate, reflect, cardinality } = TileSetMapGenerator.symmetry[tiles.symmetry[i]]
            const offset = indices.length
            order.push(offset)

            for(let k = 0; k < cardinality; k++){
                indices.push([
                    offset + k,
                    offset + rotate(k),
                    offset + rotate(rotate(k)),
                    offset + rotate(rotate(rotate(k))),
                    offset + reflect(k),
                    offset + reflect(rotate(k)),
                    offset + reflect(rotate(rotate(k))),
                    offset + reflect(rotate(rotate(rotate(k))))
                ])
                this.tiles.push(i * 8 + k)
                weights.push(tiles.weight[i] || 1)
            }
        }
        this.count = indices.length
        this.weights = new Float32Array(weights)
        this.propagator = new Array(4 * this.count)
        const densePropagator = new Array(4 * this.count * this.count)

        for(let i = 0; i < tiles.constraints.length; i++){
            const [ i0, k0, i1, k1 ] = tiles.constraints[i]
            const L = indices[order[i0]][k0], D = indices[L][1]
            const R = indices[order[i1]][k1], U = indices[R][1]

            densePropagator[0 + 4*R + 4*this.count*L] = true
            densePropagator[0 + 4*indices[R][6] + 4*this.count*indices[L][6]] = true
            densePropagator[0 + 4*indices[L][4] + 4*this.count*indices[R][4]] = true
            densePropagator[0 + 4*indices[L][2] + 4*this.count*indices[R][2]] = true

            densePropagator[1 + 4*U + 4*this.count*D] = true
            densePropagator[1 + 4*indices[D][6] + 4*this.count*indices[U][6]] = true
            densePropagator[1 + 4*indices[U][4] + 4*this.count*indices[D][4]] = true
            densePropagator[1 + 4*indices[D][2] + 4*this.count*indices[U][2]] = true
        }
        for(let j2 = 0; j2 < this.count; j2++) for(let j1 = 0; j1 < this.count; j1++){
            densePropagator[2 + 4*j2 + 4*this.count*j1] = densePropagator[0 + 4*j1 + 4*this.count*j2]
            densePropagator[3 + 4*j2 + 4*this.count*j1] = densePropagator[1 + 4*j1 + 4*this.count*j2]
        }
        for(let d = 0; d < 4; d++) for(let j1 = 0; j1 < this.count; j1++){
            const sparse = this.propagator[j1 * 4 + d] = []
            for(let j2 = 0; j2 < this.count; j2++)
                if(densePropagator[d + 4*j1 + 4*this.count*j2]) sparse.push(j2)
            if(!sparse.length) throw `Tile ${this.tiles[j1]/8|0} has no neighbours in direction ${d}`
        }
    }
    graphics(tileset: ImageData[], out: ImageData): ImageData {
        if(this.visited[0] < 0) return
        const tileSize = tileset[0].width
        out = out || new ImageData(new Uint8ClampedArray(this.width * this.height * tileSize * tileSize * 4), this.width * tileSize, this.height * tileSize)
        const bitmapData = new Uint32Array(out.data.buffer)
        const imageData = new Uint32Array(tileSize * tileSize)
        for(let x = 0; x < this.width; x++) for(let y = 0; y < this.height; y++){
            const tile = this.tiles[this.visited[x + y * this.width]]
            const index = tile / 8 | 0
            const cardinality = tile % 8
            TextureMapGenerator.copy(tileSize, TextureMapGenerator.symmetries[cardinality], new Uint32Array(tileset[index].data.buffer) as any, imageData as any)
            for(let xt = 0; xt < tileSize; xt++) for(let yt = 0; yt < tileSize; yt++){
                const color = imageData[xt + yt * tileSize]
                bitmapData[x * tileSize + xt + (y * tileSize + yt) * this.width * tileSize] = color
            }
        }
        return out
    }
}