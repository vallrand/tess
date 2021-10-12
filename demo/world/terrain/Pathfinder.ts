import { Application, BinaryHeap } from '../../engine/framework'
import { vec2 } from '../../engine/math'

const enum TileStatus {
	Dirty = -1,
	Occupied = 0,
	Visited = 1,
	Closed = 2
}

export class Pathfinder {
	public static readonly heuristic = {
		manhattan: vec2.manhattan,
		euclidean: vec2.distance,
		diagonal: (a: vec2, b: vec2): number => {
			const dx = Math.abs(b[0] - a[0])
        	const dy = Math.abs(b[1] - a[1])
			return Math.max(dx, dy) + (Math.SQRT2-1) * Math.min(dx, dy)
		}
	}
	public static readonly neighbours = {
		cardinal: [vec2(1,0), vec2(0,1), vec2(-1,0), vec2(0,-1)],
		diagonal: [vec2(1,0), vec2(1,1), vec2(0,1), vec2(-1,1), vec2(-1,0), vec2(-1,-1), vec2(0,-1), vec2(1,-1)]
	}
	private static readonly tile0: vec2 = vec2()
	private static readonly tile1: vec2 = vec2()

	private readonly heap = new BinaryHeap<number>(
		(a,b) => (this.estimate[a] + this.distance[a]) - (this.estimate[b] + this.distance[b])
	)
	private readonly dirty: number[] = []
	private readonly parent = new Uint32Array(this.size * this.size)
	private readonly flags = new Uint8Array(this.size * this.size)
	private readonly distance = new Float32Array(this.size * this.size)
	private readonly estimate = new Float32Array(this.size * this.size)

	public readonly weight = new Float32Array(this.size * this.size).fill(TileStatus.Dirty)
	public readonly marked = new Float32Array(this.size * this.size)
	public readonly offset: vec2 = vec2(0, 0)
    constructor(private readonly context: Application, public readonly size: number){}
	private calculateWeight(start: vec2, end: vec2, startIndex: number, endIndex: number): number {
		let weight = this.weight[endIndex]
		if(start[0] != end[0] && start[1] != end[1]){
			weight *= Math.SQRT2
			const left = this.weight[start[0] + end[1] * this.size]
			const right = this.weight[end[0] + start[1] * this.size]
			if(!left && !right) return TileStatus.Occupied
		}
		return weight
	}
	public tileIndex(column: number, row: number): number {
		return column + this.offset[0] + (row + this.offset[1]) * this.size
	}
    public search(origin: vec2, target: vec2, diagonal?: boolean): vec2[] {
		const heuristic = diagonal ? Pathfinder.heuristic.diagonal : Pathfinder.heuristic.manhattan
		const neighbours = diagonal ? Pathfinder.neighbours.diagonal : Pathfinder.neighbours.cardinal
		const { tile0, tile1 } = Pathfinder

		const originIndex = this.tileIndex(origin[0], origin[1])
		const targetIndex = this.tileIndex(target[0], target[1])

		let closest: number = originIndex
		this.estimate[closest] = heuristic(origin, target)
		this.dirty.push(closest)
		this.heap.push(closest)

        while(this.heap.length){
			const node = this.heap.pop()
			if(node === targetIndex) break
			this.flags[node] |= TileStatus.Closed

			tile0[0] = node % this.size
			tile0[1] = node / this.size | 0

			for(let i = neighbours.length - 1; i >= 0; i--){
				vec2.add(neighbours[i], tile0, tile1)
				if(tile1[0] < 0 || tile1[1] < 0 || tile1[0] >= this.size || tile1[1] >= this.size) continue
				const neighbour = tile1[0] + tile1[1] * this.size
				const weight = this.calculateWeight(tile0, tile1, node, neighbour)
				if((this.flags[neighbour] & TileStatus.Closed) != 0 || weight == TileStatus.Occupied) continue
				const distance = this.distance[node] + weight
				const visited = (this.flags[neighbour] & TileStatus.Visited) != 0
				if(visited && distance >= this.distance[neighbour]) continue

				this.parent[neighbour] = node + 1
				this.distance[neighbour] = distance

				if(!visited){
					this.flags[neighbour] |= TileStatus.Visited
					vec2.subtract(tile1, this.offset, tile1)
					this.estimate[neighbour] = heuristic(tile1, target)
					this.dirty.push(neighbour)
				}
				
				if(this.estimate[neighbour] === this.estimate[closest]
					? this.distance[neighbour] < this.distance[closest]
					: this.estimate[neighbour] < this.estimate[closest])
					closest = neighbour

				if(!visited) this.heap.push(neighbour)
				else this.heap.update(neighbour)
			}
        }
        const path = []
		for(let node = closest; node >= 0; node = this.parent[node] - 1)
			path.unshift([
				(node % this.size) - this.offset[0],
				(node / this.size | 0) - this.offset[1]
			])
		this.heap.clear()
		while(this.dirty.length){
			const index = this.dirty.pop()
			this.estimate[index] = this.distance[index] = 0
			this.parent[index] = this.flags[index] = 0
		}
        return path
    }
}