export class PoissonDisk {
    private static readonly neighbourhood = [
        [0, 0], [0, -1], [-1, 0], [1, 0], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1],
        [0, -2], [-2, 0], [2, 0], [0, 2],
        [-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 1], [2, 1], [-1, 2], [1, 2]
    ]
    private readonly squaredRadius: number = this.radius * this.radius
    private readonly cellSize: number = this.radius * Math.SQRT1_2
    public readonly samples: number[] = []
    private readonly stack: number[] = []
    private readonly gridWidth: number = Math.ceil(this.width / this.cellSize)
    private readonly gridHeight: number = Math.ceil(this.height / this.cellSize)
    private readonly grid: Uint32Array = new Uint32Array(this.gridWidth * this.gridHeight)
    constructor(private readonly width: number, private readonly height: number, private readonly radius: number){}
    public fill(random: () => number, limit: number): number[] {
        if(!this.samples.length) this.add(random() * this.width, random() * this.height)
        const distance = this.radius + 1e-6
        const angleIncrement = Math.PI * 2 / limit

        outer: while(this.stack.length > 0){
            const index = random() * this.stack.length | 0
            const i = this.stack[index]
            const prevX = this.samples[i - 2], prevY = this.samples[i - 1]
            
            let angle = random() * 2 * Math.PI
            for(let tries = 0; tries < limit; tries++, angle += angleIncrement){
                const x = prevX + Math.cos(angle) * distance
                const y = prevY + Math.sin(angle) * distance
                if(x < 0 || y < 0 || x >= this.width || y >= this.height) continue
                else if(this.overlap(x, y)) continue
                
                this.add(x, y)
                continue outer
            }
            this.stack[index] = this.stack[this.stack.length - 1]
            this.stack.length-- 
        }
        return this.samples
    }
    private add(x: number, y: number): number {
        const index = (x / this.cellSize | 0) + (y / this.cellSize | 0) * this.gridWidth
        this.samples.push(x, y)
        this.stack.push(this.samples.length)
        return this.grid[index] = this.samples.length
    }
    private overlap(x: number, y: number): boolean {
        const ix = x / this.cellSize | 0
        const iy = y / this.cellSize | 0
        for(let i = PoissonDisk.neighbourhood.length - 1; i >= 0; i--){
            const nx = ix + PoissonDisk.neighbourhood[i][0]
            const ny = iy + PoissonDisk.neighbourhood[i][1]
            if(nx < 0 || ny < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue
            const index = this.grid[nx + ny * this.gridWidth]
            if(index == 0) continue

            const dx = x - this.samples[index - 2]
            const dy = y - this.samples[index - 1]
            if(dx*dx + dy*dy < this.squaredRadius) return true
        }
        return false
    }
    public clear(): void {
        this.grid.fill(0)
        this.samples.length = this.stack.length = 0
    }
}