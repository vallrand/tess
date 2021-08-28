#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash11(in float u){
    uint n = floatBitsToUint(u);
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & 0x7fffffffU)/float(0x7fffffff);
}
vec2 hash22(in vec2 uv){
    uvec4 q = floatBitsToUint(uv).xyyx;
    q = 1103515245u * ((q >> 1u) ^ q.yxwz);
    uvec2 n = 1103515245u * (q.xz ^ (q.yw >> 3u));
    return vec2(n) * (1.0 / float(0xffffffffu));
}
float noise11(in float u, in float period, float seed){
    u *= period;
    vec2 i = mod(floor(vec2(u,u+1.0)),vec2(period))+seed;
    float f = fract(u);
    return mix(hash11(i.x),hash11(i.y),f);
}
vec3 voronoi(in vec2 uv, in vec2 period, in float jitter, in float width, in float seed){
    uv *= period;
    vec2 i = floor(uv); vec2 f = uv - i;
    vec2 minPos, tilePos;
    float md = 1e+5;
    for(int y=-1;y<=1;y++)
    for(int x=-1;x<=1;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        float d = dot(rPos, rPos);
        if(d >= md) continue;
        md = d;
        minPos = rPos;
        tilePos = cPos;
    }
    float md0 = 1e+5; md = 1e+5;
    for(int y=-2;y<=2;y++)
    for(int x=-2;x<=2;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        vec2 v = minPos - rPos;
        if(dot(v, v) <= 1e-5) continue;
        float d = dot(0.5 * (minPos + rPos), normalize(rPos - minPos));
        if(d < md){
            md0 = md; md = d;
        }else if(d < md0){
            md0 = d;
        }
    }
    md += (md0 - md) * width;
    return vec3(md, tilePos);
}

void main(){
    vec2 uv = 2.*vUV-1.;
    vec2 polar = vec2(atan(uv.y,uv.x)/TAU+0.5,length(uv));
    vec2 frequency = vec2(24,16);

    vec2 uv0 = vec2(max(0.5,pow(polar.y,0.1)), polar.x);
    uv0.x += 0.01 * abs(noise11(polar.x, 40.0, 0.0));
    vec3 w = voronoi(uv0, frequency, 0.6, 0.1, 0.0);
    float e0 = mix(.1, .0, pow(polar.y, .1));
    float edge = smoothstep(e0+0.18, e0, w.x) * smoothstep(1.0,0.8,polar.y);
#ifdef MASK
    float alpha = smoothstep(-0.5,2.0,2.0*polar.y-edge*noise11(polar.x, 32.0, 0.0));
    float height = 1.0 - pow(edge, 4.0);
    float dhdx = dFdx(height);
    float dhdy = dFdy(height);
    vec3 normal = smoothstep(0.0,0.5,edge) * normalize(vec3(-dhdx, -dhdy, 1));
    fragColor = vec4(0.5+0.5*normal, alpha);
#else
    vec3 color = vec3(0.0);
    color = mix(color, vec3(0.15,0.10,0.20), edge);
    color = mix(color, vec3(0.30,0.20,0.40), smoothstep(0.7,1.0,edge));
    color = mix(color, vec3(1.00,0.20,0.50), smoothstep(0.9,1.0,edge));
    color = mix(color, vec3(1.20,0.80,1.00), smoothstep(0.99,1.0,edge));

    float alpha = mix(edge * edge, 0.0, smoothstep(0.95,1.0,edge));

    fragColor = vec4(color, alpha);
#endif
}