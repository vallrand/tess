import { Application } from '../../engine/framework'
import { vec2 } from '../../engine/math'

class BinaryHeap<T> {
	private moveUp(list: T[], i: number = list.length - 1, value: T = list[i], comparator: (a: T, b: T) => number){
		while(true){
			let j = (i-1)>>1
			if(j < 0 || comparator(value, list[j]) >= 0) break
			list[i] = list[i = j]
		}
		list[i] = value
	}
	private moveDown(list: T[], i: number = 0, value: T = list[i], comparator: (a: T, b: T) => number){
		if(i >= list.length) return
		while(true){
			let j = i*2+1
			if(j+1 < list.length && comparator(list[j], list[j+1]) > 0) j++
			if(j >= list.length || comparator(value, list[j]) <= 0) break
			list[i] = list[i = j]
      	}
      	list[i] = value
	}
	private readonly list: T[] = []
	constructor(private readonly comparator: (a: T, b: T) => number){}
	public get length(): number { return this.list.length }
	public push(item: T){
		this.moveUp(this.list, this.list.length, item, this.comparator)
	}
	public pop(): T {
		const value = this.list[0]
		const last = this.list.pop()
		if(this.list.length) this.moveDown(this.list, 0, last, this.comparator)
		return value
	}
	public remove(item: T){
		const i = this.list.indexOf(item)
		const last = this.list.pop()
		if(i === this.list.length - 1) return
		else if(this.comparator(last, item) < 0) this.moveUp(this.list, i, last, this.comparator)
		else this.moveDown(this.list, i, last, this.comparator)
	}
	public update(item: T){
		this.moveUp(this.list, this.list.indexOf(item), undefined, this.comparator)
	}
	public clear(): void { this.list.length = 0 }
}

export class Pathfinder {
	public static readonly heuristic = {
		manhattan: (a: vec2, b: vec2, scale: number = 1): number => {
			const dx = Math.abs(b[0] - a[0])
        	const dy = Math.abs(b[1] - a[1])
			return scale * (dx + dy)
		},
		diagonal: (a: vec2, b: vec2, scale: number = 1): number => {
        	const dx = Math.abs(b[0] - a[0])
        	const dy = Math.abs(b[1] - a[1])
        	return scale * (dx + dy) + (Math.SQRT2 - 2 * scale) * Math.min(dx, dy)
		},
		euclidean: (a: vec2, b: vec2, scale: number = 1): number => {
			const dx = Math.abs(b[0] - a[0])
        	const dy = Math.abs(b[1] - a[1])
			return scale * Math.sqrt(dx * dx + dy * dy)
		}
	}
	public static readonly neighbours = {
		cardinal: [vec2(1,0), vec2(0,1), vec2(-1,0), vec2(0,-1)],
		diagonal: [vec2(1,0), vec2(1,1), vec2(0,1), vec2(-1,1), vec2(-1,0), vec2(-1,-1), vec2(0,-1), vec2(1,-1)]
	}
	private readonly heap = new BinaryHeap<number>((a,b) =>
		(this.estimate[a] + this.distance[a]) - (this.estimate[b] + this.distance[b]))
	private readonly dirty: number[] = []
	private readonly parent = new Uint32Array(this.size * this.size)
	private readonly flags = new Uint8Array(this.size * this.size)
	private readonly distance = new Float32Array(this.size * this.size)
	private readonly estimate = new Float32Array(this.size * this.size)
	private readonly weight = new Float32Array(this.size * this.size)
	public readonly offset: vec2 = vec2(0, 0)
	public frame: number = 0
    constructor(private readonly context: Application, private readonly size: number){}
	private calculateWeight(start: vec2, end: vec2, startIndex: number, endIndex: number): number {
		const weight = this.weight[endIndex]
		if(start[0] != end[0] && start[1] != end[1]) return weight * Math.SQRT2
		return weight
	}
    public search(origin: vec2, target: vec2, diagonal?: boolean): vec2[] {
		const heuristic = diagonal ? Pathfinder.heuristic.diagonal : Pathfinder.heuristic.manhattan
		const neighbours = diagonal ? Pathfinder.neighbours.diagonal : Pathfinder.neighbours.cardinal
		const tile0 = vec2(), tile1 = vec2()

		const originIndex = (origin[0] - this.offset[0]) + (origin[1] - this.offset[1]) * this.size
		const targetIndex = (target[0] - this.offset[0]) + (target[1] - this.offset[1]) * this.size

		let closest: number = originIndex
		this.estimate[closest] = heuristic(origin, target, 1)
		this.dirty.push(closest)
		this.heap.push(closest)

        while(this.heap.length){
			const node = this.heap.pop()
			if(node === targetIndex) break
			this.flags[node] |= 2

			tile0[0] = node % this.size
			tile0[1] = node / this.size | 0

			for(let i = neighbours.length - 1; i >= 0; i--){
				vec2.add(neighbours[i], tile0, tile1)
				if(tile1[0] < 0 || tile1[1] < 0 || tile1[0] >= this.size || tile1[1] >= this.size) continue
				const neighbour = tile1[0] + tile1[1] * this.size
				const weight = this.calculateWeight(tile0, tile1, node, neighbour)
				if((this.flags[neighbour] & 2) != 0 || weight == 0) continue
				const distance = this.distance[node] + weight
				const visited = (this.flags[neighbour] & 1) != 0
				if(visited && distance >= this.distance[neighbour]) continue

				this.parent[neighbour] = node + 1
				this.distance[neighbour] = distance

				if(!visited){
					this.flags[neighbour] |= 1
					this.estimate[neighbour] = heuristic(tile1, target, 1)
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
		for(let node = closest; this.parent[node]; node = this.parent[node] - 1){
			const waypoint = vec2()
			waypoint[0] = (node % this.size) + this.offset[0]
			waypoint[1] = (node / this.size | 0) + this.offset[1]
			path.unshift(waypoint)
		}
		this.heap.clear()
		while(this.dirty.length){
			const index = this.dirty.pop()
			this.estimate[index] = this.distance[index] = this.flags[index] = 0
			this.parent[index] = 0
		}
        return path
    }
}