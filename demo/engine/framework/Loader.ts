type IProgressHandler<T> = (remaining: number, value?: T | Error) => void

export interface ILoadedData {
    readonly textures: HTMLImageElement[]
    readonly buffers: ArrayBuffer[]
    readonly audio: ArrayBuffer[]
}

export class Loader {
    private progressBarElement: HTMLDivElement = document.querySelector('.progress_bar div')
    load(manifest: {
        texture: string[]
        buffer: string[]
        audio: string[]
    }, callback: (store: ILoadedData) => void){
        const textures: HTMLImageElement[] = []
        const buffers: ArrayBuffer[] = []
        const audio: ArrayBuffer[] = []
        let total = manifest.texture.length + manifest.buffer.length// + manifest.audio.length
        let progress = 0, totalRemaining = total

        const progressHandler = <T>(index: number, list: T[]): IProgressHandler<T> => {
            let prevRemaining = 0
            return (remaining, value) => {
                if(remaining == -1) return console.error(value)
                else if(remaining == 0 && value){
                    totalRemaining--
                    list[index] = value as T
                }
                progress += remaining - prevRemaining
                prevRemaining = remaining
                this.progressBarElement.style.width = `${Math.round(100 * (1 - progress / total))}%`

                if(totalRemaining == 0) callback({ textures, buffers, audio })
            }
        }

        for(let i = 0; i < manifest.texture.length; i++)
            this.loadImage(manifest.texture[i], progressHandler(i, textures))
        for(let i = 0; i < manifest.buffer.length; i++)
            this.loadFile<ArrayBuffer>(manifest.buffer[i], 'arraybuffer', progressHandler(i, buffers))
        //for(let i = 0; i < manifest.audio.length; i++)
        //    this.loadFile<ArrayBuffer>(manifest.audio[i], 'arraybuffer', progressHandler(i, audio))
    }
    private loadFile<T>(url: string, responseType: XMLHttpRequestResponseType, progress: IProgressHandler<T>){
        const xhr = new XMLHttpRequest()
        xhr.open('GET', encodeURI(url), true)
        xhr.responseType = responseType || 'text'
        xhr.onprogress = (event: ProgressEvent) => event.lengthComputable && progress(1 - event.loaded / event.total)
        xhr.onreadystatechange = (event: Event) => xhr.readyState === XMLHttpRequest.DONE && (
            xhr.status === 200 ? progress(0, xhr.response) : progress(-1, new Error(xhr.statusText))
        )
        xhr.send()
    }
    private loadImage(url: string, progress: IProgressHandler<HTMLImageElement>){
        const image: HTMLImageElement = new Image()
        image.crossOrigin = 'anonymous'
        image.onerror = event => progress(-1, new Error(`${url}`) as Error)
        image.onload = event => progress(0, image)
        image.src = url
    }
    public static awaitUserGesture(callback: () => void){
        const overlay: HTMLDivElement = document.querySelector('.overlay')
        overlay.addEventListener('pointerup', function handleUserGesture(){
            overlay.removeEventListener('pointerup', handleUserGesture)
            overlay.style.opacity = '0'
            overlay.style.pointerEvents = 'none'
            callback()
        })
    }
    public static awaitDocumentLoad(callback: () => void){
        if(document.readyState !== 'loading') callback()
        else document.addEventListener('DOMContentLoaded', callback)
    }
}