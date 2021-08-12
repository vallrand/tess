#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
#define RESOLUTION 1
uniform vec2 uScreenSize;

float hash(ivec2 v, int period){
    period *= RESOLUTION;
    uvec2 x = uvec2(v - period * (v / period));
    uvec2 q = 1103515245U * ((x>>1U) ^ (x.yx   ));
    uint  n = 1103515245U * ((q.x  ) ^ (q.y>>3U));
    return float(n) * (1.0/float(0xffffffffU));
}
float noise(in vec2 p, int period){
    const ivec2 k = ivec2(0,1);
    ivec2 i = ivec2(floor(p));
    vec2 f = fract(p);
	vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + k.xx, period), 
                hash(i + k.yx, period), u.x),
            mix(hash(i + k.xy, period), 
                hash(i + k.yy, period), u.x), u.y);
}

float grid(in vec2 uv, in float tiles, in float width){
    uv = cos(TAU*(uv*tiles));
    return smoothstep(1.0-width,1.0,max(uv.x,uv.y));
}

void main(){
    vec2 uv = vUV * float(RESOLUTION);

    float l3 = noise(512.0 * uv, 512);
    float l2 = noise(128.0 * uv, 128);
    float l1 = noise(32.0 * uv, 32);
    uv += 0.4*noise(16.0*uv.yx - l1 + 128.0,16);
    float l0 = noise(8.0*uv,8);
    
    vec3 color = vec3(0.04,0.04,0.12)
    + vec3(0.63,0.55,0.42) * l0
    + vec3(0.2,0.1,0.1) * (1.0-l0*l1)
    + vec3(0.42,0.42,0.44) * l1
    + vec3(0.16,0.30,0.27) * l2
    + vec3(0.12,0.16,0.22) * (l3-1.0);
    color = 0.25 + 0.5 * color;

#ifdef GRID
    color = vec3(grid(vUV, 10.0, 0.1),0.0,0.0);
    color.gb += step(0.48, max(abs(0.5-vUV.x),abs(0.5-vUV.y)));
#endif

    float roughness = mix(0.5,1.0,color.g);
    fragColor = vec4(color,.5*roughness);
}