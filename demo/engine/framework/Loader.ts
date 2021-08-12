export type IProgressHandler<T> = (remaining: number, value?: T | Error) => void

export function ready(callback: Function): void {
    if(document.readyState !== 'loading') callback()
    else document.addEventListener('DOMContentLoaded', callback as any)
}

export function ProgressHandler(start: Function): IProgressHandler<void> {
    const progressBarElement: HTMLDivElement = document.querySelector('.progress_bar div')
    let total = -1, progress = 0

    const overlay: HTMLDivElement = document.querySelector('.overlay')
    overlay.addEventListener('pointerup', function handleUserGesture(){
        if(total < 0 || progress < 100) return
        overlay.removeEventListener('pointerup', handleUserGesture)
        overlay.style.opacity = '0'
        start()
    })

    return function(remaining: number, value?: void | Error){
        if(remaining == -1) return console.error(value)
        total = Math.max(total, remaining)
        progress = Math.max(progress, Math.round(100 * (1 - remaining / total)))
        progressBarElement.style.width = `${progress}%`
    }
}

export function loadFile<T>(url: string, responseType: XMLHttpRequestResponseType, progress: IProgressHandler<T>){
    const xhr = new XMLHttpRequest()
    xhr.open('GET', encodeURI(url), true)
    xhr.responseType = responseType || 'text'

    xhr.onprogress = (event: ProgressEvent) => event.lengthComputable && progress(1 - event.loaded / event.total)
    xhr.onreadystatechange = (event: Event) => xhr.readyState === XMLHttpRequest.DONE && (
        xhr.status === 200 ? progress(0, xhr.response) : progress(-1, new Error(xhr.statusText))
    )
    progress(1)
    xhr.send()
}