#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    float alpha = pow(max(0.0, 1.0-length(uv)),2.0);
    
    fragColor = uColor * alpha;
}