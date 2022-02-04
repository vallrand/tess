#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    float alpha = pow(.5-.5*cos(smoothstep(0.2,1.0,length(uv))*TAU),2.0);

    fragColor = uColor * alpha;
}