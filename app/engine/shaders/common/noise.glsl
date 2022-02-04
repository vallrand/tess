float noise1D(in float v, in float period, in float seed){
    float i = floor(v);
    float f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(hash11(mod(i,period)+seed), hash11(mod(i+1.,period)+seed), f);
}
float noise2D(in vec2 v){
    vec4 i = floor(v).xyxy + vec2(0,1).xxyy;
    vec2 f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i.xy), hash21(i.zy), f.x),
            mix(hash21(i.xw), hash21(i.zw), f.x), f.y);
}
float noise2D(in vec2 v, in vec2 period, in float seed){
    vec4 i = floor(v).xyxy + vec2(0,1).xxyy;
    vec2 f = fract(v); f = f*f*(3.0-2.0*f);
    i = mod(i, period.xyxy)+seed;
    return mix(mix(hash21(i.xy), hash21(i.zy), f.x),
            mix(hash21(i.xw), hash21(i.zw), f.x), f.y);
}
float noise3D(in vec3 v){
    vec3 i = floor(v);
    vec3 f = fract(v); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash31(i+vec3(0,0,0)), hash31(i+vec3(1,0,0)),f.x),
            mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)),f.x),
                mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float noise3D(in vec3 uv, in vec3 period, in float seed){
    vec3 i0 = floor(mod(uv, period))+seed;
    vec3 i1 = floor(mod(uv+vec3(1), period))+seed;
    vec3 f = fract(uv); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash31(vec3(i0.x,i0.y,i0.z)), hash31(vec3(i1.x,i0.y,i0.z)),f.x),
                mix(hash31(vec3(i0.x,i1.y,i0.z)), hash31(vec3(i1.x,i1.y,i0.z)),f.x),f.y),
            mix(mix(hash31(vec3(i0.x,i0.y,i1.z)), hash31(vec3(i1.x,i0.y,i1.z)),f.x),
                mix(hash31(vec3(i0.x,i1.y,i1.z)), hash31(vec3(i1.x,i1.y,i1.z)),f.x),f.y),f.z);
}