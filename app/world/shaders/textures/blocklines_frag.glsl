#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

float hash21(in vec2 src) {
    const uint M = 0x5bd1e995u;
    uint h = 1190494759u;
    uvec2 v = floatBitsToUint(src);    
    v *= M; v ^= v>>24u; v *= M;
    h *= M; h ^= v.x; h *= M; h ^= v.y;
    h ^= h>>13u; h *= M; h ^= h>>15u;
    return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

vec4 rectangularNoise(in vec2 uv, in vec2 period){
    uv *= period;
    vec2 i = floor(uv);
    vec2 f = uv - i;
    vec2 c = vec2(0);
    int o = int(i.x+i.y) & 1;
    int u = o ^ 1;
    bool s = f[o]>hash21(mod(i,period));
    if(s) c[o] = 1.;
    vec2 n = i;
    n[o] += s ? 1. : -1.;
    if(f[u]>hash21(mod(n,period))) c[u] = 1.;
    c = i+c;

    vec4 d = vec4(
        hash21(mod(c + vec2(-1,-1), period)), 
        hash21(mod(c + vec2( 0,-1), period)), 
        hash21(mod(c + vec2( 0, 0), period)), 
    	hash21(mod(c + vec2(-1, 0), period))
    );
    o = int(c.x+c.y) & 1;
    if(o==1) d = d.wxyz;
    d = d + vec4(c-1.,c);
    return d;
}

uniform vec4 uColor;

void main(){
    vec2 uv = vUV;
    float alpha = 0.0; float alpha2 = 0.0;
    float scale = 24.0;
    uv.y += 0.2;
    const int iterations = 4;
    for(int i = 0; i < iterations; i++){
        vec4 v = rectangularNoise(uv, vec2(scale));
        float y = floor(0.5+uv.y*scale/8.0)*8.0;
    
        alpha += smoothstep(0.5,0.0,min(abs(y-v.y),abs(v.w-y)));
        alpha2 += smoothstep(0.0,0.5,min(y-v.y,v.w-y));
        uv.y += 1.0 / scale;
        uv.x += sin(y + float(i+1));
    }
    alpha*=1.5/float(iterations);
    alpha2*=2.0/float(iterations);
    fragColor = uColor * vec4(alpha,alpha2,alpha,alpha);
}