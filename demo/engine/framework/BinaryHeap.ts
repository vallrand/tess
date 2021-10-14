export class BinaryHeap<T> {
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
	public get(index: number): T { return this.list[index] }
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