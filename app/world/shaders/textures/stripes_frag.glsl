#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = vUV;

    float line = .5+.5*cos(TAU*(4.0*uv.y+0.5));
    float l0 = 1.0/pow(1.0-line,0.2);
    float alpha = 0.4 * line * l0;

    fragColor = uColor * alpha;
}