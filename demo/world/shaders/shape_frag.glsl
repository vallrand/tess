#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec4 uColor;
#ifdef ROUNDED_BOX
uniform float uSize;
uniform float uRadius;
#endif

void main(){
    vec2 uv = 2.*vUV-1.;
#if defined(CIRCLE)
    float distance = max(0.0, 1.0-length(uv));
    float alpha = distance*distance;
#elif defined(RING)
    float distance = max(0.0, 1.0-length(uv));
    float alpha = smoothstep(0.0,0.1,distance) * smoothstep(0.5,0.0,distance);
#elif defined(ROUNDED_BOX)
    float distance = length(max(abs(uv)-uSize+uRadius,0.0))-uRadius;
    float alpha = 1.0-smoothstep(0.0, 1.0 - uSize, distance);
#endif
    fragColor = uColor * vec4(1,1,1,alpha);
}