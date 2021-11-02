#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    float distance = max(0.0, 1.0-length(uv));
    float alpha = pow(smoothstep(0.0,0.1,distance) * smoothstep(0.5,0.0,distance), 1.4);

    fragColor = uColor * alpha;
}