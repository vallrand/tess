float hash11(in float uv){
    uint v = floatBitsToUint(uv);
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float hash21(in vec2 uv) {
    uvec2 v = floatBitsToUint(uv);
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float hash31(in vec3 uv){
    uvec3 v = floatBitsToUint(uv);
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y; h *= M; h ^= v.z;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}
float hash41(in vec4 uv){
    uvec4 v = floatBitsToUint(uv);
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y; h *= M; h ^= v.z; h *= M; h ^= v.w;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}