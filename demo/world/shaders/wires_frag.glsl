#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define RESOLUTION 1.0
#define TAU 6.283185307179586

uvec2 wrap2(in vec2 v, float period){return uvec2(v-period*floor(v/period));}
uint hash(uint x){
    x = (x^(x>>16))*0x7feb352dU;
    x = (x^(x>>15))*0x846ca68bU;
    return (x^(x>>16));
}
vec2 hash22(uvec2 v){
    uint n = v.x*1597334677U^v.y*3812015801U;
    n = hash(n);
    return vec2(n*uvec2(0x1U,0x3fffU))*(1.0/float(0xffffffffU));
}
float hash21(uvec2 v){
    uint n = v.x*1597334677U^v.y*3812015801U;
    n = hash(n);
    return float(n)*(1.0/float(0xffffffffU));
}
float gradN2D(in vec2 value, float period){ 
    const vec2 ie = vec2(0, 1);
    vec2 p = floor(value);
    vec2 f = fract(value);
    vec2 w = f*f*(3. - 2.*f); 
    return .5+.5*mix(mix(
    dot(hash22(wrap2(p + ie.xx,period)), f-ie.xx),
    dot(hash22(wrap2(p + ie.yx,period)), f-ie.yx), w.x),
    mix(dot(hash22(wrap2(p + ie.xy,period)), f-ie.xy),
    dot(hash22(wrap2(p + ie.yy,period)), f-ie.yy), w.x), w.y);
}

float fbm(in vec2 uv, in float period, in int octaves){
    float value = 0.0, scale = 1.0, weight = 0.0;
    for(int i=0;i<octaves;i++){
        float n = gradN2D(uv,period/scale);
        value += abs(1.-2.*n)*scale;
        weight += scale;
        scale *= 0.5;
        uv *= 2.0;
    }
    return value/weight;
}

float tile0(vec2 uv){
    return max(abs(uv.x),-uv.y);
}
float tile1(vec2 uv){
    return abs(min(uv.x, uv.y));
}
float tile2(vec2 uv){
    return abs(uv.x);
}
float tile3(vec2 uv){
    return min(abs(uv.x), max(-uv.x, abs(uv.y)));
}
float tile4(vec2 uv){
    return min(abs(uv.x), abs(uv.y));
}
float tileMap(in vec2 uv, in float period){
    int tile = 0;
    vec2 id = floor(uv);
    uv = fract(uv)-.5;
    if(hash21(wrap2(id, period)) >= .5)
        tile += 1;
    if(hash21(wrap2(-id, period)) >= .5)
        tile += 8;
    if(hash21(wrap2(id-vec2(0,1), period)) >= .5)
        tile += 4;
    if(hash21(wrap2(-id-vec2(1,0), period)) >= .5)
        tile += 2;
    switch(tile){
        case 0: return 0.5;
        case 1: return tile0(uv);
        case 2: return tile0(uv.yx);
        case 3: return tile1(uv);
        case 4: return tile0(vec2(uv.x,-uv.y));
        case 5: return tile2(uv);
        case 6: return tile1(vec2(uv.x,-uv.y));
        case 7: return tile3(uv);
        case 8: return tile0(vec2(uv.y,-uv.x));
        case 9: return tile1(vec2(-uv.x,uv.y));
        case 10: return tile2(uv.yx);
        case 11: return tile3(uv.yx);
        case 12: return tile1(vec2(-uv.x,-uv.y));
        case 13: return tile3(vec2(-uv.x, uv.y));
        case 14: return tile3(vec2(-uv.y, uv.x));
        case 15: return tile4(uv);
    }
}

uniform vec2 uScreenSize;
uniform float uTime;

void main(){
    vec2 uv = vUV * RESOLUTION;
    float scale = 8.0;
    
    float n = fbm(uv*scale, scale, 2);
    n *= .5+.5*cos(TAU * (n + uv.y - 0.5*uTime));
    
    float v = tileMap(uv*scale*2.0,scale*2.0);
    v += 0.25*(1.-2.*smoothstep(0.,0.3,n));
    
    vec3 color = vec3(0.1,0.3,0.2);
    color += smoothstep(0.,0.4, 0.4-v) * vec3(0.3,0.4,0.4);
    color += smoothstep(0.,0.8, 0.8-v) * vec3(0.3,0.5,0.4);
    color += smoothstep(0.05,.1, .1-abs(v-0.1)) * vec3(0.2,0.5,0.4);
    color += smoothstep(0.,.2, .1-abs(v-0.3)) * vec3(0.3,0.6,0.7);
    color += smoothstep(0.,0.1,n) * vec3(0.1,0.1,0.2);

    fragColor = vec4(color,.5+.5*smoothstep(0.5,1.0,color.b));
}