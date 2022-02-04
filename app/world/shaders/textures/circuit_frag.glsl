#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define RESOLUTION 1.0
#define TAU 6.283185307179586
#define PI 3.141592653589793

uvec2 wrap2(in vec2 v, float period){return uvec2(v-period*floor(v/period));}
uvec3 wrap2(in vec3 v, float period){return uvec3(v-period*floor(v/period));}
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
float hash31(uvec3 v){
    uint n = v.x*1597334677U^v.y*3812015801U^v.z*3299493293U;
    n = hash(n);
    return float(n)*(1.0/float(0xffffffffU));
}

vec3 voronoi3(in vec2 uv, in float period, out vec4 center){
    vec2 n = floor(uv);
    vec2 f = fract(uv);
    vec4 mc = vec4(0.0);
    vec3 md = vec3(8.0);

    for(int j=-1;j<=1;j++)
    for(int i=-1;i<=1;i++){
        vec2 g = vec2(i, j);
        vec2 r = g - f + hash22(wrap2(n + g, period)) * 0.8;
        float d = abs(r.x)+abs(r.y);
        if(d < md.x){
            md.z = md.y;
            md.y = md.x;
            md.x = d;
            mc.zw = mc.xy;
            mc.xy = n + g;
        }else if(d < md.y){
            md.z = md.y;
            md.y = d;
            mc.zw = n + g;
        }else if(d < md.z){
            md.z = d;
        }
    }
    center = mc;
    return md;
}

float cubicPulse(float c, float w, float x){
    x = abs(x-c)/w;return step(x,1.0)*(1.0-x*x*(3.0-2.0*x));
}

uniform vec2 uScreenSize;
uniform float uTime;

void main(){
    vec2 uv = vUV * RESOLUTION;
    float t = .5+.5*cos(TAU * (uv.x - uTime));
    uv = vec2(uv.x+uv.y,uv.x-uv.y);
    float width = 0.6, scale = 8.0;

    vec4 cellCenters;
    vec3 vr = voronoi3(uv * scale, scale * RESOLUTION, cellCenters);
    float d = max(width + vr.y - vr.z, vr.y - vr.x);
    
    float h0 = hash21(wrap2(cellCenters.xy, scale * RESOLUTION));
    float h1 = hash21(wrap2(cellCenters.zw, scale * RESOLUTION));
    
	float wire = cubicPulse(width, 0.06, d);
    wire += step(0.0, h0 - h1) * cubicPulse(width-0.1, 0.06, d);
    wire += step(0.5, h0 - h1) * cubicPulse(width-0.2, 0.06, d);
    
    vec3 color = vec3(0.12,0.28,0.36) +
    wire * vec3(0.1,0.5,0.4) +
    vr.x * vec3(0,0.42,0.38) +
    t*(h0*h1) * vec3(0.0,0.4,0.3) +
    t*t*(wire+0.2*vr.y*vr.z+0.4*vr.x) * vec3(0.5,0.6,0.5);

    fragColor = vec4(color,.5+.5*color.b);
}