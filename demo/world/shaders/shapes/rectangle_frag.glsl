#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

uniform vec4 uColor;
uniform float uSize;
uniform float uRadius;

void main(){
    vec2 uv = 2.*vUV-1.;

    float distance = length(max(abs(uv)-uSize+uRadius,0.0))-uRadius;
    float alpha = 1.0-smoothstep(0.0, 1.0 - uSize, distance);

    fragColor = uColor * alpha;
}