type IListener<T> = (value: T) => void
export class Signal<T> {
    private readonly listeners: IListener<T>[] = []
    private iterator: number = -1
    public dispatch(value: T): void {
        if(this.iterator != -1) throw new Error(`${this.iterator}!=-1`)
        for(this.iterator = this.listeners.length - 1; this.iterator >= 0; this.iterator--)
            this.listeners[this.iterator](value)
    }
    addListener(listener: IListener<T>): void {
        const index = this.listeners.indexOf(listener)
        if(index == -1) this.listeners.push(listener)
    }
    removeListener(listener: IListener<T>): void {
        const index = this.listeners.indexOf(listener)
        if(index == -1) return
        this.listeners.splice(index, 1)
        if(index < this.iterator) this.iterator--
    }
}