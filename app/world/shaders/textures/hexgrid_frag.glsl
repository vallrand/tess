#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define RESOLUTION 1.0
#define TAU 6.283185307179586
uniform vec2 uScreenSize;
uniform float uTime;

const vec2 s = vec2(1, sqrt(3.0));
float hexDistance(vec2 p){
    p = abs(p);
    return max(dot(p, s * .5), p.x);
}
vec2 hexOffset(vec2 uv){
    vec4 hexCenter = round(vec4(uv, uv - vec2(.5, 1.)) / s.xyxy);
    vec4 offset = vec4(uv - hexCenter.xy * s, uv - (hexCenter.zw + .5) * s);
    return dot(offset.xy, offset.xy) < dot(offset.zw, offset.zw) ? offset.xy : offset.zw;
}

void main(){
    vec2 uv = vUV * RESOLUTION;

    float h = hexDistance(hexOffset(uv * 4.0 * s.y));
    float t = cos(TAU * (uv.x - uTime));

    float v0 = smoothstep(0.,0.5,0.5-h-0.5*max(0.0,t));
    float v1 = smoothstep(0.02,0.,abs(.45-h));
    float v2 = smoothstep(h,0.,abs(.25-0.05-0.1*t));
    float v3 = smoothstep(0.8,0.,abs(0.8-t*h));
    float v4 = smoothstep(0.05,0.,abs(0.3-h-0.1*max(0.0,t)));
    vec3 color = vec3(0.32, 0.40, 0.46) +
    v0 * vec3(0.4, 0.7, 0.7) +
    v1 * vec3(0.14, 0.82, 0.85) +
    v2 * vec3(0.16, 0.50, 0.52) +
    v3 * vec3(0.6, 1.0, 1.0) +
    v4 * vec3(0.20, 0.36, 1.3);

    fragColor = vec4(color,.5+.5*color.b);
}