export function trimAudioBuffer(buffer: AudioBuffer): [number, number] {
    const { numberOfChannels, length, duration } = buffer
    const out: [number, number] = [length, 0]
    for(let channel = 0; channel < numberOfChannels; channel++){
        const data = buffer.getChannelData(channel)
        let start = 0, end = data.length - 1
        while(start < data.length) if(data[start++] != 0) break
        while(end >= 0) if(data[end--] != 0) break
        out[0] = Math.min(out[0], start)
        out[1] = Math.max(out[1], end)
    }
    out[0] *= duration / length
    out[1] *= duration / length
    return out
}