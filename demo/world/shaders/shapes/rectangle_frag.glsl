#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

uniform vec4 uColor;
uniform vec2 uSize;
uniform float uRadius;

float rectSDF(vec2 uv, vec2 size, float r){
    vec2 d = abs(uv) - size + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;   
}


void main(){
    vec2 uv = 2.*vUV-1.;

    float distance = rectSDF(uv, uSize, uRadius);
#ifdef FRAME
    float alpha = 4.*smoothstep(0.08,0.,abs(distance))+smoothstep(0.1,0.,distance);
#else
    float alpha = 1.0-smoothstep(0.0, 1.0 - uSize.x, distance);
#endif

    fragColor = uColor * alpha;
}