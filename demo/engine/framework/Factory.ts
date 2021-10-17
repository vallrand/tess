// export class Factory<T> {
//     private readonly pool: T[] = []
//     constructor(private readonly Factory: new () => T){}
//     public create(): T {
//         const item = this.pool.pop() || new this.Factory()
//         return item
//     }
//     public delete(item: T): void {
//         this.pool.push(item)
//     }
// }

export class Factory<T extends { index: number }> {
    private readonly pool: T[] = []
    public readonly list: T[] = []
    constructor(private readonly Factory: new () => T){}
    public create(): T {
        const item = this.pool.pop() || new this.Factory()
        item.index = this.list.push(item) - 1
        return item
    }
    public delete(item: T): void {
        if(item.index == -1) return
        this.list[item.index] = this.list[this.list.length - 1]
        this.list[item.index].index = item.index
        this.list.length--
        item.index = -1
        this.pool.push(item)
    }
}