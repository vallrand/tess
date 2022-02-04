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

	public readonly heap = new BinaryHeap<number>(
		(a,b) => (this.estimate[a] + this.distance[a]) - (this.estimate[b] + this.distance[b])
	)
	public readonly orderedQueue = new BinaryHeap<number>(
		(a,b) => (this.distance[a] - this.distance[b]) || (this.estimate[a] - this.estimate[b])
	)
	public readonly dirty: number[] = []
	public readonly queue: number[] = []
	public readonly parent = new Uint32Array(this.size * this.size)
	public readonly flags = new Uint8Array(this.size * this.size)
	public readonly distance = new Float32Array(this.size * this.size)
	public readonly estimate = new Float32Array(this.size * this.size)

	public readonly weight = new Float32Array(this.size * this.size).fill(TileStatus.Dirty)
	public readonly marked = new Float32Array(this.size * this.size)
	public readonly influence = new Uint32Array(this.size * this.size)
	public readonly offset: vec2 = vec2(0, 0)
    constructor(private readonly context: Application, public readonly size: number){}

	private calculateSingleWeight(start: vec2, end: vec2, size: vec2, threshold?: number): number {
		let weight = this.weight[end[0] + end[1] * this.size]
		if(start[0] !== end[0] && start[1] !== end[1]){
			const left = this.weight[start[0] + end[1] * this.size]
			const right = this.weight[end[0] + start[1] * this.size]
			if(!left && !right) return TileStatus.Occupied
			weight += (Math.SQRT2-1) * Math.max(left, right)
		}
		if(threshold != null && weight > threshold) return TileStatus.Occupied
		return weight
	}	
	private calculateAreaWeight(start: vec2, end: vec2, size: vec2, threshold?: number): number {
		let x0 = end[0], x1 = end[0] + size[0]
		let y0 = end[1], y1 = end[1] + size[1]
		const dx = end[0] - start[0], dy = end[1] - start[1]
		if(dx === 0){
			if(dy > 0) y0 = Math.max(y0, y1 - dy)
			else y1 = Math.min(y1, y0 - dy)
		}else if(dy === 0){
			if(dx > 0) x0 = Math.max(x0, x1 - dx)
			else x1 = Math.min(x1, x0 - dx)
		}
		let weight: number = 1
		for(let x = x0; x < x1; x++)
		for(let y = y0; y < y1; y++){
			const sample = this.weight[x + y * this.size]
			if(!sample) return TileStatus.Occupied
			weight = Math.max(weight, sample)
		}
		if(threshold != null && weight > threshold) return TileStatus.Occupied
		return weight
	}
	public tileIndex(column: number, row: number): number {
		return column + this.offset[0] + (row + this.offset[1]) * this.size
	}
	public indexTile(index: number, out: vec2): vec2 {
		out[0] = (index % this.size) - this.offset[0]
		out[1] = (index / this.size | 0) - this.offset[1]
		return out
	}
	public add(origin: vec2): void {
		this.dirty.push(this.tileIndex(origin[0], origin[1]))
	}
    public search(target: vec2, size: vec2, diagonal?: boolean, threshold?: number): number {
		const heuristic = diagonal ? Pathfinder.heuristic.diagonal : Pathfinder.heuristic.manhattan
		const neighbours = diagonal ? Pathfinder.neighbours.diagonal : Pathfinder.neighbours.cardinal
		const sampleWeight = vec2.equals(vec2.ONE, size, 0) ? this.calculateSingleWeight : this.calculateAreaWeight
		const { tile0, tile1 } = Pathfinder

		for(let i = this.dirty.length - 1; i >= 0; i--){
			const originIndex = this.dirty[i]
			if(this.flags[originIndex]) continue
			this.indexTile(originIndex, tile0)
			this.estimate[originIndex] = heuristic(tile0, target)
			this.flags[originIndex] |= TileStatus.Visited
			this.heap.push(originIndex)
		}
		
		const targetIndex = this.tileIndex(target[0], target[1])
		let closest: number = this.heap.get(0)
        while(this.heap.length){
			const node = this.heap.shift()
			if(node === targetIndex) break
			this.flags[node] |= TileStatus.Closed

			tile0[0] = node % this.size
			tile0[1] = node / this.size | 0

			for(let i = neighbours.length - 1; i >= 0; i--){
				vec2.add(neighbours[i], tile0, tile1)
				if(tile1[0] < 0 || tile1[1] < 0 || tile1[0] >= this.size || tile1[1] >= this.size) continue
				const neighbour = tile1[0] + tile1[1] * this.size
				const weight = sampleWeight.call(this, tile0, tile1, size, threshold)
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
        return closest
    }
	linkPath(start: number): number[] {
		const path = []
		for(let node = start; node >= 0; node = this.parent[node] - 1)
			path.unshift(node)
		return path
	}
	walk<T>(
		enter: (this: T, node: number, tile: vec2, distance: number, parent: number, first: boolean) => boolean, context: T,
		size: vec2, diagonal?: boolean, threshold?: number, ordered?: boolean
	): void {
		const neighbours = diagonal ? Pathfinder.neighbours.diagonal : Pathfinder.neighbours.cardinal
		const sampleWeight = vec2.equals(vec2.ONE, size, 0) ? this.calculateSingleWeight : this.calculateAreaWeight
		const queue = ordered ? this.orderedQueue : this.queue
		const { tile0, tile1 } = Pathfinder

		for(let i = this.dirty.length - 1; i >= 0; i--){
			const originIndex = this.dirty[i]
			if(this.flags[originIndex]) continue
			if(!enter.call(context, originIndex, this.indexTile(originIndex, tile0), 0, -1, true)) continue
			queue.push(originIndex)
			this.flags[originIndex] = TileStatus.Visited
		}

		while(queue.length){
			const node = queue.shift()
			const distance = this.distance[node]
			tile0[0] = node % this.size
			tile0[1] = node / this.size | 0

			for(let i = neighbours.length - 1; i >= 0; i--){
				vec2.add(neighbours[i], tile0, tile1)
				if(tile1[0] < 0 || tile1[1] < 0 || tile1[0] >= this.size || tile1[1] >= this.size) continue
				const neighbour = tile1[0] + tile1[1] * this.size
				const weight = sampleWeight.call(this, tile0, tile1, size, threshold)
				if(weight == TileStatus.Occupied) continue
				if(!enter.call(context, neighbour, vec2.subtract(tile1, this.offset, tile1), distance + 1, node, !this.flags[neighbour])) continue
				if(this.flags[neighbour] === TileStatus.Visited) continue
				this.flags[neighbour] = TileStatus.Visited
				this.parent[neighbour] = node + 1
				this.distance[neighbour] = distance + 1
				this.dirty.push(neighbour)
				queue.push(neighbour)
			}
		}
	}
	public clear(): void {
		this.heap.clear()
		this.orderedQueue.clear()
		this.queue.length = 0
		while(this.dirty.length){
			const index = this.dirty.pop()
			this.estimate[index] = this.distance[index] = 0
			this.parent[index] = this.flags[index] = 0
		}
	}
}