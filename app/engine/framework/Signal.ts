export class Signal<Subscriber extends (...args: any[]) => void> {
    private readonly subscribers: Subscriber[] = []
    private readonly iterator: number[] = []
    public broadcast(...args: Parameters<Subscriber>): void {
        const iterator = this.iterator, i = iterator.length
        for(iterator[i] = this.subscribers.length - 1; iterator[i] >= 0; iterator[i]--)
            this.subscribers[iterator[i]].apply(this, arguments)
        iterator.length--
    }
    public add(subscriber: Subscriber): void {
        const index = this.subscribers.indexOf(subscriber)
        if(index == -1) this.subscribers.push(subscriber)
    }
    public remove(subscriber: Subscriber): void {
        const index = this.subscribers.indexOf(subscriber)
        if(index == -1) return
        this.subscribers.splice(index, 1)
        for(let i = this.iterator.length - 1; i >= 0; i--)
            if(index < this.iterator[i]) this.iterator[i]--
    }
}