#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    float alpha = 0.5*(1.0/length(uv)-1.0);

    fragColor = uColor * alpha;
}